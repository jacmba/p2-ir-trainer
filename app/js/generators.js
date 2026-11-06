/* Generadores paramétricos de preguntas del P2 (IFR). Cada generador recibe un rng y devuelve
   {t: tema, q, o[], a[], e, g: grupo, viz?}. Se usan en el Test y en las pruebas automáticas. */
(function (root) {
  'use strict';
  const R = (typeof module !== 'undefined' && module.exports) ? require('./rules.js') : root.P2_RULES;
  const pick = (rng, a) => a[Math.floor(rng() * a.length)];
  const randint = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));
  function shuffle(rng, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function single(rng, t, q, correct, distractors, e, extra) {
    const opts = [correct]; for (const d of distractors) if (!opts.includes(d) && opts.length < 4) opts.push(d);
    const sh = shuffle(rng, opts); return Object.assign({ t, q, o: sh, a: [sh.indexOf(correct)], e, gen: true }, extra || {});
  }
  const H = R.hdg, F1 = R.fmt1;
  const kt = n => n + ' kt';
  const G = {};

  // 1. Entrada en espera (sectores sobre el indicador de rumbo)
  G.holdEntry = function (rng) {
    let inb, h, right;
    do { inb = randint(rng, 0, 35) * 10; h = randint(rng, 0, 71) * 5; right = rng() < 0.7; } while (R.holdBoundaryDist(h, inb, right) < 14);
    const entry = R.holdEntry(h, inb, right);
    const fix = pick(rng, R.VORS.concat(R.FIXES));
    const q = `Espera ${right ? 'estándar (virajes por la derecha)' : 'no estándar (virajes por la izquierda)'} sobre ${fix}, curso de acercamiento ${H(inb)}°. Llegas a ${fix} con rumbo ${H(h)}°. ¿Qué entrada corresponde?`;
    const O = R.recip(inb);
    const e = `Rumbo de alejamiento ${H(O)}°. Con el rumbo actual ${H(h)}° arriba en el indicador: ` + (right
      ? `paralela si el alejamiento cae en los 110° a la izquierda (${H(h - 110)}–${H(h)}), gota en los 70° a la derecha (${H(h)}–${H(h + 70)}), directa en los 180° restantes.`
      : `en no estándar el dibujo se invierte: paralela en los 110° a la derecha (${H(h)}–${H(h + 110)}), gota en los 70° a la izquierda (${H(h - 70)}–${H(h)}), directa en el resto.`);
    const map = { directa: 'Directa (sector C)', paralela: 'Paralela (sector A)', gota: 'Gota de agua (sector B)' };
    return single(rng, 'esperas', q, map[entry], Object.values(map), e, { g: 'Entrada en espera', viz: { kind: 'hold', inb, h, right } });
  };

  // 2. Velocidad máxima en espera (tabla del curso)
  G.holdSpeed = function (rng) {
    const prop = rng() < 0.35;
    const alt = pick(rng, [3000, 4000, 5000, 6000, 7000, 9000, 11000, 13000, 14000, 16000, 19000, 22000, 27000, 31000, 35000]);
    const altTxt = alt > 14000 ? 'FL' + alt / 100 : alt.toLocaleString('es-ES') + ' ft';
    const ac = prop ? pick(rng, R.AIRCRAFT.filter(a => a.prop)) : pick(rng, R.AIRCRAFT.filter(a => !a.prop));
    const v = R.holdMaxSpeed(alt, prop);
    return single(rng, 'esperas', `Esperas con un ${ac.name} (${prop ? 'hélice' : 'reactor'}) a ${altTxt}. ¿Velocidad máxima indicada en la espera?`,
      v + ' KIAS', ['175 KIAS', '200 KIAS', '230 KIAS', '265 KIAS', '250 KIAS', '280 KIAS'].filter(x => x !== v + ' KIAS'),
      'Hélice (incluidos turbohélices): 175 KIAS a cualquier altitud. Reactores: hasta 6 000 ft 200 KIAS · 6 001 ft a FL140 230 KIAS · por encima de FL140 265 KIAS.', { g: 'Velocidades de espera' });
  };

  // 3. Cronometraje de la espera
  G.holdTiming = function (rng) {
    const over = rng() < 0.5;
    const t = over ? randint(rng, 7, 12) * 10 : randint(rng, 6, 11) * 5;
    const out = R.holdOutboundTime(t);
    const wrongs = [R.mmss(over ? 60 - (t - 60) : 60 + (60 - t)), R.mmss(over ? 60 + (t - 60) / 2 : 60 - (60 - t) * 2), R.mmss(60), R.mmss(over ? 60 - (t - 60) * 2 : 60 + (60 - t) / 2)];
    return single(rng, 'esperas', `En la espera, el tramo de acercamiento te ha durado ${R.mmss(t)}. ¿Cuánto debe durar el próximo alejamiento para conseguir un acercamiento de 1 minuto?`,
      R.mmss(out), wrongs, over ? `Sobra tiempo en el acercamiento (${t - 60} s): se divide entre 2 y se resta del alejamiento → 60 − ${(t - 60) / 2} = ${out} s.` : `Falta tiempo en el acercamiento (${60 - t} s): se multiplica por 2 y se suma al alejamiento → 60 + ${(60 - t) * 2} = ${out} s.`, { g: 'Cronometraje de espera' });
  };

  // 4. Rumbo de la gota y crono del alejamiento
  G.holdTeardrop = function (rng) {
    const inb = randint(rng, 1, 36) * 10, right = rng() < 0.65;
    if (rng() < 0.6) {
      const td = R.teardropHeading(inb, right), O = R.recip(inb);
      return single(rng, 'esperas', `Entrada en gota a una espera ${right ? 'estándar' : 'no estándar'} con curso de acercamiento ${H(inb)}°. Tras el fijo, ¿qué rumbo mantienes durante 1 minuto?`,
        H(td) + '°', [H(R.recip(inb) + (right ? 30 : -30)) + '°', H(O) + '°', H(inb) + '°', H(O + (right ? -45 : 45)) + '°'],
        `Alejamiento ${H(O)}°; la gota es 30° ${right ? 'menos' : 'más'} en ${right ? 'estándar' : 'no estándar'} → ${H(td)}°. Después se vira ${right ? 'por la derecha' : 'por la izquierda'} para interceptar el acercamiento.`, { g: 'Entradas en espera' });
    }
    const c = pick(rng, [
      ['¿Cuándo se empieza a cronometrar el tramo de alejamiento?', 'A la cuadra del fijo o al nivelar las alas, lo que ocurra último', ['Al cruzar el fijo', 'Al iniciar el viraje de alejamiento', 'Al nivelar las alas, aunque no se haya llegado a la cuadra']],
      ['Entrada paralela: tras el minuto de alejamiento no has interceptado el acercamiento 30 s después de virar. ¿Qué haces?', 'Proceder directo a la estación', ['Repetir la entrada', 'Virar 45° hacia el lado de la espera', 'Seguir con ese rumbo hasta interceptar']],
      ['¿Qué flexibilidad admite el curso en los límites de los sectores de entrada?', '10° a cada lado', ['5° a cada lado', '15° a cada lado', 'Ninguna']],
      ['Si la espera está publicada y el ATC no da instrucciones detalladas, el piloto…', 'Mantiene la espera tal y como está publicada', ['Vuela una espera estándar de 1 min sobre el último fijo', 'Pide una espera a medida', 'Se aleja por el radial de llegada']]]);
    return single(rng, 'esperas', c[0], c[1], c[2], c[1] + '.', { g: 'Circuito de espera' });
  };

  // 5. Interceptación (rumbo inicial)
  G.intercept = function (rng) {
    const inbound = rng() < 0.55;
    let qdm, desired, res;
    do { qdm = randint(rng, 1, 72) * 5; desired = randint(rng, 1, 36) * 10; res = R.intercept(qdm, desired, inbound); }
    while (res.d < 6 || R.interceptBoundaryDist(qdm, desired, inbound) < 4 || res.d > 170 || (res.tipo === 'pasada' && rng() < 0.6));
    const vor = pick(rng, R.VORS);
    const instr = inbound ? `interceptar el curso ${H(desired)}° hacia ${vor}` : `alejarte por el radial ${H(desired)} de ${vor}`;
    const q = `RMI sintonizado a ${vor}: cabeza ${H(qdm)}°, cola ${H(R.recip(qdm))}°. Debes ${instr}. ¿Rumbo de interceptación inicial?`;
    let correct, e, wrongs;
    if (res.tipo === 'directa') {
      correct = H(res.heading) + '°';
      const ref = inbound ? qdm : R.recip(qdm);
      e = inbound
        ? `Acercamiento: deseado ${H(desired)}°, cabeza ${H(qdm)}° → diferencia ${res.d}° → «${res.rule}» → rumbo ${H(res.heading)}° (ángulo de corte ${res.angle}°).`
        : `Alejamiento: cola (radial actual) ${H(ref)}, radial deseado ${H(desired)} → diferencia ${res.d}° → «${res.rule}» → rumbo ${H(res.heading)}°.`;
      const s = res.heading === desired ? 1 : R.turnDir(desired, res.heading);
      wrongs = [H(desired) + '°', H(ref) + '°', H(desired - s * (inbound ? 30 : 45)) + '°', H(res.heading + s * 15) + '°', H(R.recip(res.heading)) + '°'];
    } else {
      correct = `${H(res.heading)}° (rumbo radial) hasta la cuadra; luego ` + (inbound ? '1 min y 90° + 90° hacia la cabeza' : '45° hacia el lado de la cabeza');
      e = `Diferencia ${res.d}° > 90° → ruta pasada en ${inbound ? 'acercamiento' : 'alejamiento'}: ${res.rule}.`;
      wrongs = [`${H(res.heading)}° (rumbo radial) hasta la cuadra; luego ` + (inbound ? '45° hacia el lado de la cabeza' : '1 min y 90° + 90° hacia la cabeza'), `${H(R.recip(res.heading))}° directamente`, `${H(desired + 90)}° hasta centrar el CDI`];
    }
    return single(rng, 'interceptaciones', q, correct, shuffle(rng, wrongs), e, { g: 'Interceptaciones', viz: { kind: 'rmi', qdm, hdgAc: randint(rng, 0, 35) * 10 } });
  };

  // 6. ¿Qué regla aplica?
  G.interceptRule = function (rng) {
    const inbound = rng() < 0.5;
    const opts = inbound ? ['Deseado – Cabeza – Doble P', 'Deseado – Cabeza – 30°', 'Deseado – Cabeza – hasta 90°', 'Ruta pasada'] : ['Radial deseado – P', 'Radial deseado – 45°', 'Ruta pasada'];
    let d; do { d = randint(rng, 4, 34) * 5; } while ([15, 60, 90].includes(d) || d > 170);
    const ans = inbound ? (d < 15 ? opts[0] : d <= 60 ? opts[1] : d <= 90 ? opts[2] : opts[3]) : (d < 15 ? opts[0] : d <= 90 ? opts[1] : opts[2]);
    const extra = inbound ? [] : ['Deseado – Cabeza – 30°'];
    return single(rng, 'interceptaciones', `Interceptación en ${inbound ? 'acercamiento' : 'alejamiento'} con ${d}° de diferencia entre ${inbound ? 'la cabeza del RMI y el curso deseado' : 'la cola del RMI y el radial deseado'}. ¿Qué método usas?`,
      ans, opts.concat(extra), inbound ? 'Acercamiento: < 15° doble P · 15–60° 30° · 60–90° hasta 90° · > 90° ruta pasada.' : 'Alejamiento: < 15° P · 15–90° 45° · > 90° ruta pasada.', { g: 'Interceptaciones' });
  };

  // 7. Mantenimiento de curso con viento
  G.courseWind = function (rng) {
    const crs = randint(rng, 1, 36) * 10, dev = randint(rng, 1, 3) * 5, side = rng() < 0.5 ? 1 : -1;
    const inbound = rng() < 0.6;
    if (rng() < 0.5) {
      const ptr = inbound ? 'la cabeza' : 'la cola';
      const moved = inbound ? (side > 0 ? 'derecha' : 'izquierda') : (side > 0 ? 'izquierda' : 'derecha');
      const windSide = side > 0 ? 'derecha' : 'izquierda';
      return single(rng, 'interceptaciones', `Vuelas ${inbound ? 'en acercamiento' : 'en alejamiento'} con rumbo ${H(crs)}° sin corrección y ${ptr} del RMI se desvía ${dev}° hacia la ${moved}. ¿De dónde viene el viento y cómo corriges tras reinterceptar?`,
        `De la ${windSide}: proa ${dev}° hacia la ${windSide}`, [`De la ${windSide === 'derecha' ? 'izquierda' : 'derecha'}: proa ${dev}° hacia la ${windSide === 'derecha' ? 'izquierda' : 'derecha'}`, `De la ${windSide}: proa ${dev * 2}° hacia la ${windSide === 'derecha' ? 'izquierda' : 'derecha'}`, 'No hay viento: es error del instrumento'],
        inbound ? 'En acercamiento el viento viene del lado hacia el que se va la cabeza; tras reinterceptar se apunta la nariz al viento tantos grados como la deflexión.' : 'En alejamiento se trabaja con la cola, que se desplaza hacia el lado contrario al viento; se corrige hacia el viento con los grados de la deflexión.', { g: 'Mantenimiento de curso' });
    }
    const big = rng() < 0.5;
    return single(rng, 'interceptaciones', `Con corrección de deriva aplicada en ${inbound ? 'acercamiento' : 'alejamiento'}, ${inbound ? 'la cabeza' : 'la cola'} del RMI se mueve ${(inbound ? big : !big) ? 'alejándose del' : 'hacia el'} índice superior. La corrección fue…`,
      big ? 'Excesiva' : 'Insuficiente', ['Excesiva', 'Insuficiente', 'Correcta'], inbound ? 'Acercamiento: cabeza hacia el índice superior = corrección pequeña; alejándose = demasiada.' : 'Alejamiento (cola) es al revés: hacia el índice superior = demasiada; alejándose = pequeña.', { g: 'Mantenimiento de curso' });
  };

  // 8. Lectura de RMI / HSI
  G.instrument = function (rng) {
    const k = pick(rng, ['rmi', 'hsi', 'qdm', 'flag']);
    if (k === 'rmi') { const qdm = randint(rng, 1, 72) * 5; return single(rng, 'radioayudas', `La aguja VOR del RMI marca la cabeza en ${H(qdm)}°. ¿Sobre qué radial estás?`, H(R.recip(qdm)), [H(qdm), H(qdm + 90), H(qdm - 90)], 'La cabeza indica el curso hacia la estación; la cola, el radial en el que está el avión.', { g: 'Instrumentos', viz: { kind: 'rmi', qdm, hdgAc: randint(rng, 0, 35) * 10 } }); }
    if (k === 'hsi') { const c = randint(rng, 1, 72) * 5; const to = rng() < 0.5; return single(rng, 'radioayudas', `HSI con el curso ${H(c)}° seleccionado, barra centrada e indicador ${to ? 'TO (apunta a la flecha del curso)' : 'FROM (apunta a la cola del curso)'}. ¿En qué radial estás?`, H(to ? R.recip(c) : c), [H(to ? c : R.recip(c)), H(c + 90), H(c - 90)], to ? 'Con TO el curso lleva a la estación: el radial es el recíproco.' : 'Con FROM el curso seleccionado coincide con el radial.', { g: 'Instrumentos', viz: { kind: 'hsi', crs: c, hdgAc: c, dev: 0, to } }); }
    if (k === 'qdm') { const r = randint(rng, 1, 72) * 5; return single(rng, 'radioayudas', `Estás en el radial ${H(r)} y quieres ir a la estación. ¿Qué curso seleccionas en el OBS para obtener TO con la aguja centrada?`, H(R.recip(r)), [H(r), H(r + 90), H(r - 90)], 'Para ir a la estación se selecciona el recíproco del radial; al alejarse, el curso coincide con el radial.', { g: 'Instrumentos' }); }
    const f = pick(rng, [['NAV', 'No se recibe una señal fiable de navegación'], ['HDG', 'El compás (rosa de rumbos) no funciona correctamente'], ['GS', 'No hay señal fiable de senda de planeo']]);
    return single(rng, 'radioayudas', `En el HSI aparece la bandera ${f[0]}. Significa…`, f[1], ['No se recibe una señal fiable de navegación', 'El compás (rosa de rumbos) no funciona correctamente', 'No hay señal fiable de senda de planeo', 'Has sobrevolado la estación'], f[1] + '.', { g: 'Instrumentos' });
  };

  // 9. Arco DME: de radial a arco
  G.arcEntry = function (rng) {
    const arc = randint(rng, 8, 20), gs = randint(rng, 9, 24) * 10, inbound = rng() < 0.5, half = rng() < 0.3;
    const lead = R.arcLeadNM(gs, half), at = R.arcTurnDME(arc, gs, inbound, half);
    const vor = pick(rng, R.VORS);
    return single(rng, 'arco-dme', `Vuelas por un radial de ${vor} ${inbound ? 'en acercamiento' : 'en alejamiento'} a ${gs} kt de GS y debes orbitar el arco de ${arc} NM con viraje ${half ? 'medio estándar (1,5°/s)' : 'estándar (3°/s)'}. ¿A qué DME inicias el viraje?`,
      F1(at) + ' NM', [F1(R.arcTurnDME(arc, gs, !inbound, half)) + ' NM', F1(R.arcTurnDME(arc, gs, inbound, !half)) + ' NM', arc + ' NM', F1(arc + (inbound ? 1 : -1) * gs / 60) + ' NM'],
      `Anticipo = ${half ? '1 %' : '0,5 %'} de la GS = ${F1(lead)} NM; ${inbound ? 'en acercamiento se suma' : 'en alejamiento se resta'}: ${arc} ${inbound ? '+' : '−'} ${F1(lead)} = ${F1(at)} NM.`, { g: 'Arco DME', viz: { kind: 'arc', arc, radial: randint(rng, 0, 35) * 10, inbound } });
  };

  // 10. Arco DME: de arco a radial
  G.arcExit = function (rng) {
    const arc = randint(rng, 8, 20), gs = randint(rng, 9, 20) * 10, half = rng() < 0.3;
    const target = randint(rng, 1, 36) * 10, cw = rng() < 0.5;
    const lead = Math.max(1, Math.round(R.arcLeadDeg(gs, arc, half)));
    const start = R.norm(target - (cw ? lead : -lead));
    const vor = pick(rng, R.VORS);
    return single(rng, 'arco-dme', `Orbitas el arco de ${arc} NM de ${vor} en sentido ${cw ? 'horario (radiales crecientes)' : 'antihorario (radiales decrecientes)'} a ${gs} kt de GS y debes abandonarlo para volar hacia la estación por el radial ${H(target)} (viraje ${half ? 'medio estándar' : 'estándar'}). ¿Con qué radial en la cola inicias el viraje?`,
      H(start), [H(R.norm(target + (cw ? lead : -lead))), H(target), H(R.norm(target - (cw ? 2 * lead + 3 : -(2 * lead + 3))))],
      `Anticipo = [60 × ${half ? '1 %' : '0,5 %'} GS] / distancia = 60 × ${F1(R.arcLeadNM(gs, half))} / ${arc} ≈ ${lead}°. Se vira ${lead} radiales antes del deseado: ${H(start)}.`, { g: 'Arco DME' });
  };

  // 11. Mantenimiento del arco
  G.arcKeep = function (rng) {
    const c = pick(rng, [
      ['Mantienes un arco DME y has derivado 0,5 NM hacia la estación. ¿Cómo corriges?', 'Pones la referencia 5° más por debajo de la punta de ala, para salir hacia fuera', ['Pones la referencia 10° por encima de la punta de ala', 'Viras 90° hacia fuera', 'No corriges hasta 1 NM']],
      ['Mantienes un arco DME y has derivado 0,5 NM hacia fuera. ¿Cómo corriges?', 'Pones la referencia 10° más por encima de la punta de ala, para volar hacia dentro', ['Pones la referencia 5° por debajo de la punta de ala', 'Viras 45° hacia la estación', 'Aumentas la velocidad']],
      ['Técnica de tramos rectos en el arco: ¿dónde colocas la aguja del RMI y hasta cuándo mantienes el rumbo?', '10° por encima de la referencia de punta de ala, hasta que caiga 5° por debajo', ['5° por encima, hasta que caiga 10° por debajo', 'En la punta de ala, sin moverla', '20° por encima, hasta la punta de ala']],
      ['¿Qué desviación máxima respecto del arco se admite?', '± 0,5 NM', ['± 1 NM', '± 2 NM', '± 0,1 NM']],
      ['¿Cuándo se recomienda mantener el arco con un ángulo de alabeo constante en lugar de tramos rectos?', 'Cuando el arco está cerca de la estación (5–10 NM)', ['Cuando el arco está a más de 20 NM', 'Con viento fuerte de cola', 'Nunca: siempre tramos rectos']]]);
    return single(rng, 'arco-dme', c[0], c[1], c[2], c[1] + '.', { g: 'Arco DME' });
  };

  // 12. Niveles de crucero IFR
  G.ifrLevel = function (rng) {
    const track = randint(rng, 0, 71) * 5, east = track < 180;
    const good = R.ifrLevels(east).filter(f => f >= 40 && f <= 450);
    const fl = pick(rng, good);
    const bad = R.ifrLevels(!east).filter(f => f >= 40 && f <= 450);
    const wr = shuffle(rng, bad).slice(0, 2).map(f => 'FL' + f).concat(['FL' + (fl + 5)]);
    return single(rng, 'vuelo-ifr', `Vuelo IFR en crucero con curso magnético ${H(track)}°. ¿Qué nivel es correcto?`, 'FL' + fl, wr,
      `Curso ${east ? '000–179° → miles impares (FL10, 30… 290, 310… 410, luego 450, 490)' : '180–359° → miles pares (FL20, 40… 280, 300… 400, luego 430, 470, 510)'}.`, { g: 'Niveles de crucero' });
  };

  // 13. Altitud mínima IFR sin altitud publicada
  G.minAlt = function (rng) {
    const obs = randint(rng, 4, 90) * 100, mount = rng() < 0.5;
    const res = obs + (mount ? 2000 : 1000);
    return single(rng, 'vuelo-ifr', `Sin altitud mínima publicada, vuelas IFR ${mount ? 'sobre terreno montañoso' : 'sobre terreno llano'}. El obstáculo más alto dentro de 8 km de tu posición estimada tiene ${obs.toLocaleString('es-ES')} ft. ¿Altitud mínima?`,
      res.toLocaleString('es-ES') + ' ft', [(obs + (mount ? 1000 : 2000)).toLocaleString('es-ES') + ' ft', (obs + 500).toLocaleString('es-ES') + ' ft', (obs + 1500).toLocaleString('es-ES') + ' ft'],
      `${mount ? 'Terreno elevado o montañoso: 2 000 ft (600 m)' : 'Resto: 1 000 ft (300 m)'} sobre el obstáculo más alto en un radio de 8 km.`, { g: 'Altitudes mínimas' });
  };

  // 14. Viraje estándar: alabeo y tiempos
  G.stdTurn = function (rng) {
    if (rng() < 0.5) {
      const tas = randint(rng, 8, 25) * 10, b = R.bankStdTurn(tas);
      return single(rng, 'vuelo-instrumental', `¿Alabeo aproximado para un viraje estándar a ${tas} kt TAS?`, b + '°', [(b + 5) + '°', Math.round(tas / 10) + '°', (b - 8) + '°', '30°'].filter(x => x !== b + '°'), `10 % de la TAS + 5 = ${tas / 10} + 5 = ${b}°. (Sin superar 30°.)`, { g: 'Virajes' });
    }
    const deg = pick(rng, [45, 90, 135, 180, 270, 360]), half = rng() < 0.4;
    const t = R.turnTime(deg, half);
    return single(rng, 'vuelo-instrumental', `¿Cuánto tarda un viraje de ${deg}° a razón ${half ? 'medio estándar (1,5°/s)' : 'estándar (3°/s)'}?`, R.mmss(t), [R.mmss(R.turnTime(deg, !half)), R.mmss(t + 30), R.mmss(deg / 2)].filter(x => x !== R.mmss(t)),
      `${deg}° ÷ ${half ? '1,5' : '3'}°/s = ${t} s. Un 360° dura 2 min en estándar y 4 min en medio estándar.`, { g: 'Virajes' });
  };

  // 15. Anticipo de nivelada y corrección de rumbo
  G.levelOff = function (rng) {
    if (rng() < 0.6) {
      const vs = randint(rng, 4, 15) * 100, target = randint(rng, 30, 120) * 100, climb = rng() < 0.6;
      const lead = R.levelOffLead(vs), at = climb ? target - lead : target + lead;
      return single(rng, 'vuelo-instrumental', `${climb ? 'Asciendes' : 'Desciendes'} a ${vs} ft/min para nivelar a ${target.toLocaleString('es-ES')} ft. ¿A qué altitud empiezas a nivelar?`,
        at.toLocaleString('es-ES') + ' ft', [(climb ? target + lead : target - lead).toLocaleString('es-ES') + ' ft', target.toLocaleString('es-ES') + ' ft', (climb ? target - 2 * lead : target + 2 * lead).toLocaleString('es-ES') + ' ft'],
        `Anticipo = 10 % de la razón del variómetro = ${lead} ft ${climb ? 'antes (por debajo)' : 'antes (por encima)'} de la altitud deseada.`, { g: 'Maniobras básicas' });
    }
    const off = pick(rng, [5, 8, 10, 15, 20, 25, 40]), tas = pick(rng, [100, 120, 140]);
    const b = Math.min(off, 30, R.bankStdTurn(tas));
    return single(rng, 'vuelo-instrumental', `Estás desviado ${off}° del rumbo a ${tas} kt TAS. ¿Qué alabeo usas para corregir?`, b + '°', [off * 2 + '°', '30°', '5°', '45°'].filter(x => x !== b + '°'),
      `Alabeo igual a los grados a corregir, como máximo 30° o el de viraje estándar (${R.bankStdTurn(tas)}° a ${tas} kt), lo que ocurra primero.`, { g: 'Maniobras básicas' });
  };

  // 16. Tipos de instrumentos
  const INST = [['Indicador de actitud', 'Control'], ['Tacómetro (RPM)', 'Control'], ['Presión de admisión', 'Control'], ['Torquímetro', 'Control'], ['Flujo de combustible', 'Control'],
    ['Altímetro', 'Performance'], ['Velocímetro', 'Performance'], ['Variómetro', 'Performance'], ['Indicador de rumbo', 'Performance'], ['Coordinador de viraje', 'Performance'], ['Machímetro', 'Performance'], ['Indicador de ángulo de ataque', 'Performance'],
    ['HSI', 'Navegación'], ['RMI', 'Navegación'], ['Indicador DME', 'Navegación'], ['CDI', 'Navegación']];
  G.instClass = function (rng) {
    const [n, c] = pick(rng, INST);
    return single(rng, 'vuelo-instrumental', `En el concepto de control y performance, el ${n.toLowerCase().startsWith('indicador') ? '' : 'instrumento '}«${n}» es un instrumento de…`, c, ['Control', 'Performance', 'Navegación'],
      'Control: actitud y potencia. Performance: comportamiento real (altímetro, velocímetro, variómetro, rumbo, viraje, Mach, AoA). Navegación: posición respecto de una radioayuda o fijo (HSI, RMI, DME, CDI).', { g: 'Control y performance' });
  };

  // 17. Gradiente de ascenso
  G.climb = function (rng) {
    const gs = pick(rng, [75, 90, 100, 110, 120, 130, 140, 150, 160, 180, 200, 250]);
    const pct = pick(rng, [3.3, 4, 4.5, 5, 6, 7]);
    if (rng() < 0.7) {
      const v = R.climbRate(gs, pct);
      return single(rng, 'planificacion', `Una SID exige un ${F1(pct)} % de gradiente mínimo. Con ${gs} kt de velocidad terrestre, ¿qué razón de ascenso mínima necesitas?`, v + ' ft/min',
        [Math.round(gs * pct) + ' ft/min', Math.round(gs * pct * 1.013 * 1.5) + ' ft/min', Math.round(gs * pct * 0.6) + ' ft/min', Math.round(gs * 3.3 * 1.013) + ' ft/min'],
        `Razón ≈ GS × % × 1,013 = ${gs} × ${F1(pct)} × 1,013 ≈ ${v} ft/min (1 % = 101,3 ft por NM; a falta de tabla, GS × % da casi lo mismo).`, { g: 'Gradiente de ascenso' });
    }
    return single(rng, 'planificacion', 'Si la carta de la SID no publica otro valor, ¿qué gradiente mínimo de ascenso debe cumplir toda salida instrumental?', '3,3 %', ['2,5 %', '5 %', '4,3 %'], 'Salvo gradiente mayor publicado, el mínimo es el 3,3 %.', { g: 'Gradiente de ascenso' });
  };

  // 18. Designadores de ruta ATS
  G.atsRoute = function (rng) {
    const L = pick(rng, Object.keys(R.ATS_DESIG));
    const pre = rng() < 0.35 ? 'U' : ''; const num = randint(rng, 1, 999); const id = pre + L + num;
    const d = R.decodeRoute(id);
    const types = ['convencional regional', 'RNAV regional', 'convencional nacional', 'RNAV nacional'];
    const fmt = t => `${t[0].toUpperCase() + t.slice(1)}${d.upper ? ', en espacio aéreo superior' : ''}`;
    return single(rng, 'planificacion', `¿Qué indica el designador de ruta ATS «${id}»?`, fmt(d.type), types.filter(t => t !== d.type).map(fmt).concat(pre ? [d.type[0].toUpperCase() + d.type.slice(1) + ', para supersónicos'] : []),
      'A B G R convencionales regionales · L M N P RNAV regionales · H J V W convencionales nacionales · Q T Y Z RNAV nacionales. Prefijo U = superior, S = supersónicos, K = helicópteros a bajo nivel.', { g: 'Rutas ATS' });
  };

  // 19. NOTAM
  G.notam = function (rng) {
    const fir = pick(rng, ['SCEZ', 'SVZM', 'SAEF', 'SBBS', 'SPIM']), ad = { SCEZ: 'SCEL', SVZM: 'SVMI', SAEF: 'SAEZ', SBBS: 'SBBR', SPIM: 'SPJC' }[fir];
    const subj = pick(rng, Object.keys(R.NOTAM_SUBJ)), cond = pick(rng, ['A', 'C', 'H', 'L']);
    const tr = pick(rng, ['I', 'V', 'IV']), pu = pick(rng, ['NBO', 'BO', 'M']), sc = pick(rng, ['A', 'E', 'AE', 'W']);
    const type = pick(rng, ['N', 'R', 'C']); const num = randint(rng, 1000, 4999), yr = randint(rng, 20, 26);
    const code = 'Q' + subj + pick(rng, ['X', 'R', 'C', 'A', 'L']) + cond + pick(rng, ['S', 'C', 'U', 'W', 'L']);
    const head = `A${num}/${yr} NOTAM${type}${type !== 'N' ? ' A' + (num - randint(rng, 5, 99)) + '/' + yr : ''} Q) ${fir}/${code}/${tr}/${pu}/${sc}/000/999/...`;
    const k = pick(rng, ['subj', 'cond', 'tr', 'type', 'scope', 'limits']);
    if (k === 'subj') return single(rng, 'planificacion', `${head}\n¿Qué indican la 2.ª y 3.ª letra del código Q (${code}): sobre qué trata, empezando por la «${subj}»?`, R.NOTAM_SUBJ[subj], shuffle(rng, Object.values(R.NOTAM_SUBJ).filter(x => x !== R.NOTAM_SUBJ[subj])), `La 2.ª letra («${subj}») agrupa el objeto: ${R.NOTAM_SUBJ[subj]}.`, { g: 'NOTAM' });
    if (k === 'cond') return single(rng, 'planificacion', `${head}\nLa 4.ª letra del código Q es «${cond}». ¿Qué estado indica?`, R.NOTAM_COND[cond], Object.values(R.NOTAM_COND).filter(x => x !== R.NOTAM_COND[cond]), '4.ª y 5.ª letras = estado: A disponibilidad, C cambios, H peligro, L limitaciones, XX otro.', { g: 'NOTAM' });
    if (k === 'tr') return single(rng, 'planificacion', `${head}\n¿A qué tránsito va dirigido?`, R.NOTAM_TRAFFIC[tr], Object.values(R.NOTAM_TRAFFIC).concat(['Solo militar']), 'Campo de tránsito: I IFR, V VFR, IV ambos.', { g: 'NOTAM' });
    if (k === 'type') return single(rng, 'planificacion', `${head}\nEl identificador NOTAM${type} indica que es un NOTAM…`, R.NOTAM_TYPE[type], Object.values(R.NOTAM_TYPE).concat(['de prueba']), 'NOTAMN nueva información · NOTAMR reemplaza (cita el reemplazado) · NOTAMC cancela (cita el cancelado).', { g: 'NOTAM' });
    if (k === 'scope') { const s = sc[0]; return single(rng, 'planificacion', `${head}\nEn el campo de alcance aparece «${sc}». La letra ${s} significa…`, R.NOTAM_SCOPE[s], Object.values(R.NOTAM_SCOPE).concat(['Área terminal']), 'Alcance: A aeródromo, E en ruta, W aviso para la navegación.', { g: 'NOTAM' }); }
    return single(rng, 'planificacion', `${head}\n¿Qué significa «000/999» en el campo Q?`, 'Sin límites verticales específicos: desde el suelo hasta sin límite', ['Válido de 00:00 a 09:99 UTC', 'Radio de 0 a 999 NM', 'Número de serie del NOTAM'], 'Límites inferior/superior en FL; sin información de altura se ponen 000 y 999.', { g: 'NOTAM' });
  };

  // 20. Plan de vuelo: ruta
  G.fplRoute = function (rng) {
    const c = pick(rng, [
      ['Sales por la SID OSMAR2, sigues la W19 hasta CHALO y llegas por la STAR EKONU. ¿Cómo se escribe la ruta?', 'OSMAR2 OSMAR W19 CHALO EKONU', ['OSMAR2 W19 EKONU', 'OSMAR W19 CHALO', 'SVMI OSMAR2 W19 EKONU SVMG']],
      ['Sin SID ni STAR, entras en la W19 en MIQ y la dejas en MTA:', 'MIQ W19 MTA', ['W19', 'SVMI MIQ W19 MTA SVMG', 'MIQ DCT W19 DCT MTA']],
      ['Vuelas la A561 de MTA a CBC y después la A552 hasta MIQ:', 'MTA A561 CBC A552 MIQ', ['MTA A561 A552 MIQ', 'A561 CBC A552', 'MTA DCT CBC DCT MIQ']],
      ['Sigues la A552 desde MIQ hasta PORGA y de ahí vas directo a MTA:', 'MIQ A552 PORGA DCT MTA', ['MIQ A552 DCT MTA', 'MIQ A552 PORGA MTA', 'MIQ PORGA A552 DCT MTA']],
      ['La W19 aparece en la carta como de sentido único hacia MTA. Para volar de MTA a MIQ…', 'No puedes usarla: hay que buscar otra ruta (A561 + A552)', ['Puedes usarla en sentido contrario a otro nivel', 'Puedes usarla si lo pides al ATC', 'Puedes usarla por debajo de la MEA']],
      ['Tu avión tiene techo operativo FL130 y la aerovía tiene MEA FL140:', 'No debes planificar esa aerovía', ['Puedes volarla a FL130 avisando al ATC', 'Puedes volarla porque la MEA es orientativa', 'Puedes volarla solo de día']]]);
    return single(rng, 'planificacion', c[0], c[1], c[2], c[1] + '.', { g: 'Ruta del plan de vuelo' });
  };

  // 21. Combustible
  G.fuel = function (rng) {
    const trip = randint(rng, 5, 30) * 5, alt = randint(rng, 4, 12) * 5;
    const tot = R.ifrFuelMin(trip, alt);
    const hm = m => `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
    return single(rng, 'planificacion', `Vuelo IFR: ${trip} min hasta el destino y ${alt} min del destino a la alternativa más crítica. Según el curso, ¿cuál es el combustible mínimo (en tiempo de vuelo)?`, hm(tot),
      [hm(trip + alt), hm(trip + 45), hm(trip + alt + 30), hm(trip + 2 * alt + 45)], `Destino + alternativa más crítica + 45 min = ${trip} + ${alt} + 45 = ${tot} min. Lo que sobre puede preverse para esperas.`, { g: 'Combustible' });
  };

  // 22. ILS: categorías
  G.ilsCat = function (rng) {
    if (rng() < 0.5) {
      const [c, d] = pick(rng, R.ILS_CATS);
      return single(rng, 'radioayudas', `¿Qué mínimos corresponden a un ILS ${c} según el curso?`, d, R.ILS_CATS.filter(x => x[0] !== c).map(x => x[1]), `${c}: ${d}.`, { g: 'Categorías ILS' });
    }
    const dh = pick(rng, [200, 150, 120, 100, 80, 60, 40, null]);
    const cat = R.ilsCat(dh, dh == null ? null : dh >= 100 ? 300 : 200);
    return single(rng, 'radioayudas', dh == null ? 'Aproximación ILS sin DH y sin RVR mínimo:' : `Aproximación ILS con DH ${dh} ft:`, cat, R.ILS_CATS.map(x => x[0]).filter(x => x !== cat),
      'CAT I DH 200 · CAT II 100–200 · CAT IIIA < 100 (RVR ≥ 200 m) · CAT IIIB < 50 (RVR 50–200 m) · CAT IIIC sin mínimos.', { g: 'Categorías ILS' });
  };

  // 23. ILS: frecuencias, marcadores, haces
  G.ilsFacts = function (rng) {
    const k = pick(rng, ['freq', 'marker', 'marker2', 'beam', 'gs']);
    if (k === 'freq') {
      const good = (108 + 0.1 + 2 * randint(rng, 0, 18) * 0.1 + (rng() < 0.5 ? 0.05 : 0)).toFixed(2);
      const bads = [(108 + 2 * randint(rng, 1, 18) * 0.1).toFixed(2), (112 + randint(rng, 0, 9) * 0.1).toFixed(2), (329.15 + randint(rng, 0, 5) * 0.3).toFixed(2), '117.95'].map(x => x.replace('.', ','));
      return single(rng, 'radioayudas', '¿Cuál de estas frecuencias puede ser la de un localizador ILS?', good.replace('.', ','), bads, 'Localizador: 108,10–111,95 MHz con décima impar. Las de décima par en esa banda son VOR; la senda va en UHF (329,15–335,00 MHz) y se sintoniza sola.', { g: 'ILS' });
    }
    if (k === 'marker' || k === 'marker2') {
      const [m, morse, col, where] = pick(rng, R.MARKERS);
      if (k === 'marker') return single(rng, 'radioayudas', `Al pasar sobre el marcador ${m} se enciende la luz…`, col, ['Azul', 'Ámbar', 'Blanca', 'Verde'], `${m}: ${morse}, luz ${col.toLowerCase()}, ${where}.`, { g: 'ILS' });
      return single(rng, 'radioayudas', `¿Dónde está normalmente el ${m}?`, where[0].toUpperCase() + where.slice(1), R.MARKERS.filter(x => x[0] !== m).map(x => x[3][0].toUpperCase() + x[3].slice(1)).concat(['Sobre el umbral de la pista opuesta']), `${m}: ${where}.`, { g: 'ILS' });
    }
    if (k === 'beam') return single(rng, 'radioayudas', 'Mirando hacia la pista desde el marcador exterior, la modulación de 150 Hz del localizador (sector azul) queda…', 'A la derecha', ['A la izquierda', 'Encima del eje', 'Debajo de la senda'], '150 Hz a la derecha (azul), 90 Hz a la izquierda (amarillo); el curso es donde ambas se igualan.', { g: 'ILS' });
    return single(rng, 'radioayudas', 'En la senda de planeo de 3°, ¿qué altura aproximada hay sobre el umbral en el MM y en el OM?', '200 ft en el MM y 1 400 ft en el OM', ['100 ft y 1 000 ft', '500 ft y 3 000 ft', '200 ft y 2 500 ft'], 'Senda ideal 3° (mínimo 2°): ≈ 200 ft en el MM y 1 400 ft en el OM.', { g: 'ILS' });
  };

  // 24. Lectura de la aguja del ILS
  G.ilsNeedles = function (rng) {
    const lr = pick(rng, [-2, -1, 1, 2]), ud = pick(rng, [-1.5, -1, 1, 1.5]);
    const crs = randint(rng, 1, 36) * 10;
    const L = { l: 'a la izquierda del localizador: corriges hacia la derecha', r: 'a la derecha del localizador: corriges hacia la izquierda' };
    const V = { lo: 'por debajo de la senda: reduces la razón de descenso', hi: 'por encima de la senda: aumentas la razón de descenso' };
    const lat = lr > 0 ? 'l' : 'r', ver = ud > 0 ? 'lo' : 'hi', oLat = lat === 'l' ? 'r' : 'l', oVer = ver === 'lo' ? 'hi' : 'lo';
    const ok = `Estás ${L[lat]}; y ${V[ver]}`;
    const wrongs = [`Estás ${L[oLat]}; y ${V[ver]}`, `Estás ${L[lat]}; y ${V[oVer]}`, `Estás ${L[oLat]}; y ${V[oVer]}`];
    return single(rng, 'aproximaciones', `En final del ILS (curso ${H(crs)}°, rumbo ${H(crs)}°) el HSI muestra la barra del localizador desplazada a la ${lr > 0 ? 'derecha' : 'izquierda'} y el puntero de senda ${ud > 0 ? 'por encima' : 'por debajo'} del centro. ¿Dónde estás y qué haces?`, ok, wrongs,
      'Las correcciones se hacen siempre hacia el lado al que se ha desplazado la aguja. Puntero de senda abajo = avión por encima (más descenso); arriba = avión por debajo.', { g: 'ILS', viz: { kind: 'hsi', crs, hdgAc: crs, dev: lr, to: true, gs: ud } });
  };

  // 25. DME
  G.dme = function (rng) {
    if (rng() < 0.55) {
      const d = pick(rng, [5, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 80, 100]);
      const e = R.dmeError(d);
      return single(rng, 'radioayudas', `El DME indica ${d} NM. ¿Qué margen de error admite la medida?`, '± ' + F1(e) + ' NM', ['± ' + F1(e === 0.5 ? 1 : 0.5) + ' NM', '± ' + F1(d * 0.1) + ' NM', '± ' + F1(d * 0.05 + 0.2) + ' NM'].filter(x => x !== '± ' + F1(e) + ' NM'),
        `± 0,5 NM o ± 3 % de la distancia, lo que sea mayor: 3 % de ${d} = ${F1(d * 0.03)} NM → ± ${F1(e)} NM.`, { g: 'DME' });
    }
    const c = pick(rng, [
      ['¿Qué distancia mide el DME?', 'La distancia oblicua (en línea recta) a la estación', ['La distancia horizontal sobre el terreno', 'La distancia al umbral de pista', 'La distancia al último fijo']],
      ['¿En qué banda funciona el DME?', 'UHF', ['VHF', 'LF/MF', 'HF']],
      ['¿Cómo se identifica auditivamente un DME asociado a un VOR?', 'Igual que el VOR pero con un tono más agudo, cada 30 s aproximadamente', ['Con la letra «D» delante', 'No tiene identificación', 'Con una portadora continua']],
      ['¿Hasta qué alcance está diseñado el DME para dar información fiable?', '196 NM (menos a baja altitud)', ['40 NM', '25 NM', '300 NM']],
      ['¿Cuándo deja de parecerse la distancia DME a la horizontal?', 'Cuando el avión está muy cerca de la estación', ['Por debajo de 1 000 ft', 'Por encima de FL245', 'Con viento fuerte']]]);
    return single(rng, 'radioayudas', c[0], c[1], c[2], c[1] + '.', { g: 'DME' });
  };

  // 26. VOR
  G.vor = function (rng) {
    const c = pick(rng, [
      ['¿En qué banda opera el VOR?', 'VHF, 108,00–117,95 MHz', ['UHF, 329–335 MHz', 'LF/MF, 190–1 750 kHz', 'VHF, 118–137 MHz']],
      ['VOR tipo T (terminal): alcance…', '25 NM y 12 000 ft AGL', ['40 NM y 18 000 ft AGL', '130 NM a 45 000 ft', '196 NM']],
      ['VOR tipo L (baja altitud): alcance…', '40 NM hasta 18 000 ft AGL', ['25 NM y 12 000 ft', '130 NM', '100 NM entre 14 500 y 60 000 ft']],
      ['VOR tipo H (alta altitud): alcance máximo…', '130 NM a 45 000 ft AGL', ['40 NM', '25 NM', '196 NM a cualquier altitud']],
      ['¿Cómo determina el receptor el radial?', 'Comparando la fase de la señal de referencia con la de la señal variable', ['Midiendo el tiempo de ida y vuelta', 'Por la intensidad de la señal', 'Con la diferencia entre 90 y 150 Hz']],
      ['En el RMI, la aguja amarilla suele indicar…', 'El curso a un VOR o punto GPS', ['La estación ADF', 'El rumbo seleccionado', 'La senda de planeo']],
      ['En el RMI, ¿hay que seleccionar un curso?', 'No: solo se elige la radioayuda que indica cada aguja', ['Sí, con el OBS', 'Sí, con el selector de rumbo', 'Solo para el ADF']]]);
    return single(rng, 'radioayudas', c[0], c[1], c[2], c[1] + '.', { g: 'VOR' });
  };

  // 27. GPS / RNAV
  G.gnss = function (rng) {
    if (rng() < 0.45) {
      const [m, s] = pick(rng, R.GPS_MODES);
      return single(rng, 'radioayudas', `Sensibilidad (deflexión máxima) del CDI del GPS en modo ${m}:`, s, R.GPS_MODES.map(x => x[1]).filter(x => x !== s).concat(['± 2,5°']), 'Ruta ± 5 NM · terminal (30 NM) pasa a ± 1 · aproximación ± 0,3 desde 2 NM antes del FAF · frustrada ± 1.', { g: 'GPS' });
    }
    const c = pick(rng, [
      ['¿Cuántos satélites necesita el receptor para fijar su posición tridimensional?', '4 (el cuarto corrige el reloj)', ['3', '5', '6']],
      ['RNAV 5 significa…', 'Precisión lateral de 5 NM al menos el 95 % del tiempo de vuelo', ['5 waypoints como mínimo', 'Precisión de 0,5 NM', '5 satélites visibles']],
      ['¿Qué hace el RAIM?', 'Compara posiciones con señales redundantes del propio receptor y excluye el satélite defectuoso', ['Compara el GNSS con el inercial y el altímetro', 'Corrige la posición con satélites geoestacionarios', 'Amplía la señal en zonas montañosas']],
      ['¿Qué hace el AAIM?', 'Compara los datos del GNSS con otros sistemas de la aeronave (inercial, altímetro)', ['Usa satélites redundantes dentro del receptor', 'Transmite correcciones desde satélites GEO', 'Calcula el viento']],
      ['El SBAS ofrece una precisión de…', 'Entre 1 y 10 metros', ['0,3 NM', '100 metros', '5 NM']],
      ['El error total de los sistemas de navegación que define la precisión PBN se llama…', 'Total System Error (TSE)', ['RAIM', 'HPL', 'Level Of Service']],
      ['¿Qué sistema suele centralizar los sensores RNAV de un avión?', 'El FMS/FMC', ['El transpondedor', 'El piloto automático', 'El ADF']]]);
    return single(rng, 'radioayudas', c[0], c[1], c[2], c[1] + '.', { g: 'GPS y RNAV' });
  };

  // 28. Aproximaciones RNAV y TAA
  G.rnavApp = function (rng) {
    const c = pick(rng, [
      ['Una aproximación LNAV termina en…', 'Una MDA', ['Una DA', 'Una DH de 200 ft', 'Una RVR']],
      ['Una aproximación LNAV/VNAV termina en una DA. ¿Es de precisión?', 'No: la escala lateral es fija (0,3 NM) y no llega a la del ILS', ['Sí, como un ILS CAT I', 'Sí, si hay SBAS', 'Solo con piloto automático']],
      ['LPV significa…', 'Localizer Performance with Vertical guidance, con DA y similar a un ILS CAT I', ['Lateral Precision Visual, con MDA', 'Aproximación visual con GPS', 'LNAV con VNAV barométrica']],
      ['¿Qué requiere una aproximación LP o LPV?', 'Capacidad y cobertura SBAS', ['Un DME en la pista', 'Un localizador', 'VNAV barométrica']],
      ['En el diseño en T del TAA, el FAF está a…', '5 NM del umbral, y el IF otras 5 NM más allá', ['3 NM del umbral', '10 NM del IAF', '30 NM del umbral']],
      ['En el diseño en T, los IAF laterales están a…', '3–6 NM del IF, a 90° del segmento intermedio', ['10 NM del FAF, a 45°', '30 NM del umbral', '1 NM del IF, a 70°']],
      ['El diseño en Y se diferencia del de T en que los segmentos iniciales forman…', '70° con el intermedio en lugar de 90°', ['45°', '120°', 'Ningún ángulo: es una recta']],
      ['¿Qué límite tienen las áreas del TAA?', 'Un arco de 30 NM', ['Un arco de 25 NM', 'El límite del TMA', 'Un arco de 10 NM']],
      ['Llegas al IF de una RNAV con ambos IAF laterales eliminados y necesitas virar más de 120°. ¿Qué haces?', 'Una entrada en la espera del IF para quedar establecido en el acercamiento', ['Virar directamente al FAF', 'Pedir vectores obligatoriamente', 'Cancelar la aproximación']],
      ['Antes de pedir una aproximación RNAV hay que comprobar…', 'El estado RAIM y la disponibilidad de satélites a la hora prevista', ['La frecuencia del localizador', 'El QNH de la alternativa', 'La MEA de la aerovía']],
      ['Longitud mínima del segmento inicial de una RNAV para un avión CAT A:', '3 NM', ['6 NM', '5 NM', '1 NM']]]);
    return single(rng, 'aproximaciones', c[0], c[1], c[2], c[1] + '.', { g: 'Aproximaciones RNAV' });
  };

  // 29. Fallo de comunicaciones y emergencias
  G.emergency = function (rng) {
    const c = pick(rng, [
      ['Fallo de comunicaciones en IFR, en VMC. ¿Qué haces?', 'Continúas en VMC y aterrizas lo antes posible', ['Sigues el plan de vuelo hasta el destino en IMC', 'Subes al nivel del plan', 'Esperas sobre el último fijo']],
      ['Fallo de comunicaciones en IMC bajo vectores radar. ¿Qué ruta sigues?', 'Directo al punto, ruta o aerovía especificada en la autorización', ['La ruta del plan de vuelo desde el origen', 'El último rumbo asignado indefinidamente', 'Directo al destino']],
      ['Fallo de comunicaciones en IMC sin ruta asignada ni prevista. ¿Qué ruta sigues?', 'La del plan de vuelo', ['Directo al alternativo', 'La última asignada a otro tráfico', 'Vuelves al origen']],
      ['Fallo de comunicaciones: tu altitud asignada es inferior a la MEA del tramo siguiente. ¿Cuándo subes?', 'Al llegar al punto en el que aumenta la MEA (antes si hay MCA, para cruzarlo a ella)', ['Inmediatamente', 'Nunca: mantienes la asignada', 'Al iniciar la aproximación']],
      ['Código transpondedor para fallo de comunicaciones:', '7600', ['7700', '7500', '2000']],
      ['Bajo control radar quieres declarar emergencia. ¿Pones 7700?', 'Mantienes el código actual hasta que el controlador pida cambiarlo', ['Sí, siempre de inmediato', 'Pones 7600', 'Apagas el transpondedor']],
      ['Según el código de conducta (B6), ¿puedes declarar emergencia en UNICOM?', 'No: solo si hay control de tránsito, y nunca para obtener prioridad', ['Sí, siempre que avises por texto', 'Sí, con 7700', 'Solo de noche']],
      ['El controlador te pide que finalices la emergencia simulada. ¿Qué haces?', 'Finalizarla de inmediato o desconectarte de la red', ['Mantenerla hasta aterrizar', 'Pasar a 7600', 'Cambiar de frecuencia']],
      ['¿Está permitido en VATSIM el código 7500?', 'No: está prohibido simular secuestros o interferencia ilícita', ['Sí, con aviso previo', 'Solo en eventos', 'Sí, en espacio aéreo sin control']],
      ['El combustible remanente no admite demoras. ¿Qué notificas?', 'Combustible mínimo, con los minutos aproximados que puedes seguir en vuelo', ['MAYDAY por combustible', 'PAN-PAN y 7700', 'Nada hasta estar en emergencia']],
      ['Una situación de urgencia (sin peligro inmediato) se notifica con…', 'PAN-PAN', ['MAYDAY ×3', '7500', 'SECURITÉ']],
      ['Te falla el indicador de rumbo y el ATC te da vectores sin giróscopo. ¿Cómo viras?', 'A razón estándar hasta que te digan que viras a final; después a medio estándar', ['Siempre a medio estándar', 'Con 30° de alabeo', 'A razón doble']],
      ['Fallo de comunicaciones con autorización hasta el punto de inicio de la aproximación y llegas antes de la hora prevista. ¿Qué haces?', 'Esperas y comienzas la aproximación lo más cerca posible de la hora prevista o ETA', ['Comienzas la aproximación de inmediato', 'Vuelves al origen', 'Asciendes a la MSA y esperas 30 min']],
      ['Sospechas que el indicador de actitud ha fallado. ¿Prioridad?', 'Volar el avión con panel parcial (tapar el instrumento), luego navegar y notificar', ['Notificar al ATC antes que nada', 'Reiniciar el instrumento', 'Seguir con el piloto automático']]]);
    return single(rng, 'briefing-emergencias', c[0], c[1], c[2], c[1] + '.', { g: 'Emergencias' });
  };

  // 30. Nubes y meteorología
  G.clouds = function (rng) {
    if (rng() < 0.45) {
      const base = pick(rng, [800, 2000, 4500, 6000, 8000, 12000, 18000, 22000, 28000]);
      const ans = base < 6500 ? 'Bajas' : base <= 20000 ? 'Medias' : 'Altas';
      return single(rng, 'meteorologia', `Nubes con la base a unos ${base.toLocaleString('es-ES')} ft AGL. Se clasifican como…`, ans, ['Bajas', 'Medias', 'Altas', 'De desarrollo vertical'], 'Bajas hasta 6 500 ft · medias 6 500–20 000 ft · altas por encima de 20 000 ft. Las de desarrollo vertical se definen por su forma.', { g: 'Nubes' });
    }
    const c = pick(rng, [
      ['Noche clara, sin viento, valle de montaña: ¿qué niebla esperas?', 'De radiación', ['De advección', 'De vapor', 'Frontal']],
      ['Aire cálido y húmedo moviéndose sobre una superficie fría en la costa:', 'Niebla de advección', ['Niebla de radiación', 'Niebla de vapor', 'Virga']],
      ['Aire frío y seco sobre aguas cálidas:', 'Niebla de vapor (humo de mar)', ['Niebla de advección', 'Niebla de radiación', 'Escarcha']],
      ['La niebla es una nube que empieza dentro de…', '50 ft de la superficie', ['500 ft', '1 000 ft', '6 500 ft']],
      ['Una microrráfaga típica…', 'Mide menos de 1 milla, dura ≈ 15 min y puede tener descendencias de 6 000 ft/min', ['Mide 10 NM y dura horas', 'Solo ocurre en invierno', 'Produce ascendencias de 500 ft/min']],
      ['¿A qué distancia conviene rodear una tormenta severa?', 'Al menos 20 NM', ['5 NM', '10 km', '2 NM']],
      ['La etapa más violenta de una tormenta es la de…', 'Madurez', ['Cúmulo', 'Disipación', 'Yunque']],
      ['Lluvia que se evapora antes de llegar al suelo:', 'Virga', ['Llovizna', 'Granizo', 'Gránulos de hielo']],
      ['Gránulos de hielo en superficie indican…', 'Una inversión térmica y lluvia helada en altura', ['Atmósfera inestable sin hielo', 'Niebla de radiación', 'Paso de un frente cálido ya completado']],
      ['¿Entre qué temperaturas se forma hielo claro con más rapidez en una tormenta?', 'Entre 0 °C y −15 °C', ['Entre +5 °C y 0 °C', 'Por debajo de −40 °C', 'Entre −20 °C y −40 °C']],
      ['Masa de aire que pasa sobre una superficie más cálida:', 'Inestable: cúmulos, chubascos, turbulencia y buena visibilidad', ['Estable: estratos, niebla y mala visibilidad', 'Estable y seca', 'No cambia']],
      ['Un frente frío rápido alcanza a un frente cálido lento:', 'Frente ocluido', ['Frente estacionario', 'Línea de turbonada', 'Inversión frontal']],
      ['El cambio de presión al paso de una tormenta puede dar un error de altímetro de…', 'Más de 100 ft en unos 15 min', ['Menos de 10 ft', '1 000 ft en una hora', 'Ninguno']],
      ['Viento de frente que pasa bruscamente a viento de cola:', 'Pérdida de velocidad y de rendimiento', ['Aumento de velocidad', 'Efecto globo', 'Ningún efecto']],
      ['Los sistemas de alta presión se asocian normalmente con…', 'Aire seco, estable y descendente: buen tiempo', ['Aire ascendente e inestable', 'Tormentas', 'Frentes cálidos']]]);
    return single(rng, 'meteorologia', c[0], c[1], c[2], c[1] + '.', { g: 'Meteorología' });
  };

  // 31. Mínimos y notación en la IAC
  G.iacMinima = function (rng) {
    const k = pick(rng, ['rvr', 'vis', 'cat', 'msa', 'da']);
    if (k === 'rvr') { const r = pick(rng, [18, 24, 40, 50, 60]); return single(rng, 'cartas', `En los mínimos de una carta aparece «R${r}». Significa…`, `RVR de ${(r * 100).toLocaleString('es-ES')} ft`, [`Visibilidad de ${r} millas`, `RVR de ${r} m`, `Radial ${r}`], 'R + centenas de pies = RVR; V = visibilidad.', { g: 'Lectura de IAC' }); }
    if (k === 'vis') { const v = pick(rng, [['V3/4', '3/4 de milla'], ['V1', '1 milla'], ['V2 1/2', '2 millas y media'], ['V1 1/2', '1 milla y media']]); return single(rng, 'cartas', `«${v[0]}» en la tabla de mínimos indica…`, `Visibilidad de ${v[1]}`, [`RVR de ${v[1]}`, `${v[0].slice(1)} km`, 'Techo requerido'], 'V = visibilidad en enteros y fracciones de milla; R = RVR.', { g: 'Lectura de IAC' }); }
    if (k === 'cat') { const vso = randint(rng, 40, 100); const v = Math.round(vso * 1.3); return single(rng, 'cartas', `La categoría de aproximación de un avión se basa en…`, '1,3 × VSO en configuración de aterrizaje con la masa máxima certificada', ['1,3 × VS1 con la masa real', 'La VNE', 'La velocidad de crucero'], `Por ejemplo, VSO ${vso} kt → ${v} kt.`, { g: 'Lectura de IAC' }); }
    if (k === 'msa') return single(rng, 'cartas', 'Si la carta no dice otra cosa, ¿qué radio tiene la MSA?', '25 NM', ['10 NM', '30 NM', '50 NM'], 'MSA: 25 NM salvo indicación, centrada en la radioayuda indicada.', { g: 'Lectura de IAC' });
    return single(rng, 'cartas', 'En los mínimos «DA 432' + "'" + ' (200' + "'" + ')», ¿qué es el valor entre paréntesis?', 'La altura sobre el terreno (umbral)', ['La altitud de transición', 'La RVR', 'La MSA'], 'DA (precisión) o MDA (no precisión), con la altura sobre el terreno entre paréntesis.', { g: 'Lectura de IAC' });
  };

  G.list = Object.keys(G).filter(k => typeof G[k] === 'function' && k !== 'list');
  G.combos = () => ({ holdEntry: 36 * 72 * 2, holdSpeed: 15 * 2, holdTiming: 12, holdTeardrop: 36 * 2 + 4, intercept: 72 * 36 * 2, interceptRule: 60, courseWind: 36 * 3 * 2 * 2,
    instrument: 72 * 3 + 3, arcEntry: 13 * 16 * 4, arcExit: 13 * 12 * 36 * 4, arcKeep: 5, ifrLevel: 72 * 20, minAlt: 87 * 2, stdTurn: 18 + 12, levelOff: 12 * 91 * 2 + 21,
    instClass: 16, climb: 72 + 1, atsRoute: 16 * 999 * 2, notam: 5 * 13 * 4 * 6, fplRoute: 6, fuel: 26 * 9, ilsCat: 13, ilsFacts: 40, ilsNeedles: 16 * 36, dme: 18,
    vor: 7, gnss: 11, rnavApp: 11, emergency: 14, clouds: 24, iacMinima: 70 });
  G.generate = (rng, name) => G[name || pick(rng, G.list)](rng);
  G.mulberry32 = a => function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  if (typeof module !== 'undefined' && module.exports) module.exports = G; else root.P2_GEN = G;
})(typeof window !== 'undefined' ? window : globalThis);
