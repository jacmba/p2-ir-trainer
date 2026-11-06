#!/usr/bin/env python3
"""Genera el manual PDF del P2 (IFR) a partir de content/."""
import json, re, os, glob
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle,
                                Image, PageBreak, KeepTogether, NextPageTemplate, CondPageBreak)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.lib.utils import ImageReader

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
C = os.path.join(ROOT, 'content')
OUT = os.path.join(ROOT, 'build', 'Manual_P2_IFR_VATSIM_ES.pdf')

F = '/usr/share/fonts/truetype/dejavu/'
pdfmetrics.registerFont(TTFont('DV', F + 'DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DV-B', F + 'DejaVuSans-Bold.ttf'))
# Las variantes oblicuas no vienen en todas las instalaciones: si faltan, se usan la normal y la negrita
_f = lambda n, alt: F + (n if os.path.exists(F + n) else alt)
pdfmetrics.registerFont(TTFont('DV-I', _f('DejaVuSans-Oblique.ttf', 'DejaVuSans.ttf')))
pdfmetrics.registerFont(TTFont('DV-BI', _f('DejaVuSans-BoldOblique.ttf', 'DejaVuSans-Bold.ttf')))
pdfmetrics.registerFont(TTFont('DVM', F + 'DejaVuSansMono.ttf'))
from reportlab.pdfbase.pdfmetrics import registerFontFamily
registerFontFamily('DV', normal='DV', bold='DV-B', italic='DV-I', boldItalic='DV-BI')

NAVY = colors.HexColor('#1e3a8a'); INK = colors.HexColor('#0f172a'); MUTED = colors.HexColor('#475569')
AMBER = colors.HexColor('#b45309'); AMBERBG = colors.HexColor('#fef3c7'); BLUEBG = colors.HexColor('#dbeafe')
GRID = colors.HexColor('#cbd5e1'); HEADBG = colors.HexColor('#e2e8f0'); GREENBG = colors.HexColor('#dcfce7')

S = {}
S['body'] = ParagraphStyle('body', fontName='DV', fontSize=9.6, leading=13.6, textColor=INK, spaceAfter=5)
S['li'] = ParagraphStyle('li', parent=S['body'], leftIndent=13, bulletIndent=3, spaceAfter=2.5)
S['h1'] = ParagraphStyle('h1', fontName='DV-B', fontSize=22, leading=27, textColor=NAVY, spaceAfter=10)
S['h2'] = ParagraphStyle('h2', fontName='DV-B', fontSize=14, leading=18, textColor=NAVY, spaceBefore=12, spaceAfter=6)
S['h3'] = ParagraphStyle('h3', fontName='DV-B', fontSize=11, leading=14, textColor=INK, spaceBefore=8, spaceAfter=4)
S['cell'] = ParagraphStyle('cell', fontName='DV', fontSize=8.3, leading=10.6, textColor=INK)
S['cellh'] = ParagraphStyle('cellh', parent=S['cell'], fontName='DV-B')
S['quote'] = ParagraphStyle('quote', parent=S['body'], fontName='DV-I', fontSize=9, leading=12.4, textColor=colors.HexColor('#334155'), spaceAfter=1.5)
S['cap'] = ParagraphStyle('cap', parent=S['body'], fontSize=8, textColor=MUTED, alignment=TA_CENTER)
S['toc1'] = ParagraphStyle('toc1', fontName='DV-B', fontSize=11, leading=17, leftIndent=0)
S['toc2'] = ParagraphStyle('toc2', fontName='DV', fontSize=9, leading=12.5, leftIndent=16, textColor=MUTED)
S['fcq'] = ParagraphStyle('fcq', fontName='DV-B', fontSize=8.6, leading=11, textColor=INK)
S['fca'] = ParagraphStyle('fca', fontName='DV', fontSize=8.2, leading=10.4, textColor=INK)
S['tag'] = ParagraphStyle('tag', fontName='DV', fontSize=6.5, leading=8, textColor=MUTED)

def esc(t):
    return t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

def inline(t):
    t = esc(t)
    t = re.sub(r'`([^`]+)`', r'<font name="DVM" size="8.4" color="#7c2d12">\1</font>', t)
    t = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', t)
    t = re.sub(r'(?<![\w/])_([^_]+?)_(?![\w])', r'<i>\1</i>', t)
    t = t.replace('\\*', '*')
    return t

