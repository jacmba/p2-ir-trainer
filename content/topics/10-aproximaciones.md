---
id: aproximaciones
num: 10
title: Aproximaciones ILS y RNAV
src: Sección 7 · págs. 89–94
---

## La aproximación ILS

El ILS da información precisa de **azimut** (dirección) y **trayectoria de planeo** (descenso) hasta alturas de **0 a 200 ft** según la categoría del equipo. Puede completarse con un radiofaro, NDB, DME o TACAN, y a menudo la transición al localizador se hace con **vectores radar**.

- La aproximación inicial parte de un punto de la ruta o de puntos específicos (o vectores) para **interceptar el localizador en acercamiento**.
- Entre la interceptación del localizador y la de la senda debe haber **distancia suficiente para estabilizarse** en el localizador antes de capturar la senda.

### El comportamiento de la aguja

- **Cuanto más cerca de la estación, más rápido se mueve el CDI** con el mismo cambio de rumbo (el haz es más estrecho). Las correcciones deben ser **cada vez más suaves**.
- Las correcciones se hacen **siempre hacia el lado al que se ha desplazado la aguja**.
- Hay que poner en el selector de curso **el curso de la aproximación**: **no afecta** a la aguja del localizador, pero recuerda el curso y orienta la presentación.
- Al virar para interceptar, el CDI está **totalmente desplazado hasta estar dentro de 2,5°** del curso: atención a su **primer movimiento** para no pasarse.
- Se mantiene la **altitud de interceptación de la senda** mientras se reduce a la velocidad de aproximación final y hasta capturarla.
- Antes del **OM o FAF**, determinar y mantener el **curso exacto con la corrección de deriva**.

![fig:hsi|Barra del localizador y puntero de senda en el HSI]

### Errores y técnica

> [!key] El error más común: **volar las agujas** e ignorar los instrumentos de performance. Las correcciones se hacen en los **instrumentos de control** (actitud y potencia) según el rumbo y la velocidad vertical.

- En la última parte de la final el cross-check debe ser **más rápido**: las desviaciones crecen deprisa y las correcciones deben ser **pequeñas e inmediatas**.
- La fase **más crítica** es la llegada a la **altitud de decisión**: cross-check completo con más énfasis en el **altímetro** y un barrido sistemático buscando la pista antes de la DA.
- Con **referencias visuales** (luces de aproximación o pista), continuar al aterrizaje combinando instrumentos y referencias visuales. **Sin pista a la vista en la DA → frustrada.**

### Situaciones anómalas

- **Bandera de fallo del CDI** o deflexión **completa** del localizador → **frustrar**.
- **Bandera de fallo de la senda** → no descender por debajo de la **MDA** publicada (se convierte en una aproximación de localizador).
- Las aproximaciones de **solo localizador** (sin senda) se planifican como **de no precisión**.

## Aproximaciones RNAV

Las puede volar cualquier piloto cuyo avión tenga los sistemas adecuados. Pueden tener o no guía vertical y se etiquetan **RNAV (GNSS)** o **RNAV (GPS)** según el país.

| Tipo | Guía vertical | Mínimo | Notas |
|---|---|---|---|
| **LNAV** | No | **MDA** | En la base de datos; GNSS + RAIM dan **0,3 NM** en final. Descenso a razón constante hasta la MDA; sin pista a la vista, frustrada (botón **GA** o manual) |
| **LNAV/VNAV** | Sí (piloto automático o director de vuelo) | **DA** | Escala vertical típica ± 50 ft (seudosenda); limitaciones de temperatura con **Baro-VNAV**. **No es de precisión**: la escala lateral es fija (0,3 NM) |
| **LP** | No | **MDA** | Requiere **SBAS**; escala lateral angular, como un localizador |
| **LPV** | Sí | **DA** | Requiere **SBAS**; confinamiento vertical que puede parecerse a un **ILS CAT I** |

Antes del FAF, con SBAS, el sistema verifica la integridad lateral y vertical mediante el **nivel de servicio (LOS)**, y el piloto puede ver los niveles de protección **HPL** (horizontal) y **VPL** (vertical).

## El TAA y el diseño en T o en Y

El **Área de Arribo de Terminal (TAA)** ordena la transición de los tráficos RNAV desde la ruta. Contiene una aproximación en **T** o en **Y**:

![fig:taa|Diseño en T de una aproximación RNAV y áreas del TAA]

- El **umbral** es el waypoint final. Sobre el eje, a **5 NM**, el **FAF**; otras **5 NM** más allá, el **IF** (punto intermedio, que también puede ser IAF).
- Desde el IF, a cada lado, a **3–6 NM**, los dos **IAF**.
- El segmento inicial tiene una longitud mínima de **3 NM para CAT A** y **6 NM para CAT E** (según la categoría y el gradiente de descenso).
- Los segmentos iniciales forman **90°** con el intermedio en la **T** y **70°** en la **Y**.
- La **frustrada** va idealmente alineada con el final y termina con **entrada directa a una espera**.
- Tres áreas: **Directa**, **Base derecha** y **Base izquierda**, limitadas por un **arco de 30 NM**. Las altitudes publicadas de cada área deben mantenerse al cruzarlas (las distancias pueden ser distintas entre áreas).

### Reglas de entrada

- Las bases derecha e izquierda se introducen en el sistema como **transición al IAF** correspondiente; si hay espera publicada en el IF(IAF), también aparece como transición.
- Si se eliminan ambos IAF laterales y hay que virar **más de 120°** en el IF para interceptar el curso hacia el FAF, se hace una **entrada en la espera del IF** para quedar establecido en el acercamiento.
- Sin IAF laterales ni espera publicada, solo se puede llegar al IF por una **STAR o con vectores**.

### Preparar y volar la RNAV

1. Cargar de la base de datos: **pista, aproximación, transición y STAR**.
2. Antes de pedir la aproximación, comprobar el **RAIM** y la disponibilidad e integridad de satélites a la hora prevista.
3. Antes de empezar, verificar que la aproximación está **armada** (se activa sola en la secuencia de ruta tras el IF, o manualmente).
4. Al dejar el IF, comprobar el **cambio de escala del CDI**; muchos equipos muestran **APPROACH MODE**.
5. En frustrada, al llegar al **MAPt**, verificar que el sistema sigue el procedimiento de la base de datos (algunos aviones exigen activarlo con **GO AROUND** o desde el sistema).
