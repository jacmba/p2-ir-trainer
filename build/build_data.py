#!/usr/bin/env python3
"""Empaqueta content/ en app/js/data.js (window.APP_DATA)."""
import json, os, re, glob
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
C = os.path.join(ROOT, 'content')

topics = []
for p in sorted(glob.glob(os.path.join(C, 'topics', '*.md'))):
    raw = open(p, encoding='utf-8').read()
    fm, body = re.match(r'---\n(.*?)\n---\n(.*)', raw, re.S).groups()
    meta = dict(re.findall(r'^(\w+):\s*(.*)$', fm, re.M))
    topics.append({'id': meta['id'], 'num': int(meta['num']), 'title': meta['title'], 'src': meta['src'], 'md': body.strip()})

raw = open(os.path.join(C, 'summaries.md'), encoding='utf-8').read()
parts = re.split(r'^# (\S+)\s*$', raw, flags=re.M)
summaries = {parts[i]: parts[i + 1].strip() for i in range(1, len(parts), 2)}

diagrams = {}
for p in glob.glob(os.path.join(C, 'diagrams', '*.svg')):
    s = open(p, encoding='utf-8').read()
    s = re.sub(r'id="(a|b|ar|ag)"', lambda m: f'id="{os.path.basename(p)[:-4]}-{m.group(1)}"', s)
    s = re.sub(r'url\(#(a|b|ar|ag)\)', lambda m: f'url(#{os.path.basename(p)[:-4]}-{m.group(1)})', s)
    diagrams[os.path.basename(p)[:-4]] = s

data = {
    'topics': topics,
    'summaries': summaries,
    'flashcards': json.load(open(os.path.join(C, 'flashcards.json'), encoding='utf-8')),
    'questions': json.load(open(os.path.join(C, 'questions.json'), encoding='utf-8')),
    'scenarios': json.load(open(os.path.join(C, 'scenarios.json'), encoding='utf-8')),
    'cheatsheet': open(os.path.join(ROOT, 'build', 'cheatsheet.md'), encoding='utf-8').read(),
    'diagrams': diagrams,
}
out = os.path.join(ROOT, 'app', 'js', 'data.js')
with open(out, 'w', encoding='utf-8') as f:
    f.write('/* Generado por build/build_data.py a partir de content/. No editar a mano. */\n')
    f.write('window.APP_DATA = ' + json.dumps(data, ensure_ascii=False) + ';\n')
print('OK', out, os.path.getsize(out), 'bytes')