def table_flow(rows, width):
    hdr = rows[0]; body = rows[1:]
    n = len(hdr)
    data = [[Paragraph(inline(c), S['cellh']) for c in hdr]]
    for r in body:
        r = (r + [''] * n)[:n]
        data.append([Paragraph(inline(c), S['cell']) for c in r])
    # column widths proportional to content length
    lens = [max(len(re.sub(r'\*\*|`', '', (row + [''] * n)[i])) for row in rows) for i in range(n)]
    lens = [min(max(l, 10), 55) for l in lens]
    tot = sum(lens)
    cw = [width * l / tot for l in lens]
    t = Table(data, colWidths=cw, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADBG),
        ('GRID', (0, 0), (-1, -1), 0.4, GRID),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 4), ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5), ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
    ]))
    return t

def callout(text, kind, width):
    bg, border, label = {'key': (AMBERBG, AMBER, 'CLAVE'), 'vatsim': (BLUEBG, NAVY, 'VATSIM · NOTA')}[kind]
    p = Paragraph(f'<font name="DV-B" color="{border.hexval()}" size="7.5">{label}</font><br/>' + text, S['body'])
    t = Table([[p]], colWidths=[width])
    t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), bg), ('LINEBEFORE', (0, 0), (0, -1), 3, border),
                           ('LEFTPADDING', (0, 0), (-1, -1), 8), ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                           ('TOPPADDING', (0, 0), (-1, -1), 5), ('BOTTOMPADDING', (0, 0), (-1, -1), 5)]))
    return [Spacer(1, 3), t, Spacer(1, 6)]

def figure(name, cap, width):
    path = os.path.join(ROOT, 'build', 'diagrams', name + '.png')
    if not os.path.exists(path):
        return []
    ir = ImageReader(path); iw, ih = ir.getSize()
    w = width * 0.92; h = w * ih / iw
    return [Spacer(1, 4), KeepTogether([Image(path, width=w, height=h), Paragraph(esc(cap), S['cap'])]), Spacer(1, 6)]

def md_to_flow(md, width, chapter_title=None):
    flow = []
    lines = md.split('\n')
    i = 0
    para = []
    def flush():
        nonlocal para
        if para:
            flow.append(Paragraph(inline(' '.join(para)), S['body'])); para = []
    while i < len(lines):
        ln = lines[i].rstrip()
        if not ln.strip():
            flush(); i += 1; continue
        if ln.startswith('## '):
            flush(); txt = ln[3:].strip()
            h = Paragraph(inline(txt), S['h2']); h._toc = (1, txt)
            flow.append(CondPageBreak(60 * mm)); flow.append(h); i += 1; continue
        if ln.startswith('### '):
            flush(); flow.append(CondPageBreak(30 * mm)); flow.append(Paragraph(inline(ln[4:].strip()), S['h3'])); i += 1; continue
        if ln.startswith('|'):
            flush(); rows = []
            while i < len(lines) and lines[i].startswith('|'):
                cells = [c.strip() for c in lines[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r':?-{3,}:?', c) for c in cells):
                    rows.append(cells)
                i += 1
            flow.append(Spacer(1, 2)); flow.append(table_flow(rows, width)); flow.append(Spacer(1, 7)); continue
        m = re.match(r'!\[(fig|wiki):([^|\]]+)\|?([^\]]*)\]', ln)
        if m:
            flush()
            if m.group(1) == 'fig':
                flow += figure(m.group(2), m.group(3), width)
            i += 1; continue
        if ln.startswith('> [!'):
            flush(); kind = re.match(r'> \[!(\w+)\]', ln).group(1)
            buf = [re.sub(r'^> \[!\w+\]\s*', '', ln)]
            i += 1
            while i < len(lines) and lines[i].startswith('>') and not lines[i].startswith('> [!'):
                buf.append(lines[i][1:].strip()); i += 1
            flow += callout('<br/>'.join(inline(b) for b in buf if b), kind, width); continue
        if ln.startswith('>'):
            flush(); buf = []
            while i < len(lines) and lines[i].startswith('>'):
                s = lines[i][1:].strip()
                if s: buf.append(Paragraph(inline(s), S['quote']))
                i += 1
            t = Table([[buf]], colWidths=[width])
            t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f1f5f9')), ('LINEBEFORE', (0, 0), (0, -1), 2, colors.HexColor('#94a3b8')),
                                   ('LEFTPADDING', (0, 0), (-1, -1), 8), ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4)]))
            flow += [t, Spacer(1, 6)]; continue
        m = re.match(r'^(\s*)([-*]|\d+\.)\s+(.*)', ln)
        if m:
            flush()
            bullet = '•' if m.group(2) in '-*' else m.group(2)
            indent = len(m.group(1))
            st = ParagraphStyle('lix', parent=S['li'], leftIndent=13 + indent * 4, bulletIndent=3 + indent * 4)
            flow.append(Paragraph(inline(m.group(3)), st, bulletText=bullet)); i += 1; continue
        para.append(ln.strip()); i += 1
    flush()
    return flow

