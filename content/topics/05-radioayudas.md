---
id: radioayudas
num: 5
title: Radioayudas y navegación
src: Sección 5 · págs. 50–63
---

## VOR

El **VOR** (VHF Omnidirectional Range) opera en **VHF, 108,00–117,95 MHz** y permite saber el curso hacia la estación desde donde se vuela. Consta de una estación en tierra y un receptor a bordo.

- La estación emite una señal de **referencia** de fase constante en todas direcciones y otra **variable**, direccional, que llega a cada azimut con un retraso igual a los grados del azimut (0–360°).
- El receptor **compara las fases**; la diferencia es el radial. Identificación en **Morse**.
- Emite **360 radiales**, como los radios de una rueda de bicicleta.

| Tipo | Uso | Alcance |
|---|---|---|
| **VOR T** (terminal) | Aeropuertos, aproximaciones | **25 NM** y 12 000 ft AGL |
| **VOR L** (baja altitud) | Aerovías inferiores | **40 NM** hasta 18 000 ft AGL |
| **VOR H** (alta altitud) | Aerovías | **130 NM** a 45 000 ft AGL · 100 NM entre 14 500 y 60 000 ft · 40 NM hasta 14 500 ft |

> [!key] Se usa interceptando cursos con el selector. **Alejándose**, el curso seleccionado **coincide con el radial**; **acercándose**, el curso es el **recíproco del radial**.

### CDI (indicador de desvío de curso)

- **OBS** (selector omnidireccional o de curso): gira para elegir el radial deseado o encontrar en cuál se está.
- **Aguja** izquierda-derecha: posición del radial respecto del avión.
- Indicador **TO/FROM**: si el curso seleccionado lleva hacia o desde la estación.

Girando el OBS hasta centrar la aguja se obtiene el radial (FROM) o su recíproco (TO). Si el avión se separa del radial, la aguja se desplaza a izquierda o derecha.

### HSI (indicador de situación horizontal)

Combina el **compás** (alimentado por una válvula de flujo) con las señales de **navegación y senda de planeo**.

- Rosa de rumbos bajo la **línea de fe** (en el ejemplo del curso, rumbo 184°).
- **Puntero de curso** (ejemplo: 295°; su cola marca el recíproco, 115°) y **barra de desviación** que funciona con VOR/LOC o GPS.
- **Avión fijo** en el centro: la barra muestra dónde está el curso respecto del avión.
- **TO/FROM**: triángulo. Si apunta a la flecha del curso, el curso lleva **a** la estación; si apunta a la cola, **desde** ella.
- **Bandera NAV**: no hay señal fiable. **Bandera HDG**: el compás no funciona bien.
- **Puntero de senda**: si está **por debajo del centro**, el avión está **por encima** de la senda y hay que **aumentar el descenso**.

![fig:hsi|Lectura del HSI: curso, barra de desviación, TO/FROM y puntero de senda]

### RMI (indicador radiomagnético)

Rosa de rumbos con, normalmente, **dos agujas** que apuntan a la estación seleccionada (ADF o VOR). Funciona con corriente alterna.

- Con VOR, la **cabeza** marca el **curso magnético hacia la estación** y la **cola el radial** en el que está el avión.
- Aguja **verde**: ADF. Aguja **amarilla**: VOR o punto GPS.
- **No se selecciona curso**: solo la radioayuda que indica cada aguja.

Ejemplo del curso con seis aviones alrededor de un VOR: A en el radial 000 con rumbo 270 · B R-090 rumbo 000 · C R-135 rumbo 090 · D R-180 rumbo 000 · E R-270 rumbo 180 · F R-315 rumbo 000. **El radial depende de la posición, no del rumbo.**

## DME

Da la **distancia en línea recta** (oblicua) a la estación; funciona en **UHF**. Se identifica en Morse cada **30 s** aproximadamente (una vez por cada dos identificaciones del VOR asociado), normalmente con el **mismo indicativo del VOR y un tono más agudo**.

- El equipo de a bordo **interroga** con pulsos; la estación **responde** y se mide el **tiempo** transcurrido.
- A bordo: **transmisor-receptor**, **indicador** (distancia y, a veces, velocidad terrestre y tiempo a la estación, solo o integrado en el HSI) y **antena**.
- Alcance fiable de hasta **196 NM** según la altitud (menos a baja altura: limitación de línea de vista).
- Al ser **oblicua**, en la práctica equivale a la horizontal **salvo muy cerca de la estación**.
- Precisión: **± 0,5 NM o ± 3 % de la distancia, lo que sea mayor**.

## ILS

El **ILS** (Instrument Landing System) es un sistema de **aproximación de precisión** que da curso final y trayectoria de descenso. Consta de **localizador**, **senda de planeo** y hasta **tres marcadores**.

![fig:ils|Componentes del ILS y marcadores]

### Localizador

- Antena en la **cabecera opuesta**, unos 300 ft a un lado del eje, alineada con la pista.
- Modulaciones de **90 y 150 Hz** a cada lado: mirando a la pista desde el OM, **150 Hz a la derecha (sector azul)** y **90 Hz a la izquierda (sector amarillo)**. El curso es la línea de igual señal.
- **108,10–111,95 MHz** con **décima impar** (por ejemplo, 110,30).
- Identificación Morse continua, normalmente **«I» + tres letras**.

