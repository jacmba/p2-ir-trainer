# Cabina P2 — entrenador para el P2 (habilitación por instrumentos) de VATSIM

Material de estudio personal basado en el curso «P2 – Habilitación por Instrumentos (IFR)» de VATSUR
(entrenamiento ATO, documentación teórica completa, 98 páginas). El texto está redactado de nuevo y reorganizado;
ante cualquier duda mandan la documentación oficial de VATSIM y de la división, y las cartas vigentes.

Mismo esquema que `adc-trainer` y `spp-trainer`: una app web sin dependencias ni build (temario, resúmenes,
flashcards, test, mini-juego y chuleta) y un manual en PDF, ambos generados desde `content/`.

## Estructura

```
content/                 ← fuente única de verdad (editar aquí)
  topics/NN-*.md         11 temas (las 7 secciones del curso), con front matter id/num/title/src
  summaries.md           "Lo esencial" de cada tema (# id-del-tema)
  flashcards.json        [{topic, front, back}]                       (145 tarjetas)
  questions.json         banco fijo [{t, q, o[], a[], m?, e}]          (180 preguntas; a = índices; m = múltiple)
  scenarios.json         14 escenarios de la Cabina IFR (formato abajo)
  diagrams/*.svg         8 diagramas propios: espera, sectores, interceptación, arco, ILS, HSI, TAA, cross-check
app/
  index.html             shell + estilos (claro/oscuro, móvil)
  js/rules.js            reglas del P2: interceptaciones (2P / 30° / hasta 90° / ruta pasada; P / 45°), entradas y
                         velocidades de espera del curso, cronometraje, arco DME, gradientes de SID, niveles IFR,
                         categorías y frecuencias ILS, DME, GPS, designadores ATS, NOTAM…
  js/generators.js       31 generadores paramétricos de preguntas (algunos con RMI, HSI, espera o arco dibujados)
  js/data.js             GENERADO desde content/ (no editar)
  js/app.js              vistas + instrumentos SVG viz({kind:'rmi'|'hsi'|'hold'|'arc'}) + entrenadores
build/
  build_data.py          content/ → app/js/data.js
  build_pdf.py           content/ → build/Manual_P2_IFR_VATSIM_ES.pdf (reportlab + DejaVu)
  cheatsheet.md          chuleta de tablas (app y apéndice A del PDF)
  test_rules.js          reglas contra los ejemplos resueltos del curso + 12 400 preguntas generadas
  smoke_test.js          prueba de humo con jsdom (temas, test de 80, escenarios y entrenadores)
```

## Comandos

```bash
python3 build/build_data.py          # regenerar datos de la app
python3 -c "import cairosvg,glob,os; [cairosvg.svg2png(url=f, write_to='build/diagrams/'+os.path.basename(f)[:-4]+'.png', output_width=1520) for f in glob.glob('content/diagrams/*.svg')]"
python3 build/build_pdf.py           # regenerar el PDF (requiere reportlab y los PNG de build/diagrams)
node build/test_rules.js             # reglas y generadores
node build/smoke_test.js             # tras npm i jsdom@24
npx serve app                        # o abrir app/index.html directamente
```

## Cabina IFR

- **Escenarios** guiados (salida OSMAR2, esperas paralela y en gota, interceptaciones, arco DME de MTA, ILS con
  fallo de senda, RNAV en T, fallos de comunicaciones e instrumentos, tormentas, plan de vuelo, emergencias en VATSIM,
  viraje reglamentario). Las decisiones marcadas `sev: "loss"` cuentan como suspenso.
- **Interceptaciones**: RMI al azar; primero se elige la banda de diferencia y el método, luego el rumbo.
- **Esperas**: entrada con los sectores dibujados al corregir.
- **Arco DME**: DME al que virar para entrar al arco o radial en el que virar para salir.
- **Cronometraje**: tiempo de alejamiento corregido a partir del acercamiento medido.

## Formato de escenario

```json
{ "id": "c15", "title": "…", "cat": "Esperas", "diff": 1-3,
  "setup": { "ac": "BE58 Baron", "route": "SVMI → SVMG", "metar": "…", "notes": "…" },
  "steps": [ { "viz": {"kind": "hold", "inb": 270, "h": 150, "right": true, "sectors": true},
               "sit": "situación", "q": "pregunta", "o": ["correcta", "…"], "a": [0], "e": "explicación",
               "sev": "loss" | "minor" } ] }
```

`viz`: `rmi {qdm, hdgAc}` · `hsi {crs, hdgAc, dev (puntos, + = barra a la derecha), to, gs? (+ = puntero arriba)}` ·
`hold {inb, h, right, sectors?}` · `arc {arc, radial, inbound}` · `none`. Las opciones se barajan al jugar.

## Extensiones de markdown

- `> [!key] texto` → recuadro CLAVE · `> [!vatsim] texto` → recuadro VATSIM / nota
- `> línea` (sin [!]) → bloque de fraseología o texto literal (NOTAM, rutas)
- `![fig:nombre|pie]` → diagrama de content/diagrams
- listas con un nivel de anidamiento (dos espacios)

## Progreso

Se guarda en `localStorage` con prefijo `p2.` (aciertos por tema, temas leídos, cajas Leitner, mejor examen,
escenarios, rachas de los entrenadores). En el Temario, «Tu progreso» permite exportarlo, importarlo o borrarlo.

## Datos y decisiones que conviene conocer

- **Velocidades de espera**: se usan las del curso (hélice 175 KIAS; reactores 200 hasta 6 000 ft, 230 hasta FL140,
  265 por encima), distintas de la tabla OACI general y de la del SPP de IVAO.
- **Figura pequeña de sectores** (pág. 86): los rótulos A/B aparecen desplazados; la app sigue la figura principal
  (paralela 110°, gota 70°, directa 180°) y lo indica en el tema.
- **Ruta pasada en acercamiento**: la regla resumida dice «contar 1 minuto» y el ejemplo resuelto cronometra 2; los
  generadores no preguntan ese tiempo.
- **Gradiente**: el curso escribe «razón = VT × %»; la tabla de la carta se reproduce con el factor 1,013
  (6 076,12 / 6 000), que es el que usan las reglas.
- **Fallo de comunicaciones**: el curso enumera tres criterios de altitud sin decir cómo combinarlos; se aclara que la
  norma de origen (FAA 91.185) manda la más alta.
- Las páginas de simbología (Anexo 4, Apéndice 2) y las imágenes de cartas del PDF no se reproducen.

## Ideas para seguir

- Escenarios con cartas reales (SID/STAR/IAC de una división concreta) y un lector de IAC interactivo.
- Simulador de HSI con posición libre (dar radial y distancia, leer la barra y el TO/FROM).
- Un modo de examen cronometrado con el formato del examen teórico del P2 de VATSIM.
