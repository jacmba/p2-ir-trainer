/* Reglas de cálculo del curso P2 – Habilitación por Instrumentos (VATSUR / VATSIM).
   Todas las funciones son puras: se usan en los generadores, en la Cabina IFR y en las pruebas. */
(function (root) {
  'use strict';
  const norm = a => ((Math.round(a) % 360) + 360) % 360;
  const hdg = a => { const n = norm(a); return String(n === 0 ? 360 : n).padStart(3, '0'); };
  const recip = a => norm(a + 180);
  // diferencia angular mínima (0..180)
  const diff = (a, b) => { const d = Math.abs(norm(a) - norm(b)) % 360; return d > 180 ? 360 - d : d; };
  // ¿está x dentro del arco que va de a a b en sentido horario?
  const inArc = (x, a, b) => { x = norm(x); a = norm(a); b = norm(b); return a <= b ? (x >= a && x <= b) : (x >= a || x <= b); };
  // signo del giro más corto de a hacia b (+1 horario, −1 antihorario)
  const turnDir = (a, b) => { const d = norm(b - a); return d === 0 ? 0 : (d <= 180 ? 1 : -1); };
  const r1 = x => Math.round(x * 10) / 10;
  const fmt1 = x => String(r1(x)).replace('.', ',');

  // ---------- Interceptaciones (Sección 7) ----------
  // inbound=true: acercamiento; se compara la CABEZA del RMI (QDM, curso actual) con el curso deseado.
  //   < 15°  → «Deseado – Cabeza – Doble P»: cabeza ± 2P (alejándose del deseado)
  //   15–60° → «Deseado – Cabeza – 30°»:     cabeza ± 30°
  //   60–90° → «Deseado – Cabeza – hasta 90»: el deseado queda a 90° del rumbo
  //   > 90°  → ruta pasada: rumbo radial (opuesto al curso deseado) hasta la cuadra, 1 min, 90° + 90° hacia la cabeza
  // inbound=false: alejamiento; se compara la COLA (radial actual) con el radial deseado.
  //   < 15°  → «Radial deseado – P»: deseado ± P
  //   15–90° → «Radial deseado – 45°»: deseado ± 45°
  //   > 90°  → ruta pasada: rumbo = radial deseado hasta la cuadra, luego 45° hacia el lado de la cabeza
  function intercept(qdm, desired, inbound) {
    const ref = inbound ? norm(qdm) : recip(qdm);
    const d = diff(ref, desired);
    if (inbound) {
      const s = turnDir(desired, ref) || 1;
      if (d < 15) return { tipo: 'directa', band: '<15', rule: 'Deseado – Cabeza – Doble P', heading: norm(ref + s * 2 * d), d, angle: 3 * d };
      if (d <= 60) return { tipo: 'directa', band: '15-60', rule: 'Deseado – Cabeza – 30°', heading: norm(ref + s * 30), d, angle: d + 30 };
      if (d <= 90) return { tipo: 'directa', band: '60-90', rule: 'Deseado – Cabeza – hasta 90°', heading: norm(desired + s * 90), d, angle: 90 };
      return { tipo: 'pasada', band: '>90', rule: 'rumbo radial hasta la cuadra, 1 min, 90° y 90° hacia la cabeza', heading: recip(desired), d };
    }
    const s = turnDir(ref, desired) || 1;
    if (d < 15) return { tipo: 'directa', band: '<15', rule: 'Radial deseado – P', heading: norm(desired + s * d), d, angle: d };
    if (d <= 90) return { tipo: 'directa', band: '15-90', rule: 'Radial deseado – 45°', heading: norm(desired + s * 45), d, angle: 45 };
    return { tipo: 'pasada', band: '>90', rule: 'rumbo = radial deseado hasta la cuadra, luego 45° hacia el lado de la cabeza', heading: norm(desired), d };
  }
  // distancia al límite de banda más cercano (para no generar casos ambiguos)
  function interceptBoundaryDist(qdm, desired, inbound) {
    const d = diff(inbound ? qdm : recip(qdm), desired);
    const b = inbound ? [15, 60, 90] : [15, 90];
    return Math.min(...b.map(x => Math.abs(d - x)));
  }

  // ---------- Circuito de espera ----------
  // Regla de los sectores sobre el indicador de rumbo: H = rumbo con el que se llega al fijo,
  // O = rumbo de alejamiento. Estándar (derecha): O en [H−110, H] paralela, [H, H+70] gota; resto directa.
  function holdEntry(H, inbound, right) {
    const O = recip(inbound);
    if (right) {
      if (inArc(O, H - 110, H)) return 'paralela';
      if (inArc(O, H, H + 70)) return 'gota';
      return 'directa';
    }
    if (inArc(O, H, H + 110)) return 'paralela';
    if (inArc(O, H - 70, H)) return 'gota';
    return 'directa';
  }
  // distancia (°) al límite de sector más cercano; el curso admite ±10° de flexibilidad
  function holdBoundaryDist(H, inbound, right) {
    const O = recip(inbound);
    const bounds = right ? [H - 110, H, H + 70] : [H, H + 110, H - 70];
    return Math.min(...bounds.map(b => diff(O, b)));
  }
  // Velocidades máximas en espera según el curso P2 (KIAS)
  function holdMaxSpeed(altFt, prop) {
    if (prop) return 175;
    if (altFt <= 6000) return 200;
    if (altFt <= 14000) return 230;
    return 265;
  }
  // rumbo de la gota: 30° hacia el lado de la espera respecto del alejamiento
  // (estándar: alejamiento − 30; no estándar: alejamiento + 30)
  const teardropHeading = (inbound, right) => norm(recip(inbound) + (right ? -30 : 30));
  // Corrección del tiempo de alejamiento a partir del tiempo del tramo de acercamiento (s)
  //  sobra tiempo en el acercamiento → exceso / 2 se resta; falta → falta × 2 se suma
  function holdOutboundTime(inboundSec, target) {
    target = target || 60;
    if (inboundSec > target) return target - (inboundSec - target) / 2;
    if (inboundSec < target) return target + (target - inboundSec) * 2;
    return target;
  }
  const mmss = s => { s = Math.round(s); const m = Math.floor(s / 60), r = s % 60; return m ? `${m} min${r ? ' ' + r + ' s' : ''}` : `${r} s`; };

  // ---------- Arco DME ----------
  // anticipo (NM) para pasar de radial a arco: 0,5 % GS con viraje estándar, 1 % con medio estándar
  const arcLeadNM = (gs, half) => gs * (half ? 0.01 : 0.005);
  // DME al que se inicia el viraje: se suma en acercamiento y se resta en alejamiento
  const arcTurnDME = (arc, gs, inbound, half) => r1(arc + (inbound ? 1 : -1) * arcLeadNM(gs, half));
  // anticipo (radiales) para pasar de arco a radial: 60 × anticipo NM / distancia
  const arcLeadDeg = (gs, dist, half) => 60 * arcLeadNM(gs, half) / dist;

  // ---------- Vuelo por instrumentos ----------
  const bankStdTurn = tas => Math.round(tas / 10 + 5);           // 10 % TAS + 5
  const turnTime = (deg, half) => deg / (half ? 1.5 : 3);         // s
  const levelOffLead = vs => Math.round(Math.abs(vs) * 0.1);     // 10 % del variómetro
  // gradiente de ascenso: razón (ft/min) = GS × % × 1,013 (101,3 ft por NM y por cada 1 %)
  const FT_NM = 6076.12 / 6000; // 1 % de gradiente = 101,27 ft por NM (≈ 1,013)
  const climbRate = (gs, pct) => Math.round(gs * pct * FT_NM);
  const climbGradient = (vs, gs) => vs / (gs * FT_NM);

  // ---------- Niveles de crucero IFR (tabla OACI con RVSM) ----------
  function ifrLevels(east) {
    const out = [];
    if (east) { for (let f = 10; f <= 410; f += 20) out.push(f); out.push(450, 490); }
    else { for (let f = 20; f <= 400; f += 20) out.push(f); out.push(430, 470, 510); }
    return out;
  }
  const ifrLevelOk = (track, fl) => ifrLevels(norm(track) < 180).includes(fl);

  // ---------- ILS ----------
  // Categorías según el curso: DH y RVR mínimos
  const ILS_CATS = [
    ['CAT I', 'DH 200 ft, RVR 800 m (550 m con luces de zona de toma de contacto y de eje)'],
    ['CAT II', 'DH < 200 ft y ≥ 100 ft, RVR 300 m'],
    ['CAT IIIA', 'Sin DH o DH < 100 ft, RVR ≥ 200 m'],
    ['CAT IIIB', 'Sin DH o DH < 50 ft, RVR < 200 m y ≥ 50 m'],
    ['CAT IIIC', 'Sin DH ni RVR mínimos']
  ];
  function ilsCat(dh, rvr) {
    if (dh == null && rvr == null) return 'CAT IIIC';
    if (dh != null && dh >= 200) return 'CAT I';
    if (dh != null && dh >= 100) return 'CAT II';
    if (rvr != null && rvr < 200) return 'CAT IIIB';
    if (dh != null && dh < 50) return 'CAT IIIB';
    return 'CAT IIIA';
  }
  // localizador: 108,10–111,95 MHz con décima impar
  function isLocFreq(f) {
    if (f < 108.1 || f > 111.95) return false;
    const tenth = Math.floor(Math.round(f * 100) / 10) % 10;
    return tenth % 2 === 1;
  }
  const MARKERS = [['OM (exterior)', '— — — (rayas)', 'Azul', '4–7 NM del umbral; ayuda a interceptar la senda'],
    ['MM (medio)', '·—·— (punto-raya)', 'Ámbar', '½–¾ NM del umbral; ≈ 200 ft sobre el terreno'],
    ['IM (interno)', '···· (puntos)', 'Blanca', 'entre el MM y el umbral; CAT II/III, donde se alcanza la DA']];

  // ---------- DME ----------
  const dmeError = d => Math.max(0.5, 0.03 * d);

  // ---------- GPS: sensibilidad del CDI ----------
  const GPS_MODES = [['Ruta', '± 5 NM'], ['Área terminal (dentro de 30 NM)', 'de ± 5 a ± 1 NM'], ['Aproximación (desde 2 NM antes del FAF)', '± 0,3 NM'], ['Frustrada', '± 1 NM']];

  // ---------- Designadores de ruta ATS ----------
  const ATS_DESIG = {
    A: 'convencional regional', B: 'convencional regional', G: 'convencional regional', R: 'convencional regional',
    L: 'RNAV regional', M: 'RNAV regional', N: 'RNAV regional', P: 'RNAV regional',
    H: 'convencional nacional', J: 'convencional nacional', V: 'convencional nacional', W: 'convencional nacional',
    Q: 'RNAV nacional', T: 'RNAV nacional', Y: 'RNAV nacional', Z: 'RNAV nacional'
  };
  function decodeRoute(id) {
    let s = id.toUpperCase(), pre = [], suf = null;
    while (/^[USK]/.test(s) && s.length > 1 && /[A-Z]/.test(s[1])) { pre.push(s[0]); s = s.slice(1); }
    const letter = s[0]; const m = /^[A-Z](\d+)([FG])?$/.exec(s);
    if (m && m[2]) suf = m[2];
    return { letter, type: ATS_DESIG[letter] || '?', upper: pre.includes('U'), supersonic: pre.includes('S'), heli: pre.includes('K'), suffix: suf };
  }

  // ---------- NOTAM: código Q ----------
  const NOTAM_SUBJ = { L: 'Instalaciones de iluminación (AGA)', M: 'Área de movimiento y aterrizaje (AGA)', F: 'Instalaciones y servicios (AGA)',
    A: 'Organización del espacio aéreo (ATM)', S: 'Servicios de tránsito aéreo y VOLMET (ATM)', P: 'Procedimientos de tránsito aéreo (ATM)',
    R: 'Restricciones en el espacio aéreo (navegación)', W: 'Avisos para la navegación', C: 'Comunicaciones y radar (CNS)',
    I: 'ILS y microondas (CNS)', N: 'Navegación terminal y en ruta (CNS)', G: 'Operaciones GNSS (CNS)', O: 'Otras informaciones' };
  const NOTAM_COND = { A: 'Disponibilidad', C: 'Cambios', H: 'Peligro', L: 'Limitaciones', X: 'Otro' };
  const NOTAM_TRAFFIC = { I: 'IFR', V: 'VFR', IV: 'IFR y VFR' };
  const NOTAM_PURPOSE = { N: 'atención inmediata de la tripulación', B: 'boletín de información previa al vuelo (PIB)', O: 'relativo a las operaciones de vuelo', M: 'asuntos varios (a solicitud)' };
  const NOTAM_SCOPE = { A: 'Aeródromo', E: 'En ruta', W: 'Aviso para la navegación' };
  const NOTAM_TYPE = { N: 'nuevo', R: 'reemplaza a otro', C: 'cancela a otro' };

  // ---------- Combustible ----------
  const ifrFuelMin = (tripMin, altMin, reserveMin) => tripMin + (altMin || 0) + (reserveMin == null ? 45 : reserveMin);

  // ---------- Datos para los generadores ----------
  const AIRCRAFT = [
    { t: 'C172', name: 'Cessna 172', prop: true, tas: 110, cat: 'A' }, { t: 'PA28', name: 'Piper Archer', prop: true, tas: 115, cat: 'A' },
    { t: 'BE58', name: 'Beechcraft Baron', prop: true, tas: 180, cat: 'B' }, { t: 'PA34', name: 'Piper Seneca', prop: true, tas: 160, cat: 'B' },
    { t: 'TBM9', name: 'TBM 930', prop: true, tas: 300, cat: 'B' }, { t: 'B350', name: 'King Air 350', prop: true, tas: 290, cat: 'B' },
    { t: 'C510', name: 'Citation Mustang', prop: false, tas: 330, cat: 'B' }, { t: 'E145', name: 'Embraer 145', prop: false, tas: 420, cat: 'C' },
    { t: 'A320', name: 'Airbus A320', prop: false, tas: 450, cat: 'C' }, { t: 'B738', name: 'Boeing 737-800', prop: false, tas: 450, cat: 'D' }
  ];
  // radioayudas y puntos de los ejemplos del curso (Venezuela, Chile, Argentina…)
  const VORS = ['MIQ', 'MTA', 'CBC', 'AMB', 'SCL', 'EZE', 'FDO', 'MOR', 'CAR', 'PTA', 'DOZ', 'ROS', 'SNT', 'CRV', 'VTN'];
  const FIXES = ['OSMAR', 'DALSI', 'DOSRA', 'TORTU', 'CHALO', 'PORGA', 'EKONU', 'GENAS', 'DARPA', 'ASEMI', 'TIGRE', 'NEBEX'];

  const API = { norm, hdg, recip, diff, inArc, turnDir, r1, fmt1, intercept, interceptBoundaryDist, holdEntry, holdBoundaryDist, holdMaxSpeed,
    teardropHeading, holdOutboundTime, mmss, arcLeadNM, arcTurnDME, arcLeadDeg, bankStdTurn, turnTime, levelOffLead, climbRate, climbGradient,
    ifrLevels, ifrLevelOk, ILS_CATS, ilsCat, isLocFreq, MARKERS, dmeError, GPS_MODES, ATS_DESIG, decodeRoute,
    NOTAM_SUBJ, NOTAM_COND, NOTAM_TRAFFIC, NOTAM_PURPOSE, NOTAM_SCOPE, NOTAM_TYPE, ifrFuelMin, AIRCRAFT, VORS, FIXES };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.P2_RULES = API;
})(typeof window !== 'undefined' ? window : globalThis);