def parse_topic(path):
    raw = open(path, encoding='utf-8').read()
    fm, body = re.match(r'---\n(.*?)\n---\n(.*)', raw, re.S).groups()
    meta = dict(re.findall(r'^(\w+):\s*(.*)$', fm, re.M))
    return meta, body

def summaries():
    raw = open(os.path.join(C, 'summaries.md'), encoding='utf-8').read()
    parts = re.split(r'^# (\S+)\s*$', raw, flags=re.M)
    return {parts[i]: parts[i + 1].strip() for i in range(1, len(parts), 2)}

class Doc(BaseDocTemplate):
    def __init__(self, fn, **kw):
        super().__init__(fn, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=18 * mm, bottomMargin=17 * mm,
                         title='Manual P2 – Habilitación por Instrumentos (VATSIM)', author='Material de estudio personal', **kw)
        fr = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id='f')
        self.addPageTemplates([PageTemplate('cover', [fr], onPage=self.cover_bg), PageTemplate('normal', [fr], onPage=self.decor)])
        self.chapter = ''
    def cover_bg(self, c, d):
        c.saveState(); c.setFillColor(NAVY); c.rect(0, A4[1] - 95 * mm, A4[0], 95 * mm, fill=1, stroke=0)
        c.setFillColor(colors.HexColor('#f59e0b')); c.rect(0, A4[1] - 98 * mm, A4[0], 3 * mm, fill=1, stroke=0); c.restoreState()
    def decor(self, c, d):
        c.saveState(); c.setFont('DV', 7.5); c.setFillColor(MUTED)
        c.drawString(18 * mm, 10 * mm, 'Manual P2 IFR · VATSIM · material de estudio')
        c.drawRightString(A4[0] - 18 * mm, 10 * mm, str(c.getPageNumber()))
        if self.chapter:
            c.drawRightString(A4[0] - 18 * mm, A4[1] - 11 * mm, self.chapter)
        c.setStrokeColor(GRID); c.setLineWidth(0.5); c.line(18 * mm, A4[1] - 13 * mm, A4[0] - 18 * mm, A4[1] - 13 * mm)
        c.restoreState()
    def beforeDocument(self):
        self.chapter = ''
    def afterFlowable(self, f):
        if hasattr(f, '_chap'):
            self.chapter = f._chap
            self.canv.bookmarkPage(f._key); self.canv.addOutlineEntry(f._chap, f._key, 0)
            self.notify('TOCEntry', (0, f._chap, self.page, f._key))
        elif hasattr(f, '_toc'):
            self.notify('TOCEntry', (1, f._toc[1], self.page))

