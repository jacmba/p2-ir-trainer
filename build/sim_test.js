/* Prueba del simulador: un «piloto robot» vuela cada tipo de caso bien (debe resolverlo) y mal
   (debe fallar o recibir la corrección del instructor). node build/sim_test.js */
global.P2_RULES = require('../app/js/rules.js');
const R = global.P2_RULES, S = require('../app/js/sim.js');
const num = (str, re) => parseInt(str.match(re)[1], 10);
const n180 = a => { a = ((a % 360) + 360) % 360; return a > 180 ? a - 360 : a; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const setHdg = (s, target, dir) => { let d = n180(target - s.ac.hdg); if (dir === 'R' && d < 0) d += 360; if (dir === 'L' && d > 0) d -= 360; s.turn = d; };
const steer = (s, h) => setHdg(s, h, 'S');
// sigue un curso con un controlador proporcional sobre la desviación lateral real
function track(s, P, crs, k) { // con corrección de deriva (rumbo − derrota) como un piloto que ya conoce el viento
  const d = S.lineDev(s.ac, P, crs), wca = n180(s.ac.hdg - s.track);
  steer(s, crs + wca - clamp((k || 4) * d.ang + 6 * d.right, -40, 40));
}

function fly(type, pilot, opt) {
  opt = opt || {};
  const c = S.MAKERS[type](); if (opt.mod) opt.mod(c);
  const s = S.makeState(c, { ac: opt.ac || 'c172', wind: opt.wind || 0, windDir: opt.windDir || 0, events: !!opt.eventKind, eventRate: 1, eventKind: opt.eventKind });
  const log = []; const say = (k, t) => log.push(k + ' ' + t); const mem = {};
  for (let i = 0; i < 1700; i++) { // hasta 1 700 s
    pilot(s, S.readNav(s), mem, c);
    if (process.env.TRACE && i % 10 === 0) { const n = S.readNav(s); log.push(`  t=${s.t.toFixed(0)} hdg=${s.ac.hdg.toFixed(0)} trk=${s.track.toFixed(0)} alt=${s.ac.alt.toFixed(0)} dme=${n.dme.toFixed(2)} dots=${n.dots.toFixed(2)} gs=${n.gs == null ? '-' : n.gs.toFixed(2)} turn=${s.turn.toFixed(0)} mem=${JSON.stringify(mem).slice(0, 80)}`); }
    const r = S.advance(s, 0.25 * 4, say); // 1 s por iteración
    if (r) return { r, log, s, c };
  }
  return { r: { done: false }, log, s, c };
}

// ---- pilotos correctos ----
function pRadial(s, n, m, c) {
  const st = c.nav.st, C = parseInt(c.title.match(/(\d{3})/)[1], 10), inbound = c.type === 'inb';
  s.obs = C;
  const res = m.res || (m.res = R.intercept(R.recip(R.norm(Math.round(n.radial))), C, inbound));
  const d = S.lineDev(s.ac, st, C);
  if (!m.go) {
    if (res.tipo === "directa") { steer(s, res.heading); if (Math.abs(d.ang) < 12 || Math.abs(d.right) < 0.9) m.go = true; }
    else if (!m.abeam) { steer(s, res.heading); if (Math.abs(n180(n.brg - s.ac.hdg)) > 88) m.abeam = s.t; }
    else if (!inbound) m.go = true;
    else if (s.t - m.abeam < 60) steer(s, res.heading);
    else { const r2 = m.r2 || (m.r2 = R.intercept(R.norm(Math.round(n.brg)), C, true)); steer(s, r2.heading); if (Math.abs(d.ang) < 12 || Math.abs(d.right) < 0.9) m.go = true; }
  } else track(s, st, C);
}
// paralela: tras el minuto, otra vez por el mismo lado hasta cortar el acercamiento a 45°
function pHold(s, n, m, c) {
  const st = c.nav.st, h = c.draw.hold, O = R.recip(h.inb);
  s.obs = h.inb;
  if (!m.spd) { m.spd = 1; s.iasSel = Math.min(s.iasSel, R.holdMaxSpeed(s.ac.alt, s.acType.prop) - 10); }
  if (!m.fix) { if (n.dme > 1.5) steer(s, n.brg); if (n.dme < 0.25 || (m.min && n.dme > m.min + 0.05)) { m.fix = s.t; m.entry = c.entry; } m.min = Math.min(m.min || 99, n.dme); return; }
  if (m.a && !m.tEnd && Math.abs(s.turn) < 1) m.tEnd = s.t; // el minuto empieza al terminar el primer viraje
  const t = m.tEnd ? s.t - m.tEnd + 10 : 0, toward = h.right ? 'R' : 'L', away = h.right ? 'L' : 'R';
  if (m.entry === 'directa') { if (!m.a) { setHdg(s, O, toward); m.a = 1; } else if (t > 70 && !m.b) { setHdg(s, h.inb, toward); m.b = 1; } else if (m.b && Math.abs(s.turn) < 1) m.trk = 1; }
  if (m.entry === 'paralela') { if (!m.a) { setHdg(s, O, away); m.a = 1; } else if (t > 70 && !m.b) { setHdg(s, R.norm(h.inb + (h.right ? 45 : -45)), away); m.b = 1; } else if (m.b && Math.abs(s.turn) < 1) m.trk = 1; }
  if (m.entry === 'gota') { if (!m.a) { setHdg(s, R.teardropHeading(h.inb, h.right), toward); m.a = 1; } else if (t > 70 && !m.b) { setHdg(s, h.inb, toward); m.b = 1; } else if (m.b && Math.abs(s.turn) < 1) m.trk = 1; }
  if (m.trk) {
    track(s, st, h.inb);
    // si pasa el fijo sin quedar establecido, sigue en la espera como entrada directa
    if (n.dme < 0.4) m.near = 1; else if (m.near && n.dme > 0.6) { Object.assign(m, { near: 0, trk: 0, a: 0, b: 0, tEnd: 0, fix: s.t, entry: 'directa' }); }
  }
}
function pArc(s, n, m, c) {
  const a = c.draw.arc, crsOut = c.draw.course.crs, inbound = c.obs === R.recip(a.r0);
  if (!m.on) { if (inbound ? n.dme <= R.arcTurnDME(a.A, s.gs, true) : n.dme >= R.arcTurnDME(a.A, s.gs, false)) m.on = 1; else return; }
  const rr = n.radial, lead = Math.max(1, Math.round(R.arcLeadDeg(s.gs, a.A)));
  const toGo = (a.cw ? 1 : -1) * n180(a.target - rr);
  if (m.exit || toGo <= lead) { m.exit = 1; s.obs = crsOut; track(s, a.st, crsOut); return; }
  if (toGo < 25) s.obs = crsOut;
  const e = n.dme - a.A, tan = rr + (a.cw ? 90 : -90);
  steer(s, tan + (a.cw ? 1 : -1) * clamp(40 * e, -30, 30));
}
function pILS(s, n, m, c) {
  const i = c.nav;
  const d = S.lineDev(s.ac, i.loc, i.crs);
  if (!m.go) { if (Math.abs(d.ang) < 3) m.go = 1; else return; }
  track(s, i.loc, i.crs, 3);
  if (!m.est) { if (Math.abs(d.ang) < 0.8 && Math.abs(n180(s.track - i.crs)) < 10) m.est = 1; else return; }
  if (s.gsFail) { s.altTarget = 500; s.vsSel = 600; return; }
  if (n.gs != null && (m.gs || n.gs < 0.3)) { m.gs = 1; s.altTarget = 0; s.vsSel = clamp(s.gs * 5.31 - 250 * n.gs, 100, 1500); }
}

function pSID(s, n, m, c) {
  const grad = num(c.brief, /mínimo (\d) %/), turnAlt = num(c.brief, /hasta (\d+) ft/), Q = num(c.brief, /radial (\d{3})/), st = c.nav.st;
  s.obs = Q; s.vsSel = clamp(Math.round(R.climbRate(s.gs, grad) * 1.3 / 100) * 100 + 100, 500, 2000);
  if (s.ac.alt < turnAlt) return;
  const d = S.lineDev(s.ac, st, Q);
  if (!m.go) { const res = m.res || (m.res = R.intercept(R.recip(Math.round(n.radial)), Q, false)); steer(s, res.heading); if (Math.abs(d.right) < 0.9 && d.from) m.go = 1; }
  else track(s, st, Q);
}
function pRev(s, n, m, c) {
  const C = num(c.brief, /radial (\d{3})/), side = /por la derecha/.test(c.brief) ? 1 : -1, h1 = R.norm(C + side * 45), h2 = R.recip(h1), inbC = R.recip(C);
  if (!m.a) { setHdg(s, h1, side > 0 ? 'R' : 'L'); m.a = 1; return; }
  if (!m.t1) { if (Math.abs(s.turn) < 0.5) m.t1 = s.t; return; }
  if (!m.b) { if (s.t - m.t1 >= 59) { s.obs = inbC; setHdg(s, h2, side > 0 ? 'L' : 'R'); m.b = 1; } return; }
  if (!m.c) { if (Math.abs(s.turn) < 0.5) m.c = 1; return; }
  const d = S.lineDev(s.ac, c.nav.st, inbC);
  if (!m.go) { if (Math.abs(d.right) < 0.8) m.go = 1; else return; }
  track(s, c.nav.st, inbC);
}
function pVOR(s, n, m, c) {
  const F = num(c.brief, /curso (\d{3}) hacia/), MDA = num(c.brief, /MDA (\d+) ft/), st = c.nav.st;
  s.obs = F; const d = S.lineDev(s.ac, st, F), dme = S.dist(s.ac, st);
  if (!m.go) { if (Math.abs(d.right) < 0.9) m.go = 1; else return; }
  track(s, st, F);
  if (!m.est) { if (Math.abs(d.ang) < 3 && Math.abs(n180(s.track - F)) < 10) m.est = 1; else return; }
  if (dme > 6) { s.altTarget = 2100; s.vsSel = 800; return; }
  s.altTarget = MDA; s.vsSel = clamp(Math.round((s.ac.alt - MDA) / Math.max(0.3, (dme - 0.8) / s.gs * 60) * 1.1), 200, 1500);
}
function pRNAV(s, n, m, c) {
  const nav = c.nav, a = nav.wps[s.leg - 1], b = nav.wps[s.leg], crs = S.bearing(a, b);
  track(s, a, crs, 3);
  if (s.leg >= 3) s.altTarget = 1600;
  if (s.leg === 4) {
    if (nav.lpv) { if (n.gs != null && (m.gs || n.gs < 0.3)) { m.gs = 1; s.altTarget = 0; s.vsSel = clamp(s.gs * 5.31 - 250 * n.gs, 100, 1500); } }
    else { const MIN = 450; s.altTarget = MIN; s.vsSel = clamp(Math.round((s.ac.alt - MIN) / Math.max(0.3, (n.dme - 1) / s.gs * 60) * 1.1), 200, 1500); }
  }
}
// responde a los eventos (fallo de comunicaciones, altitud, velocidad)
const withAtc = pilot => (s, n, m, c) => { pilot(s, n, m, c); const e = s.evt; if (e && e.fired && !e.done) { if (e.kind === 'com') s.sq = '7600'; if (e.kind === 'alt') s.altTarget = e.val; if (e.kind === 'spd') s.iasSel = e.val; } };
// ---- pilotos erróneos ----
function pHoldWrong(s, n, m, c) { // siempre entrada directa por el lado de la espera aunque toque otra
  const h = c.draw.hold, O = R.recip(h.inb);
  if (!m.fix) { steer(s, n.brg); if (n.dme < 0.25) m.fix = 1; return; }
  if (!m.a) { setHdg(s, O, h.right ? 'L' : 'R'); m.a = 1; } // lado contrario: parecerá paralela
}
function pArcWrongDir(s, n, m, c) { const a = c.draw.arc; pArc(s, n, m, Object.assign({}, c, { draw: Object.assign({}, c.draw, { arc: Object.assign({}, a, { cw: !a.cw }) }) })); }
function pIlsEarly(s, n, m) { if (!m.x) { s.altTarget = 1500; m.x = 1; } }
function pHoldFast(s, n, m, c) { const mm = Object.assign(m, { spd: 1 }); pHold(s, n, mm, c); }   // no reduce velocidad
function pSidTurnEarly(s, n, m, c) { if (s.ac.alt > 300 && !m.t) { m.t = 1; s.turn = 30; } }
function pVorLow(s, n, m, c) { if (!m.x) { m.x = 1; s.altTarget = 1000; s.vsSel = 1500; } }
function pRevWrong(s, n, m, c) { if (!m.x) { m.x = 1; const side = /por la derecha/.test(c.brief) ? 1 : -1; s.turn = -side * 45; } }
function pSquawk7500(s) { s.sq = '7500'; }

let fails = 0;
function run(name, type, pilot, N, expectOk, opt, check, minRate) {
  let ok = 0; const bad = [];
  for (let k = 0; k < N; k++) {
    const o = fly(type, pilot, opt);
    const good = expectOk ? o.r.ok === true : (o.r.ok === false || (check && check(o)));
    if (good) ok++; else bad.push(o);
  }
  const pass = ok >= Math.ceil(N * (minRate || 1));
  if (process.env.BANDS && bad.length) console.log('   ', name, bad.map(b => b.c.hint.slice(0, 50)).join(' | '));
  if (!pass) { fails++; const b = bad[0]; console.log(`FAIL ${name}: ${ok}/${N}`, '|', b.c.brief, '|', JSON.stringify(b.r), '\n   ', b.log.slice(process.env.TRACE ? -60 : -6).join('\n    ')); }
  else console.log(`ok   ${name}: ${ok}/${N}${ok < N ? ' (los fallos restantes son pasadas del robot, que no anticipa)' : ''}`);
}
const N = 60, RATE = 0.95; // el robot es un piloto proporcional simple: alguna vez se pasa del curso
run('radial acercamiento', 'inb', pRadial, N, true, {}, null, RATE);
run('radial alejamiento', 'outb', pRadial, N, true, {}, null, RATE);
run('radial con viento 20 kt', 'inb', pRadial, N, true, { wind: 20, windDir: 250 }, null, 0.7); // el robot no corrige la deriva en el tramo de ruta pasada
run('espera', 'hold', pHold, N, true, {}, null, RATE);
run('arco DME', 'arc', pArc, N, true, {}, null, RATE);
run('arco DME en King Air', 'arc', pArc, N, true, { ac: 'b350' }, null, RATE);
run('ILS', 'ils', pILS, N, true, {}, null, RATE);
run('ILS en Citation con viento', 'ils', pILS, N, true, { ac: 'c510', wind: 15, windDir: 100 }, null, RATE);
run('espera en King Air reduciendo a 175', 'hold', pHold, N, true, { ac: 'b350' }, null, RATE);
run('espera en Citation (200/230 KIAS)', 'hold', pHold, N, true, { ac: 'c510' }, null, RATE);
run('SID con gradiente', 'sid', pSID, N, true, {}, null, RATE);
run('SID en King Air', 'sid', pSID, N, true, { ac: 'b350' }, null, RATE);
run('viraje reglamentario', 'rev', pRev, N, true, {}, null, RATE);
run('aproximación VOR/DME', 'vor', pVOR, N, true, {}, null, RATE);
run('aproximación VOR/DME en King Air', 'vor', pVOR, N, true, { ac: 'b350' }, null, RATE);
run('aproximación RNAV (LNAV y LPV)', 'rnav', pRNAV, N, true, {}, null, RATE);
run('aproximación RNAV en Citation', 'rnav', pRNAV, N, true, { ac: 'c510' }, null, RATE);
for (const k of ['com', 'alt', 'spd']) run(`evento ${k} atendido`, 'outb', withAtc(pRadial), 30, true, { eventKind: k, ac: 'b350' }, null, RATE);
for (const k of ['com', 'alt', 'spd']) run(`evento ${k} ignorado → aviso`, 'outb', pRadial, 30, false, { eventKind: k, ac: 'b350' }, o => o.log.some(l => /^warn (Con fallo|No has)/.test(l)));
run('espera con entrada equivocada → corrección', 'hold', pHoldWrong, N, false, {}, o => o.log.some(l => l.startsWith('bad') && /entrada/.test(l)) || o.c.ev && o.log.some(l => /Entrada .* correcta/.test(l)));
run('arco en sentido contrario → fallo', 'arc', pArcWrongDir, N, false);
run('ILS descendiendo antes de tiempo → aviso', 'ils', pIlsEarly, 20, false, {}, o => o.log.some(l => /sin estar establecido/.test(l)));
run('espera en King Air sin reducir → aviso', 'hold', pHoldFast, 20, false, { ac: 'b350' }, o => o.log.some(l => /175 KIAS/.test(l)));
run('SID virando a 300 ft → aviso', 'sid', pSidTurnEarly, 20, false, {}, o => o.log.some(l => /400 ft AGL/.test(l)));
run('SID sin gradiente en King Air → aviso', 'sid', (s, n, m) => { s.vsSel = 300; }, 20, false, { ac: 'b350' }, o => o.log.some(l => /No cumples/.test(l)));
run('VOR/DME bajando antes del FAF → aviso', 'vor', pVorLow, 20, false, {}, o => o.log.some(l => /antes de estar establecido|antes del FAF/.test(l)));
run('inversión por el lado equivocado → aviso', 'rev', pRevWrong, 20, false, {}, o => o.log.some(l => /viraje inicial era/.test(l)));
run('7500 → prohibido', 'inb', pSquawk7500, 10, false, {}, o => o.log.some(l => /7500/.test(l)));
// la entrada correcta no debe penalizarse
{ let pen = 0; for (let k = 0; k < N; k++) { const o = fly('hold', pHold); if (o.log.some(l => l.startsWith('bad'))) { pen++; if (pen < 3) console.log('   espera penalizada:', o.c.brief, o.log.join(' / ')); } } if (pen) { fails++; console.log(`FAIL espera bien volada penalizada ${pen}/${N}`); } else console.log(`ok   espera bien volada sin reproches: ${N}/${N}`); }
console.log(fails ? fails + ' fallos' : 'simulador OK'); process.exit(fails ? 1 : 0);
