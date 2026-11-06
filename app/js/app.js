/* Cabina P2 — app de estudio del P2 (IFR) de VATSIM. Vanilla JS, sin dependencias. */
(function () {
  'use strict';
  const D = window.APP_DATA, R = window.P2_RULES, G = window.P2_GEN;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const rnd = Math.random;
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const topicById = Object.fromEntries(D.topics.map(t => [t.id, t]));
  const topicName = id => (topicById[id] || {}).title || id;
  const VIEW = $('#view');
  const PFX = 'p2.';

  // ---------- almacenamiento local (opcional) ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem(PFX + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(PFX + k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }
  };
  // ---------- progreso: exportar, importar y borrar ----------
  const progress = {
    keys() { try { return Object.keys(localStorage).filter(k => k.startsWith(PFX)); } catch (e) { return []; } },
    dump() { const o = {}; for (const k of this.keys()) { try { o[k] = JSON.parse(localStorage.getItem(k)); } catch (e) { /* no JSON */ } } return o; },
    exportFile() {
      const blob = new Blob([JSON.stringify({ app: 'p2-ir-trainer', version: 1, date: new Date().toISOString(), data: this.dump() }, null, 1)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `p2-ir-trainer-progreso-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },
    importText(txt) {
      const j = JSON.parse(txt); const data = j && j.app === 'p2-ir-trainer' && j.data;
      if (!data || typeof data !== 'object') throw new Error('No es un archivo de progreso de esta app.');
      const keys = Object.keys(data).filter(k => k.startsWith(PFX)); if (!keys.length) throw new Error('El archivo no contiene progreso.');
      for (const k of keys) localStorage.setItem(k, JSON.stringify(data[k]));
      return keys.length;
    },
    reset() { for (const k of this.keys()) localStorage.removeItem(k); }
  };

  // ---------- markdown mínimo ----------
  function inline(t) {
    t = esc(t);
    t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
    t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/(^|[^\w/])_([^_]+?)_(?!\w)/g, '$1<em>$2</em>');
    t = t.replace(/\\\*/g, '*');
    return t;
  }
  const slug = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const LIST = /^(\s*)([-*]|\d+\.)\s+(.*)/;
  function list(L, i) { // lista con un nivel de anidamiento
    const base = LIST.exec(L[i])[1].length, ordered = /\d/.test(LIST.exec(L[i])[2]); const items = [];
    while (i < L.length) {
      const m = LIST.exec(L[i]); if (!m) break;
      const ind = m[1].length;
      if (ind > base && items.length) { const sub = list(L, i); items[items.length - 1].sub = sub.html; i = sub.i; continue; }
      if (ind < base) break;
      items.push({ t: m[3] }); i++;
    }
    const tag = ordered ? 'ol' : 'ul';
    return { html: `<${tag}>` + items.map(x => `<li>${inline(x.t)}${x.sub || ''}</li>`).join('') + `</${tag}>`, i };
  }
  function md(src) {
    const L = src.split('\n'); let i = 0, out = '', para = [];
    const flush = () => { if (para.length) { out += '<p>' + inline(para.join(' ')) + '</p>'; para = []; } };
    while (i < L.length) {
      const ln = L[i].replace(/\s+$/, '');
      if (!ln.trim()) { flush(); i++; continue; }
      if (ln.startsWith('## ')) { flush(); const t = ln.slice(3); out += `<h2 id="${slug(t)}">${inline(t)}</h2>`; i++; continue; }
      if (ln.startsWith('### ')) { flush(); out += `<h3>${inline(ln.slice(4))}</h3>`; i++; continue; }
      if (ln.startsWith('|')) {
        flush(); const rows = [];
        while (i < L.length && L[i].startsWith('|')) { const c = L[i].trim().replace(/^\||\|$/g, '').split('|').map(x => x.trim()); if (!c.every(x => /^:?-{3,}:?$/.test(x))) rows.push(c); i++; }
        out += '<div class="tbl"><table><thead><tr>' + rows[0].map(c => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>' +
          rows.slice(1).map(r => '<tr>' + r.map(c => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>';
        continue;
      }
      let m = /^!\[fig:([^|\]]+)\|?([^\]]*)\]/.exec(ln);
      if (m) { flush(); if (D.diagrams[m[1]]) out += `<figure class="fig"><div class="svg">${D.diagrams[m[1]]}</div><figcaption>${esc(m[2])}</figcaption></figure>`; i++; continue; }
      if (ln.startsWith('> [!')) {
        flush(); const kind = /> \[!(\w+)\]/.exec(ln)[1]; const buf = [ln.replace(/^> \[!\w+\]\s*/, '')]; i++;
        while (i < L.length && L[i].startsWith('>') && !L[i].startsWith('> [!')) { buf.push(L[i].slice(1).trim()); i++; }
        out += `<div class="call ${kind}"><span class="lbl">${kind === 'vatsim' ? 'VATSIM · NOTA' : 'CLAVE'}</span>${buf.filter(Boolean).map(inline).join('<br>')}</div>`;
        continue;
      }
      if (ln.startsWith('>')) {
        flush(); const buf = [];
        while (i < L.length && L[i].startsWith('>')) { const s = L[i].slice(1).trim(); if (s) buf.push(`<div>${inline(s)}</div>`); i++; }
        out += `<div class="radio">${buf.join('')}</div>`; continue;
      }
      if (LIST.test(ln)) { flush(); const r = list(L, i); out += r.html; i = r.i; continue; }
      para.push(ln.trim()); i++;
    }
    flush(); return out;
  }

  // ---------- estadísticas ----------
  const stats = store.get('stats', {}); // {topic: {ok, n}}
  function recordAnswer(topic, ok) { const s = stats[topic] || (stats[topic] = { ok: 0, n: 0 }); s.n++; if (ok) s.ok++; store.set('stats', stats); }
  const readTopics = store.get('read', {});

  // ---------- navegación ----------
  let state = { view: 'temario', topic: null };
  let keyHandler = null, unmount = null;
  function go(view, extra) {
    state = Object.assign({ view }, extra || {});
    keyHandler = null;
    if (unmount) { unmount(); unmount = null; }
    $$('#nav button').forEach(b => b.setAttribute('aria-current', b.dataset.view === view ? 'page' : 'false'));
    store.set('view', view);
    ({ temario: viewTemario, resumenes: viewResumenes, flashcards: viewFlash, test: viewTest, cabina: viewCabina, simulador: viewSim, chuleta: viewChuleta })[view]();
    try { window.scrollTo(0, 0); } catch (e) { /* entorno sin scroll */ }
  }
  $$('#nav button').forEach(b => b.addEventListener('click', () => go(b.dataset.view)));
  document.addEventListener('keydown', e => { if (keyHandler && !e.target.closest('input,textarea')) keyHandler(e); });

  // ---------- TEMARIO ----------
  function viewTemario() {
    if (state.topic) return viewTopic(state.topic);
    const tiles = D.topics.map(t => {
      const s = stats[t.id]; const pct = s && s.n ? Math.round(100 * s.ok / s.n) : null;
      const nQ = D.questions.filter(q => q.t === t.id).length, nF = D.flashcards.filter(f => f.topic === t.id).length;
      return `<button class="tile" data-topic="${t.id}"><span class="n">${t.num}</span><span><span class="t">${esc(t.title)}${readTopics[t.id] ? ' <span class="muted small">✓</span>' : ''}</span>
        <span class="m">${nQ} preguntas · ${nF} flashcards${pct != null ? ` · aciertos ${pct}% (${s.n})` : ''}</span>
        ${pct != null ? `<span class="progress"><i style="width:${pct}%"></i></span>` : ''}</span></button>`;
    }).join('');
    const nRead = D.topics.filter(t => readTopics[t.id]).length;
    const nAns = Object.values(stats).reduce((a, x) => a + x.n, 0), nOk = Object.values(stats).reduce((a, x) => a + x.ok, 0);
    VIEW.innerHTML = `<div class="view-head"><div><div class="eyebrow">Curso P2 VATSUR · ${D.topics.length} temas${nRead ? ` · ${nRead} leído${nRead > 1 ? 's' : ''}` : ''}</div><h1>Temario</h1>
      <p>Las siete secciones del curso P2 – Habilitación por Instrumentos, organizadas en temas, con diagramas, tablas y los puntos clave destacados. Un tema cuenta como leído al llegar a su final.</p></div></div>
      <div class="grid cols-3">${tiles}</div>
      <section class="panel" style="padding:14px 18px;margin-top:22px" aria-labelledby="prog-h">
        <div class="row" style="justify-content:space-between"><h2 id="prog-h" style="font-family:var(--display);text-transform:uppercase;letter-spacing:.05em;font-size:20px;margin:0">Tu progreso</h2>
          <div class="row"><button class="btn" id="pExp">Exportar</button><button class="btn" id="pImp">Importar…</button><button class="btn ghost" id="pDel">Borrar todo</button><input type="file" id="pFile" accept="application/json,.json" hidden></div></div>
        <p class="small muted" style="margin:6px 0 0">${nRead}/${D.topics.length} temas leídos · ${nAns} preguntas respondidas${nAns ? ` (${Math.round(100 * nOk / nAns)}% aciertos)` : ''}. Se guarda en este navegador; exporta un archivo para llevarlo a otro equipo.</p>
        <p class="small" id="pMsg" role="status" style="margin:6px 0 0"></p>
      </section>`;
    $$('.tile', VIEW).forEach(b => b.addEventListener('click', () => go('temario', { topic: b.dataset.topic })));
    const msg = t => { $('#pMsg').textContent = t; };
    $('#pExp').onclick = () => { progress.exportFile(); msg('Progreso exportado.'); };
    $('#pImp').onclick = () => $('#pFile').click();
    $('#pFile').onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      f.text().then(txt => {
        if (!confirm('Importar este archivo sustituye el progreso guardado en este navegador. ¿Continuar?')) return;
        const n = progress.importText(txt); msg(`Importados ${n} datos. Recargando…`); setTimeout(() => location.reload(), 600);
      }).catch(err => msg('No se pudo importar: ' + err.message));
    };
    $('#pDel').onclick = () => { if (confirm('¿Borrar todo el progreso guardado en este navegador? No se puede deshacer.')) { progress.reset(); location.reload(); } };
  }
  function viewTopic(id) {
    const t = topicById[id], idx = D.topics.indexOf(t);
    const prev = D.topics[idx - 1], next = D.topics[idx + 1];
    const heads = (t.md.match(/^## .+$/gm) || []).map(h => h.slice(3));
    VIEW.innerHTML = `<div class="view-head"><div><div class="eyebrow">Tema ${t.num} de ${D.topics.length} · ${esc(t.src)}</div><h1>${esc(t.title)}</h1></div>
      <div class="row"><button class="btn ghost" id="back">← Todos los temas</button><button class="btn" id="tq">Test de este tema</button><button class="btn" id="tf">Flashcards</button></div></div>
      <div class="reader"><article class="doc">${md(t.md)}
        ${D.summaries[id] ? `<section class="essential"><h3>Lo esencial</h3>${md(D.summaries[id])}</section>` : ''}
        <div class="pager" id="endmark">${prev ? `<button class="btn" data-go="${prev.id}">← ${esc(prev.title)}</button>` : '<span></span>'}${next ? `<button class="btn primary" data-go="${next.id}">${esc(next.title)} →</button>` : ''}</div>
      </article><nav class="toc" aria-label="En este tema">${heads.map(h => `<a href="#${slug(h)}" data-anchor="${slug(h)}">${esc(h)}</a>`).join('')}<a href="#" data-anchor="esencial">Lo esencial</a></nav></div>`;
    $('#back').onclick = () => go('temario');
    $('#tq').onclick = () => { testCfg.topics = [id]; go('test', { autostart: true }); };
    $('#tf').onclick = () => { flashCfg.topics = [id]; go('flashcards'); };
    $$('[data-go]', VIEW).forEach(b => b.onclick = () => go('temario', { topic: b.dataset.go }));
    $$('.toc a', VIEW).forEach(a => a.onclick = e => { e.preventDefault(); const el = a.dataset.anchor === 'esencial' ? $('.essential', VIEW) : document.getElementById(a.dataset.anchor); if (el) el.scrollIntoView({ behavior: 'smooth' }); });
    const mark = () => { if (!readTopics[id]) { readTopics[id] = Date.now(); store.set('read', readTopics); } };
    if ('IntersectionObserver' in window) { const io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) { mark(); io.disconnect(); } }); io.observe($('#endmark')); }
  }

  // ---------- RESÚMENES ----------
  function viewResumenes() {
    const sel = state.topic || 'all';
    const lst = sel === 'all' ? D.topics : [topicById[sel]];
    VIEW.innerHTML = `<div class="view-head"><div><div class="eyebrow">Repaso rápido</div><h1>Resúmenes</h1>
      <p>Lo imprescindible de cada tema en una sola pantalla. Ideal la noche antes del examen.</p></div></div>
      <div class="row" style="margin-bottom:14px"><span class="chip ${sel === 'all' ? 'on' : ''}"><button style="all:unset;cursor:pointer" data-s="all">Todos</button></span>
      ${D.topics.map(t => `<span class="chip ${sel === t.id ? 'on' : ''}"><button style="all:unset;cursor:pointer" data-s="${t.id}">${t.num}. ${esc(t.title)}</button></span>`).join('')}</div>
      <div class="grid">${lst.map(t => `<article class="doc"><div class="eyebrow">Tema ${t.num}</div><h2 style="margin-top:4px;border:0;padding:0">${esc(t.title)}</h2>${md(D.summaries[t.id] || '')}
        <div class="row"><button class="btn" data-open="${t.id}">Leer el tema completo →</button></div></article>`).join('')}</div>`;
    $$('[data-s]', VIEW).forEach(b => b.onclick = () => go('resumenes', { topic: b.dataset.s === 'all' ? null : b.dataset.s }));
    $$('[data-open]', VIEW).forEach(b => b.onclick = () => go('temario', { topic: b.dataset.open }));
  }

  // ---------- FLASHCARDS (Leitner 1–5) ----------
  const flashCfg = { topics: null };
  const boxes = store.get('boxes', {});
  const fcId = c => slug(c.topic + '-' + c.front).slice(0, 80);
  function viewFlash() {
    const topics = flashCfg.topics;
    const pool = D.flashcards.filter(c => !topics || topics.includes(c.topic));
    const boxOf = c => boxes[fcId(c)] || 1;
    const queue = shuffle(pool).sort((a, b) => boxOf(a) - boxOf(b));
    let cur = 0, flipped = false, seen = 0, known = 0;
    function counts() { const n = [0, 0, 0, 0, 0]; pool.forEach(c => n[boxOf(c) - 1]++); return n; }
    function render() {
      const c = queue[cur]; const n = counts();
      VIEW.innerHTML = `<div class="view-head"><div><div class="eyebrow">Repetición espaciada · ${pool.length} tarjetas</div><h1>Flashcards</h1>
        <p>Toca la tarjeta (o pulsa espacio) para darle la vuelta. Las que no sabes vuelven a la caja 1 y salen antes; las que sabes suben de caja.</p></div></div>
        <div class="row" style="margin-bottom:12px"><span class="chip ${!topics ? 'on' : ''}"><button style="all:unset;cursor:pointer" data-t="all">Todos</button></span>
        ${D.topics.map(t => `<span class="chip ${topics && topics.includes(t.id) ? 'on' : ''}"><button style="all:unset;cursor:pointer" data-t="${t.id}">${esc(t.title)}</button></span>`).join('')}</div>
        <div class="box-row" style="margin-bottom:14px">${n.map((x, i) => `<div><b class="tabular">${x}</b><span>Caja ${i + 1}</span></div>`).join('')}</div>
        ${c ? `<div class="card-stage"><div class="fcard ${flipped ? 'flip' : ''}" id="fc" role="button" tabindex="0" aria-label="Dar la vuelta a la tarjeta">
          <div class="fface"><span class="lab">${esc(topicName(c.topic))} · caja ${boxOf(c)}</span><div class="txt">${esc(c.front)}</div><span class="lab">toca para ver la respuesta</span></div>
          <div class="fface back"><span class="lab">Respuesta</span><div class="txt">${esc(c.back)}</div></div></div></div>
          <div class="qbar"><span class="muted small tabular">Tarjeta ${cur + 1} de ${queue.length} · sesión: ${known}/${seen} sabidas</span>
          <div class="row"><button class="btn" id="no" ${flipped ? '' : 'disabled'}>No la sabía (1)</button><button class="btn primary" id="yes" ${flipped ? '' : 'disabled'}>La sabía (2)</button></div></div>`
          : `<div class="panel empty">Sesión terminada: ${known} de ${seen} sabidas. <button class="btn primary" id="again">Otra ronda</button></div>`}`;
      $$('[data-t]', VIEW).forEach(b => b.onclick = () => {
        const t = b.dataset.t;
        if (t === 'all') flashCfg.topics = null;
        else { const s = new Set(flashCfg.topics || []); s.has(t) ? s.delete(t) : s.add(t); flashCfg.topics = s.size ? [...s] : null; }
        viewFlash();
      });
      if (!c) { $('#again').onclick = viewFlash; keyHandler = null; return; }
      const flip = () => { flipped = !flipped; $('#fc').classList.toggle('flip', flipped); $('#no').disabled = $('#yes').disabled = !flipped; };
      $('#fc').onclick = flip;
      const answer = ok => { boxes[fcId(c)] = ok ? Math.min(5, boxOf(c) + 1) : 1; store.set('boxes', boxes); seen++; if (ok) known++; cur++; flipped = false; render(); };
      $('#no').onclick = () => answer(false); $('#yes').onclick = () => answer(true);
      keyHandler = e => { if (e.key === ' ') { e.preventDefault(); flip(); } else if (flipped && e.key === '1') answer(false); else if (flipped && e.key === '2') answer(true); };
    }
    render();
  }

  // ---------- TEST ----------
  const testCfg = { topics: null, source: 'mix', count: 20, mode: 'practice' };
  const genTopic = {}; G.list.forEach(n => { genTopic[n] = G[n](G.mulberry32(7)).t; });
  function buildQuestions() {
    const t = testCfg.topics;
    const fixed = D.questions.filter(q => !t || t.includes(q.t)).map(q => {
      const order = shuffle(q.o.map((_, i) => i));
      return { t: q.t, q: q.q, o: order.map(i => q.o[i]), a: q.a.map(i => order.indexOf(i)), m: !!q.m, e: q.e, g: 'Banco' };
    });
    const gens = shuffle(G.list.filter(n => !t || t.includes(genTopic[n])));
    const n = testCfg.count;
    let nGen = testCfg.source === 'fixed' ? 0 : testCfg.source === 'gen' ? n : Math.round(n * 0.45);
    if (!gens.length) nGen = 0;
    const fx = shuffle(fixed).slice(0, n - nGen);
    const out = [];
    for (let k = 0; k < n - fx.length && gens.length; k++) out.push(G[gens[k % gens.length]](Math.random));
    return shuffle(fx.concat(out)).slice(0, n);
  }
  function viewTest() {
    if (state.autostart) { state.autostart = false; return runTest(buildQuestions()); }
    const t = testCfg.topics;
    const nFixed = D.questions.filter(q => !t || t.includes(q.t)).length;
    const total = Object.values(G.combos()).reduce((a, b) => a + b, 0);
    const best = store.get('best', null);
    VIEW.innerHTML = `<div class="view-head"><div><div class="eyebrow">${D.questions.length} preguntas fijas + ${G.list.length} generadores</div><h1>Test</h1>
      <p>Preguntas de respuesta única y múltiple. Los generadores crean casos nuevos cada vez (interceptaciones con el RMI, entradas y cronometraje de esperas, arcos DME, gradientes de SID, NOTAM, niveles IFR, agujas del ILS…): más de ${Math.floor(total / 1000) * 1000} combinaciones.</p></div></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin-bottom:16px">
        <div class="panel stat"><b class="tabular">${nFixed}</b><span>preguntas fijas en la selección</span></div>
        <div class="panel stat"><b class="tabular">${Object.values(stats).reduce((a, s) => a + s.n, 0)}</b><span>respondidas en este navegador</span></div>
        <div class="panel stat"><b class="tabular">${best != null ? best + '%' : '—'}</b><span>mejor examen simulado</span></div>
      </div>
      <div class="panel" style="padding:18px;display:grid;gap:16px">
        <div><div class="eyebrow" style="margin-bottom:6px">Temas</div><div class="row">
          <label class="chip ${!t ? 'on' : ''}"><input type="checkbox" id="t-all" ${!t ? 'checked' : ''}> Todos</label>
          ${D.topics.map(x => `<label class="chip ${t && t.includes(x.id) ? 'on' : ''}"><input type="checkbox" data-id="${x.id}" ${t && t.includes(x.id) ? 'checked' : ''}> ${esc(x.title)}</label>`).join('')}</div></div>
        <div class="row" style="gap:22px">
          <div><div class="eyebrow" style="margin-bottom:6px">Origen</div><div class="seg" id="src">
            ${[['mix', 'Mezcla'], ['fixed', 'Solo banco'], ['gen', 'Solo generadas']].map(([k, l]) => `<button aria-pressed="${testCfg.source === k}" data-k="${k}">${l}</button>`).join('')}</div></div>
          <div><div class="eyebrow" style="margin-bottom:6px">Preguntas</div><div class="seg" id="cnt">
            ${[10, 20, 40, 80].map(k => `<button aria-pressed="${testCfg.count === k}" data-k="${k}">${k}</button>`).join('')}</div></div>
          <div><div class="eyebrow" style="margin-bottom:6px">Modo</div><div class="seg" id="mode">
            ${[['practice', 'Práctica'], ['exam', 'Examen']].map(([k, l]) => `<button aria-pressed="${testCfg.mode === k}" data-k="${k}">${l}</button>`).join('')}</div></div>
        </div>
        <p class="small muted" style="margin:0">Práctica: corrección y explicación tras cada pregunta. Examen: sin ayudas, nota y revisión al final.</p>
        <div><button class="btn primary" id="start">Empezar</button></div>
      </div>`;
    $('#t-all').onchange = () => { testCfg.topics = null; viewTest(); };
    $$('[data-id]', VIEW).forEach(c => c.onchange = () => { const s = new Set(testCfg.topics || []); c.checked ? s.add(c.dataset.id) : s.delete(c.dataset.id); testCfg.topics = s.size ? [...s] : null; viewTest(); });
    $$('#src button').forEach(b => b.onclick = () => { testCfg.source = b.dataset.k; viewTest(); });
    $$('#cnt button').forEach(b => b.onclick = () => { testCfg.count = +b.dataset.k; viewTest(); });
    $$('#mode button').forEach(b => b.onclick = () => { testCfg.mode = b.dataset.k; viewTest(); });
    $('#start').onclick = () => runTest(buildQuestions());
  }
  const qHtml = q => esc(q).replace(/\n/g, '<br>');
  function runTest(qs) {
    let cur = 0; const answers = qs.map(() => null); const exam = testCfg.mode === 'exam';
    const isRight = (q, sel) => sel && sel.length === q.a.length && sel.every(x => q.a.includes(x));
    function render() {
      const q = qs[cur]; const ans = answers[cur]; const shown = ans && ans.done;
      const meter = qs.map((x, i) => { const a = answers[i]; const c = a && a.done ? (exam ? 'ok' : (isRight(x, a.sel) ? 'ok' : 'bad')) : ''; return `<i class="${c} ${i === cur ? 'cur' : ''}"></i>`; }).join('');
      const sel = ans ? ans.sel : [];
      const multi = q.m || q.a.length > 1;
      VIEW.innerHTML = `<div class="view-head"><div><div class="eyebrow">${exam ? 'Examen' : 'Práctica'} · pregunta ${cur + 1} de ${qs.length}</div><h1>Test</h1></div>
        <button class="btn ghost" id="quit">Salir</button></div>
        <div class="strip ${shown && !exam ? (isRight(q, sel) ? 'ok' : 'bad') : ''}"><div class="body">
          <div class="strip-meta"><span>${esc(topicName(q.t))}</span><span>${esc(q.g || '')}</span><span>${multi ? 'Respuesta múltiple: marca todas las correctas' : 'Respuesta única'}</span></div>
          ${q.viz ? `<div class="vizbox">${viz(q.viz)}</div>` : ''}<p class="qtext">${qHtml(q.q)}</p>
          <div class="opts">${q.o.map((o, i) => {
            let cls = sel.includes(i) ? 'sel' : '';
            if (shown && !exam) cls = q.a.includes(i) ? 'right' : (sel.includes(i) ? 'wrong' : '');
            return `<button class="opt ${cls}" data-i="${i}" ${shown ? 'disabled' : ''}><span class="k">${'ABCDEFG'[i]}</span><span>${esc(o)}</span></button>`;
          }).join('')}</div>
          ${shown && !exam ? `<div class="feedback ${isRight(q, sel) ? 'ok' : 'bad'}"><b>${isRight(q, sel) ? 'Correcto.' : 'Incorrecto.'}</b>${esc(q.e || '')}</div>` : ''}
          <div class="qbar"><div class="meter">${meter}</div><div class="row">
            ${!shown ? `<button class="btn primary" id="check" ${sel.length ? '' : 'disabled'}>${exam ? 'Responder' : 'Comprobar'}</button>` : `<button class="btn primary" id="next">${cur === qs.length - 1 ? 'Ver resultado' : 'Siguiente →'}</button>`}
          </div></div></div></div>`;
      $('#quit').onclick = () => viewTest();
      $$('.opt', VIEW).forEach(b => b.onclick = () => {
        const i = +b.dataset.i; let s = (answers[cur] && answers[cur].sel) || [];
        s = multi ? (s.includes(i) ? s.filter(x => x !== i) : s.concat(i)) : [i];
        answers[cur] = { sel: s, done: false };
        if (!multi && exam) { answers[cur].done = true; recordAnswer(q.t, isRight(q, [i])); return next(); }
        render();
      });
      const check = () => { if (!sel.length) return; answers[cur].done = true; recordAnswer(q.t, isRight(q, sel)); exam ? next() : render(); };
      const next = () => { if (cur < qs.length - 1) { cur++; render(); } else finish(); };
      if ($('#check')) $('#check').onclick = check;
      if ($('#next')) $('#next').onclick = next;
      keyHandler = e => {
        const idx = 'ABCDEFG'.indexOf(e.key.toUpperCase());
        if (!shown && idx >= 0 && idx < q.o.length) $$('.opt', VIEW)[idx].click();
        else if (e.key === 'Enter') { const b = $('#check') || $('#next'); if (b && !b.disabled) b.click(); }
      };
    }
    function finish() {
      const ok = qs.filter((q, i) => answers[i] && isRight(q, answers[i].sel)).length;
      const pct = Math.round(100 * ok / qs.length);
      if (exam) { const b = store.get('best', null); if (b == null || pct > b) store.set('best', pct); }
      const wrong = qs.map((q, i) => ({ q, a: answers[i] })).filter(x => !x.a || !isRight(x.q, x.a.sel));
      keyHandler = null;
      VIEW.innerHTML = `<div class="view-head"><div><div class="eyebrow">Resultado</div><h1>${ok} / ${qs.length} · ${pct}%</h1>
        <p>${pct >= 90 ? 'Listo para el examen.' : pct >= 75 ? 'Buen nivel: repasa los fallos.' : 'Toca repasar: revisa las explicaciones y vuelve al temario.'}</p></div>
        <div class="row"><button class="btn primary" id="again">Otro test</button><button class="btn" id="cfg">Cambiar ajustes</button></div></div>
        ${wrong.length ? `<div class="grid">${wrong.map(({ q, a }) => `<div class="strip bad"><div class="body"><div class="strip-meta"><span>${esc(topicName(q.t))}</span><span>${esc(q.g || '')}</span></div>
          <p class="qtext" style="font-size:15.5px">${qHtml(q.q)}</p>
          <div class="small"><b>Tu respuesta:</b> ${a && a.sel.length ? a.sel.map(i => esc(q.o[i])).join(' · ') : '—'}<br><b>Correcta:</b> ${q.a.map(i => esc(q.o[i])).join(' · ')}</div>
          <div class="feedback bad" style="margin-top:8px">${esc(q.e || '')}</div></div></div>`).join('')}</div>` : '<div class="panel empty">Sin fallos.</div>'}`;
      $('#again').onclick = () => runTest(buildQuestions());
      $('#cfg').onclick = () => viewTest();
    }
    render();
  }

  // ---------- INSTRUMENTOS (SVG) ----------
  const P = (deg, r, cx, cy) => [cx + r * Math.sin(deg * Math.PI / 180), cy - r * Math.cos(deg * Math.PI / 180)];
  const f1 = n => Math.round(n * 10) / 10;
  function card(cx, cy, r, rot) { // rosa de rumbos girada (rot = rumbo arriba)
    let s = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--inst-bg)" stroke="var(--inst-ring)" stroke-width="2"/>`;
    for (let d = 0; d < 360; d += 5) {
      const a = d - rot, big = d % 30 === 0, mid = d % 10 === 0;
      const [x1, y1] = P(a, r - 2, cx, cy), [x2, y2] = P(a, r - (big ? 14 : mid ? 9 : 5), cx, cy);
      s += `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="var(--inst-fg)" stroke-width="${big ? 2 : 1}"/>`;
      if (big) { const lab = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' }[d] || String(d / 10); const [tx, ty] = P(a, r - 26, cx, cy);
        s += `<text x="${f1(tx)}" y="${f1(ty + 4)}" text-anchor="middle" font-family="var(--mono)" font-size="12" font-weight="600" fill="var(--inst-fg)" transform="rotate(${a} ${f1(tx)} ${f1(ty + 4)})">${lab}</text>`; }
    }
    return s + `<path d="M${cx},${cy - r - 4} l-7,-10 h14 z" fill="var(--inst-needle)"/>`;
  }
  const ptr = (a, r1, r2, cx, cy, col, w) => { const [x1, y1] = P(a, r1, cx, cy), [x2, y2] = P(a, r2, cx, cy); return `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`; };
  function rmiSVG(qdm, hdgAc) {
    const cx = 120, cy = 120, r = 104, a = qdm - hdgAc;
    const [ax, ay] = P(a, r - 30, cx, cy), [bx, by] = P(a - 8, r - 46, cx, cy), [c2x, c2y] = P(a + 8, r - 46, cx, cy);
    return `<svg viewBox="0 0 240 262" class="inst" role="img" aria-label="RMI: cabeza ${R.hdg(qdm)}, cola ${R.hdg(R.recip(qdm))}, rumbo ${R.hdg(hdgAc)}">${card(cx, cy, r, hdgAc)}
      ${ptr(a + 180, r - 34, 0, cx, cy, 'var(--inst-acc)', 4)}${ptr(a, 0, r - 40, cx, cy, 'var(--inst-acc)', 4)}
      <polygon points="${f1(ax)},${f1(ay)} ${f1(bx)},${f1(by)} ${f1(c2x)},${f1(c2y)}" fill="var(--inst-acc)"/>
      <circle cx="${cx}" cy="${cy}" r="6" fill="var(--inst-fg)"/>
      <text x="120" y="256" text-anchor="middle" font-family="var(--mono)" font-size="12" fill="var(--muted)">RMI · rumbo ${R.hdg(hdgAc)} · aguja VOR</text></svg>`;
  }
  // HSI: crs curso, hdgAc rumbo, dev desviación en puntos (+ = barra a la derecha), to, gs (+ = puntero arriba)
  function hsiSVG(v) {
    const cx = 120, cy = 120, r = 104, a = v.crs - v.hdgAc, dev = Math.max(-2.5, Math.min(2.5, v.dev || 0));
    const rot = (x, y) => { const t = a * Math.PI / 180; return [cx + x * Math.cos(t) - y * Math.sin(t), cy + x * Math.sin(t) + y * Math.cos(t)]; };
    const seg = (x1, y1, x2, y2, col, w) => { const [p, q] = rot(x1, y1), [s, u] = rot(x2, y2); return `<line x1="${f1(p)}" y1="${f1(q)}" x2="${f1(s)}" y2="${f1(u)}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`; };
    const poly = (pts, col) => `<polygon points="${pts.map(([x, y]) => rot(x, y).map(f1).join(',')).join(' ')}" fill="${col}"/>`;
    let s = card(cx, cy, r, v.hdgAc);
    s += seg(0, -80, 0, -54, 'var(--inst-acc)', 5) + poly([[0, -92], [-9, -76], [9, -76]], 'var(--inst-acc)') + seg(0, 54, 0, 84, 'var(--inst-acc)', 5);
    s += [-2, -1, 1, 2].map(k => { const [x, y] = rot(k * 20, 0); return `<circle cx="${f1(x)}" cy="${f1(y)}" r="4" fill="none" stroke="var(--inst-fg)" stroke-width="1.5"/>`; }).join('');
    s += seg(dev * 20, -48, dev * 20, 48, 'var(--inst-acc)', 5);
    s += v.to ? poly([[34, -30], [26, -16], [42, -16]], 'var(--inst-fg)') : poly([[34, 30], [26, 16], [42, 16]], 'var(--inst-fg)');
    s += `<path d="M${cx},${cy - 10} v20 M${cx - 15},${cy} h30 M${cx - 6},${cy + 12} h12" stroke="var(--inst-needle)" stroke-width="3"/>`;
    if (v.gs != null) {
      s += [-2, -1, 1, 2].map(k => `<circle cx="${cx + 92}" cy="${cy + k * 16}" r="3.5" fill="none" stroke="var(--inst-fg)" stroke-width="1.5"/>`).join('');
      const gy = cy - Math.max(-2.5, Math.min(2.5, v.gs)) * 16; s += `<path d="M${cx + 84},${f1(gy)} l8,-6 l8,6 l-8,6 z" fill="#f472b6"/>`;
    }
    return `<svg viewBox="0 0 240 262" class="inst" role="img" aria-label="HSI curso ${R.hdg(v.crs)} ${v.to ? 'TO' : 'FROM'}, rumbo ${R.hdg(v.hdgAc)}">${s}
      <text x="120" y="256" text-anchor="middle" font-family="var(--mono)" font-size="12" fill="var(--muted)">HSI · CRS ${R.hdg(v.crs)} · ${v.to ? 'TO' : 'FROM'} · HDG ${R.hdg(v.hdgAc)}</text></svg>`;
  }
  function holdSVG(inb, h, right, showSectors) {
    const cx = 170, cy = 140, L = 92, W = 52, d = (b, rr) => [Math.sin(b * Math.PI / 180) * rr, -Math.cos(b * Math.PI / 180) * rr];
    const side = right ? inb + 90 : inb - 90;
    const [sx, sy] = d(inb + 180, L), [ox, oy] = d(side, W);
    const F = [cx, cy], S = [cx + sx, cy + sy], F2 = [cx + ox, cy + oy], S2 = [cx + sx + ox, cy + sy + oy];
    const sweep = right ? 1 : 0;
    let sect = '';
    if (showSectors) { // zonas desde las que se llega (marcación desde el fijo = rumbo de llegada + 180)
      const wedge = (b1, b2, col) => { const [x1, y1] = P(b1, 118, cx, cy), [x2, y2] = P(b2, 118, cx, cy); const span = ((b2 - b1) % 360 + 360) % 360; return `<path d="M${cx},${cy} L${f1(x1)},${f1(y1)} A118,118 0 ${span > 180 ? 1 : 0} 1 ${f1(x2)},${f1(y2)} Z" fill="${col}" opacity=".3"/>`; };
      const O = R.recip(inb), pos = hh => R.norm(hh + 180);
      // llegada con rumbo H ⇒ paralela si O ∈ [H−110,H] (estándar) ⇔ H ∈ [O, O+110]
      const par = right ? [O, O + 110] : [O - 110, O], gota = right ? [O - 70, O] : [O, O + 70];
      sect = wedge(pos(par[0]), pos(par[1]), '#2563eb') + wedge(pos(gota[0]), pos(gota[1]), '#eab308');
      const rest = right ? [pos(O + 110), pos(O - 70)] : [pos(O + 70), pos(O - 110)];
      sect += wedge(rest[0], rest[1], '#ef4444');
    }
    const [px, py] = d(h + 180, 128), [qx, qy] = d(h + 180, 40);
    const [tx, ty] = [cx + qx, cy + qy], [l1x, l1y] = d(h + 150, 12), [l2x, l2y] = d(h - 150, 12);
    return `<svg viewBox="0 0 340 290" class="inst" role="img" aria-label="Espera, acercamiento ${R.hdg(inb)}, ${right ? 'derecha' : 'izquierda'}; llegada con rumbo ${R.hdg(h)}">
      <rect width="340" height="290" rx="8" fill="var(--inst-bg)"/>${sect}
      <text x="12" y="20" font-family="var(--mono)" font-size="11" fill="var(--inst-fg)">N ↑</text>
      <path d="M${f1(S[0])},${f1(S[1])} L${F[0]},${F[1]}" stroke="var(--inst-acc)" stroke-width="4"/>
      <path d="M${F[0]},${F[1]} A${W / 2},${W / 2} 0 0 ${sweep} ${f1(F2[0])},${f1(F2[1])} L${f1(S2[0])},${f1(S2[1])} A${W / 2},${W / 2} 0 0 ${sweep} ${f1(S[0])},${f1(S[1])}" stroke="var(--inst-acc)" stroke-width="2.5" stroke-dasharray="6 4" fill="none"/>
      <circle cx="${cx}" cy="${cy}" r="6" fill="var(--inst-fg)"/>
      <line x1="${f1(cx + px)}" y1="${f1(cy + py)}" x2="${f1(tx)}" y2="${f1(ty)}" stroke="var(--inst-needle)" stroke-width="3" stroke-dasharray="2 5"/>
      <polygon points="${f1(tx)},${f1(ty)} ${f1(tx + l1x)},${f1(ty + l1y)} ${f1(tx + l2x)},${f1(ty + l2y)}" fill="var(--inst-needle)"/>
      <text x="12" y="276" font-family="var(--mono)" font-size="11" fill="var(--inst-fg)">Acerc. ${R.hdg(inb)}° · ${right ? 'derecha' : 'izquierda'} · tu rumbo ${R.hdg(h)}°</text></svg>`;
  }
  function arcSVG(v) { // estación en el centro, arco de radio fijo, avión en el radial indicado
    const cx = 150, cy = 140, rr = 95, b = v.radial;
    const [ax, ay] = P(b, rr, cx, cy), [ox, oy] = P(b, rr + 40, cx, cy);
    const [a0x, a0y] = P(b + 15, rr, cx, cy), [a1x, a1y] = P(b + 95, rr, cx, cy);
    const tip = v.inbound ? [ax, ay] : [ox, oy], tail = v.inbound ? [ox, oy] : [cx, cy];
    return `<svg viewBox="0 0 300 290" class="inst" role="img" aria-label="Arco DME de ${v.arc} NM; avión en el radial ${R.hdg(b)}">
      <rect width="300" height="290" rx="8" fill="var(--inst-bg)"/>
      <circle cx="${cx}" cy="${cy}" r="${rr}" fill="none" stroke="var(--inst-ring)" stroke-dasharray="3 5"/>
      <path d="M${f1(a0x)},${f1(a0y)} A${rr},${rr} 0 0 1 ${f1(a1x)},${f1(a1y)}" fill="none" stroke="var(--inst-acc)" stroke-width="3.5"/>
      <line x1="${f1(tail[0])}" y1="${f1(tail[1])}" x2="${f1(tip[0])}" y2="${f1(tip[1])}" stroke="var(--inst-needle)" stroke-width="3" stroke-dasharray="${v.inbound ? '0' : '4 4'}"/>
      <circle cx="${f1(ax)}" cy="${f1(ay)}" r="5" fill="var(--inst-needle)"/>
      <circle cx="${cx}" cy="${cy}" r="6" fill="var(--inst-bg)" stroke="var(--inst-fg)" stroke-width="2"/>
      <text x="12" y="20" font-family="var(--mono)" font-size="11" fill="var(--inst-fg)">N ↑</text>
      <text x="12" y="276" font-family="var(--mono)" font-size="11" fill="var(--inst-fg)">Arco ${v.arc} NM · R-${R.hdg(b)} ${v.inbound ? 'acercamiento' : 'alejamiento'}</text></svg>`;
  }
  function viz(v) {
    if (!v || v.kind === 'none') return '';
    if (v.kind === 'rmi') return rmiSVG(v.qdm, v.hdgAc);
    if (v.kind === 'hsi') return hsiSVG(v);
    if (v.kind === 'hold') return holdSVG(v.inb, v.h, v.right, v.sectors);
    if (v.kind === 'arc') return arcSVG(v);
    return '';
  }

  // ---------- CABINA IFR ----------
  const done = store.get('scen', {});
  const streaks = store.get('streaks', {});
  const bump = (k, ok) => { streaks[k] = ok ? (streaks[k] || 0) + 1 : 0; streaks[k + 'Best'] = Math.max(streaks[k + 'Best'] || 0, streaks[k]); store.set('streaks', streaks); };
  const streakTxt = k => `Racha: <b class="tabular">${streaks[k] || 0}</b> · mejor: <b class="tabular">${streaks[k + 'Best'] || 0}</b>`;
  const TABS = [['esc', 'Escenarios'], ['int', 'Interceptaciones'], ['hold', 'Esperas'], ['arc', 'Arco DME'], ['time', 'Cronometraje']];
  function viewCabina() {
    const tab = state.tab || store.get('cabTab', 'esc');
    store.set('cabTab', tab);
    VIEW.innerHTML = `<div class="view-head"><div><div class="eyebrow">Mini-juego</div><h1>Cabina IFR</h1>
      <p>Vuela situaciones del P2 paso a paso con los instrumentos delante, o entrena una técnica concreta con casos al azar. Las decisiones que serían motivo de suspenso cuentan aparte.</p></div>
      <div class="seg">${TABS.map(([k, l]) => `<button aria-pressed="${tab === k}" data-tab="${k}">${l}</button>`).join('')}</div></div>
      <div id="cab"></div>`;
    $$('[data-tab]', VIEW).forEach(b => b.onclick = () => go('cabina', { tab: b.dataset.tab }));
    const box = $('#cab');
    if (tab === 'int') return interceptTrainer(box);
    if (tab === 'hold') return holdTrainer(box);
    if (tab === 'arc') return arcTrainer(box);
    if (tab === 'time') return timingTrainer(box);
    const cats = [...new Set(D.scenarios.map(s => s.cat))];
    box.innerHTML = cats.map(c => `<h3 class="cat-h">${esc(c)}</h3>
      <div class="grid cols-3">${D.scenarios.filter(s => s.cat === c).map(s => `<button class="scen ${done[s.id] ? 'done' : ''}" data-s="${s.id}"><span class="body">
        <span class="cs"><span>${esc(s.setup.ac)}</span><span>${'●'.repeat(s.diff)}${'○'.repeat(3 - s.diff)}</span></span>
        <span class="tt" style="display:block">${esc(s.title)}</span>
        <span class="small muted">${s.steps.length} decisiones${done[s.id] ? ` · mejor ${done[s.id]}%` : ''}</span></span></button>`).join('')}</div>`).join('');
    $$('[data-s]', box).forEach(b => b.onclick = () => playScenario(D.scenarios.find(s => s.id === b.dataset.s)));
  }
  function playScenario(sc) {
    let step = 0, points = 0, losses = 0; const log = [];
    const steps = sc.steps.map(st => { const order = shuffle(st.o.map((_, i) => i)); return Object.assign({}, st, { o: order.map(i => st.o[i]), a: st.a.map(i => order.indexOf(i)) }); });
    function render(sel, shown) {
      const st = steps[step]; sel = sel || [];
      const multi = st.a.length > 1;
      const right = shown && sel.length === st.a.length && sel.every(x => st.a.includes(x));
      const v = viz(st.viz);
      VIEW.innerHTML = `<div class="view-head"><div><div class="eyebrow">${esc(sc.cat)} · decisión ${step + 1} de ${steps.length}</div><h1>${esc(sc.title)}</h1></div>
        <button class="btn ghost" id="exit">← Escenarios</button></div>
        <div class="scorebar"><div class="panel"><b class="tabular">${points}</b><span>puntos</span></div><div class="panel"><b class="tabular">${step}/${steps.length}</b><span>decisiones</span></div><div class="panel"><b class="tabular" style="color:${losses ? 'var(--bad)' : 'inherit'}">${losses}</b><span>errores de suspenso</span></div></div>
        <div class="game"><div>${v ? `<div class="panelinst">${v}</div>` : ''}<div class="atis"><b>${esc(sc.setup.ac)}</b> · ${esc(sc.setup.route)}${sc.setup.metar ? '<br>' + esc(sc.setup.metar) : ''}${sc.setup.notes ? '<br>' + esc(sc.setup.notes) : ''}</div></div>
        <div><div class="sit">${esc(st.sit)}</div>
          <div class="strip arr ${shown ? (right ? 'ok' : 'bad') : ''}"><div class="body"><div class="strip-meta"><span>${multi ? 'Marca todas las correctas' : 'Elige una'}</span>${st.sev === 'loss' ? '<span style="color:var(--bad)">Crítica: motivo de suspenso</span>' : ''}</div>
          <p class="qtext" style="font-size:16px">${esc(st.q)}</p>
          <div class="opts">${st.o.map((o, i) => { let c = sel.includes(i) ? 'sel' : ''; if (shown) c = st.a.includes(i) ? 'right' : (sel.includes(i) ? 'wrong' : ''); return `<button class="opt ${c}" data-i="${i}" ${shown ? 'disabled' : ''}><span class="k">${'ABCDE'[i]}</span><span>${esc(o)}</span></button>`; }).join('')}</div>
          ${shown ? `<div class="feedback ${right ? 'ok' : 'bad'}"><b>${right ? 'Correcto.' : (st.sev === 'loss' ? 'En un chequeo esto sería suspenso.' : 'No es lo correcto.')}</b>${esc(st.e)}</div>` : ''}
          <div class="qbar"><span></span>${shown ? `<button class="btn primary" id="nx">${step === steps.length - 1 ? 'Terminar' : 'Siguiente →'}</button>` : `<button class="btn primary" id="ck" ${sel.length ? '' : 'disabled'}>Confirmar</button>`}</div>
          </div></div></div></div>`;
      $('#exit').onclick = () => go('cabina', { tab: 'esc' });
      $$('.opt', VIEW).forEach(b => b.onclick = () => { const i = +b.dataset.i; const s = multi ? (sel.includes(i) ? sel.filter(x => x !== i) : sel.concat(i)) : [i]; render(s, false); });
      if ($('#ck')) $('#ck').onclick = () => { const ok = sel.length === st.a.length && sel.every(x => st.a.includes(x)); if (ok) points += st.sev === 'loss' ? 20 : 10; else if (st.sev === 'loss') losses++; log.push(ok); render(sel, true); };
      if ($('#nx')) $('#nx').onclick = () => { if (step < steps.length - 1) { step++; render(); } else finish(); };
      keyHandler = e => { const idx = 'ABCDE'.indexOf(e.key.toUpperCase()); if (!shown && idx >= 0 && idx < st.o.length) $$('.opt', VIEW)[idx].click(); else if (e.key === 'Enter') { const b = $('#ck') || $('#nx'); if (b && !b.disabled) b.click(); } };
    }
    function finish() {
      const max = steps.reduce((a, s) => a + (s.sev === 'loss' ? 20 : 10), 0); const pct = Math.round(100 * points / max);
      if (!done[sc.id] || pct > done[sc.id]) { done[sc.id] = pct; store.set('scen', done); }
      keyHandler = null;
      VIEW.innerHTML = `<div class="view-head"><div><div class="eyebrow">Fin del escenario</div><h1>${esc(sc.title)}</h1>
        <p>${points} de ${max} puntos (${pct}%). ${losses ? `${losses} ${losses > 1 ? 'decisiones habrían' : 'decisión habría'} supuesto suspenso.` : 'Sin errores de suspenso.'}</p></div>
        <div class="row"><button class="btn primary" id="rep">Repetir</button><button class="btn" id="lst">Otros escenarios</button></div></div>
        <div class="grid">${steps.map((s, i) => `<div class="strip ${log[i] ? 'ok' : 'bad'}"><div class="body"><div class="strip-meta"><span>Decisión ${i + 1}</span><span>${log[i] ? 'Correcta' : 'Fallada'}</span></div>
          <div class="small"><b>${esc(s.q)}</b><br>${s.a.map(k => esc(s.o[k])).join(' · ')}</div><div class="small muted" style="margin-top:4px">${esc(s.e)}</div></div></div>`).join('')}</div>`;
      $('#rep').onclick = () => playScenario(sc); $('#lst').onclick = () => go('cabina', { tab: 'esc' });
    }
    render();
  }

  // Entrenador de interceptaciones (reglas del P2)
  function interceptTrainer(box) {
    const inbound = rnd() < 0.55; let qdm, desired, res;
    do { qdm = (1 + Math.floor(rnd() * 72)) * 5; desired = (1 + Math.floor(rnd() * 36)) * 10; res = R.intercept(qdm, desired, inbound); }
    while (res.d < 6 || res.d > 170 || R.interceptBoundaryDist(qdm, desired, inbound) < 4 || (res.tipo === 'pasada' && rnd() < 0.5));
    const hdgAc = inbound ? qdm : R.norm(R.recip(qdm) + Math.round((rnd() - 0.5) * 20));
    const vor = R.VORS[Math.floor(rnd() * R.VORS.length)];
    const instr = inbound ? `Intercepte el curso ${R.hdg(desired)} hacia ${vor}` : `Aléjese por el radial ${R.hdg(desired)} de ${vor}`;
    const bands = inbound ? [['<15', '< 15° · doble P'], ['15-60', '15–60° · 30°'], ['60-90', '60–90° · hasta 90°'], ['>90', '> 90° · ruta pasada']] : [['<15', '< 15° · P'], ['15-90', '15–90° · 45°'], ['>90', '> 90° · ruta pasada']];
    box.innerHTML = `<div class="game"><div class="panelinst">${rmiSVG(qdm, hdgAc)}</div><div>
      <div class="sit"><b>ATC:</b> «${instr}».<br><span class="small">${inbound ? 'Acercamiento: compara la cabeza del RMI con el curso deseado.' : 'Alejamiento: compara la cola del RMI (radial actual) con el radial deseado.'}</span></div>
      <div class="panel" style="padding:16px;display:grid;gap:12px">
        <div><div class="eyebrow" style="margin-bottom:6px">1 · Diferencia y método</div><div class="seg" id="band">${bands.map(([k, l]) => `<button data-k="${k}" aria-pressed="false">${l}</button>`).join('')}</div></div>
        <div id="ans"></div><div id="fb"></div>
        <div class="row small muted">${streakTxt('int')}</div>
      </div></div></div>`;
    const ref = inbound ? qdm : R.recip(qdm);
    function verdict(ok, extra) {
      bump('int', ok);
      const expl = res.tipo === 'directa'
        ? `${inbound ? 'Cabeza' : 'Cola'} ${R.hdg(ref)} · deseado ${R.hdg(desired)} · diferencia ${res.d}° → «${res.rule}» → rumbo ${R.hdg(res.heading)}°.`
        : `Diferencia ${res.d}° > 90° → ruta pasada: ${res.rule} (rumbo ${R.hdg(res.heading)}°).`;
      $('#fb', box).innerHTML = `<div class="feedback ${ok ? 'ok' : 'bad'}"><b>${ok ? 'Correcto.' : 'No.'}</b>${extra || ''}${esc(expl)}</div><div class="qbar"><span></span><button class="btn primary" id="otra">Otra interceptación</button></div>`;
      $('#otra', box).onclick = () => interceptTrainer(box);
      $$('#ans input, #ans button, #band button', box).forEach(x => x.disabled = true);
      keyHandler = e => { if (e.key === 'Enter') $('#otra', box).click(); };
    }
    $$('#band button', box).forEach(b => b.onclick = () => {
      $$('#band button', box).forEach(x => x.setAttribute('aria-pressed', x === b));
      if (b.dataset.k !== res.band) return verdict(false, `La diferencia es de ${res.d}°. `);
      const a = $('#ans', box);
      if (res.tipo === 'directa') {
        a.innerHTML = `<label class="small" for="hdgin">2 · Rumbo de interceptación (°)</label><div class="row"><input id="hdgin" class="num" type="number" min="1" max="360" inputmode="numeric" placeholder="p. ej. 280"><button class="btn primary" id="chk">Comprobar</button></div>`;
        const chk = () => { const v = +$('#hdgin', box).value; if (!v) return; const ok = R.diff(v, res.heading) <= 3; verdict(ok, ok ? '' : `Has puesto ${R.hdg(v)}. `); };
        $('#chk', box).onclick = chk; $('#hdgin', box).onkeydown = e => { if (e.key === 'Enter') chk(); }; $('#hdgin', box).focus();
      } else {
        const good = `Rumbo ${R.hdg(res.heading)}° hasta la cuadra; luego ${inbound ? 'tiempo y 90° + 90° hacia la cabeza' : '45° hacia el lado de la cabeza'}`;
        const opts = shuffle([good, `Rumbo ${R.hdg(res.heading)}° hasta la cuadra; luego ${inbound ? '45° hacia el lado de la cabeza' : 'tiempo y 90° + 90° hacia la cabeza'}`, `Rumbo ${R.hdg(R.recip(res.heading))}° directamente`]);
        a.innerHTML = `<div class="eyebrow" style="margin-bottom:6px">2 · Procedimiento</div><div class="opts">${opts.map((o, i) => `<button class="opt" data-i="${i}"><span class="k">${'ABC'[i]}</span><span>${esc(o)}</span></button>`).join('')}</div>`;
        $$('.opt', a).forEach(x => x.onclick = () => { const ok = opts[+x.dataset.i] === good; x.classList.add(ok ? 'right' : 'wrong'); verdict(ok); });
      }
    });
  }

  // Entrenador de entradas en espera
  function holdTrainer(box) {
    let inb, h, right; do { inb = Math.floor(rnd() * 36) * 10; h = Math.floor(rnd() * 72) * 5; right = rnd() < 0.65; } while (R.holdBoundaryDist(h, inb, right) < 14);
    const entry = R.holdEntry(h, inb, right); const fix = R.VORS[Math.floor(rnd() * R.VORS.length)];
    const names = { directa: 'Directa (sector C)', paralela: 'Paralela (sector A)', gota: 'Gota de agua (sector B)' };
    function draw(shown, pick) {
      const O = R.recip(inb);
      box.innerHTML = `<div class="game"><div class="panelinst">${holdSVG(inb, h, right, shown)}</div><div>
        <div class="sit">Espera ${right ? '<b>estándar</b> (derecha)' : '<b>no estándar</b> (izquierda)'} sobre <b>${fix}</b>, curso de acercamiento <b>${R.hdg(inb)}°</b>. Llegas a ${fix} con rumbo <b>${R.hdg(h)}°</b>.</div>
        <div class="opts">${['directa', 'paralela', 'gota'].map((k, i) => { let c = ''; if (shown) c = k === entry ? 'right' : (k === pick ? 'wrong' : ''); return `<button class="opt ${c}" data-k="${k}" ${shown ? 'disabled' : ''}><span class="k">${'ABC'[i]}</span><span>${names[k]}</span></button>`; }).join('')}</div>
        ${shown ? `<div class="feedback ${pick === entry ? 'ok' : 'bad'}"><b>${pick === entry ? 'Correcto.' : 'Es la entrada ' + entry + '.'}</b>Alejamiento ${R.hdg(O)}°. Con ${R.hdg(h)}° arriba en el indicador: ${right ? `paralela ${R.hdg(h - 110)}–${R.hdg(h)} (110° a la izquierda), gota ${R.hdg(h)}–${R.hdg(h + 70)} (70° a la derecha)` : `paralela ${R.hdg(h)}–${R.hdg(h + 110)} (110° a la derecha), gota ${R.hdg(h - 70)}–${R.hdg(h)} (70° a la izquierda)`}; el resto, directa.${entry === 'gota' ? ` Rumbo de la gota: ${R.hdg(R.teardropHeading(inb, right))}°.` : ''} En el dibujo, las zonas desde las que se llega: azul paralela, amarillo gota, rojo directa.</div><div class="qbar"><span></span><button class="btn primary" id="otra">Otra espera</button></div>` : ''}
        <p class="small muted">${streakTxt('hold')} · Velocidad máxima: hélice 175 KIAS; reactores 200/230/265 KIAS.</p></div></div>`;
      $$('.opt', box).forEach(b => b.onclick = () => { bump('hold', b.dataset.k === entry); draw(true, b.dataset.k); });
      if ($('#otra', box)) $('#otra', box).onclick = () => holdTrainer(box);
      keyHandler = e => { const idx = 'ABC'.indexOf(e.key.toUpperCase()); if (!shown && idx >= 0) $$('.opt', box)[idx].click(); else if (shown && e.key === 'Enter') $('#otra', box).click(); };
    }
    draw(false);
  }

  // Entrenador de arco DME
  function numTrainer(box, k, viewHtml, sit, label, answer, tol, explain, again) {
    box.innerHTML = `<div class="game"><div class="panelinst">${viewHtml}</div><div>
      <div class="sit">${sit}</div>
      <div class="panel" style="padding:16px;display:grid;gap:12px">
        <label class="small" for="nin">${label}</label><div class="row"><input id="nin" class="num" type="text" inputmode="decimal" placeholder="valor"><button class="btn primary" id="chk">Comprobar</button></div>
        <div id="fb"></div><div class="row small muted">${streakTxt(k)}</div></div></div></div>`;
    const chk = () => {
      const raw = $('#nin', box).value.replace(',', '.').trim(); if (!raw) return; const v = parseFloat(raw);
      const ok = Math.abs(v - answer) <= tol; bump(k, ok);
      $('#fb', box).innerHTML = `<div class="feedback ${ok ? 'ok' : 'bad'}"><b>${ok ? 'Correcto.' : 'No.'}</b>${esc(explain)}</div><div class="qbar"><span></span><button class="btn primary" id="otra">Otro caso</button></div>`;
      $('#chk', box).disabled = true; $('#nin', box).disabled = true; $('#otra', box).onclick = again;
      keyHandler = e => { if (e.key === 'Enter') again(); };
    };
    $('#chk', box).onclick = chk; $('#nin', box).onkeydown = e => { if (e.key === 'Enter') { e.stopPropagation(); chk(); } }; $('#nin', box).focus();
    keyHandler = null;
  }
  function arcTrainer(box) {
    const again = () => arcTrainer(box);
    const arc = 8 + Math.floor(rnd() * 13), gs = (9 + Math.floor(rnd() * 14)) * 10, half = rnd() < 0.3, vor = R.VORS[Math.floor(rnd() * R.VORS.length)];
    if (rnd() < 0.5) {
      const inbound = rnd() < 0.5, radial = Math.floor(rnd() * 36) * 10, at = R.arcTurnDME(arc, gs, inbound, half);
      return numTrainer(box, 'arc', arcSVG({ arc, radial, inbound }), `Vuelas por el R-${R.hdg(radial)} de ${vor} <b>${inbound ? 'en acercamiento' : 'en alejamiento'}</b> a <b>${gs} kt</b> de GS. Debes orbitar el arco de <b>${arc} NM</b> con viraje ${half ? '<b>medio estándar</b>' : '<b>estándar</b>'}.`,
        'DME (NM) al que inicias el viraje', at, 0.05, `Anticipo ${half ? '1 %' : '0,5 %'} × ${gs} = ${R.fmt1(R.arcLeadNM(gs, half))} NM, que ${inbound ? 'se suma' : 'se resta'}: ${R.fmt1(at)} NM.`, again);
    }
    const target = (1 + Math.floor(rnd() * 36)) * 10, cw = rnd() < 0.5;
    const lead = Math.max(1, Math.round(R.arcLeadDeg(gs, arc, half))), start = R.norm(target - (cw ? lead : -lead));
    return numTrainer(box, 'arc', arcSVG({ arc, radial: R.norm(target - (cw ? 20 : -20)), inbound: true }), `Orbitas el arco de <b>${arc} NM</b> de ${vor} en sentido <b>${cw ? 'horario (radiales crecientes)' : 'antihorario (radiales decrecientes)'}</b> a <b>${gs} kt</b>. Debes salir hacia la estación por el <b>R-${R.hdg(target)}</b> con viraje ${half ? 'medio estándar' : 'estándar'}.`,
      'Radial (cola) en el que inicias el viraje', start, 0.5, `Anticipo = 60 × ${R.fmt1(R.arcLeadNM(gs, half))} / ${arc} = ${R.fmt1(R.arcLeadDeg(gs, arc, half))} ≈ ${lead}°: viras en el R-${R.hdg(start)}.`, again);
  }
  function timingTrainer(box) {
    const over = rnd() < 0.5, t = over ? 70 + Math.floor(rnd() * 6) * 10 : 30 + Math.floor(rnd() * 6) * 5;
    const out = R.holdOutboundTime(t);
    const inb = Math.floor(rnd() * 36) * 10;
    numTrainer(box, 'time', holdSVG(inb, inb, true, false), `Primer circuito completo en la espera. El tramo de acercamiento te ha durado <b>${R.mmss(t)}</b>. Objetivo: acercamiento de 1 minuto.`,
      'Nuevo tiempo de alejamiento (segundos)', out, 0.5, over ? `Sobran ${t - 60} s: la mitad (${(t - 60) / 2} s) se resta → ${out} s (${R.mmss(out)}).` : `Faltan ${60 - t} s: el doble (${(60 - t) * 2} s) se suma → ${out} s (${R.mmss(out)}).`, () => timingTrainer(box));
  }

  // ---------- SIMULADOR ----------
  function viewSim() { unmount = window.P2_SIM.mount(VIEW, { store }); }

  // ---------- CHULETA ----------
  function viewChuleta() {
    VIEW.innerHTML = `<div class="view-head"><div><div class="eyebrow">Tablas de bolsillo</div><h1>Chuleta</h1>
      <p>Todos los números del P2 que hay que tener en la cabeza, en una sola página.</p></div></div><article class="doc">${md(D.cheatsheet)}</article>`;
  }

  // ---------- arranque ----------
  const tokens = ['temario', 'resumenes', 'flashcards', 'test', 'cabina', 'simulador', 'chuleta'];
  const h = (location.hash || '').slice(1);
  if (tokens.includes(h)) go(h);
  else if (h.startsWith('t-') && topicById[h.slice(2)]) go('temario', { topic: h.slice(2) });
  else go(tokens.includes(store.get('view', '')) ? store.get('view', 'temario') : 'temario');
})();
