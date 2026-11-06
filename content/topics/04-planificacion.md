---
id: planificacion
num: 4
title: Planificación del vuelo IFR
src: Sección 4 · págs. 42–49
---

## Go / No-Go

La decisión de ir o no ir se toma **al preparar la navegación**. El vuelo IFR exige una planificación cuidadosa para hacerlo con seguridad y poder afrontar imprevistos. Además de **METAR y TAF**, conviene reunir toda la información posible y valorarla frente a las capacidades del avión y su equipamiento:

- Cartas sinópticas de superficie.
- Imágenes de satélite.
- Cartas de viento en altura.
- Cartas de fenómenos significativos.

## Selección de la alternativa

Para elegir el aeropuerto alternativo:

- Que tenga un **procedimiento de aproximación por instrumentos aplicable a la categoría** de la aeronave.
- Los **mínimos meteorológicos para usarlo como alternativa** (vienen en su carta de aproximación).
- Su **pronóstico**.
- El combustible para ir del destino a la **alternativa más crítica más 45 minutos**.

## NOTAM

Notas con información esencial sobre aeródromos, rutas, radioayudas, servicios, procedimientos o riesgos, que debe difundirse con rapidez. Hay que revisar **siempre** los de salida, llegada, **alternativa** y de todas las **FIR** atravesadas.

Ejemplo del curso:

> A4347/20 NOTAMN
> Q) SCEZ/QMRLC/IV/BO/A/000/999/3324S07048W005
> A) SCEL B) 2011261200 C) 2012202359
> E) RWY 17R/35L CLSD DUE TO WIP

### Primera línea: serie, número e identificador

- **Serie**: letra (aquí **A**) si se emite más de una serie.
- **Número**: cuatro cifras / dos del año, consecutivos por año civil: **4347/20**.
- **Identificador**: **NOTAMN** (nuevo) · **NOTAMR** (reemplaza: `A0135/11 NOTAMR A0124/11`) · **NOTAMC** (cancela: `A0470/11 NOTAMC A0456/11`).

### Campo Q: ocho subcampos separados por barras

| Subcampo | Ejemplo | Significado |
|---|---|---|
| FIR | `SCEZ` | Indicador OACI de la FIR (o del país + «XX» si afecta a varias) |
| Código NOTAM | `QMRLC` | 5 letras: **Q** + objeto (2.ª–3.ª) + estado (4.ª–5.ª) |
| Tránsito | `IV` | **I** IFR, **V** VFR, **IV** ambos |
| Objetivo | `BO` | **N** atención inmediata de la tripulación · **B** entra en el boletín previo al vuelo (PIB) · **O** operaciones de vuelo · **M** varios, a solicitud |
| Alcance | `A` | **A** aeródromo · **E** en ruta · **W** aviso para la navegación |
| Límites | `000/999` | Inferior/superior en FL; sin dato de altura, **000** y **999** |
| Coordenadas y radio | `3324S07048W005` | Centro del círculo y radio de influencia (aquí **5 NM**) |

**Objeto (2.ª letra)**:

| Grupo | Letras |
|---|---|
| AGA (aeródromos) | **L** iluminación · **M** área de movimiento y aterrizaje · **F** instalaciones y servicios |
| ATM | **A** organización del espacio aéreo · **S** servicios ATS y VOLMET · **P** procedimientos |
| Avisos para la navegación | **R** restricciones del espacio aéreo · **W** avisos |
| CNS | **C** comunicaciones y radar · **I** ILS y microondas · **N** navegación terminal y en ruta · **G** GNSS |
| Otras | **O** |

**Estado (4.ª–5.ª)**: **A** disponibilidad · **C** cambios · **H** peligro · **L** limitaciones · **XX** otro. Para cancelar: **AK** reanudada la operación normal · **AL** funcionando de nuevo con las limitaciones publicadas · **AO** operacional · **CC** completado · **XX** lenguaje claro.

### Resto de campos

- **A)** aeródromo o FIR afectados (`SCEL`).
- **B)** inicio de vigencia y **C)** fin, en **AAMMDDHHmm UTC** (`2011261200` = 26-nov-2020 12:00 UTC).
- **E)** el texto: `RWY 17R/35L CLSD DUE TO WIP` = pista cerrada por obras.

> [!vatsim] Los NOTAM reales de cualquier aeródromo o FIR se consultan en el buscador de la FAA (notams.aim.faa.gov). En VATSIM conviene revisar además los NOTAM de la división o del evento.

## Combustible

El cálculo IFR incluye:

- Llegada al **destino**; más
- llegada a la **alternativa más crítica** (si aplica); más
- **combustible remanente** según el tipo de aeronave (el curso toma **45 min** para la alternativa).

Lo que sobre por encima del mínimo puede preverse para **esperas**.

## Determinar la ruta

Influyen la disponibilidad de rutas, la performance, el consumo… Las rutas IFR empiezan y acaban en un punto al que se llega o del que se sale mediante **SID, STAR, vectores** o incluso una **IAC**.

- Revisar la **MEA** (altitud mínima en ruta) de todos los tramos: puede superar el techo del avión. Ejemplo: el **C172 tiene techo operativo FL130**, así que no se planifica una aerovía con **MEA FL140**.
- Espacio aéreo **inferior / superior**: límite **FL245**. Por debajo se usa la carta de rutas inferiores; por encima, la de superiores.
- **Convencionales o RNAV**: se distinguen por color o indicador (en SkyVector, convencionales en **negro** y RNAV en **azul**). Solo se vuelan las RNAV con el equipo adecuado.
- **Sentido único**: algunas aerovías solo se pueden volar en un sentido.

### Designadores de rutas ATS

| Letra | Tipo |
|---|---|
| **A, B, G, R** | Convencionales del sistema **regional** |
| **L, M, N, P** | **RNAV** del sistema **regional** |
| **H, J, V, W** | Convencionales **nacionales** |
| **Q, T, Y, Z** | **RNAV nacionales** |

Prefijos: **U** espacio aéreo superior · **S** supersónicos · **K** helicópteros a bajo nivel. Sufijos: **F** solo servicio de asesoramiento · **G** solo servicio de información de vuelo.

### Ejemplo del curso: SVMI → SVMG

- Ambos aeródromos se unen por la **W19**: del VOR **MIQ** por OSMAR, DALSI, DOSRA, TORTU y CHALO hasta el VOR **MTA**, con **MEA 5 000 ft**.
- La W19 es de **sentido único hacia MTA**: para volver (SVMG → SVMI) hay que ir por la **A561 hasta CBC y la A552 hasta MIQ**.
- SID: la **OSMAR2** termina en OSMAR, que está en la W19. Conviene mirar también las aproximaciones de SVMI por si hay que volver.
- STAR: desde CHALO, la **EKONU**, que es **RNAV** y exige cruzar CHALO a **FL110 o superior**: si se planifica volar a 5 000 ft, no se usa. Sin RNAV, se sigue la aerovía hasta MTA o, tras CHALO, directo al punto de inicio de la aproximación.

### Gradientes mínimos de ascenso de la SID

Las SID publican el gradiente mínimo (por ejemplo, **5,0 % hasta 2 100 ft y luego 3,3 % hasta GENAS**) y una tabla de razón de ascenso según la **velocidad terrestre**:

| GS (kt) | 75 | 100 | 150 | 200 | 250 | 300 |
|---|---|---|---|---|---|---|
| 3,3 % (ft/min) | 251 | 334 | 501 | 668 | 835 | 1 003 |
| 5,0 % (ft/min) | 380 | 506 | 760 | 1 013 | 1 266 | 1 519 |

Sin tabla:

- **Razón de ascenso (ft/min) = GS × % × 1,013**
- **% de gradiente = razón (ft/min) / (GS × 1,013)**

(El curso escribe la primera fórmula como «VT × porcentaje»; el factor 1,013 viene de que 1 % equivale a **101,3 ft por NM** y es el que reproduce la tabla. Sin él la diferencia es de apenas un 1 %.)

> [!key] Si la carta no publica otro, **todas las salidas instrumentales exigen al menos un 3,3 %**. A 150 kt: 3,3 % → **501 ft/min**; 5 % → **760 ft/min**.

## Rellenar la ruta del plan de vuelo

Formato: **SID, punto donde acaba la salida, aerovía, punto donde empieza la llegada, STAR**.

> OSMAR2 OSMAR W19 CHALO EKONU

- Sin SID ni STAR: primer punto = donde se entra en la ruta; último = donde se abandona o empieza la aproximación (a menudo la radioayuda del aeródromo): `MIQ W19 MTA`.
- Varias aerovías: se encadenan con el punto de cambio: `MTA A561 CBC A552 MIQ`.
- Tramos directos (sin aerovía adecuada, o para evitar meteorología): **DCT** entre puntos: `MIQ A552 PORGA DCT MTA`.

Con la ruta definida queda calcular **rumbo, tiempo y combustible** por tramo con las tablas de performance (como en el P1) y pasarlo al plan de vuelo operacional.