### Senda de planeo

- Antena a **750–1 250 ft** del umbral de aproximación y a **250–650 ft** del eje.
- **150 Hz en la parte inferior y 90 Hz en la superior**.
- Ángulo ideal **3°** (mínimo **2°**): ≈ **200 ft en el MM** y **1 400 ft en el OM**.
- **UHF, 329,15–335,00 MHz**, emparejada y sintonizada automáticamente con el localizador.
- Fiable **hasta la DH publicada**; por debajo, referencias visuales. Sin DH publicada, utilizable hasta el umbral.
- **TCH** (altura de cruce del umbral): altura a la que pasa la **antena ILS del avión**, no el avión.

### Marcadores

| Marcador | Morse | Luz | Ubicación |
|---|---|---|---|
| **OM** exterior | — — — | **Azul** | **4–7 NM** del umbral; ayuda a interceptar la senda (± 50 ft de la altitud del viraje reglamentario) |
| **MM** medio | · — · — | **Ámbar** | **½–¾ NM** del umbral; cruza la senda a ≈ **200 ft** |
| **IM** interno | · · · · | **Blanca** | Entre el MM y el umbral (CAT II/III); marca el final de la senda, donde se alcanza la DA |

### Categorías ILS

| Categoría | DH | RVR |
|---|---|---|
| **CAT I** | **200 ft** | **800 m** (550 m con luces de zona de toma y de eje) |
| **CAT II** | **< 200 ft y ≥ 100 ft** | **300 m** |
| **CAT IIIA** | Sin DH o **< 100 ft** | **≥ 200 m** |
| **CAT IIIB** | Sin DH o **< 50 ft** | **< 200 m y ≥ 50 m** |
| **CAT IIIC** | Sin DH | Sin RVR mínimo |

## GPS

Navegación por satélite que da posición, velocidad, hora, altitud, dirección, velocidad terrestre, error de derrota, rumbo y variación.

- El receptor calcula la distancia a cada satélite por el **tiempo de viaje** de la señal. Con **3 satélites** tiene la posición en 3D; el **cuarto** elimina el error de sincronismo del reloj → **hacen falta 4**.
- **Segmento espacial**: **32 satélites** (de los 24 iniciales) en **seis planos orbitales**; se aseguran **24** en servicio permanente y **mínimo 5 visibles** en cualquier lugar y hora. Satélites **GEO** de comunicación retransmiten correcciones (sistemas de aumento).
- **Segmento de control**: estaciones en tierra que vigilan y corrigen órbitas y relojes.
- **Segmento usuario**: antenas y receptores. Para IFR el equipo debe estar **certificado** y con la **base de datos actualizada**.

### Sensibilidad del CDI del GPS

Es **lineal**, no depende de la distancia al punto (a diferencia de las radioayudas):

| Modo | Deflexión máxima |
|---|---|
| **Ruta** | **± 5 NM** |
| **Terminal** (dentro de **30 NM** del aeropuerto) | Pasa suavemente de ± 5 a **± 1 NM** |
| **Aproximación** (desde **2 NM antes del FAF**) | **± 0,3 NM** (algunos equipos, angular como un localizador) |
| **Frustrada** | Vuelve a **± 1 NM** |

### Integridad y aumento

- **RAIM** (Receiver Autonomous Integrity Monitoring): el propio receptor compara posiciones con **satélites redundantes**; con detección y exclusión de fallos descarta el satélite defectuoso.
- **AAIM** (Aircraft Autonomous Integrity Monitoring): compara el GNSS con **otros sistemas del avión** (inercial, altímetro barométrico).
- **SBAS**: estaciones y **satélites geoestacionarios** que estiman errores y emiten correcciones; precisión de **1–10 m**, y avisa de qué satélites usar en unos **6 s**.

## RNAV y PBN

**Navegación de área** (OACI): navegar por **cualquier trayectoria** dentro de la cobertura de las ayudas o de la capacidad de las autónomas, o una combinación. Da más libertad lateral y aprovecha mejor el espacio aéreo:

- Rutas más cortas entre salida y llegada.
- Tramos de llegada y salida preprogramados en áreas terminales.
- Aproximaciones en aeropuertos sin ayudas instrumentales.

Sensores: **terrestres** (VOR, DME), **espaciales** (GPS, GNSS) o **autónomos** (INS, IRS), normalmente gestionados por el **FMS/FMC**. Las rutas RNAV se definen con **waypoints** por coordenadas. Los primeros sistemas creaban waypoints con radiales y distancias de VOR.

**PBN** (navegación basada en la performance): RNAV con requisitos de performance para una ruta, aproximación o espacio aéreo (**RNAV 5, Basic-RNP 1, RNP APCH, RNP AR APCH**…). El número es la **precisión lateral en NM que se mantiene al menos el 95 % del tiempo**; la mide el **error total del sistema (TSE)**. Se define en términos de **precisión, integridad, continuidad y disponibilidad**.

> [!key] **RNAV 5 = ± 5 NM el 95 % del tiempo.** RAIM = dentro del receptor; AAIM = con otros sistemas del avión; SBAS = satélites geoestacionarios, 1–10 m.
