---
id: esperas
num: 9
title: Circuito de espera
src: Sección 7 · págs. 85–88
---

## Qué es

Una **espera** es una maniobra predeterminada que mantiene al avión dentro de un **espacio aéreo específico** mientras espera una autorización del ATC o mientras se prepara para la aproximación.

- **Estándar**: virajes por la **derecha**. **No estándar**: por la **izquierda**.
- Si la espera está **publicada** y el ATC no da instrucciones detalladas, se vuela **tal como está publicada**.

Se vuela un **curso de acercamiento** hacia el fijo (VOR, NDB o fijo), viraje de **180°** (a la derecha en estándar), **rumbo de alejamiento** paralelo al curso de espera, otro viraje de 180° e interceptación del curso hacia el fijo. **Cada tramo dura 1 minuto.**

![fig:espera|Elementos del circuito de espera estándar]

Elementos: **punto de referencia** (el fijo), **extremo del punto de referencia**, **a la cuadra** (al través del fijo en el alejamiento), **tramo de alejamiento**, **extremo del alejamiento**, **tramo de acercamiento**, **lado espera** y **lado opuesto a la espera**.

## Velocidades máximas

| Aeronave | Altitud | Velocidad máxima (KIAS) |
|---|---|---|
| **Hélice** (incluidos turbohélices) | Cualquiera | **175** |
| **Reactores** | MHA hasta **6 000 ft** | **200** |
| **Reactores** | **6 001 ft a FL140** | **230** |
| **Reactores** | Por encima de **FL140** | **265** |

> [!vatsim] Estos son los valores del curso P2. Otras tablas (la OACI general o la de la división del SPP de IVAO) dan cifras distintas, como 230/240/265 kt: para el examen del P2, la tabla de arriba.

## Entradas

La entrada busca situar al avión **cuanto antes en el lado de la espera**, la zona protegida con más margen sobre los obstáculos. Se elige según el **rumbo de alejamiento** del circuito, que caerá en uno de **tres sectores**, con una **flexibilidad de 10° a cada lado** de los límites.

![fig:sectores|Sectores de entrada dibujados sobre el indicador de rumbo]

El método práctico: imaginar el dibujo de los sectores **sobre el indicador de rumbo**, con el rumbo actual arriba, poner el **HDG bug en el rumbo de alejamiento** y mirar en qué sector cae.

| Circuito | Sector A · Paralela | Sector B · Gota de agua | Sector C · Directa |
|---|---|---|---|
| **Estándar** (derecha) | Los **110°** a la **izquierda** del rumbo actual | Los **70°** a la **derecha** del rumbo actual | Los **180°** restantes (por detrás) |
| **No estándar** (izquierda) | Los **110°** a la **derecha** | Los **70°** a la **izquierda** | Los **180°** restantes |

> [!vatsim] En la figura pequeña del curso (sectores sobre el indicador de rumbo) los rótulos «Sector A» y «Sector B» quedan desplazados respecto de sus cuñas. Lo que manda es la amplitud de la figura principal: **paralela = 110°, gota = 70°, directa = 180°**.

> [!key] Regla rápida (H = rumbo de llegada, O = rumbo de alejamiento). **Estándar**: O entre H − 110 y H → **paralela**; entre H y H + 70 → **gota**; resto → **directa**. **No estándar**: O entre H y H + 110 → paralela; entre H − 70 y H → gota.

### Paralela (sector A)

Tras cruzar el fijo, viraje por la **izquierda** (derecha en no estándar) para mantener el **rumbo de alejamiento** por el lado opuesto. **1 minuto** y nuevo viraje por la **izquierda** (derecha en no estándar) para interceptar el acercamiento. **Si a los 30 s no se ha interceptado, directo a la estación.**

### Gota de agua (sector B)

Tras el fijo, se sigue el **radial de la gota durante 1 minuto**: **30° menos que el rumbo de alejamiento** en estándar (30° más en no estándar). Después, viraje por la **derecha** (izquierda en no estándar) para interceptar el acercamiento.

### Directa (sector C)

Tras el fijo, viraje por la **derecha** (izquierda en no estándar) al **rumbo de alejamiento**, **1 minuto**, y viraje de 180° para interceptar el acercamiento.

## Control del tiempo

El tiempo del alejamiento empieza **a la cuadra del fijo o al nivelar las alas, lo que ocurra último**, una vez establecido en el circuito. El viento cambia los tiempos y distancias; tras el **primer circuito** se ajusta el tiempo de alejamiento para conseguir **1 minuto en el acercamiento**:

- **Sobra tiempo** en el acercamiento → el exceso **dividido entre 2** se **resta** del alejamiento.
- **Falta tiempo** en el acercamiento → la falta **multiplicada por 2** se **suma** al alejamiento.

| Acercamiento medido | Cálculo | Nuevo alejamiento |
|---|---|---|
| 1 min 20 s | 20 / 2 = 10 s → 60 − 10 | **50 s** |
| 50 s | 10 × 2 = 20 s → 60 + 20 | **1 min 20 s** |

> [!key] **Sobra → mitad y se resta. Falta → doble y se suma.** El objetivo es siempre el acercamiento de 1 minuto.