def build():
    doc = Doc(OUT)
    W = doc.width
    story = []
    # ---- portada
    story.append(Spacer(1, 22 * mm))
    story.append(Paragraph('<font color="#ffffff">Habilitación por Instrumentos</font>', ParagraphStyle('ct', fontName='DV-B', fontSize=30, leading=36, textColor=colors.white)))
    story.append(Paragraph('<font color="#fde68a">P2 · IFR · VATSIM</font>', ParagraphStyle('cs', fontName='DV-B', fontSize=18, leading=24)))
    story.append(Spacer(1, 6))
    story.append(Paragraph('<font color="#e0e7ff">Manual de estudio del temario teórico del curso VATSUR, con resúmenes, tablas clave y flashcards</font>', ParagraphStyle('cs2', fontName='DV', fontSize=11, leading=15)))
    story.append(Spacer(1, 70 * mm))
    intro = ('Este manual reorganiza y redacta con otras palabras el curso <b>«P2 – Habilitación por Instrumentos»</b> de VATSUR '
             '(entrenamiento ATO, documentación teórica completa). Es material de estudio personal: '
             'ante cualquier duda manda siempre la documentación oficial de VATSIM y de la división, y las cartas vigentes. '
             'Las aclaraciones que no vienen del curso están marcadas como tales. Cada capítulo termina con <b>«Lo esencial»</b>, y al final encontrarás '
             'una <b>chuleta de tablas</b> y un apéndice de <b>flashcards recortables</b>.')
    story.append(Paragraph(intro, ParagraphStyle('ci', parent=S['body'], fontSize=10, leading=15)))
    story.append(Spacer(1, 6))
    story.append(NextPageTemplate('normal')); story.append(PageBreak())
    # ---- índice
    toc = TableOfContents(); toc.levelStyles = [S['toc1'], S['toc2']]; toc.dotsMinLevel = 0
    story.append(Paragraph('Índice', S['h1'])); story.append(toc); story.append(PageBreak())
    # ---- capítulos
    sums = summaries()
    for path in sorted(glob.glob(os.path.join(C, 'topics', '*.md'))):
        meta, body = parse_topic(path)
        title = f"{meta['num']}. {meta['title']}"
        h = Paragraph(esc(title), S['h1']); h._chap = title; h._key = 'ch' + meta['num']
        story.append(h)
        story.append(Paragraph(f'Fuente: curso P2 VATSUR · <font color="#1e3a8a">{esc(meta["src"])}</font>', S['cap']))
        story.append(Spacer(1, 4))
        story += md_to_flow(body, W)
        if meta['id'] in sums:
            hs = Paragraph('Lo esencial', S['h2']); hs._toc = (1, 'Lo esencial')
            items = [Paragraph(inline(re.sub(r'^-\s*', '', l)), S['li'], bulletText='✓') for l in sums[meta['id']].split('\n') if l.strip()]
            t = Table([[items]], colWidths=[W])
            t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), GREENBG), ('LEFTPADDING', (0, 0), (-1, -1), 8), ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                                   ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 6), ('BOX', (0, 0), (-1, -1), 0.6, colors.HexColor('#16a34a'))]))
            story += [KeepTogether([hs, t])]
        story.append(PageBreak())
    # ---- chuleta
    h = Paragraph('Apéndice A · Chuleta de tablas', S['h1']); h._chap = 'Apéndice A · Chuleta de tablas'; h._key = 'apA'
    story.append(h)
    story += md_to_flow(open(os.path.join(ROOT, 'build', 'cheatsheet.md'), encoding='utf-8').read(), W)
    story.append(PageBreak())
    # ---- flashcards
    h = Paragraph('Apéndice B · Flashcards', S['h1']); h._chap = 'Apéndice B · Flashcards'; h._key = 'apB'
    story.append(h)
    story.append(Paragraph('Imprime, recorta por las líneas discontinuas y dobla por la mitad: pregunta a la izquierda, respuesta a la derecha. '
                           'Están agrupadas por tema.', S['body']))
    cards = json.load(open(os.path.join(C, 'flashcards.json'), encoding='utf-8'))
    names = {parse_topic(p)[0]['id']: parse_topic(p)[0]['title'] for p in glob.glob(os.path.join(C, 'topics', '*.md'))}
    rows = []
    for c in cards:
        rows.append([[Paragraph(esc(names.get(c['topic'], c['topic'])).upper(), S['tag']), Paragraph(esc(c['front']), S['fcq'])],
                     Paragraph(esc(c['back']).replace('\n', '<br/>'), S['fca'])])
    t = Table(rows, colWidths=[W * 0.42, W * 0.58])
    t.setStyle(TableStyle([('GRID', (0, 0), (-1, -1), 0.6, colors.HexColor('#94a3b8'), None, (3, 2)),
                           ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#eef2ff')),
                           ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'), ('LEFTPADDING', (0, 0), (-1, -1), 7), ('RIGHTPADDING', (0, 0), (-1, -1), 7),
                           ('TOPPADDING', (0, 0), (-1, -1), 7), ('BOTTOMPADDING', (0, 0), (-1, -1), 7)]))
    story.append(t)
    doc.multiBuild(story)
    print('OK', OUT)

if __name__ == '__main__':
    build()
