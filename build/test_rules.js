/* Pruebas de reglas y generadores: node build/test_rules.js */
const R = require('../app/js/rules.js'), G = require('../app/js/generators.js');
let fails = 0; const t = (name, a, b) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fails++; console.log('FAIL', name, a, '≠', b); } };
// Ejemplos resueltos del curso P2 (Sección 7)
t('acerc <15 (135→145)', R.intercept(135, 145, true).heading, 115);
t('acerc 15–60 (250→210)', R.intercept(250, 210, true).heading, 280);
t('acerc 60–90 (330→045)', R.intercept(330, 45, true).heading, 315);
t('acerc pasada (R180 → curso 210)', [R.intercept(360, 210, true).tipo, R.intercept(360, 210, true).heading], ['pasada', 30]);
t('alej <15 (R320→R330)', R.intercept(140, 330, false).heading, 340);
t('alej 15–90 (R120→R050)', R.intercept(300, 50, false).heading, 5);
t('arco entrada acerc', R.arcTurnDME(13, 120, true), 13.6);
t('arco entrada alej', R.arcTurnDME(13, 120, false), 12.4);
t('arco salida 2,77°', Math.round(R.arcLeadDeg(120, 13) * 100) / 100, 2.77);
t('crono sobra 20 s', R.holdOutboundTime(80), 50);
t('crono falta 10 s', R.holdOutboundTime(50), 80);
t('gradiente 5 % 150 kt', R.climbRate(150, 5), 760);
t('gradiente 3,3 % 150 kt', R.climbRate(150, 3.3), 501);
[[75, 3.3, 251], [100, 3.3, 334], [200, 3.3, 668], [250, 3.3, 835], [300, 3.3, 1003], [75, 5, 380], [100, 5, 506], [200, 5, 1013], [250, 5, 1266], [300, 5, 1519]]
  .forEach(([g, p, v]) => t(`tabla ${g} kt ${p} %`, R.climbRate(g, p), v));
t('vel espera hélice', R.holdMaxSpeed(12000, true), 175);
t('vel espera reactor 6000', R.holdMaxSpeed(6000, false), 200);
t('vel espera reactor 6001', R.holdMaxSpeed(6001, false), 230);
t('vel espera reactor FL150', R.holdMaxSpeed(15000, false), 265);
t('gota estándar 360', R.teardropHeading(360, true), 150);
t('niveles E', R.ifrLevels(true).slice(-4), [370, 390, 410, 450].concat([490]).slice(-4));
t('FL290 este', R.ifrLevelOk(45, 290), true); t('FL300 oeste', R.ifrLevelOk(200, 300), true); t('FL430 oeste', R.ifrLevelOk(300, 430), true);
t('LOC 110,30', R.isLocFreq(110.3), true); t('VOR 110,20', R.isLocFreq(110.2), false);
t('alabeo 120 kt', R.bankStdTurn(120), 17);
t('ILS 200', R.ilsCat(200), 'CAT I'); t('ILS 150', R.ilsCat(150), 'CAT II'); t('ILS 80', R.ilsCat(80, 250), 'CAT IIIA'); t('ILS 40', R.ilsCat(40, 100), 'CAT IIIB');
t('UL', R.decodeRoute('UL401').upper, true);
// Generadores: estructura válida en miles de casos
const rng = G.mulberry32(12345); let n = 0;
for (const name of G.list) for (let i = 0; i < 400; i++) {
  const q = G[name](rng); n++;
  const bad = !q.t || !q.q || !Array.isArray(q.o) || q.o.length < 2 || new Set(q.o).size !== q.o.length || !q.a.length || q.a.some(x => x < 0 || x >= q.o.length) || !q.e || q.o.some(o => /undefined|NaN/.test(o)) || /undefined|NaN/.test(q.q + q.e);
  if (bad) { fails++; if (fails < 15) console.log('FAIL gen', name, JSON.stringify(q)); }
}
console.log(`${G.list.length} generadores · ${n} preguntas generadas · ${fails ? fails + ' fallos' : 'todo OK'}`);
process.exit(fails ? 1 : 0);
