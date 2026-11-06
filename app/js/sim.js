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
        gs: s.gsFail || behind ? null : clamp(-(elev - 3) / 0.35, -2.5, 2.5), gsDev: elev - 3, ils: true };
    }
    const st = nav.st, d = lineDev(ac, st, s.obs);
    return { dots: clamp(-d.ang / 5, -2.5, 2.5), angDev: d.ang, to: !d.from, dme: dist(ac, st), brg: bearing(ac, st), radial: bearing(st, ac), gs: null, ils: false };
  }

  // ---------- casos ----------
  const VORS = R.VORS;
  const TYPES = {
    inb: 'Radial en acercamiento', outb: 'Radial en alejamiento', hold: 'Espera', arc: 'Arco DME', ils: 'Aproximación ILS'
  };
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
    const entry = R.holdEntry(h, inb, right), alt = pick([4000, 5000, 6000]);
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
    let phase = 'app', minD = 99, tFix = 0, judged = false, estT = null, turned = 0, prevH = null, obsWarned = false, altWarn = 0, stable = 0;
    const names = { directa: 'directa', paralela: 'paralela', gota: 'en gota' };
    return (s, n, dt, say) => {
      if (!obsWarned && s.t > 25 && diff(s.obs, o.inb) > 2) { obsWarned = true; say('tip', `Pon ${H(o.inb)} (curso de acercamiento) en el OBS.`); }
      if (Math.abs(s.ac.alt - s.altAssigned) > 300 && s.t - altWarn > 60) { altWarn = s.t; say('warn', `Mantén ${s.altAssigned.toLocaleString('es-ES')} ft en la espera.`); }
      const d = n.dme;
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
      type: 'ils', title: `ILS pista ${rwy}`, nav: { kind: 'ils', id, thr, loc, gsRef, crs }, ac: { x: pos.x, y: pos.y, hdg, alt }, altAssigned: alt, obs: crs, gsFail: false, gsFailPlan: gsFail,
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
  const MAKERS = { inb: () => caseRadial(true), outb: () => caseRadial(false), hold: caseHold, arc: caseArc, ils: caseILS };

  // ---------- estado y física ----------
  function makeState(c, opt) {
    const s = { c, t: 0, ac: Object.assign({ tas: opt.tas || 120 }, c.ac), turn: 0, vs: 0, vsSel: 600, altTarget: c.altAssigned, altAssigned: c.altAssigned,
      obs: c.obs, nav: c.nav, gsFail: false, penal: 0, hint: false, trail: [], trailT: 0, wind: { dir: opt.windDir || 0, spd: opt.wind || 0 },
      chrono: { st: 'off', t0: 0, acc: 0 }, track: c.ac.hdg, gs: opt.tas || 120 };
    s.hdgStart = s.ac.hdg; s.ev = c.ev; return s;
  }
  function physStep(s, dt) {
    const ac = s.ac;
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
    while (dt > 1e-6) { const h = Math.min(0.25, dt); dt -= h; physStep(s, h); const r = s.ev(s, readNav(s), h, say); if (r) return r; }
    return null;
  }

  // ---------- montaje ----------
  function mount(VIEW, deps) {
    const store = deps.store;
    const cfg = Object.assign({ mode: 'inb', inst: 'hsi', wind: 0, speed: 120, help: true, imc: false, tscale: 2 }, store.get('sim', {}));
    const saveCfg = () => store.set('sim', cfg);
    const best = store.get('simBest', {});
    let s = null, raf = 0, last = 0, running = false, ended = false, logN = 0, nextTimer = 0;
    const cont = { solved: 0, failed: 0, pts: 0 };

    VIEW.innerHTML = `<div class="view-head"><div><div class="eyebrow">Simulador IFR · ${Object.keys(TYPES).length} tipos de caso</div><h1>Simulador</h1>
        <p>Tu avión visto desde arriba con los instrumentos básicos. Sigue la instrucción, vuela con el rumbo seleccionado, el OBS y la altitud, y atiende al instructor.</p></div></div>
      <div class="sim-top">
        <div class="seg" id="smode">${Object.entries(TYPES).map(([k, l]) => `<button data-k="${k}" aria-pressed="${cfg.mode === k}">${l.replace('Radial en ', 'Radial · ').replace('Aproximación ', '')}</button>`).join('')}<button data-k="cont" aria-pressed="${cfg.mode === 'cont'}">Continuo</button></div>
        <div class="row small">
          <div class="seg" id="sinst"><button data-k="hsi" aria-pressed="${cfg.inst === 'hsi'}">HSI</button><button data-k="cdi" aria-pressed="${cfg.inst === 'cdi'}">DG + CDI</button></div>
          <label class="chip">Viento <select id="swind">${[[0, 'sin'], [10, 'suave'], [20, 'moderado']].map(([v, l]) => `<option value="${v}" ${cfg.wind == v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <label class="chip">TAS <select id="sspd">${[90, 120, 150].map(v => `<option ${cfg.speed == v ? 'selected' : ''}>${v}</option>`).join('')}</select> kt</label>
          <label class="chip"><input type="checkbox" id="shelp" ${cfg.help ? 'checked' : ''}> Ayudas en el mapa</label>
          <label class="chip"><input type="checkbox" id="simc" ${cfg.imc ? 'checked' : ''}> Ocultar mapa (IMC)</label>
        </div>
      </div>
      <div class="simgrid">
        <div class="simleft">
          <div class="sim-instr" id="sinstr"></div>
          <div class="simmap"><canvas id="smap"></canvas><div class="sim-hud" id="shud"></div></div>
          <div class="sim-ctl">
            <div class="row"><button class="btn" id="spause">▶ Empezar</button>
              <div class="seg" id="sts">${[1, 2, 4, 8].map(v => `<button data-k="${v}" aria-pressed="${cfg.tscale === v}">${v}×</button>`).join('')}</div>
              <button class="btn" id="snew">Nuevo caso</button><button class="btn ghost" id="shint">Pista (−10)</button>
              <button class="btn sim-chrono" id="schrono" title="Cronómetro (T): inicia, para y pone a cero">⏱ 0:00</button></div>
            <details class="help small"><summary>Teclado</summary><p class="muted" style="margin:6px 0 0">← → rumbo seleccionado ±5° (Mayús ±1°; el avión vira hacia el lado al que mueves el selector) · Z / X OBS ∓1° (Mayús ±10°) · ↑ ↓ altitud ±100 ft · Mayús ↑ ↓ régimen ±100 ft/min · T cronómetro · Espacio pausa · 1–4 velocidad · N nuevo caso</p></details>
          </div>
          <div class="simlog" id="slog" aria-live="polite"></div>
          <div class="small muted" id="sscore"></div>
        </div>
        <div class="simright">
          <div class="siminst">${cfg.inst === 'hsi' ? '<canvas id="ci1"></canvas>' : '<canvas id="ci0"></canvas><canvas id="ci1"></canvas>'}<canvas id="ci2"></canvas></div>
          <div class="simdata" id="sdata"></div>
          <div class="simknobs">
            <div><span class="eyebrow">Rumbo</span><div class="row"><button class="btn" data-h="-10">−10</button><button class="btn" data-h="-1">−1</button><input class="num" id="hin" inputmode="numeric" placeholder="000"><button class="btn" data-h="1">+1</button><button class="btn" data-h="10">+10</button></div>
              <div class="row" style="margin-top:4px"><button class="btn" data-dir="L">◀ por la izquierda</button><button class="btn" data-dir="S">el más corto</button><button class="btn" data-dir="R">por la derecha ▶</button></div></div>
            <div><span class="eyebrow">OBS / curso</span><div class="row"><button class="btn" data-o="-10">−10</button><button class="btn" data-o="-1">−1</button><input class="num" id="oin" inputmode="numeric" placeholder="000"><button class="btn" data-o="1">+1</button><button class="btn" data-o="10">+10</button></div></div>
            <div><span class="eyebrow">Altitud · régimen</span><div class="row"><button class="btn" data-a="-100">−100 ft</button><button class="btn" data-a="100">+100 ft</button><button class="btn" data-v="-100">−100 fpm</button><button class="btn" data-v="100">+100 fpm</button></div></div>
          </div>
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
      s = makeState(c, { tas: cfg.speed, wind: +cfg.wind, windDir: rint(0, 35) * 10 });
      ended = false; running = false; view = null;
      $('#slog').innerHTML = '';
      say('info', `${TYPES[type]}: ${c.brief}${s.wind.spd ? ` Viento ${H(s.wind.dir)}/${s.wind.spd} kt.` : ''}`);
      renderInstr(); setPause(false);
    }
    function renderInstr() {
      if (!s) return;
      $('#sinstr').innerHTML = `<span class="eyebrow">${esc(TYPES[s.c.type])}${cfg.mode === 'cont' ? ' · modo continuo' : ''}</span><div class="sim-clr">«${esc(s.c.brief)}»</div>${s.hint ? `<div class="small" style="margin-top:4px"><b>Pista:</b> ${esc(s.c.hint)}</div>` : ''}`;
      const b = best[s.c.type];
      $('#sscore').innerHTML = cfg.mode === 'cont' ? `Continuo: <b>${cont.solved}</b> resueltos · <b>${cont.failed}</b> fallidos · <b>${cont.pts}</b> puntos${best.cont ? ` · récord ${best.cont}` : ''}` : (b ? `Mejor puntuación en este tipo: ${b}` : '');
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
      const ac = s.ac, nav = s.nav, ref = nav.kind === 'ils' ? nav.thr : nav.st;
      const pts = [ac, ref]; if (s.c.draw.arc) { const a = s.c.draw.arc; pts.push(placeOn(a.st, a.target, a.A + 2), placeOn(a.st, a.r0, a.A + 2)); }
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
      // pista / estación
      if (nav.kind === 'ils') { const end = placeOn(nav.thr, nav.crs, 1.7); g.strokeStyle = colors['radar-rwy']; g.lineWidth = Math.max(3, 0.03 * view.sc); g.beginPath(); g.moveTo(X(nav.thr), Y(nav.thr)); g.lineTo(X(end), Y(end)); g.stroke(); g.fillStyle = colors['radar-fg']; g.fillText(nav.id, X(end) + 6, Y(end)); }
      else { const p = nav.st; g.strokeStyle = colors['radar-fg']; g.lineWidth = 2; g.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 3 * k; const xx = X(p) + 7 * Math.cos(a), yy = Y(p) + 7 * Math.sin(a); k ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.closePath(); g.stroke(); g.fillStyle = colors['radar-fg']; g.fillText(nav.st.id, X(p) + 10, Y(p) - 8); }
      // estela
      g.fillStyle = colors['radar-fg']; for (const [tx, ty] of s.trail) { g.fillRect(X({ x: tx }) - 1, Y({ y: ty }) - 1, 2, 2); }
      // avión
      const ax = X(ac), ay = Y(ac), hr = rad(ac.hdg);
      g.save(); g.translate(ax, ay); g.rotate(hr); g.fillStyle = colors['inst-needle']; g.beginPath(); g.moveTo(0, -11); g.lineTo(7, 8); g.lineTo(0, 4); g.lineTo(-7, 8); g.closePath(); g.fill(); g.restore();
      const vec = placeOn(ac, s.track, s.gs / 60); line(ac, vec, colors['inst-needle'], 1, [3, 3]);
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
      const crs = n.ils ? s.nav.crs : s.obs, a = crs - s.ac.hdg, sp = r * 0.2;
      g.save(); g.translate(cx, cy); g.rotate(rad(a)); g.strokeStyle = colors['inst-acc']; g.fillStyle = colors['inst-acc']; g.lineWidth = 5;
      g.beginPath(); g.moveTo(0, -r * 0.72); g.lineTo(0, -r * 0.5); g.moveTo(0, r * 0.5); g.lineTo(0, r * 0.78); g.stroke();
      g.beginPath(); g.moveTo(0, -r * 0.86); g.lineTo(-8, -r * 0.7); g.lineTo(8, -r * 0.7); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(n.dots * sp, -r * 0.46); g.lineTo(n.dots * sp, r * 0.46); g.stroke(); g.restore();
      devDots(g, cx, cy, sp, a); if (!n.ils) toFrom(g, cx, cy, a, n.to);
      plane(g, cx, cy);
      if (n.ils) gsScale(g, cx + r * 0.86, cy, r * 0.16, n.gs, s.gsFail);
      label(g, cx, W + 18, `HSI · CRS ${H(crs)} · HDG ${H(s.ac.hdg)}`);
    }
    function plane(g, cx, cy) { g.strokeStyle = colors['inst-needle']; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy - 10); g.lineTo(cx, cy + 12); g.moveTo(cx - 14, cy); g.lineTo(cx + 14, cy); g.moveTo(cx - 6, cy + 11); g.lineTo(cx + 6, cy + 11); g.stroke(); }
    function drawDG(c) { const [g, W] = fit(c); const cx = W / 2, cy = W / 2, r = W / 2 - 14; g.clearRect(0, 0, W, W + 30); card(g, cx, cy, r, s.ac.hdg); bugMark(g, cx, cy, r, s.turn); plane(g, cx, cy); label(g, cx, W + 18, `DG · HDG ${H(s.ac.hdg)} · bug ${H(s.ac.hdg + s.turn)}`); }
    function drawCDI(c, n) {
      const [g, W] = fit(c); const cx = W / 2, cy = W / 2, r = W / 2 - 14, sp = r * 0.2;
      g.clearRect(0, 0, W, W + 30); const crs = n.ils ? s.nav.crs : s.obs; card(g, cx, cy, r, s.obs);
      devDots(g, cx, cy, sp, 0);
      g.strokeStyle = colors['inst-acc']; g.lineWidth = 4; g.beginPath(); g.moveTo(cx + n.dots * sp, cy - r * 0.55); g.lineTo(cx + n.dots * sp, cy + r * 0.55); g.stroke();
      if (n.ils) { g.strokeStyle = s.gsFail ? 'transparent' : colors['inst-acc']; const gy = cy - (n.gs || 0) * sp; if (!s.gsFail && n.gs != null) { g.beginPath(); g.moveTo(cx - r * 0.55, gy); g.lineTo(cx + r * 0.55, gy); g.stroke(); } gsScale(g, cx + r * 0.78, cy, sp, null, s.gsFail); }
      else { g.fillStyle = colors['inst-fg']; g.fillRect(cx + 18, n.to ? cy - 34 : cy + 16, 38, 18); g.fillStyle = colors['inst-bg']; g.font = '700 11px IBM Plex Mono, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(n.to ? 'TO' : 'FROM', cx + 37, n.to ? cy - 25 : cy + 25); }
      label(g, cx, W + 18, n.ils ? `CDI · LOC ${H(crs)} (OBS ${H(s.obs)})` : `CDI · OBS ${H(s.obs)}`);
    }
    function drawRMI(c, n) {
      const [g, W] = fit(c); const cx = W / 2, cy = W / 2, r = W / 2 - 14;
      g.clearRect(0, 0, W, W + 30); card(g, cx, cy, r, s.ac.hdg);
      const a = rad(n.brg - s.ac.hdg);
      g.strokeStyle = colors['inst-acc']; g.fillStyle = colors['inst-acc']; g.lineWidth = 4; g.beginPath(); g.moveTo(cx - Math.sin(a) * (r - 30), cy + Math.cos(a) * (r - 30)); g.lineTo(cx + Math.sin(a) * (r - 40), cy - Math.cos(a) * (r - 40)); g.stroke();
      g.save(); g.translate(cx, cy); g.rotate(a); g.beginPath(); g.moveTo(0, -(r - 26)); g.lineTo(-8, -(r - 44)); g.lineTo(8, -(r - 44)); g.closePath(); g.fill(); g.restore();
      g.fillStyle = colors['inst-fg']; g.beginPath(); g.arc(cx, cy, 5, 0, Math.PI * 2); g.fill();
      label(g, cx, W + 18, `RMI · ${n.ils ? s.nav.id : s.nav.st.id}`);
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
      const vsTxt = s.vs ? (s.vs > 0 ? '+' : '') + Math.round(s.vs) : '0';
      $('#sdata').innerHTML = [['DME', fmt1(n.dme) + ' NM'], ['GS', Math.round(s.gs) + ' kt'], ['TAS', s.ac.tas + ' kt'], ['ALT', Math.round(s.ac.alt).toLocaleString('es-ES') + ' ft'], ['ALT SEL', s.altTarget.toLocaleString('es-ES') + ' ft'], ['V/S', vsTxt + ' · sel ' + s.vsSel], ['HDG', H(s.ac.hdg) + ' → ' + H(s.ac.hdg + s.turn)], ['TRK', H(s.track)], [n.ils ? 'LOC' : 'OBS', H(n.ils ? s.nav.crs : s.obs)], ['Tiempo', mmss(s.t)]]
        .map(([k, v]) => `<div><span>${k}</span><b class="mono">${v}</b></div>`).join('');
      cHud.textContent = ended ? '' : (running ? '' : (s.t ? 'PAUSA' : 'Pulsa Empezar (espacio)'));
    }

    // ---------- mandos ----------
    const turnBy = dlt => { if (s && !ended) s.turn += dlt; };
    const setHdg = (target, dir) => { if (!s) return; const h = s.ac.hdg; let d = n180(target - h); if (dir === 'R' && d < 0) d += 360; if (dir === 'L' && d > 0) d -= 360; s.turn = d; };
    const obsBy = dlt => { if (s) s.obs = norm(s.obs + dlt); };
    const altBy = dlt => { if (s) s.altTarget = clamp(s.altTarget + dlt, 0, 20000); };
    const vsBy = dlt => { if (s) s.vsSel = clamp(s.vsSel + dlt, 100, 2000); };
    function chrono() { if (!s) return; const c = s.chrono; if (c.st === 'off') { c.st = 'run'; c.t0 = s.t; c.acc = 0; } else if (c.st === 'run') { c.acc += s.t - c.t0; c.st = 'stop'; } else { c.st = 'off'; c.acc = 0; } }
    $$('[data-h]').forEach(b => b.onclick = () => turnBy(+b.dataset.h));
    $$('[data-o]').forEach(b => b.onclick = () => obsBy(+b.dataset.o));
    $$('[data-a]').forEach(b => b.onclick = () => altBy(+b.dataset.a));
    $$('[data-v]').forEach(b => b.onclick = () => vsBy(+b.dataset.v));
    $$('[data-dir]').forEach(b => b.onclick = () => { const v = parseInt($('#hin').value, 10); if (!isNaN(v)) setHdg(v % 360, b.dataset.dir); });
    $('#hin').onkeydown = e => { if (e.key === 'Enter') { const v = parseInt(e.target.value, 10); if (!isNaN(v)) setHdg(v % 360, 'S'); e.target.blur(); } };
    $('#oin').onkeydown = e => { if (e.key === 'Enter') { const v = parseInt(e.target.value, 10); if (!isNaN(v) && s) s.obs = norm(v); e.target.blur(); } };
    $('#oin').onchange = e => { const v = parseInt(e.target.value, 10); if (!isNaN(v) && s) s.obs = norm(v); };
    $('#spause').onclick = () => setPause(!running);
    $('#snew').onclick = () => { newCase(); };
    $('#shint').onclick = () => { if (s && !s.hint) { s.hint = true; s.penal += 10; renderInstr(); say('tip', s.c.hint); } };
    $('#schrono').onclick = chrono;
    $$('#smode button').forEach(b => b.onclick = () => { cfg.mode = b.dataset.k; saveCfg(); $$('#smode button').forEach(x => x.setAttribute('aria-pressed', x === b)); cont.solved = cont.failed = cont.pts = 0; newCase(); });
    $$('#sinst button').forEach(b => b.onclick = () => { cfg.inst = b.dataset.k; saveCfg(); $$('#sinst button').forEach(x => x.setAttribute('aria-pressed', x === b)); $('.siminst').innerHTML = (cfg.inst === 'hsi' ? '<canvas id="ci1"></canvas>' : '<canvas id="ci0"></canvas><canvas id="ci1"></canvas>') + '<canvas id="ci2"></canvas>'; });
    $$('#sts button').forEach(b => b.onclick = () => { cfg.tscale = +b.dataset.k; saveCfg(); $$('#sts button').forEach(x => x.setAttribute('aria-pressed', x === b)); });
    $('#swind').onchange = e => { cfg.wind = +e.target.value; saveCfg(); say('info', 'El viento se aplica desde el próximo caso.'); };
    $('#sspd').onchange = e => { cfg.speed = +e.target.value; saveCfg(); if (s && s.t === 0) s.ac.tas = cfg.speed; else say('info', 'La velocidad se aplica desde el próximo caso.'); };
    $('#shelp').onchange = e => { cfg.help = e.target.checked; saveCfg(); };
    $('#simc').onchange = e => { cfg.imc = e.target.checked; saveCfg(); };
    function onKey(e) {
      if (e.target.closest('input,select,textarea')) return;
      const k = e.key, sh = e.shiftKey; let used = true;
      if (k === 'ArrowLeft') turnBy(sh ? -1 : -5); else if (k === 'ArrowRight') turnBy(sh ? 1 : 5);
      else if (k === 'ArrowUp') sh ? vsBy(100) : altBy(100); else if (k === 'ArrowDown') sh ? vsBy(-100) : altBy(-100);
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
    return function destroy() { cancelAnimationFrame(raf); clearTimeout(nextTimer); document.removeEventListener('keydown', onKey); if (mq && mq.removeEventListener) mq.removeEventListener('change', onMq); };
  }

  const API = { mount, readNav, lineDev, MAKERS, TYPES, makeState, physStep, advance };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.P2_SIM = API;
})(typeof window !== 'undefined' ? window : globalThis);
