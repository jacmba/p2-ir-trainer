/* Prueba de humo con jsdom (npm i jsdom@24): node build/smoke_test.js
   Recorre vistas, temas, test, escenarios y los cuatro entrenadores de la Cabina IFR. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const A = require('path').join(__dirname, '..', 'app') + '/';
const html = fs.readFileSync(A + 'index.html', 'utf8').replace(/<script src="js\/(\w+)\.js"><\/script>/g, (m, n) => `<script>${fs.readFileSync(A + 'js/' + n + '.js', 'utf8')}</script>`).replace(/<link[^>]+>/g, '');
const errs = []; const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://x.test/' });
const w = dom.window; w.addEventListener('error', e => errs.push(e.message)); w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {};
const $ = s => w.document.querySelector(s), $$ = s => [...w.document.querySelectorAll(s)];
const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
let fail = 0; const must = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } };
setTimeout(() => {
  try {
    const nt = $$('.tile').length; console.log('temas', nt); must(nt === 11, 'once temas');
    for (let t = 0; t < nt; t++) {
      click($('[data-view="temario"]')); click($$('.tile')[t]);
      console.log(' ', $('h1').textContent, '· figuras', $$('.fig svg').length, '· tablas', $$('.tbl').length);
      must($('.essential'), 'lo esencial ' + t);
    }
    for (const v of ['resumenes', 'flashcards', 'test', 'cabina', 'chuleta']) { click($(`[data-view="${v}"]`)); must($('h1'), v); }
    click($('[data-view="flashcards"]')); click($('#fc')); click($('#yes')); must(/sesión: 1\/1/.test($('.qbar .muted').textContent), 'flashcard');
    click($('[data-view="test"]')); click($$('#cnt button')[3]); click($('#start')); let vz = 0;
    for (let k = 0; k < 80; k++) { if ($('.vizbox svg')) vz++; click($$('.opt')[0]); if ($('#check')) click($('#check')); click($('#next')); }
    console.log('test:', $('h1').textContent, '· con instrumento', vz); must(/\/ 80/.test($('h1').textContent), 'test 80');
    click($('[data-view="cabina"]')); click($('[data-tab="esc"]')); const n = $$('[data-s]').length; console.log('escenarios', n);
    let insts = 0;
    for (let s = 0; s < n; s++) {
      click($('[data-view="cabina"]')); click($('[data-tab="esc"]')); click($$('[data-s]')[s]); let g = 0;
      while ($('#ck') || $('#nx')) { if (g++ > 40) break; if ($('#ck')) { if ($('.panelinst svg')) insts++; click($$('.opt')[0]); click($('#ck')); } else click($('#nx')); }
      must($('#rep'), 'escenario ' + s);
    }
    console.log('pasos con instrumento', insts);
    let ok = 0;
    for (let i = 0; i < 40; i++) {
      click($('[data-view="cabina"]')); click($('[data-tab="int"]')); const b = $$('#band button'); click(b[i % b.length]);
      if ($('#hdgin')) { $('#hdgin').value = '100'; click($('#chk')); } else if ($$('#ans .opt').length) click($$('#ans .opt')[0]);
      if ($('#fb .feedback')) ok++;
    }
    console.log('interceptaciones', ok, '|', $('#fb .feedback').textContent.slice(0, 120)); must(ok === 40, 'int');
    ok = 0; for (let i = 0; i < 40; i++) { click($('[data-view="cabina"]')); click($('[data-tab="hold"]')); click($$('#cab .opt')[i % 3]); if ($('#cab .feedback')) ok++; }
    console.log('esperas', ok); must(ok === 40, 'hold');
    for (const tab of ['arc', 'time']) {
      ok = 0;
      for (let i = 0; i < 30; i++) { click($('[data-view="cabina"]')); click($(`[data-tab="${tab}"]`)); $('#nin').value = '12,4'; click($('#chk')); if ($('#fb .feedback')) ok++; }
      console.log(tab, ok, '|', $('#fb .feedback').textContent.slice(0, 100)); must(ok === 30, tab);
    }
  } catch (e) { fail++; console.log('EXC', e.stack); }
  console.log('errores JS', errs.length ? errs : 'ninguno'); process.exit(fail || errs.length ? 1 : 0);
}, 300);
