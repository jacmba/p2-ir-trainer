/* Simulador IFR del P2: vista en planta del avión + instrumentos básicos (HSI o DG + CDI, RMI, DME…).
   Casos por modo (radiales, esperas, arcos DME, ILS) o continuo (al resolver uno aparece otro al azar).
   Cada caso tiene un evaluador que vigila el vuelo y escribe la realimentación del instructor.
   Coordenadas en NM: x hacia el este, y hacia el norte. Rumbos = rumbos magnéticos (sin variación). */
(function (root) {
  'use strict';
  const R = root.P2_RULES;
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
  const n180 = a => { a = ((a % 360) + 360) % 360; return a > 180 ? a - 360 : a; }; // −180..180
  const H = R.hdg, recip = R.recip, norm = R.norm, diff = R.diff;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const mmss = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const fmt1 = R.fmt1;
  const bearing = (from, to) => norm(deg(Math.atan2(to.x - from.x, to.y - from.y)));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const FT_NM = 6076.12;

  // ---------- navegación ----------
  // desviación respecto de una línea que pasa por P con dirección crs: ángulo (°, + = avión a la derecha) y TO/FROM
  function lineDev(ac, P, crs) {
    const px = ac.x - P.x, py = ac.y - P.y;
    const along = px * Math.sin(rad(crs)) + py * Math.cos(rad(crs));
    const right = px * Math.cos(rad(crs)) - py * Math.sin(rad(crs));
    return { ang: deg(Math.atan2(right, Math.abs(along))), from: along > 0, right };
  }
  // lecturas de los instrumentos según la radioayuda sintonizada
  function readNav(s) {
    const ac = s.ac, nav = s.nav;
    if (nav.kind === 'ils') {
      const ld = lineDev(ac, nav.loc, nav.crs); // localizador: ignora el OBS
      const dThr = dist(ac, nav.thr);
      const dGs = Math.max(0.05, dist(ac, nav.gsRef)) * FT_NM;
      const elev = deg(Math.atan2(ac.alt - 50, dGs));
      const behind = lineDev(ac, nav.thr, nav.crs).from; // ya pasado el umbral
      return { dots: clamp(-ld.ang / 1.25, -2.5, 2.5), angDev: ld.ang, to: true, dme: dThr, brg: bearing(ac, nav.thr),
        gs: s.gsFail || behind ? null : clamp(-(elev - 3) / 0.35, -2.5, 2.5), gsDev: elev - 3, ils: true, vert: true, crs: nav.crs };
    }
    if (nav.kind === 'gps') { // tramo activo entre wps[leg-1] y wps[leg]; CDI lineal en NM
      const a = nav.wps[s.leg - 1], b = nav.wps[s.leg], legCrs = bearing(a, b), d = lineDev(ac, a, legCrs);
      const dFaf = dist(ac, nav.wps[nav.faf]), onFinal = s.leg > nav.faf || (s.leg === nav.faf && dFaf <= 2);
      const fs = onFinal ? 0.3 : (dist(ac, nav.thr) <= 30 ? 1 : 5);
      const out = { dots: clamp(-d.right / (fs / 2), -2.5, 2.5), xtk: d.right, fs, mode: onFinal ? 'APP' : fs === 1 ? 'TERM' : 'ENR', to: true, dme: dist(ac, b), brg: bearing(ac, b),
        gs: null, ils: false, gps: true, crs: legCrs, wp: b.id, vert: false };
      if (nav.lpv && s.leg >= nav.faf) {
        const dGs = Math.max(0.05, dist(ac, nav.gsRef)) * FT_NM, elev = deg(Math.atan2(ac.alt - 50, dGs));
        out.vert = true; out.gs = lineDev(ac, nav.thr, nav.crs).from ? null : clamp(-(elev - 3) / 0.35, -2.5, 2.5); out.gsDev = elev - 3;
      }
      return out;
    }
    const st = nav.st, d = lineDev(ac, st, s.obs);
    return { dots: clamp(-d.ang / 5, -2.5, 2.5), angDev: d.ang, to: !d.from, dme: dist(ac, st), brg: bearing(ac, st), radial: bearing(st, ac), gs: null, ils: false, crs: s.obs };
  }
  // secuencia automática del GPS: al pasar la perpendicular del punto activo, pasa al tramo siguiente
  function gpsSequence(s, say) {
    const nav = s.nav; if (nav.kind !== 'gps' || s.leg >= nav.wps.length - 1) return;
    const a = nav.wps[s.leg - 1], b = nav.wps[s.leg], c = lineDev(s.ac, b, bearing(a, b));
    if (c.from) { s.leg++; const nb = nav.wps[s.leg]; say('info', `GPS: ${b.id} secuenciado. Tramo activo a ${nb.id}, derrota ${H(bearing(b, nb))}.`); }
  }

  // ---------- casos ----------
  const VORS = R.VORS;
  const TYPES = {
    sid: 'Salida (SID)', inb: 'Radial en acercamiento', outb: 'Radial en alejamiento', rev: 'Viraje reglamentario', hold: 'Espera', arc: 'Arco DME',
    ils: 'Aproximación ILS', vor: 'Aproximación VOR/DME', rnav: 'Aproximación RNAV'
  };
  // aviones: IAS de crucero, aproximación y ascenso; límites del selector
  const SIM_AC = {
    c172: { name: 'Cessna 172', kind: 'hélice', prop: true, cruise: 105, app: 85, climb: 75, min: 60, max: 125 },
    b350: { name: 'King Air 350', kind: 'turbohélice', prop: true, cruise: 200, app: 130, climb: 140, min: 100, max: 245 },
    c510: { name: 'Citation Mustang', kind: 'reactor', prop: false, cruise: 230, app: 120, climb: 160, min: 95, max: 250 }
  };
  const tasOf = (ias, alt) => ias * (1 + 0.02 * Math.max(0, alt) / 1000); // regla rápida: +2 % por cada 1 000 ft
  const sqRandom = () => '' + rint(1, 6) + rint(0, 7) + rint(0, 7) + rint(1, 7);
  function placeOn(st, radial, d) { return { x: st.x + d * Math.sin(rad(radial)), y: st.y + d * Math.cos(rad(radial)) }; }

  // punto (NM sobre el curso, + = pasada la estación) donde la trayectoria P + rumbo h corta la línea por st con dirección C
  function interceptPoint(P, h, st, C) {
    const px = P.x - st.x, py = P.y - st.y, vx = Math.sin(rad(h)), vy = Math.cos(rad(h)), ux = Math.sin(rad(C)), uy = Math.cos(rad(C));
    const cuv = ux * vy - uy * vx; if (Math.abs(cuv) < 1e-6) return null;
    const t = (ux * py - uy * px) / -cuv; if (t <= 0) return null; // hacia delante
    return (px * vy - py * vx) / cuv;
  }
  // Radial en acercamiento / alejamiento
  function caseRadial(inbound) {
    const st = { x: 0, y: 0, id: pick(VORS) };
    let r0, hdg0, C, res, qdm, pos;
    for (let k = 0; k < 200; k++) {
      r0 = rint(0, 71) * 5; qdm = recip(r0); C = rint(1, 36) * 10;
      res = R.intercept(qdm, C, inbound);
      const want = pick(inbound ? ['<15', '15-60', '15-60', '60-90', '>90'] : ['<15', '15-90', '15-90', '>90']);
      // ruta pasada en acercamiento: más cerca, para que la cuadra no quede a muchos minutos
      pos = placeOn(st, r0, inbound ? (res.band === '>90' ? rint(7, 10) : rint(10, 16)) : rint(3, 5));
      // con el rumbo de la regla, el corte con el curso debe quedar a ≥ 4 NM antes de la estación (o detrás, en alejamiento)
      if (res.tipo === 'directa' && inbound) { const x = interceptPoint(pos, res.heading, st, C); if (x == null || x > -4) continue; }
      if (res.band === want && res.d >= 6 && res.d <= 165 && R.interceptBoundaryDist(qdm, C, inbound) >= 4) break;
    }
    hdg0 = inbound ? norm(qdm + rint(-15, 15)) : norm(r0 + rint(-15, 15));
    const instr = inbound ? `Intercepte el curso ${H(C)} hacia ${st.id}` : `Aléjese por el radial ${H(C)} de ${st.id}`;
    return {
      type: inbound ? 'inb' : 'outb', title: instr, nav: { kind: 'vor', st },
      ac: { x: pos.x, y: pos.y, hdg: hdg0, alt: 5000 }, altAssigned: 5000, obs: 360,
      brief: `${instr}. Mantenga 5 000 ft.`,
      hint: res.tipo === 'directa'
        ? `${inbound ? 'Cabeza' : 'Cola'} del RMI ${H(inbound ? qdm : r0)} frente a ${H(C)}: ${res.d}° → «${res.rule}» → rumbo ${H(res.heading)}.`
        : `Diferencia ${res.d}° > 90°: ruta pasada → ${res.rule}.`,
      draw: { course: { P: st, crs: C, inbound } },
      ev: evRadial({ st, C, inbound, res, qdm, r0 })
    };
  }
  function evRadial(o) {
    let chosen = false, stable = 0, lastHdg = null, overSide = 0, overWarned = false, ok = 0, obsWarned = false;
    const want = o.inbound ? o.C : o.C; // curso del OBS: en acercamiento el curso, en alejamiento el radial
    return (s, n, dt, say) => {
      if (!obsWarned && s.t > 25 && diff(s.obs, want) > 2) { obsWarned = true; say('tip', `Selecciona ${H(want)} en el OBS: ${o.inbound ? 'acercándote, el curso es el recíproco del radial' : 'alejándote, curso = radial'}.`); }
      // primer rumbo de interceptación elegido
      if (!chosen) {
        const settled = Math.abs(s.turn) < 0.5;
        if (settled && lastHdg != null && diff(s.ac.hdg, s.hdgStart) > 4) { stable += dt; } else stable = 0;
        lastHdg = s.ac.hdg;
        if (stable > 3) {
          chosen = true; const h = s.ac.hdg, e = diff(h, o.res.heading);
          const cut = diff(h, o.C);
          if (o.res.tipo === 'pasada') say(e <= 12 ? 'ok' : 'warn', e <= 12 ? `Bien: ruta pasada, rumbo ${H(h)} hasta la cuadra.` : `Con ${o.res.d}° de diferencia es ruta pasada: la regla daba rumbo ${H(o.res.heading)} hasta la cuadra (has puesto ${H(h)}).`);
          else if (cut > 92) say('bad', `Rumbo ${H(h)}: ángulo de corte de ${cut}°, mayor de 90°. Así no interceptas el curso.`);
          else say(e <= 10 ? 'ok' : 'warn', e <= 10 ? `Buen rumbo de interceptación (${H(h)}, «${o.res.rule}»).` : `Rumbo ${H(h)} (corte ${cut}°). La regla «${o.res.rule}» daba ${H(o.res.heading)}.`);
        }
      }
      // pasarse del curso
      if (Math.abs(n.angDev) > 6) overSide = Math.sign(n.angDev);
      if (!overWarned && overSide && Math.sign(n.angDev) === -overSide && Math.abs(n.angDev) > 6) { overWarned = true; say('warn', 'Te has pasado del curso: anticipa el viraje cuando la aguja empiece a moverse (más pronto cuanto más cerca de la estación).'); }
      // establecido
      const trackOk = diff(s.track, o.C) <= 10, toOk = o.inbound ? n.to : !n.to;
      const dev = lineDev(s.ac, o.st, o.C);
      if (Math.abs(dev.ang) <= 2.5 && trackOk && toOk && dev.from === !o.inbound) ok += dt; else ok = 0;
      if (ok > 15) {
        const wca = Math.round(n180(s.ac.hdg - s.track));
        return { done: true, ok: true, msg: `Establecido en ${o.inbound ? 'el curso ' + H(o.C) + ' hacia la estación' : 'el radial ' + H(o.C)}.${Math.abs(wca) >= 3 ? ` Corrección de deriva: ${Math.abs(wca)}° a la ${wca > 0 ? 'derecha' : 'izquierda'}.` : ''}` };
      }
      if (o.inbound && n.dme < 0.6) return { done: true, ok: false, msg: 'Has llegado a la estación sin establecerte en el curso.' };
      if (!o.inbound && n.dme > 28) return { done: true, ok: false, msg: 'Demasiado lejos sin interceptar el radial.' };
      if (s.t > 900) return { done: true, ok: false, msg: 'Tiempo agotado (15 min).' };
      return null;
    };
  }

  // Espera
  function caseHold() {
    const st = { x: 0, y: 0, id: pick(VORS) };
    let inb, h, right;
    do { inb = rint(0, 35) * 10; h = rint(0, 71) * 5; right = Math.random() < 0.65; } while (R.holdBoundaryDist(h, inb, right) < 15);
    const pos = placeOn(st, recip(h), rint(6, 8));
    const entry = R.holdEntry(h, inb, right), alt = pick([4000, 5000, 6000, 8000]);
    const instr = `Espere sobre ${st.id}, curso de acercamiento ${H(inb)}, virajes por la ${right ? 'derecha' : 'izquierda'}, ${alt.toLocaleString('es-ES')} ft`;
    return {
      type: 'hold', title: instr, nav: { kind: 'vor', st }, ac: { x: pos.x, y: pos.y, hdg: h, alt }, altAssigned: alt, obs: 360,
      brief: `Directo a ${st.id}. ${instr}. Tramos de 1 minuto.`,
      hint: `Rumbo de llegada ${H(h)}, alejamiento ${H(recip(inb))} → entrada ${entry}${entry === 'gota' ? ` (rumbo de la gota ${H(R.teardropHeading(inb, right))})` : ''}.`,
      draw: { hold: { st, inb, right }, course: { P: st, crs: inb, inbound: true } },
      entry, ev: evHold({ st, inb, right, entry, h })
    };
  }
  function evHold(o) {
    const O = recip(o.inb);
    const tdH = R.teardropHeading(o.inb, o.right);
    let phase = 'app', minD = 99, tFix = 0, judged = false, estT = null, turned = 0, prevH = null, spdT = 0, spdWarned = false, obsWarned = false, altWarn = 0, stable = 0;
    const names = { directa: 'directa', paralela: 'paralela', gota: 'en gota' };
    return (s, n, dt, say) => {
      if (!obsWarned && s.t > 25 && diff(s.obs, o.inb) > 2) { obsWarned = true; say('tip', `Pon ${H(o.inb)} (curso de acercamiento) en el OBS.`); }
      if (Math.abs(s.ac.alt - s.altAssigned) > 300 && s.t - altWarn > 60) { altWarn = s.t; say('warn', `Mantén ${s.altAssigned.toLocaleString('es-ES')} ft en la espera.`); }
      const d = n.dme;
      // velocidad máxima en espera (tabla del curso) desde 3 NM antes del fijo
      const vmax = R.holdMaxSpeed(s.ac.alt, s.acType.prop);
      if ((phase !== 'app' || d < 3) && s.ac.ias > vmax + 3) spdT += dt; else spdT = 0;
      if (spdT > 8 && !spdWarned) { spdWarned = true; s.penal += 15; say('bad', `${Math.round(s.ac.ias)} KIAS: en espera, ${s.acType.prop ? 'un avión de hélice no pasa de 175 KIAS' : `un reactor a ${Math.round(s.ac.alt).toLocaleString('es-ES')} ft no pasa de ${vmax} KIAS`}. Reduce antes del fijo.`); }
      // giro acumulado (+ derecha) desde que se está a menos de 1 NM del fijo
      if (d < 1 || phase !== 'app') { if (prevH != null) turned += n180(s.ac.hdg - prevH); prevH = s.ac.hdg; }
      if (phase === 'app') {
        minD = Math.min(minD, d);
        if (minD < 1.2 && d > minD + 0.15) { phase = 'entry'; tFix = s.t; say('info', `Sobre ${o.st.id}: inicia la entrada.`); }
        if (s.t > 400) return { done: true, ok: false, msg: 'No has llegado al fijo.' };
        return null;
      }
      const side = lineDev(s.ac, o.st, o.inb).right; const holdSide = o.right ? side > 0 : side < 0;
      if (phase === 'entry') {
        const settled = Math.abs(s.turn) < 0.5 && s.t - tFix > 12;
        stable = settled ? stable + dt : 0;
        if (!judged && (stable > 4 || s.t - tFix > 150)) {
          judged = true; const h = s.ac.hdg;
          let got = 'otra';
          // directa: se vira hacia el lado de la espera; paralela: hacia el lado contrario. Sin apenas viraje, decide el lado.
          const towardHold = o.right ? turned > 8 : turned < -8, awayHold = o.right ? turned < -8 : turned > 8;
          if (diff(h, tdH) <= 12 && o.entry === 'gota') got = 'gota';
          else if (diff(h, O) <= 20) got = towardHold ? 'directa' : awayHold ? 'paralela' : (holdSide ? 'directa' : 'paralela');
          else if (diff(h, tdH) <= 12) got = 'gota';
          if (got === o.entry) say('ok', `Entrada ${names[got]} correcta (rumbo ${H(h)}).`);
          else if (got === 'otra') say('bad', `No reconozco la entrada: rumbo ${H(h)}. Tocaba ${names[o.entry]}${o.entry === 'gota' ? ' con rumbo ' + H(tdH) : ' con rumbo de alejamiento ' + H(O)}.`);
          else say('bad', `Has hecho una entrada ${names[got]}, pero con rumbo de llegada ${H(o.h)} y alejamiento ${H(O)} tocaba ${names[o.entry]}.`);
          s.penal += got === o.entry ? 0 : 30;
          phase = 'circuit';
        }
        return null;
      }
      // circuito: establecido en el acercamiento y paso por el fijo
      const ld = lineDev(s.ac, o.st, o.inb);
      const est = !ld.from && Math.abs(ld.ang) <= 5 && diff(s.track, o.inb) <= 20 && d < 8;
      if (est && estT == null) estT = s.t;
      if (!est && estT != null && d > 1.2) estT = null;
      if (estT != null && d < 0.5) {
        const t = s.t - estT;
        const out = R.holdOutboundTime(t);
        const msg = `Paso por ${o.st.id}: acercamiento de ${mmss(t)}.` + (Math.abs(t - 60) <= 10 ? ' Buen cronometraje.' : ` Para 1 min en el acercamiento, el próximo alejamiento debería durar ${mmss(out)} (${t > 60 ? 'sobra: mitad y se resta' : 'falta: doble y se suma'}).`);
        return { done: true, ok: true, msg };
      }
      if (d > 10) return { done: true, ok: false, msg: 'Te has alejado demasiado del fijo: la espera queda fuera del espacio protegido.' };
      if (s.t - tFix > 600) return { done: true, ok: false, msg: 'Diez minutos sin completar el circuito.' };
      return null;
    };
  }

  // Arco DME
  function caseArc() {
    const st = { x: 0, y: 0, id: pick(VORS) };
    const A = rint(8, 15), inbound = Math.random() < 0.6, r0 = rint(0, 35) * 10, cw = Math.random() < 0.5;
    const target = norm(r0 + (cw ? 1 : -1) * rint(5, 9) * 10);
    const pos = placeOn(st, r0, inbound ? A + 6 : Math.max(2.5, A - 7));
    const hdg = inbound ? recip(r0) : r0;
    const crsOut = recip(target);
    const instr = `${inbound ? 'Siga el radial ' + H(r0) + ' hacia' : 'Aléjese por el radial ' + H(r0) + ' de'} ${st.id}, entre en el arco de ${A} NM ${cw ? 'en sentido horario' : 'en sentido antihorario'} y abandónelo para seguir el curso ${H(crsOut)} hacia ${st.id}`;
    return {
      type: 'arc', title: `Arco de ${A} NM de ${st.id}`, nav: { kind: 'vor', st }, ac: { x: pos.x, y: pos.y, hdg, alt: 4000 }, altAssigned: 4000, obs: inbound ? recip(r0) : r0,
      brief: instr + '. Mantenga 4 000 ft.',
      hint: `Entrada: anticipo 0,5 % GS (${inbound ? 'se suma' : 'se resta'}). Salida: [60 × 0,5 % GS] / ${A} NM radiales antes del R-${H(target)}.`,
      draw: { arc: { st, A, r0, target, cw }, course: { P: st, crs: crsOut, inbound: true } },
      ev: evArc({ st, A, inbound, r0, target, cw, crsOut, hdg })
    };
  }
  function evArc(o) {
    let phase = 'radial', far = 0, warnSide = 0, startRad = null, ok = 0, obsWarned = false, crossed = false;
    return (s, n, dt, say) => {
      const d = n.dme, rr = n.radial;
      if (phase === 'radial') {
        if (diff(s.ac.hdg, o.hdg) > 25) {
          const at = R.arcTurnDME(o.A, s.gs, o.inbound);
          const e = d - at;
          if (Math.abs(e) <= 0.4) say('ok', `Viraje iniciado a ${fmt1(d)} NM: buen anticipo (calculado ${fmt1(at)}).`);
          else { say('warn', `Viraje a ${fmt1(d)} NM; el anticipo de 0,5 % × ${Math.round(s.gs)} kt daba ${fmt1(at)} NM (${o.inbound ? 'se suma' : 'se resta'}).`); s.penal += 10; }
          phase = 'arc'; startRad = rr;
        }
        if (o.inbound ? d < o.A - 1.5 : d > o.A + 1.5) return { done: true, ok: false, msg: 'Has cruzado el arco sin virar.' };
        return null;
      }
      const prog = (o.cw ? 1 : -1) * n180(rr - startRad), toGo = (o.cw ? 1 : -1) * n180(o.target - rr);
      if (phase === 'arc') {
        if (prog < -12) return { done: true, ok: false, msg: `Estás recorriendo el arco en sentido ${o.cw ? 'antihorario' : 'horario'}: era ${o.cw ? 'horario (radiales crecientes)' : 'antihorario (radiales decrecientes)'}.` };
        const e = d - o.A;
        if (Math.abs(e) > 2.5) return { done: true, ok: false, msg: `Te has salido del arco (${fmt1(d)} NM).` };
        const sd = e > 0.5 ? 1 : e < -0.5 ? -1 : 0;
        if (sd && sd !== warnSide) { far++; s.penal += 5; say('warn', sd > 0 ? `${fmt1(d)} NM: te has ido hacia fuera. Pon la aguja del RMI 10° más por encima de la punta de ala.` : `${fmt1(d)} NM: te has ido hacia dentro. Pon la aguja 5° más por debajo de la punta de ala.`); }
        if (!sd && warnSide && Math.abs(e) < 0.3) say('info', 'De nuevo en el arco.');
        if (Math.abs(e) < 0.3 || sd) warnSide = sd;
        if (!obsWarned && toGo < 25 && diff(s.obs, o.crsOut) > 2) { obsWarned = true; say('tip', `Prepara el OBS en ${H(o.crsOut)} para la salida.`); }
        if (toGo <= 0 && !crossed) {
          crossed = true; phase = 'exit';
          const lead = Math.max(1, Math.round(R.arcLeadDeg(s.gs, o.A)));
          if (diff(s.ac.hdg, o.crsOut) <= 35) say('ok', `Buen anticipo en la salida (calculado ${lead}°: virar en el R-${H(o.target - (o.cw ? lead : -lead))}).`);
          else { s.penal += 10; say('warn', `Llegas al R-${H(o.target)} sin haber virado: el anticipo era de ${lead}° (60 × ${fmt1(R.arcLeadNM(s.gs))} / ${o.A}), virar en el R-${H(o.target - (o.cw ? lead : -lead))}.`); }
        }
        if (s.t > 1500) return { done: true, ok: false, msg: 'Tiempo agotado (25 min).' };
        return null;
      }
      // salida
      const dv = lineDev(s.ac, o.st, o.crsOut);
      if (Math.abs(dv.ang) <= 2.5 && !dv.from && diff(s.track, o.crsOut) <= 10) ok += dt; else ok = 0;
      if (ok > 10) return { done: true, ok: true, msg: `Establecido en el curso ${H(o.crsOut)} hacia ${o.st.id}.${far ? ` Saliste ${far} ${far > 1 ? 'veces' : 'vez'} de ± 0,5 NM.` : ' Arco dentro de ± 0,5 NM todo el tiempo.'}` };
      if (Math.abs(n180(rr - o.target)) > 30 || d < 1) return { done: true, ok: false, msg: 'No has interceptado el curso de salida.' };
      return null;
    };
  }

  // ILS
  function caseILS() {
    const crs = rint(0, 35) * 10, rwy = String(Math.round(crs / 10) || 36).padStart(2, '0');
    const thr = { x: 0, y: 0 }, loc = placeOn(thr, crs, 1.7), gsRef = placeOn(thr, crs, 0.16);
    // vectores para interceptar el localizador a 11–13 NM, antes de la senda (a 3 000 ft se cruza hacia 9,3 NM)
    const cut = pick([30, 45]), offA = pick([1.5, 2, 2.5, 3]), off = offA * (Math.random() < 0.5 ? 1 : -1);
    const along = 11 + offA / Math.tan(rad(cut)) + rint(0, 2);
    // posición: en la prolongación (hacia atrás) desplazada a un lado
    const back = recip(crs);
    const p0 = placeOn(thr, back, along);
    const pos = { x: p0.x + off * Math.cos(rad(crs)), y: p0.y - off * Math.sin(rad(crs)) }; // + = a la derecha del eje
    const hdg = norm(crs - Math.sign(off) * cut);
    const gsFail = Math.random() < 0.25, id = 'I' + pick(VORS).slice(0, 3);
    const alt = 3000;
    return {
      type: 'ils', title: `ILS pista ${rwy}`, nav: { kind: 'ils', id, thr, loc, gsRef, crs }, ac: { x: pos.x, y: pos.y, hdg, alt }, altAssigned: alt, obs: crs, gsFail: false, gsFailPlan: gsFail, speed: 'app',
      brief: `Rumbo ${H(hdg)}, mantenga 3 000 ft hasta establecido en el localizador, autorizado aproximación ILS pista ${rwy} (curso ${H(crs)}°, ${id}). DA 200 ft.`,
      hint: 'Senda de 3°: razón ≈ GS × 5,3 (a 120 kt, unos 640 ft/min). No desciendas hasta estar establecido en el localizador; corrige siempre hacia las agujas.',
      draw: { ils: { thr, crs, loc } },
      ev: evILS({ crs, thr, gsFail, rwy })
    };
  }
  function evILS(o) {
    let locEst = false, earlyWarn = false, gsCap = false, lowWarn = 0, failed = false;
    const MDA = 500;
    return (s, n, dt, say) => {
      const agl = s.ac.alt;
      if (!locEst && Math.abs(n.dots) < 1 && diff(s.track, o.crs) < 15) { locEst = true; say('ok', 'Establecido en el localizador.'); }
      if (!locEst && !earlyWarn && agl < s.altAssigned - 200) { earlyWarn = true; s.penal += 15; say('bad', 'Estás descendiendo sin estar establecido en el localizador.'); }
      if (o.gsFail && !failed && n.dme < 7 && locEst) { failed = true; s.gsFail = true; say('bad', `Bandera GS: la senda ha fallado. Continúas como localizador: no bajes de la MDA ${MDA} ft hasta el MAPt (1 NM).`); }
      if (!s.gsFail && n.gs != null && !gsCap && locEst && Math.abs(n.gs) < 0.6) { gsCap = true; say('info', `Interceptando la senda: descenso ≈ ${Math.round(s.gs * 5.31 / 10) * 10} ft/min a ${Math.round(s.gs)} kt de GS.`); }
      if (!s.gsFail && n.gs != null && gsCap && agl < 1500 && n.gs > 1 && s.t - lowWarn > 20) { lowWarn = s.t; s.penal += 5; say('warn', 'Bajo de senda: reduce el descenso.'); }
      if (agl < 1000 && (Math.abs(n.dots) >= 2.4 || (!s.gsFail && n.gs != null && Math.abs(n.gs) >= 2.4))) return { done: true, ok: false, msg: 'Deflexión completa por debajo de 1 000 ft: aproximación frustrada.' };
      if (s.gsFail) {
        if (agl < MDA - 50) return { done: true, ok: false, msg: `Has bajado de la MDA (${MDA} ft) sin senda de planeo.` };
        if (n.dme <= 1) return Math.abs(n.dots) <= 1 ? { done: true, ok: true, msg: 'En el MAPt a la MDA y alineado: con la pista a la vista, aterrizas; si no, frustrada.' } : { done: true, ok: false, msg: 'En el MAPt fuera del localizador: frustrada.' };
      } else if (agl <= 200) {
        const okL = Math.abs(n.dots) <= 1, okG = n.gs != null && Math.abs(n.gs) <= 1;
        if (okL && okG) return { done: true, ok: true, msg: 'En la DA dentro de tolerancias: luces a la vista (simulado). ¡Buena aproximación!' };
        return { done: true, ok: false, msg: `En la DA fuera de tolerancias (${okL ? '' : 'localizador '}${okG ? '' : 'senda'}): frustrada.` };
      }
      if (n.dme < 0.3 || s.t > 900) return { done: true, ok: false, msg: 'Aproximación no completada.' };
      return null;
    };
  }

  // Viraje reglamentario (inversión de curso 45°/180°)
  function caseRev() {
    const st = { x: 0, y: 0, id: pick(VORS) }, C = rint(0, 35) * 10, right = Math.random() < 0.5, side = right ? 1 : -1;
    const pos = placeOn(st, C, rint(3, 5)), h1 = norm(C + side * 45), h2 = recip(h1), inbC = recip(C);
    return {
      type: 'rev', title: 'Viraje reglamentario', nav: { kind: 'vor', st }, ac: { x: pos.x, y: pos.y, hdg: C, alt: 4000 }, altAssigned: 4000, obs: C,
      brief: `Establecido alejándose por el radial ${H(C)} de ${st.id}. Invierta el curso con un viraje reglamentario 45°/180° por la ${right ? 'derecha' : 'izquierda'} y vuelva a ${st.id} por el curso ${H(inbC)}. Mantenga 4 000 ft.`,
      hint: `Vira por la ${right ? 'derecha' : 'izquierda'} a ${H(h1)}; con alas niveladas, 1 minuto. A los 45 s, selector de rumbo a ${H(h2)} y OBS en ${H(inbC)}. Al minuto, viraje por la ${right ? 'izquierda' : 'derecha'} a ${H(h2)} e intercepta con 45°.`,
      draw: { course: { P: st, crs: inbC, inbound: true } },
      ev: evRev({ st, C, side, h1, h2, inbC })
    };
  }
  function evRev(o) {
    let phase = 'first', turned = 0, prevH = null, stable = 0, tLeg = 0, hLeg = 0, ok = 0, obsWarned = false;
    const lado = k => k > 0 ? 'derecha' : 'izquierda';
    return (s, n, dt, say) => {
      if (prevH != null) turned += n180(s.ac.hdg - prevH); prevH = s.ac.hdg;
      stable = Math.abs(s.turn) < 0.5 ? stable + dt : 0;
      if (phase === 'first') {
        if (Math.abs(turned) > 20 && stable > 2) {
          if (Math.sign(turned) !== o.side) { s.penal += 20; say('bad', `El viraje inicial era por la ${lado(o.side)}; has virado por la ${lado(-o.side)}.`); }
          else if (diff(s.ac.hdg, o.h1) > 8) { s.penal += 10; say('warn', `Rumbo ${H(s.ac.hdg)}: el tramo del viraje reglamentario va a 45° del curso, ${H(o.h1)}.`); }
          else say('ok', `Rumbo ${H(o.h1)}, a 45° del curso. Toma tiempo: 1 minuto.`);
          phase = 'leg'; tLeg = s.t - stable; hLeg = s.ac.hdg; turned = 0;
        }
        if (s.t > 60 && phase === 'first') return { done: true, ok: false, msg: 'No has iniciado la inversión de curso.' };
        return null;
      }
      if (phase === 'leg') {
        if (Math.abs(s.turn) > 20 || diff(s.ac.hdg, hLeg) > 20) {
          const lt = s.t - tLeg;
          if (Math.abs(lt - 60) <= 12) say('ok', `Tramo de ${mmss(lt)}: bien cronometrado.`); else { s.penal += 10; say('warn', `Tramo de ${mmss(lt)}: debía ser de 1 minuto desde alas niveladas.`); }
          if (diff(s.obs, o.inbC) > 2 && !obsWarned) { obsWarned = true; say('tip', `Pon el OBS en ${H(o.inbC)} para el acercamiento.`); }
          phase = 'second'; turned = 0;
        }
        if (s.t - tLeg > 150) return { done: true, ok: false, msg: 'Demasiado tiempo en el tramo de 45°: te has alejado.' };
        return null;
      }
      if (phase === 'second') {
        if (Math.abs(turned) > 90 && stable > 2) {
          if (Math.sign(turned) !== -o.side) { s.penal += 20; say('bad', `El segundo viraje va por el lado contrario al primero: por la ${lado(-o.side)}.`); }
          else if (diff(s.ac.hdg, o.h2) > 12) { s.penal += 5; say('warn', `Rumbo ${H(s.ac.hdg)}; el recíproco del tramo era ${H(o.h2)} (45° de corte con el curso).`); }
          else say('ok', `Rumbo ${H(o.h2)}: interceptando el curso ${H(o.inbC)} con 45°.`);
          phase = 'intc';
        }
        return null;
      }
      const dv = lineDev(s.ac, o.st, o.inbC);
      if (!dv.from && Math.abs(dv.ang) <= 3 && diff(s.track, o.inbC) <= 10) ok += dt; else ok = 0;
      if (ok > 10) return { done: true, ok: true, msg: `Curso invertido: establecido en ${H(o.inbC)} hacia ${o.st.id}.` };
      if (n.dme > 12 || s.t > 600) return { done: true, ok: false, msg: 'No has interceptado el curso de vuelta.' };
      return null;
    };
  }

  // Aproximación VOR/DME (no precisión): VOR en el aeródromo, FAF D6, MDA y MAPt sobre el VOR
  function caseVORApp() {
    const st = { x: 0, y: 0, id: pick(VORS) }, F = rint(0, 35) * 10, rwy = String(Math.round(F / 10) || 36).padStart(2, '0');
    const thr = placeOn(st, F, 0.6), FAF = 6, FAFALT = 2100, MDA = pick([500, 600, 700]);
    const cut = 30, offA = pick([1.5, 2, 2.5]), off = offA * (Math.random() < 0.5 ? 1 : -1), along = 13 + offA / Math.tan(rad(cut));
    const p0 = placeOn(st, recip(F), along), pos = { x: p0.x + off * Math.cos(rad(F)), y: p0.y - off * Math.sin(rad(F)) }, hdg = norm(F - Math.sign(off) * cut);
    return {
      type: 'vor', title: `VOR/DME pista ${rwy}`, nav: { kind: 'vor', st }, ac: { x: pos.x, y: pos.y, hdg, alt: 3000 }, altAssigned: 3000, obs: 360, speed: 'app',
      brief: `Rumbo ${H(hdg)}, intercepte el curso ${H(F)} hacia ${st.id}, autorizado aproximación VOR/DME pista ${rwy}. Mantenga 3 000 ft hasta establecido; después descienda a ${FAFALT.toLocaleString('es-ES')} ft. FAF D${FAF},0; MDA ${MDA} ft; MAPt sobre el VOR.`,
      hint: `Pon ${H(F)} en el OBS. Establecido, baja a ${FAFALT.toLocaleString('es-ES')} ft y no más hasta el FAF (D${FAF}). Desde el FAF, descenso continuo ≈ GS × 5,3 ft/min hasta la MDA; en el MAPt, sin pista a la vista, frustrada.`,
      draw: { course: { P: st, crs: F, inbound: true }, rwy: { thr, crs: F }, fixes: [{ p: placeOn(st, recip(F), FAF), id: `D${FAF}` }] },
      ev: evVORApp({ st, F, FAF, FAFALT, MDA })
    };
  }
  function evVORApp(o) {
    let est = false, early = false, step = false, faf = false, obsWarned = false;
    return (s, n, dt, say) => {
      const dv = lineDev(s.ac, o.st, o.F), alt = s.ac.alt, dme = dist(s.ac, o.st);
      if (!obsWarned && s.t > 20 && diff(s.obs, o.F) > 2) { obsWarned = true; say('tip', `Selecciona ${H(o.F)} en el OBS.`); }
      if (!est && !dv.from && Math.abs(dv.ang) <= 5 && diff(s.track, o.F) <= 15) { est = true; say('ok', `Establecido en el curso ${H(o.F)}: ya puedes bajar a ${o.FAFALT.toLocaleString('es-ES')} ft.`); }
      if (!est && !early && alt < 2800) { early = true; s.penal += 15; say('bad', 'Estás descendiendo antes de estar establecido en el curso de aproximación.'); }
      if (!faf && dme > o.FAF && !step && alt < o.FAFALT - 100) { step = true; s.penal += 20; say('bad', `Por debajo de ${o.FAFALT.toLocaleString('es-ES')} ft antes del FAF: no se baja de la altitud del tramo hasta cruzarlo.`); }
      if (!faf && dme <= o.FAF && !dv.from) {
        faf = true;
        if (!est) { s.penal += 10; say('warn', 'Cruzas el FAF sin estar establecido en el curso.'); }
        if (alt > o.FAFALT + 300) { s.penal += 5; say('warn', `Cruzas el FAF a ${Math.round(alt)} ft: alto para empezar el descenso final.`); }
        say('info', `FAF: inicia el descenso a la MDA (${o.MDA} ft), ≈ ${Math.round(s.gs * 5.31 / 10) * 10} ft/min a ${Math.round(s.gs)} kt.`);
      }
      if (faf && alt < o.MDA - 50) return { done: true, ok: false, msg: `Has bajado de la MDA (${o.MDA} ft).` };
      if (faf && alt < 1000 && Math.abs(dv.ang) > 10 && dme > 1) return { done: true, ok: false, msg: 'Desviación completa en final: aproximación frustrada.' };
      if (faf && (dme <= 0.4 || dv.from)) {
        if (alt > o.MDA + 250) return { done: true, ok: false, msg: `Llegas al MAPt a ${Math.round(alt)} ft, muy por encima de la MDA: planifica el descenso desde el FAF (≈ GS × 5,3 ft/min).` };
        return { done: true, ok: true, msg: `En el MAPt a ${Math.round(alt)} ft (MDA ${o.MDA}) y en el curso: con la pista a la vista, aterrizas; si no, frustrada.` };
      }
      if (dme > 25 || s.t > 900) return { done: true, ok: false, msg: 'Aproximación no completada.' };
      return null;
    };
  }

  // Aproximación RNAV (GNSS) en T: IAF lateral → IF → FAF → umbral
  function caseRNAV() {
    const F = rint(0, 35) * 10, rwy = String(Math.round(F / 10) || 36).padStart(2, '0'), thr = { x: 0, y: 0 };
    const names = R.FIXES.slice().sort(() => Math.random() - 0.5);
    const FAFp = placeOn(thr, recip(F), 5), IFp = placeOn(thr, recip(F), 10), rightIAF = Math.random() < 0.5;
    const IAFp = placeOn(IFp, F + (rightIAF ? 90 : -90), 5);
    const start = placeOn(IAFp, F + (rightIAF ? 90 : -90) + rint(-30, 30), rint(6, 9));
    const lpv = Math.random() < 0.5, MIN = lpv ? 250 : 450;
    const wps = [{ x: start.x, y: start.y, id: 'PPOS' }, Object.assign({ id: names[0] }, IAFp), Object.assign({ id: names[1] }, IFp), Object.assign({ id: names[2] }, FAFp), { x: 0, y: 0, id: 'RW' + rwy }];
    return {
      type: 'rnav', title: `RNAV (GNSS) pista ${rwy}`, nav: { kind: 'gps', wps, faf: 3, thr, crs: F, lpv, gsRef: placeOn(thr, F, 0.16) },
      ac: { x: start.x, y: start.y, hdg: bearing(start, IAFp), alt: 3000 }, altAssigned: 3000, obs: 360, speed: 'app',
      brief: `Directo a ${names[0]}, autorizado aproximación RNAV (GNSS) pista ${rwy} vía ${names[0]}, mínimos ${lpv ? 'LPV' : 'LNAV'}. Cruce ${names[0]} y ${names[1]} a 3 000 ft y ${names[2]} (FAF) a 1 600 ft. ${lpv ? 'DA 250 ft' : 'MDA 450 ft'}.`,
      hint: `El GPS secuencia solo: vira al nuevo tramo al pasar cada punto (90° en ${names[1]}). Tras ${names[1]} puedes bajar a 1 600 ft. La escala pasa a ± 0,3 NM 2 NM antes del FAF. ${lpv ? 'LPV: sigue la senda como en un ILS hasta la DA.' : 'LNAV: desde el FAF, descenso continuo ≈ GS × 5,3 ft/min hasta la MDA y nivelado hasta el MAPt.'}`,
      draw: { wps, rwy: { thr, crs: F } },
      ev: evRNAV({ names, lpv, MIN, F, thr })
    };
  }
  function evRNAV(o) {
    let lastLeg = 1, legT = 0, mode = null;
    const xWarn = {}, altWarn = {};
    const minAlt = leg => leg <= 2 ? 3000 : leg === 3 ? 1600 : o.MIN;
    return (s, n, dt, say) => {
      if (s.leg !== lastLeg) {
        lastLeg = s.leg; legT = s.t;
        if (s.leg === 3) say('info', 'Tramo intermedio: puedes descender a 1 600 ft.');
        if (s.leg === 4) say('info', o.lpv ? 'FAF: sigue la senda LPV hasta la DA (250 ft).' : `FAF: descenso a la MDA (450 ft), ≈ ${Math.round(s.gs * 5.31 / 10) * 10} ft/min.`);
      }
      if (mode !== n.mode) { if (mode) say('info', n.mode === 'APP' ? 'GPS en modo APPROACH: escala del CDI ± 0,3 NM.' : n.mode === 'TERM' ? 'GPS en modo TERMINAL: escala ± 1 NM.' : 'GPS en modo RUTA: escala ± 5 NM.'); mode = n.mode; }
      const alt = s.ac.alt, mn = minAlt(s.leg);
      if (alt < mn - 100 && !altWarn[s.leg] && s.leg < 4) { altWarn[s.leg] = 1; s.penal += 20; say('bad', `Por debajo de la altitud mínima del tramo (${mn.toLocaleString('es-ES')} ft).`); }
      if (s.leg >= 2 && s.t - legT > 40 && Math.abs(n.xtk) > n.fs && !xWarn[s.leg]) { xWarn[s.leg] = 1; s.penal += 10; say('warn', `Fuera de escala: estás a ${fmt1(Math.abs(n.xtk))} NM del tramo (± ${String(n.fs).replace('.', ',')} NM).`); }
      if (s.leg === 4) {
        if (alt < 1000 && Math.abs(n.dots) >= 2.4) return { done: true, ok: false, msg: 'Deflexión completa en final: aproximación frustrada.' };
        if (o.lpv) {
          if (alt <= o.MIN) { const okL = Math.abs(n.dots) <= 1, okG = n.gs != null && Math.abs(n.gs) <= 1; return okL && okG ? { done: true, ok: true, msg: 'En la DA de la LPV dentro de tolerancias: luces a la vista (simulado).' } : { done: true, ok: false, msg: 'En la DA fuera de tolerancias: frustrada.' }; }
        } else {
          if (alt < o.MIN - 50) return { done: true, ok: false, msg: 'Has bajado de la MDA de la LNAV.' };
          if (n.dme <= 0.5) return alt <= o.MIN + 200 && Math.abs(n.xtk) <= 0.3 ? { done: true, ok: true, msg: `En el MAPt a ${Math.round(alt)} ft, en el eje: con la pista a la vista, aterrizas.` } : { done: true, ok: false, msg: alt > o.MIN + 200 ? 'Llegas al MAPt muy alto: el descenso tenía que empezar en el FAF.' : 'En el MAPt fuera del eje: frustrada.' };
        }
        if (lineDev(s.ac, o.thr, o.F).from) return { done: true, ok: false, msg: 'Has pasado el umbral sin completar la aproximación.' };
      }
      if (s.t > 1100) return { done: true, ok: false, msg: 'Aproximación no completada.' };
      return null;
    };
  }

  // Salida instrumental con gradiente mínimo
  function caseSID() {
    const Rw = rint(0, 35) * 10, rwy = String(Math.round(Rw / 10) || 36).padStart(2, '0'), thr = { x: 0, y: 0 }, DER = placeOn(thr, Rw, 1.5);
    const st = Object.assign({ id: pick(VORS) }, placeOn(DER, Rw + (Math.random() < 0.5 ? 90 : -90), 0.4));
    const side = Math.random() < 0.5 ? 1 : -1, Q = norm(Rw + side * rint(3, 6) * 10), grad = pick([4, 5, 6]), turnAlt = pick([600, 800, 1000]);
    const sidName = st.id + rint(1, 4) + 'A';
    return {
      type: 'sid', title: `SID ${sidName}`, nav: { kind: 'vor', st }, ac: { x: DER.x, y: DER.y, hdg: Rw, alt: 50 }, altAssigned: 5000, obs: Rw, speed: 'climb', vsSel: 500,
      brief: `Pista ${rwy}, salida ${sidName}: rumbo de pista hasta ${turnAlt} ft, viraje por la ${side > 0 ? 'derecha' : 'izquierda'} para interceptar y seguir el radial ${H(Q)} de ${st.id}, ascienda a 5 000 ft. Gradiente mínimo ${grad} % hasta 3 000 ft.`,
      hint: `Razón mínima = GS × ${grad} × 1,013 (a 100 kt, ${R.climbRate(100, grad)} ft/min). Nada de virajes antes de ${turnAlt} ft (y nunca por debajo de 400 ft AGL). Luego, alejamiento: «Radial deseado – 45°».`,
      draw: { course: { P: st, crs: Q, inbound: false }, rwy: { thr, crs: Rw } },
      ev: evSID({ st, Rw, Q, grad, turnAlt, DER })
    };
  }
  function evSID(o) {
    let gradWarn = false, turnWarn = false, ok = 0, obsWarned = false;
    return (s, n, dt, say) => {
      const alt = s.ac.alt, d = lineDev(s.ac, o.DER, o.Rw).from ? dist(s.ac, o.DER) : 0;
      if (!obsWarned && s.t > 15 && diff(s.obs, o.Q) > 2) { obsWarned = true; say('tip', `Selecciona el radial ${H(o.Q)} en el OBS (alejándote, curso = radial).`); }
      // gradiente: altura sobre el final de pista ≥ 35 ft + distancia · 6 076 ft · gradiente
      const req = 35 + d * FT_NM * o.grad / 100;
      if (alt < 3000 && req < 3100 && req - alt > 60 && !gradWarn) { gradWarn = true; s.penal += 15; say('bad', `No cumples el ${o.grad} %: a ${fmt1(d)} NM deberías ir por ${Math.round(req)} ft. Necesitas al menos ${R.climbRate(s.gs, o.grad)} ft/min a ${Math.round(s.gs)} kt de GS.`); }
      if (!turnWarn && diff(s.ac.hdg, o.Rw) > 10 && alt < o.turnAlt - 50) { turnWarn = true; s.penal += alt < 400 ? 25 : 10; say('bad', alt < 400 ? `Viraje a ${Math.round(alt)} ft: nunca por debajo de 400 ft AGL.` : `Viraje a ${Math.round(alt)} ft: la SID pide rumbo de pista hasta ${o.turnAlt} ft.`); }
      const dv = lineDev(s.ac, o.st, o.Q);
      if (dv.from && Math.abs(dv.ang) <= 3 && diff(s.track, o.Q) <= 10) ok += dt; else ok = 0;
      if (ok > 10 && alt >= 3000) return { done: true, ok: true, msg: `Establecido en el radial ${H(o.Q)} por encima de 3 000 ft.${gradWarn ? '' : ` Gradiente del ${o.grad} % cumplido.`}` };
      if (n.dme > 25 || s.t > 900) return { done: true, ok: false, msg: 'No has interceptado el radial de la SID.' };
      return null;
    };
  }
  const MAKERS = { sid: caseSID, inb: () => caseRadial(true), outb: () => caseRadial(false), rev: caseRev, hold: caseHold, arc: caseArc, ils: caseILS, vor: caseVORApp, rnav: caseRNAV };

  // ---------- estado y física ----------
  function makeState(c, opt) {
    const at = SIM_AC[opt.ac] || SIM_AC.c172, ias = opt.ias || at[c.speed || 'cruise'];
    const s = { c, t: 0, ac: Object.assign({ ias, tas: tasOf(ias, c.ac.alt) }, c.ac), acType: at, iasSel: ias, turn: 0, vs: 0, vsSel: c.vsSel || 600,
      altTarget: c.altAssigned, altAssigned: c.altAssigned, obs: c.obs, nav: c.nav, leg: c.nav.kind === 'gps' ? 1 : 0, sq: sqRandom(),
      gsFail: false, penal: 0, hint: false, trail: [], trailT: 0, wind: { dir: opt.windDir || 0, spd: opt.wind || 0 },
      chrono: { st: 'off', t0: 0, acc: 0 }, track: c.ac.hdg, gs: tasOf(ias, c.ac.alt) };
    s.hdgStart = s.ac.hdg;
    const can = ['inb', 'outb', 'rev', 'hold', 'arc', 'vor'].includes(c.type);
    const evt = opt.events && can && Math.random() < (opt.eventRate == null ? 0.6 : opt.eventRate)
      ? { t: opt.eventAt || rint(20, 60), kind: opt.eventKind || pick(c.type === 'vor' ? ['com'] : ['com', 'alt', 'spd']) } : null;
    s.evt = evt; s.ev = withEvents(c.ev, evt); return s;
  }
  // eventos y transpondedor: fallo de comunicaciones (7600), instrucciones del ATC y códigos que no proceden
  function withEvents(base, evt) {
    let sqBad = false, sq77 = false, held = null;
    return (s, n, dt, say) => {
      if (s.sq === '7500' && !sqBad) { sqBad = true; s.penal += 30; say('bad', 'El 7500 (interferencia ilícita) está prohibido en VATSIM: no se simulan secuestros.'); }
      if (s.sq === '7700' && !sq77) { sq77 = true; s.penal += 10; say('warn', 'El 7700 es para emergencias (y bajo control radar se mantiene el código asignado salvo que el ATC pida cambiarlo). Para fallo de comunicaciones, 7600.'); }
      if (evt && !evt.done) {
        if (!evt.fired && s.t >= evt.t) {
          evt.fired = s.t;
          if (evt.kind === 'com') say('bad', 'Fallo de comunicaciones: ya no recibes al ATC. Continúa según la última autorización.');
          if (evt.kind === 'alt') { const up = s.altAssigned <= 4000 ? true : s.altAssigned >= 7000 ? false : Math.random() < 0.5; evt.val = s.altAssigned + (up ? 1000 : -1000); s.altAssigned = evt.val; say('info', `ATC: «${up ? 'Ascienda' : 'Descienda'} y mantenga ${evt.val.toLocaleString('es-ES')} ft».`); }
          if (evt.kind === 'spd') { evt.val = Math.max(s.acType.min + 10, Math.round((s.ac.ias - 20) / 10) * 10); say('info', `ATC: «Reduzca a ${evt.val} kt».`); }
        } else if (evt.fired) {
          const el = s.t - evt.fired;
          if (evt.kind === 'com' && s.sq === '7600') { evt.done = true; say('ok', 'Transpondedor 7600: correcto. En VATSIM, además, puedes avisar por texto.'); }
          else if (evt.kind === 'alt' && s.altTarget === evt.val) { evt.done = true; say('ok', `${evt.val.toLocaleString('es-ES')} ft seleccionados.`); }
          else if (evt.kind === 'spd' && Math.abs(s.iasSel - evt.val) <= 5) { evt.done = true; say('ok', `${evt.val} kt seleccionados.`); }
          else if (el > (evt.kind === 'com' ? 60 : 30)) {
            evt.done = true; s.penal += 15;
            say('warn', evt.kind === 'com' ? 'Con fallo de comunicaciones debías poner 7600 en el transpondedor.' : evt.kind === 'alt' ? `No has seleccionado los ${evt.val.toLocaleString('es-ES')} ft que pidió el ATC.` : `No has reducido a ${evt.val} kt como pidió el ATC.`);
          }
        }
      }
      if (held) return evt.done ? held : null; // el caso termina cuando el evento se ha atendido (o ha vencido)
      const r = base(s, n, dt, say);
      if (r && r.ok && evt && evt.fired && !evt.done) { held = r; return null; }
      return r;
    };
  }
  function physStep(s, dt) {
    const ac = s.ac;
    // velocidad indicada hacia la seleccionada (≈ 1,5 kt/s) y TAS por la regla del 2 % por 1 000 ft
    const dI = s.iasSel - ac.ias; if (Math.abs(dI) > 0.05) ac.ias += clamp(dI, -1.5 * dt, 1.5 * dt);
    ac.tas = tasOf(ac.ias, ac.alt);
    // viraje a razón estándar (3°/s) hacia el lado al que se movió el selector; el rumbo lleva decimales
    if (Math.abs(s.turn) > 0.01) { const d = clamp(s.turn, -3 * dt, 3 * dt); ac.hdg = ((ac.hdg + d) % 360 + 360) % 360; s.turn -= d; } else s.turn = 0;
    const dAlt = s.altTarget - ac.alt;
    if (Math.abs(dAlt) > 1) { ac.alt += Math.sign(dAlt) * Math.min(Math.abs(s.vsSel) / 60 * dt, Math.abs(dAlt)); s.vs = Math.sign(dAlt) * Math.abs(s.vsSel); } else { ac.alt = s.altTarget; s.vs = 0; }
    const vx = ac.tas * Math.sin(rad(ac.hdg)) + s.wind.spd * Math.sin(rad(s.wind.dir + 180));
    const vy = ac.tas * Math.cos(rad(ac.hdg)) + s.wind.spd * Math.cos(rad(s.wind.dir + 180));
    ac.x += vx / 3600 * dt; ac.y += vy / 3600 * dt;
    s.gs = Math.hypot(vx, vy); s.track = (deg(Math.atan2(vx, vy)) + 360) % 360;
    s.t += dt; s.trailT += dt;
    if (s.trailT > 2) { s.trailT = 0; s.trail.push([ac.x, ac.y]); if (s.trail.length > 900) s.trail.shift(); }
  }
  // avanza dt segundos en pasos de 0,25 s; devuelve el resultado del evaluador si el caso termina
  function advance(s, dt, say) {
    while (dt > 1e-6) { const h = Math.min(0.25, dt); dt -= h; physStep(s, h); gpsSequence(s, say); const r = s.ev(s, readNav(s), h, say); if (r) return r; }
    return null;
  }

  // ---------- montaje ----------
  function mount(VIEW, deps) {
    const store = deps.store;
    const cfg = Object.assign({ mode: 'inb', inst: 'hsi', wind: 0, ac: 'c172', events: true, help: true, imc: false, tscale: 2 }, store.get('sim', {}));
    if (!SIM_AC[cfg.ac]) cfg.ac = 'c172';
    const saveCfg = () => store.set('sim', cfg);
    const best = store.get('simBest', {});
    let s = null, raf = 0, last = 0, running = false, ended = false, logN = 0, nextTimer = 0;
    const cont = { solved: 0, failed: 0, pts: 0 };

    document.body.classList.add('simmode');
    const instHTML = () => (cfg.inst === 'hsi' ? '<canvas id="ci1"></canvas>' : '<canvas id="ci0"></canvas><canvas id="ci1"></canvas>') + '<canvas id="ci2"></canvas>';
    const apBtns = (attr, vals) => vals.map(v => `<button class="btn" data-${attr}="${v}">${v > 0 ? '+' : '−'}${Math.abs(v)}</button>`).join('');
    VIEW.innerHTML = `<h1 class="sr-only">Simulador IFR</h1>
      <div class="sim" id="sim">
        <div class="sim-bar">
          <div class="seg sim-modes" id="smode">${Object.entries(TYPES).map(([k, l]) => `<button data-k="${k}" aria-pressed="${cfg.mode === k}">${l.replace('Radial en acercamiento', 'Acercamiento').replace('Radial en alejamiento', 'Alejamiento').replace('Aproximación ', '').replace('Viraje reglamentario', 'Inversión').replace('Salida (SID)', 'SID')}</button>`).join('')}<button data-k="cont" aria-pressed="${cfg.mode === 'cont'}">Continuo</button></div>
          <div class="sim-actions">
            <button class="btn primary" id="spause">▶ Empezar</button>
            <div class="seg" id="sts">${[1, 2, 4, 8].map(v => `<button data-k="${v}" aria-pressed="${cfg.tscale === v}">${v}×</button>`).join('')}</div>
            <button class="btn sim-chrono" id="schrono" title="Cronómetro (T): inicia, para y pone a cero">⏱ 0:00</button>
            <button class="btn" id="snew" title="Nuevo caso (N)">Nuevo</button><button class="btn ghost" id="shint">Pista −10</button>
            <div class="sim-opts"><button class="btn" id="sopt" aria-expanded="false" aria-controls="smenu">⚙ Ajustes</button>
              <div class="sim-menu" id="smenu" hidden>
                <div class="seg" id="sinst"><button data-k="hsi" aria-pressed="${cfg.inst === 'hsi'}">HSI</button><button data-k="cdi" aria-pressed="${cfg.inst === 'cdi'}">DG + CDI</button></div>
                <label>Avión <select id="sac">${Object.entries(SIM_AC).map(([k, a]) => `<option value="${k}" ${cfg.ac === k ? 'selected' : ''}>${a.name} (${a.kind})</option>`).join('')}</select></label>
                <label>Viento <select id="swind">${[[0, 'sin viento'], [10, 'suave (10 kt)'], [20, 'moderado (20 kt)']].map(([v, l]) => `<option value="${v}" ${cfg.wind == v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
                <label title="Fallo de comunicaciones e instrucciones del ATC durante el caso"><input type="checkbox" id="sevt" ${cfg.events ? 'checked' : ''}> Eventos (ATC y fallos)</label>
                <label><input type="checkbox" id="shelp" ${cfg.help ? 'checked' : ''}> Ayudas en el mapa</label>
                <label><input type="checkbox" id="simc" ${cfg.imc ? 'checked' : ''}> Ocultar mapa (IMC)</label>
                <p class="small muted" style="margin:4px 0 0;white-space:normal;max-width:300px"><b>Teclado:</b> ← → rumbo ±5° (Mayús ±1°; el avión vira hacia el lado al que mueves el selector) · Z/X OBS ∓1° (Mayús ±10°) · ↑ ↓ altitud ±100 ft · Mayús ↑ ↓ V/S ±100 · Q/W velocidad ∓5 kt (Mayús ±10) · T cronómetro · espacio pausa · 1–4 velocidad · N nuevo caso</p>
              </div></div>
          </div>
        </div>
        <div class="sim-instr" id="sinstr"></div>
        <div class="simmap"><canvas id="smap"></canvas><div class="sim-hud" id="shud"></div></div>
        <div class="siminst" id="sinstbox">${instHTML()}</div>
        <div class="simside">
          <div class="simap" aria-label="Piloto automático">
            <div class="apm"><div class="aph"><span>HDG</span><b class="mono" id="vhdg">—</b></div><div class="apk">${apBtns('h', [-10, -1, 1, 10])}</div>
              <div class="apk"><button class="btn" data-dir="L" title="Virar por la izquierda al rumbo escrito">◀</button><input class="num" id="hin" inputmode="numeric" placeholder="rumbo" aria-label="Rumbo a seleccionar"><button class="btn" data-dir="R" title="Virar por la derecha al rumbo escrito">▶</button><button class="btn" data-dir="S" title="Virar por el lado más corto">corto</button></div></div>
            <div class="apm"><div class="aph"><span>CRS · OBS</span><b class="mono" id="vcrs">—</b></div><div class="apk">${apBtns('o', [-10, -1, 1, 10])}</div>
              <div class="apk"><input class="num" id="oin" inputmode="numeric" placeholder="curso" aria-label="Curso del OBS"></div></div>
            <div class="apm"><div class="aph"><span>ALT</span><b class="mono" id="valt">—</b></div><div class="apk">${apBtns('a', [-1000, -100, 100, 1000])}</div></div>
            <div class="apm"><div class="aph"><span>V/S</span><b class="mono" id="vvs">—</b></div><div class="apk">${apBtns('v', [-100, 100])}</div></div>
            <div class="apm"><div class="aph"><span>IAS</span><b class="mono" id="vias">—</b></div><div class="apk">${apBtns('s', [-10, -5, 5, 10])}</div></div>
            <div class="apm"><div class="aph"><span>XPDR</span><b class="mono" id="sqcur">—</b></div><div class="apk"><input class="num" id="sqin" inputmode="numeric" maxlength="4" placeholder="7000" aria-label="Código del transpondedor"><button class="btn" id="sqset">Squawk</button></div></div>
          </div>
          <div class="simdata" id="sdata"></div>
          <div class="simlog" id="slog" aria-live="polite"></div>
        </div>
      </div>`;
    const $ = q => VIEW.querySelector(q), $$ = q => Array.from(VIEW.querySelectorAll(q));
    const cMap = $('#smap'), cHud = $('#shud');
    let colors = {};
    const readColors = () => { const cs = getComputedStyle(document.documentElement); ['--inst-bg', '--inst-ring', '--inst-fg', '--inst-acc', '--inst-needle', '--radar-bg', '--radar-line', '--radar-fg', '--radar-rwy', '--ok', '--bad', '--muted'].forEach(k => colors[k.slice(2)] = cs.getPropertyValue(k).trim() || '#888'); };
    readColors();

    // ---------- log del instructor ----------
    function say(kind, text) {
      const box = $('#slog'); if (!box) return;
      const t = s ? mmss(s.t) : '0:00';
      const icon = { ok: '✓', warn: '!', bad: '✗', info: '·', tip: '→' }[kind] || '·';
      box.insertAdjacentHTML('beforeend', `<div class="lg ${kind}"><span class="mono">${t}</span><b>${icon}</b><span>${esc(text)}</span></div>`);
      box.scrollTop = box.scrollHeight; logN++;
    }

    // ---------- caso ----------
    function newCase(kind) {
      clearTimeout(nextTimer);
      const type = kind || (cfg.mode === 'cont' ? pick(Object.keys(TYPES)) : cfg.mode);
      const c = MAKERS[type]();
      s = makeState(c, { ac: cfg.ac, wind: +cfg.wind, windDir: rint(0, 35) * 10, events: cfg.events });
      ended = false; running = false; view = null;
      $('#slog').innerHTML = '';
      say('info', `${TYPES[type]} · ${s.acType.name}: ${c.brief} Transpondedor ${s.sq}.${s.wind.spd ? ` Viento ${H(s.wind.dir)}/${s.wind.spd} kt.` : ''}`);
      renderInstr(); setPause(false);
    }
    function renderInstr() {
      if (!s) return;
      const b = best[s.c.type];
      const score = cfg.mode === 'cont' ? `Continuo: <b>${cont.solved}</b> resueltos · <b>${cont.failed}</b> fallidos · <b>${cont.pts}</b> puntos${best.cont ? ` · récord ${best.cont}` : ''}` : (b ? `Mejor: ${b} puntos` : '');
      $('#sinstr').innerHTML = `<div class="sim-ih"><span class="eyebrow">${esc(TYPES[s.c.type])} · ${esc(s.acType.name)}</span><span class="small muted" id="sscore">${score}</span></div><div class="sim-clr">«${esc(s.c.brief)}»</div>${s.hint ? `<div class="small" style="margin-top:4px"><b>Pista:</b> ${esc(s.c.hint)}</div>` : ''}`;
    }
    function finish(r) {
      ended = true; running = false;
      const pts = r.ok ? Math.max(20, 100 - s.penal) : 0;
      say(r.ok ? 'ok' : 'bad', (r.ok ? 'Caso resuelto. ' : 'Caso fallido. ') + r.msg + (r.ok ? ` Puntos: ${pts}.` : ''));
      if (cfg.mode === 'cont') {
        if (r.ok) { cont.solved++; cont.pts += pts; } else cont.failed++;
        if (cont.pts > (best.cont || 0)) { best.cont = cont.pts; store.set('simBest', best); }
        say('info', 'Siguiente caso en 4 segundos…');
        nextTimer = setTimeout(() => { newCase(); setPause(true); }, 4000);
      } else if (r.ok && pts > (best[s.c.type] || 0)) { best[s.c.type] = pts; store.set('simBest', best); }
      $('#spause').textContent = cfg.mode === 'cont' ? '…' : '↻ Otro caso';
      renderInstr();
    }
    function setPause(run) {
      if (ended) { if (run && cfg.mode !== 'cont') { newCase(); setPause(true); } return; }
      running = run; $('#spause').textContent = run ? '❚❚ Pausa' : (s && s.t > 0 ? '▶ Seguir' : '▶ Empezar');
    }

    function loop(ts) {
      raf = requestAnimationFrame(loop);
      const real = last ? Math.min(0.1, (ts - last) / 1000) : 0; last = ts;
      if (s && running && !ended) {
        const r = advance(s, real * cfg.tscale, say);
        if (r) finish(r);
      }
      draw();
    }

    // ---------- dibujo ----------
    function fit(c) {
      const dpr = window.devicePixelRatio || 1, r = c.getBoundingClientRect();
      const w = Math.max(10, Math.round(r.width * dpr)), h = Math.max(10, Math.round(r.height * dpr));
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
      const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); return [ctx, r.width, r.height];
    }
    let view = null; // {cx, cy, sc}
    function drawMap() {
      const [g, W, Hh] = fit(cMap);
      g.fillStyle = colors['radar-bg']; g.fillRect(0, 0, W, Hh);
      if (!s) return;
      if (cfg.imc && !ended) { g.fillStyle = colors['radar-fg']; g.font = '600 15px ' + getComputedStyle(document.body).fontFamily; g.textAlign = 'center'; g.fillText('IMC · vuela solo con los instrumentos', W / 2, Hh / 2); g.font = '12px sans-serif'; g.fillText('El mapa se mostrará al terminar el caso', W / 2, Hh / 2 + 22); return; }
      const ac = s.ac, nav = s.nav, ref = nav.kind === 'vor' ? nav.st : nav.thr;
      const pts = [ac, ref]; if (s.c.draw.wps) pts.push(...s.c.draw.wps); if (s.c.draw.rwy) pts.push(placeOn(s.c.draw.rwy.thr, recip(s.c.draw.rwy.crs), 2)); if (s.c.draw.arc) { const a = s.c.draw.arc; pts.push(placeOn(a.st, a.target, a.A + 2), placeOn(a.st, a.r0, a.A + 2)); }
      if (s.c.draw.hold) { const hh = s.c.draw.hold; pts.push(placeOn(hh.st, recip(hh.inb), 4), placeOn(hh.st, hh.inb + (hh.right ? 90 : -90), 3), placeOn(hh.st, hh.inb - (hh.right ? 90 : -90), 2.5)); }
      let x0 = Math.min(...pts.map(p => p.x)), x1 = Math.max(...pts.map(p => p.x)), y0 = Math.min(...pts.map(p => p.y)), y1 = Math.max(...pts.map(p => p.y));
      const span = Math.max(6, (x1 - x0) * 1.25, (y1 - y0) * 1.25 * W / Hh);
      const target = { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, sc: W / span };
      if (!view) view = target; else { const k = 0.04; view.cx += (target.cx - view.cx) * k; view.cy += (target.cy - view.cy) * k; view.sc += (target.sc - view.sc) * k; }
      const X = p => W / 2 + (p.x - view.cx) * view.sc, Y = p => Hh / 2 - (p.y - view.cy) * view.sc;
      const line = (a, b, col, w, dash) => { g.strokeStyle = col; g.lineWidth = w; g.setLineDash(dash || []); g.beginPath(); g.moveTo(X(a), Y(a)); g.lineTo(X(b), Y(b)); g.stroke(); g.setLineDash([]); };
      g.font = '11px ' + 'IBM Plex Mono, monospace'; g.textAlign = 'left';
      // anillos y radiales
      g.strokeStyle = colors['radar-line']; g.lineWidth = 1;
      for (let r = 5; r <= 40; r += 5) { g.beginPath(); g.arc(X(ref), Y(ref), r * view.sc, 0, Math.PI * 2); g.stroke(); }
      for (let b = 0; b < 360; b += 30) { const p = placeOn(ref, b, 40); line(ref, p, colors['radar-line'], 1, [2, 6]); const q = placeOn(ref, b, Math.min(span * 0.42, 38)); g.fillStyle = colors['radar-line']; g.fillText(H(b), X(q) + 3, Y(q) - 3); }
      // ayudas
      const d = s.c.draw;
      if (cfg.help) {
        const acc = colors['inst-acc'];
        if (d.course) { const c = d.course; const far = placeOn(c.P, c.inbound ? recip(c.crs) : c.crs, 30); line(c.P, far, acc, 2, [8, 6]); }
        if (d.arc) { const a = d.arc; g.strokeStyle = acc; g.lineWidth = 2; g.setLineDash([6, 5]); g.beginPath(); g.arc(X(a.st), Y(a.st), a.A * view.sc, 0, Math.PI * 2); g.stroke(); g.setLineDash([]); }
        if (d.hold) { // circuito de 1 min a la TAS
          // tramos de 1 min a la TAS; diámetro del viraje estándar = 2 · TAS / (3°/s en rad)
          const hh = d.hold, L = s.ac.tas / 60, wdt = 2 * (s.ac.tas / 3600) / rad(3);
          const out = placeOn(hh.st, recip(hh.inb), L), sideB = hh.inb + (hh.right ? 90 : -90), b2 = placeOn(out, sideB, wdt);
          const m1 = placeOn(hh.st, sideB, wdt / 2), m2 = placeOn(out, sideB, wdt / 2), ang = b => rad(b - 90); // ángulos de canvas (y hacia abajo)
          g.strokeStyle = acc; g.lineWidth = 2; g.setLineDash([6, 5]); g.beginPath(); g.moveTo(X(out), Y(out)); g.lineTo(X(hh.st), Y(hh.st));
          g.arc(X(m1), Y(m1), wdt / 2 * view.sc, ang(sideB + 180), ang(sideB), !hh.right);
          g.lineTo(X(b2), Y(b2)); g.arc(X(m2), Y(m2), wdt / 2 * view.sc, ang(sideB), ang(sideB + 180), !hh.right);
          g.stroke(); g.setLineDash([]);
        }
        if (d.ils) { const i = d.ils; const far = placeOn(i.thr, recip(i.crs), 18); line(i.thr, far, acc, 2, [8, 6]); const f1p = placeOn(i.thr, recip(i.crs) + 3, 12), f2p = placeOn(i.thr, recip(i.crs) - 3, 12); line(i.thr, f1p, colors['radar-line'], 1); line(i.thr, f2p, colors['radar-line'], 1); }
      }
      // pista, puntos del GPS, fijos
      if (d.rwy) { const r = d.rwy, end = placeOn(r.thr, r.crs, 1.5); g.strokeStyle = colors['radar-rwy']; g.lineWidth = Math.max(3, 0.03 * view.sc); g.beginPath(); g.moveTo(X(r.thr), Y(r.thr)); g.lineTo(X(end), Y(end)); g.stroke(); }
      if (d.wps) {
        for (let i = 1; i < d.wps.length; i++) { const a = d.wps[i - 1], b = d.wps[i], act = i === s.leg; if (i > 1 || act) line(a, b, act ? colors['inst-needle'] : (cfg.help ? colors['inst-acc'] : colors['radar-line']), act ? 2.5 : 1.5, i === 1 ? [4, 4] : []); }
        g.fillStyle = colors['radar-fg']; d.wps.slice(1).forEach(w => { g.save(); g.translate(X(w), Y(w)); g.beginPath(); g.moveTo(0, -6); g.lineTo(5, 3); g.lineTo(-5, 3); g.closePath(); g.stroke(); g.restore(); g.fillText(w.id, X(w) + 8, Y(w) - 6); });
      }
      if (d.fixes) d.fixes.forEach(f => { g.fillStyle = colors['radar-fg']; g.fillRect(X(f.p) - 3, Y(f.p) - 3, 6, 6); g.fillText(f.id, X(f.p) + 6, Y(f.p) - 6); });
      if (nav.kind === 'gps') { /* sin estación */ }
      else if (nav.kind === 'ils') { const end = placeOn(nav.thr, nav.crs, 1.7); g.strokeStyle = colors['radar-rwy']; g.lineWidth = Math.max(3, 0.03 * view.sc); g.beginPath(); g.moveTo(X(nav.thr), Y(nav.thr)); g.lineTo(X(end), Y(end)); g.stroke(); g.fillStyle = colors['radar-fg']; g.fillText(nav.id, X(end) + 6, Y(end)); }
      else { const p = nav.st; g.strokeStyle = colors['radar-fg']; g.lineWidth = 2; g.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 3 * k; const xx = X(p) + 7 * Math.cos(a), yy = Y(p) + 7 * Math.sin(a); k ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.closePath(); g.stroke(); g.fillStyle = colors['radar-fg']; g.fillText(nav.st.id, X(p) + 10, Y(p) - 8); }
      // estela
      g.fillStyle = colors['radar-fg']; for (const [tx, ty] of s.trail) { g.fillRect(X({ x: tx }) - 1, Y({ y: ty }) - 1, 2, 2); }
      // avión
      const ax = X(ac), ay = Y(ac), hr = rad(ac.hdg);
      g.save(); g.translate(ax, ay); g.rotate(hr); g.fillStyle = colors['inst-needle']; g.beginPath(); g.moveTo(0, -11); g.lineTo(7, 8); g.lineTo(0, 4); g.lineTo(-7, 8); g.closePath(); g.fill(); g.restore();
      const vec = placeOn(ac, s.track, s.gs / 60); line(ac, vec, colors['inst-needle'], 1, [3, 3]);
      g.fillStyle = colors['radar-fg']; const right = ax > W - 120; g.textAlign = right ? 'right' : 'left'; g.fillText(`${Math.round(ac.alt / 100) * 100} ft · ${Math.round(ac.ias)} kt`, ax + (right ? -12 : 12), ay + 14); g.textAlign = 'left';
      // escala y viento
      g.fillStyle = colors['radar-fg']; g.textAlign = 'right'; const nm = view.sc >= 40 ? 1 : 5; g.fillRect(W - 14 - nm * view.sc, Hh - 16, nm * view.sc, 2); g.fillText(nm + ' NM', W - 14, Hh - 22);
      g.textAlign = 'left'; g.fillText('N ↑', 10, 18);
      if (s.wind.spd) g.fillText(`Viento ${H(s.wind.dir)}/${s.wind.spd}`, 10, 34);
    }
    // instrumentos
    function card(g, cx, cy, r, rot) {
      g.fillStyle = colors['inst-bg']; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill(); g.strokeStyle = colors['inst-ring']; g.lineWidth = 2; g.stroke();
      g.strokeStyle = colors['inst-fg']; g.fillStyle = colors['inst-fg']; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (let dd = 0; dd < 360; dd += 5) {
        const a = rad(dd - rot), big = dd % 30 === 0, mid = dd % 10 === 0, l = big ? 12 : mid ? 8 : 4;
        g.lineWidth = big ? 2 : 1; g.beginPath(); g.moveTo(cx + Math.sin(a) * (r - 2), cy - Math.cos(a) * (r - 2)); g.lineTo(cx + Math.sin(a) * (r - 2 - l), cy - Math.cos(a) * (r - 2 - l)); g.stroke();
        if (big) { g.save(); g.translate(cx + Math.sin(a) * (r - 22), cy - Math.cos(a) * (r - 22)); g.rotate(a); g.font = '600 11px IBM Plex Mono, monospace'; g.fillText({ 0: 'N', 90: 'E', 180: 'S', 270: 'W' }[dd] || String(dd / 10), 0, 0); g.restore(); }
      }
      g.fillStyle = colors['inst-needle']; g.beginPath(); g.moveTo(cx, cy - r + 1); g.lineTo(cx - 6, cy - r - 9); g.lineTo(cx + 6, cy - r - 9); g.closePath(); g.fill();
    }
    function bugMark(g, cx, cy, r, a) { g.save(); g.translate(cx, cy); g.rotate(rad(a)); g.fillStyle = '#f472b6'; g.fillRect(-6, -r + 1, 12, 6); g.restore(); }
    function label(g, cx, y, t) { g.fillStyle = colors['muted']; g.font = '11px IBM Plex Mono, monospace'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText(t, cx, y); }
    function devDots(g, cx, cy, sp, ang) { g.save(); g.translate(cx, cy); g.rotate(rad(ang)); g.strokeStyle = colors['inst-fg']; g.lineWidth = 1.5; for (const k of [-2, -1, 1, 2]) { g.beginPath(); g.arc(k * sp, 0, 3.5, 0, Math.PI * 2); g.stroke(); } g.restore(); }
    function gsScale(g, x, cy, sp, val, failed) {
      g.strokeStyle = colors['inst-fg']; g.lineWidth = 1.5; for (const k of [-2, -1, 1, 2]) { g.beginPath(); g.arc(x, cy + k * sp, 3, 0, Math.PI * 2); g.stroke(); }
      if (failed) { g.fillStyle = '#ef4444'; g.fillRect(x - 12, cy - 8, 24, 16); g.fillStyle = '#fff'; g.font = '700 10px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('GS', x, cy); return; }
      if (val == null) return; const y = cy - val * sp; g.fillStyle = '#f472b6'; g.beginPath(); g.moveTo(x - 8, y); g.lineTo(x, y - 6); g.lineTo(x + 8, y); g.lineTo(x, y + 6); g.closePath(); g.fill();
    }
    function toFrom(g, cx, cy, ang, to) { g.save(); g.translate(cx, cy); g.rotate(rad(ang)); g.fillStyle = colors['inst-fg']; g.beginPath(); if (to) { g.moveTo(32, -34); g.lineTo(25, -22); g.lineTo(39, -22); } else { g.moveTo(32, 34); g.lineTo(25, 22); g.lineTo(39, 22); } g.closePath(); g.fill(); g.restore(); }
    function drawHSI(c, n) {
      const [g, W] = fit(c); const cx = W / 2, cy = W / 2, r = W / 2 - 14;
      g.clearRect(0, 0, W, W + 30); card(g, cx, cy, r, s.ac.hdg); bugMark(g, cx, cy, r, s.turn);
      const crs = n.crs, a = crs - s.ac.hdg, sp = r * 0.2;
      g.save(); g.translate(cx, cy); g.rotate(rad(a)); g.strokeStyle = colors['inst-acc']; g.fillStyle = colors['inst-acc']; g.lineWidth = 5;
      g.beginPath(); g.moveTo(0, -r * 0.72); g.lineTo(0, -r * 0.5); g.moveTo(0, r * 0.5); g.lineTo(0, r * 0.78); g.stroke();
      g.beginPath(); g.moveTo(0, -r * 0.86); g.lineTo(-8, -r * 0.7); g.lineTo(8, -r * 0.7); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(n.dots * sp, -r * 0.46); g.lineTo(n.dots * sp, r * 0.46); g.stroke(); g.restore();
      devDots(g, cx, cy, sp, a); if (!n.ils) toFrom(g, cx, cy, a, n.to);
      plane(g, cx, cy);
      if (n.vert) gsScale(g, cx + r * 0.86, cy, r * 0.16, n.gs, s.gsFail);
      if (n.gps) gpsTag(g, 4, 4, n);
      label(g, cx, W + 18, `HSI · ${n.gps ? 'DTK' : 'CRS'} ${H(crs)} · HDG ${H(s.ac.hdg)}`);
    }
    // indicador del modo del GPS (RUTA/TERMINAL/APPROACH) y su escala, en la esquina del instrumento
    function gpsTag(g, x, y, n) { const t = `GPS ${n.mode} ±${String(n.fs).replace('.', ',')}`; g.font = '700 10px IBM Plex Mono, monospace'; const w = g.measureText(t).width + 8; g.fillStyle = '#d946ef'; g.fillRect(x, y, w, 15); g.fillStyle = '#fff'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(t, x + 4, y + 8); }
    function plane(g, cx, cy) { g.strokeStyle = colors['inst-needle']; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy - 10); g.lineTo(cx, cy + 12); g.moveTo(cx - 14, cy); g.lineTo(cx + 14, cy); g.moveTo(cx - 6, cy + 11); g.lineTo(cx + 6, cy + 11); g.stroke(); }
    function drawDG(c) { const [g, W] = fit(c); const cx = W / 2, cy = W / 2, r = W / 2 - 14; g.clearRect(0, 0, W, W + 30); card(g, cx, cy, r, s.ac.hdg); bugMark(g, cx, cy, r, s.turn); plane(g, cx, cy); label(g, cx, W + 18, `DG · HDG ${H(s.ac.hdg)} · bug ${H(s.ac.hdg + s.turn)}`); }
    function drawCDI(c, n) {
      const [g, W] = fit(c); const cx = W / 2, cy = W / 2, r = W / 2 - 14, sp = r * 0.2;
      g.clearRect(0, 0, W, W + 30); const crs = n.crs; card(g, cx, cy, r, n.gps ? n.crs : s.obs); // con GPS la rosa sigue la DTK
      devDots(g, cx, cy, sp, 0);
      g.strokeStyle = colors['inst-acc']; g.lineWidth = 4; g.beginPath(); g.moveTo(cx + n.dots * sp, cy - r * 0.55); g.lineTo(cx + n.dots * sp, cy + r * 0.55); g.stroke();
      if (n.vert) { g.strokeStyle = colors['inst-acc']; const gy = cy - (n.gs || 0) * sp; if (!s.gsFail && n.gs != null) { g.beginPath(); g.moveTo(cx - r * 0.55, gy); g.lineTo(cx + r * 0.55, gy); g.stroke(); } gsScale(g, cx + r * 0.78, cy, sp, null, s.gsFail); }
      if (n.gps) gpsTag(g, 4, 4, n);
      if (n.ils || n.gps) { /* sin TO/FROM: la aguja no depende del OBS */ }
      else { g.fillStyle = colors['inst-fg']; g.fillRect(cx + 18, n.to ? cy - 34 : cy + 16, 38, 18); g.fillStyle = colors['inst-bg']; g.font = '700 11px IBM Plex Mono, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(n.to ? 'TO' : 'FROM', cx + 37, n.to ? cy - 25 : cy + 25); }
      label(g, cx, W + 18, n.ils ? `CDI · LOC ${H(crs)} (OBS ${H(s.obs)})` : n.gps ? `CDI · GPS DTK ${H(crs)}` : `CDI · OBS ${H(s.obs)}`);
    }
    function drawRMI(c, n) {
      const [g, W] = fit(c); const cx = W / 2, cy = W / 2, r = W / 2 - 14;
      g.clearRect(0, 0, W, W + 30); card(g, cx, cy, r, s.ac.hdg);
      const a = rad(n.brg - s.ac.hdg);
      g.strokeStyle = colors['inst-acc']; g.fillStyle = colors['inst-acc']; g.lineWidth = 4; g.beginPath(); g.moveTo(cx - Math.sin(a) * (r - 30), cy + Math.cos(a) * (r - 30)); g.lineTo(cx + Math.sin(a) * (r - 40), cy - Math.cos(a) * (r - 40)); g.stroke();
      g.save(); g.translate(cx, cy); g.rotate(a); g.beginPath(); g.moveTo(0, -(r - 26)); g.lineTo(-8, -(r - 44)); g.lineTo(8, -(r - 44)); g.closePath(); g.fill(); g.restore();
      g.fillStyle = colors['inst-fg']; g.beginPath(); g.arc(cx, cy, 5, 0, Math.PI * 2); g.fill();
      label(g, cx, W + 18, `RMI · ${n.gps ? 'GPS ' + n.wp : n.ils ? s.nav.id : s.nav.st.id}`);
    }
    let dataT = 0;
    const canDraw = !!(cMap.getContext && cMap.getContext('2d')); // sin canvas (p. ej. jsdom) solo se actualizan los datos
    function draw() {
      if (canDraw) drawMap();
      if (!s) return;
      const n = readNav(s);
      if (canDraw) { if (cfg.inst === 'hsi') drawHSI($('#ci1'), n); else { drawDG($('#ci0')); drawCDI($('#ci1'), n); } drawRMI($('#ci2'), n); }
      const now = performance.now(); if (now - dataT < 150) return; dataT = now;
      const ch = s.chrono, ct = ch.acc + (ch.st === 'run' ? s.t - ch.t0 : 0);
      $('#schrono').textContent = '⏱ ' + mmss(ct); $('#schrono').dataset.st = ch.st;
      $('#vhdg').textContent = H(s.ac.hdg + s.turn); $('#vcrs').textContent = H(n.crs) + (n.ils ? ' LOC' : n.gps ? ' GPS' : ''); $('#valt').textContent = s.altTarget.toLocaleString('es-ES');
      $('#vvs').textContent = s.vsSel; $('#vias').textContent = s.iasSel; $('#sqcur').textContent = s.sq;
      const vsTxt = s.vs ? (s.vs > 0 ? '+' : '') + Math.round(s.vs) : '0';
      const bank = Math.abs(s.turn) > 0.3 ? R.bankStdTurn(s.ac.tas) : 0;
      $('#sdata').innerHTML = [[n.gps ? 'GPS ' + n.wp : 'DME', fmt1(n.dme) + ' NM'], ['IAS', Math.round(s.ac.ias) + ' kt'], ['TAS · GS', Math.round(s.ac.tas) + ' · ' + Math.round(s.gs)], ['ALT', Math.round(s.ac.alt).toLocaleString('es-ES') + ' ft'], ['V/S', vsTxt + ' ft/min'], ['HDG · TRK', H(s.ac.hdg) + ' · ' + H(s.track)], ['Alabeo', bank ? bank + '°' : '0°'], ['Viento', s.wind.spd ? H(s.wind.dir) + '/' + s.wind.spd : 'calma'], ['Tiempo', mmss(s.t)]]
        .map(([k, v]) => `<div><span>${k}</span><b class="mono">${v}</b></div>`).join('');
      cHud.textContent = ended ? '' : (running ? '' : (s.t ? 'PAUSA' : 'Pulsa Empezar (espacio)'));
    }

    // ---------- mandos ----------
    const turnBy = dlt => { if (s && !ended) s.turn += dlt; };
    const setHdg = (target, dir) => { if (!s) return; const h = s.ac.hdg; let d = n180(target - h); if (dir === 'R' && d < 0) d += 360; if (dir === 'L' && d > 0) d -= 360; s.turn = d; };
    const obsBy = dlt => { if (s) s.obs = norm(s.obs + dlt); };
    const altBy = dlt => { if (s) s.altTarget = clamp(s.altTarget + dlt, 0, 20000); };
    const vsBy = dlt => { if (s) s.vsSel = clamp(s.vsSel + dlt, 100, 2000); };
    const spdBy = dlt => { if (s) s.iasSel = clamp(s.iasSel + dlt, s.acType.min, s.acType.max); };
    const squawk = () => { const v = ($('#sqin').value || '').trim(); if (!/^[0-7]{4}$/.test(v)) { say('tip', 'El código del transpondedor son cuatro cifras del 0 al 7.'); return; } if (s) { s.sq = v; say('info', `Transpondedor ${v}.`); } $('#sqin').value = ''; $('#sqin').blur(); };
    function chrono() { if (!s) return; const c = s.chrono; if (c.st === 'off') { c.st = 'run'; c.t0 = s.t; c.acc = 0; } else if (c.st === 'run') { c.acc += s.t - c.t0; c.st = 'stop'; } else { c.st = 'off'; c.acc = 0; } }
    $$('[data-h]').forEach(b => b.onclick = () => turnBy(+b.dataset.h));
    $$('[data-o]').forEach(b => b.onclick = () => obsBy(+b.dataset.o));
    $$('[data-a]').forEach(b => b.onclick = () => altBy(+b.dataset.a));
    $$('[data-v]').forEach(b => b.onclick = () => vsBy(+b.dataset.v));
    $$('[data-s]').forEach(b => b.onclick = () => spdBy(+b.dataset.s));
    $('#sqset').onclick = squawk; $('#sqin').onkeydown = e => { if (e.key === 'Enter') squawk(); };
    $$('[data-dir]').forEach(b => b.onclick = () => { const v = parseInt($('#hin').value, 10); if (!isNaN(v)) setHdg(v % 360, b.dataset.dir); });
    $('#hin').onkeydown = e => { if (e.key === 'Enter') { const v = parseInt(e.target.value, 10); if (!isNaN(v)) setHdg(v % 360, 'S'); e.target.blur(); } };
    $('#oin').onkeydown = e => { if (e.key === 'Enter') { const v = parseInt(e.target.value, 10); if (!isNaN(v) && s) s.obs = norm(v); e.target.blur(); } };
    $('#oin').onchange = e => { const v = parseInt(e.target.value, 10); if (!isNaN(v) && s) s.obs = norm(v); };
    $('#spause').onclick = () => setPause(!running);
    $('#snew').onclick = () => { newCase(); };
    $('#shint').onclick = () => { if (s && !s.hint) { s.hint = true; s.penal += 10; renderInstr(); say('tip', s.c.hint); } };
    $('#schrono').onclick = chrono;
    $$('#smode button').forEach(b => b.onclick = () => { cfg.mode = b.dataset.k; saveCfg(); $$('#smode button').forEach(x => x.setAttribute('aria-pressed', x === b)); cont.solved = cont.failed = cont.pts = 0; newCase(); });
    $$('#sinst button').forEach(b => b.onclick = () => { cfg.inst = b.dataset.k; saveCfg(); $$('#sinst button').forEach(x => x.setAttribute('aria-pressed', x === b)); $('#sinstbox').innerHTML = instHTML(); $('#sinstbox').dataset.n = cfg.inst === 'hsi' ? 2 : 3; });
    const menu = $('#smenu'), optBtn = $('#sopt');
    const setMenu = open => { menu.hidden = !open; optBtn.setAttribute('aria-expanded', open); };
    optBtn.onclick = e => { e.stopPropagation(); setMenu(menu.hidden); };
    const onDocClick = e => { if (!menu.hidden && !e.target.closest('.sim-opts')) setMenu(false); };
    document.addEventListener('click', onDocClick);
    $$('#sts button').forEach(b => b.onclick = () => { cfg.tscale = +b.dataset.k; saveCfg(); $$('#sts button').forEach(x => x.setAttribute('aria-pressed', x === b)); });
    $('#swind').onchange = e => { cfg.wind = +e.target.value; saveCfg(); say('info', 'El viento se aplica desde el próximo caso.'); };
    $('#sac').onchange = e => { cfg.ac = e.target.value; saveCfg(); if (s && s.t === 0) newCase(s.c.type); else say('info', 'El avión cambia desde el próximo caso.'); };
    $('#sevt').onchange = e => { cfg.events = e.target.checked; saveCfg(); say('info', cfg.events ? 'Eventos activados desde el próximo caso: fallos de comunicaciones e instrucciones del ATC.' : 'Eventos desactivados desde el próximo caso.'); };
    $('#shelp').onchange = e => { cfg.help = e.target.checked; saveCfg(); };
    $('#simc').onchange = e => { cfg.imc = e.target.checked; saveCfg(); };
    function onKey(e) {
      if (e.target.closest('input,select,textarea')) return;
      const k = e.key, sh = e.shiftKey; let used = true;
      if (k === 'ArrowLeft') turnBy(sh ? -1 : -5); else if (k === 'ArrowRight') turnBy(sh ? 1 : 5);
      else if (k === 'ArrowUp') sh ? vsBy(100) : altBy(100); else if (k === 'ArrowDown') sh ? vsBy(-100) : altBy(-100);
      else if (k === 'q' || k === 'Q') spdBy(sh ? -10 : -5); else if (k === 'w' || k === 'W') spdBy(sh ? 10 : 5);
      else if (k === 'z' || k === 'Z') obsBy(sh ? -10 : -1); else if (k === 'x' || k === 'X') obsBy(sh ? 10 : 1);
      else if (k === 't' || k === 'T') chrono(); else if (k === ' ') setPause(!running);
      else if (k === 'n' || k === 'N') newCase(); else if ('1234'.includes(k) && k.length === 1) { $$('#sts button')['1234'.indexOf(k)].click(); }
      else used = false;
      if (used) e.preventDefault();
    }
    document.addEventListener('keydown', onKey);
    const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null; const onMq = () => readColors(); if (mq && mq.addEventListener) mq.addEventListener('change', onMq);
    newCase(cfg.mode === 'cont' ? null : cfg.mode); setPause(false);
    raf = requestAnimationFrame(loop);
    $('#sinstbox').dataset.n = cfg.inst === 'hsi' ? 2 : 3;
    // alto disponible: lo que queda por debajo de la cabecera (la barra superior en móvil/tablet)
    const simEl = $('#sim'), sizeVar = () => simEl.style.setProperty('--simtop', Math.max(0, simEl.getBoundingClientRect().top + window.scrollY) + 'px');
    sizeVar(); window.addEventListener('resize', sizeVar);
    return function destroy() { window.removeEventListener('resize', sizeVar); document.body.classList.remove('simmode'); document.removeEventListener('click', onDocClick); cancelAnimationFrame(raf); clearTimeout(nextTimer); document.removeEventListener('keydown', onKey); if (mq && mq.removeEventListener) mq.removeEventListener('change', onMq); };
  }

  const API = { mount, readNav, lineDev, MAKERS, TYPES, SIM_AC, makeState, physStep, advance, bearing, dist, placeOn };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.P2_SIM = API;
})(typeof window !== 'undefined' ? window : globalThis);
