# vuelo-ifr

- **IFR** = reglas; **IMC/VMC** = condiciones. Se puede volar IFR en VMC; nunca VFR en IMC.
- Equipo de navegación **apropiado a la ruta** (VOR a VOR → NAV + HSI, por ejemplo).
- Sin altitud mínima publicada: **2 000 ft** sobre el obstáculo más alto en **8 km** (montaña) · **1 000 ft** (resto).
- IFR → VFR: **cancelar específicamente** el IFR; en IMC que pasa a VMC, solo si se prevén VMC ininterrumpidas un tiempo razonable.
- RVSM: **1 000 ft** de FL290 a FL410 con aeronave certificada; por encima de FL410, **2 000 ft**.
- Niveles IFR: curso **000–179 impares** (… 290, 310 … 410, 450, 490) · **180–359 pares** (… 280, 300 … 400, 430, 470, 510). VFR = IFR + 500 ft.

# meteorologia

- Aire de **altas a bajas**. Alta = seco, estable, descendente (buen tiempo); baja = ascendente, inestable (nubes y precipitación).
- Convección: terreno desnudo → **efecto globo**; agua/vegetación → aterrizas **corto**. Sotavento de montaña: turbulento y **descendente**.
- **Microrráfaga**: < 1 milla, < 1 000 ft, ≈ **15 min**, hasta **6 000 ft/min** de descendencia, ≥ 45° de cambio de viento.
- Frío y seco = estable; cálido y húmedo = inestable. **Inversión**: temperatura sube con la altura; tapa que atrapa niebla y polución.
- Niebla (base < **50 ft**): **radiación** (noche clara y en calma, valles) · **advección** (cálido húmedo sobre frío, costas) · **vapor** (frío seco sobre agua cálida).
- Nubes: bajas < **6 500 ft** · medias 6 500–**20 000** · altas > 20 000 · desarrollo vertical (cúmulos en torre, **cumulonimbos**).
- Gránulos de hielo = **lluvia helada arriba**. Masa sobre superficie cálida → inestable, buena visibilidad; sobre fría → estable, niebla.
- Frente **frío**: cumulonimbos, chubascos fuertes, presión mínima al paso y sube. **Cálido**: estratos, precipitación continua, mala visibilidad. **Ocluido**: frío rápido alcanza al cálido.
- Tormenta: cúmulo → **madurez** (la más violenta, ≈ 15 min) → disipación (yunque). Rodear severas a **≥ 20 NM**.
- Turbulencia hasta 30 km fuera de la nube; frente de ráfagas hasta 25 km por delante. **Hielo claro 0 a −15 °C**. Altímetro: **> 100 ft** de error en 15 min.

# cartas

- Anexo 4 OACI: **17 tipos** en **4 grupos** (planificación, en vuelo, movimiento en tierra, navegación visual).
- **SID**: pista → punto significativo de la ruta. **STAR**: ruta → **IAF**. Carta de área: transiciones en el **TMA**.
- Topográfica de precisión: para pistas **CAT II/III** (radioaltímetro).
- Leer la IAC en orden: encabezado, frecuencias, briefing, planta, perfil, mínimos.
- **MSA 25 NM** salvo indicación. Altitud del FAF: en el ILS, la de cruce en la senda.
- Categoría = **1,3 × VSO** a masa máxima certificada. **DA** (precisión) / **MDA** (no precisión), altura entre paréntesis.
- **V3/4** = ¾ de milla de visibilidad · **R40** = RVR 4 000 ft · NA = no autorizado.

# planificacion

- Go/No-Go al preparar la navegación: METAR, TAF, sinópticas, satélite, viento en altura, fenómenos significativos.
- Alternativa: aproximación para la **categoría**, **mínimos de alternativa**, pronóstico y combustible **destino → alternativa más crítica + 45 min**.
- NOTAM: NOTAM**N/R/C**; Q) FIR/Qxxxx/tránsito/objetivo/alcance/límites/coordenadas-radio; A) lugar, B) inicio, C) fin, E) texto.
- Código Q: 2.ª letra = objeto (L, M, F · A, S, P · R, W · C, I, N, G · O); 4.ª–5.ª = estado (A, C, H, L, XX).
- **MEA** de todos los tramos frente al techo del avión (C172: FL130). Límite inferior/superior **FL245**.
- Rutas: **ABGR** conv. regional · **LMNP** RNAV regional · **HJVW** conv. nacional · **QTYZ** RNAV nacional; **U** superior, **S** supersónica, **K** helicópteros; sufijo **F** asesoramiento, **G** información.
- Gradiente mínimo SID **3,3 %** salvo publicado. Razón = **GS × % × 1,013** (150 kt: 3,3 % → 501; 5 % → 760 ft/min).
- Ruta: `SID PUNTO AEROVÍA PUNTO STAR` (`OSMAR2 OSMAR W19 CHALO EKONU`); `DCT` para directos. Ojo a aerovías de **sentido único** y STAR con restricciones.

# radioayudas

- VOR: **108,00–117,95 MHz**, comparación de fases, 360 radiales. **T** 25 NM · **L** 40 NM · **H** 130 NM.
- Alejándose: curso = radial. Acercándose: curso = recíproco del radial.
- HSI: TO/FROM por el triángulo; **NAV** = sin señal fiable, **HDG** = compás averiado; puntero de senda **abajo = estás alto**.
- RMI: **cabeza = curso a la estación**, **cola = radial**; verde ADF, amarilla VOR/GPS; no se selecciona curso.
- DME: **UHF**, oblicua, hasta **196 NM**, ident cada 30 s con tono más agudo; error **± 0,5 NM o 3 %** (el mayor).
- LOC: **108,10–111,95 décima impar**; **150 Hz derecha (azul)**, 90 Hz izquierda (amarillo). GS: **329,15–335,00 UHF**, 3° (mín. 2°), 150 abajo / 90 arriba.
- Marcadores: **OM azul — — —** (4–7 NM) · **MM ámbar ·—·—** (½–¾ NM, 200 ft) · **IM blanca ····**.
- CAT I DH 200 / RVR 800 (550) · CAT II 100–200 / 300 · IIIA < 100 / ≥ 200 · IIIB < 50 / 50–200 · IIIC sin mínimos.
- GPS: **4 satélites** (3 + reloj); 32 en 6 planos, 24 garantizados, ≥ 5 visibles. CDI: ruta ± 5 · terminal ± 1 (30 NM) · aproximación ± 0,3 (2 NM antes del FAF) · frustrada ± 1.
- **RAIM** (receptor), **AAIM** (con otros sistemas), **SBAS** (GEO, 1–10 m). PBN: **RNAV 5 = 5 NM el 95 % del tiempo** (TSE).

# vuelo-instrumental

- Instrumentos de **control** (actitud, potencia), **performance** (altímetro, velocímetro, variómetro, rumbo, viraje, Mach, AoA) y **navegación** (HSI, RMI, DME).
- **Actitud + potencia = performance**: establecer, compensar, cross-check, ajustar. **1 ancho de barra ≈ 2°**.
- Cross-check **radial** (80–90 % en la actitud), **rectangular** (igual tiempo a todos), **V invertida** (actitud–viraje–actitud–variómetro). Panel parcial: el coordinador de viraje pasa a primario.
- Prevuelo: altímetro **± 75 ft**; en rodaje, rumbo aumenta al virar a la derecha y la **bola va al lado contrario**.
- Despegue: sin cambios de rumbo hasta **400 ft AGL**; ascenso positivo antes de tren y flaps.
- Nivelar con anticipo del **10 % del variómetro**. Corrección de rumbo: alabeo = grados a corregir, máx. **30°** o viraje estándar.
- Viraje estándar **3°/s** (360° en 2 min), medio estándar 1,5°/s (4 min). **Alabeo = 10 % TAS + 5**.
- Virajes a nivel: más potencia al entrar, quitarla al salir (el avión tiende a subir). En ascensos, **potencia antes que actitud**.

# interceptaciones

- Ángulo de interceptación **≤ 90°**. Cerca de la estación la aguja se mueve más rápido.
- **Acercamiento** (cabeza vs deseado): **< 15° → 2P** · **15–60° → 30°** · **60–90° → hasta 90°** · **> 90° → ruta pasada** (rumbo opuesto al deseado hasta la cuadra, tiempo y viraje hacia la cabeza).
- **Alejamiento** (cola vs radial deseado): **< 15° → P** · **15–90° → 45°** · **> 90° → rumbo radial hasta la cuadra y 45° hacia la cabeza**.
- Ejemplos: 135→145 = **115°** · 250→210 = **280°** · 330→045 = **315°** · R320→R330 = **340°** · R120→R050 = **005°**.
- Viento: viene del lado al que se va la **cabeza**; corregir con los grados de la deflexión. Cabeza hacia el índice superior = corrección corta; en alejamiento (cola) al revés.
- Inversión de curso: **45°**, 1 min (a los 45 s, rumbo recíproco al lado opuesto), viraje al recíproco por el lado opuesto e interceptación = **viraje reglamentario**.

# arco-dme

- Radial → arco: anticipo **0,5 % GS** (estándar) o **1 %** (medio estándar); **se suma en acercamiento, se resta en alejamiento**. 120 kt, arco 13: **13,6 / 12,4 NM**.
- Mantener: aguja del RMI en la **punta de ala**, ± **0,5 NM**. Tramos rectos: **10° por encima → 5° por debajo**. Alabeo constante cerca de la estación (5–10 NM).
- Corrección: 0,5 NM hacia dentro → **5° más por debajo**; 0,5 NM hacia fuera → **10° más por encima**.
- Arco → radial: **60 × (0,5 % GS) / distancia** (1 % en medio estándar). 120 kt, 13 NM → **2,77 ≈ 3°** → para el radial 274, virar en el **271**.

# esperas

- Estándar = **derecha**; no estándar = izquierda. Publicada y sin instrucciones → **tal como está publicada**. Cada tramo **1 min**.
- Velocidades del curso: **hélice 175 KIAS**; reactores **200** (hasta 6 000 ft) · **230** (6 001 ft–FL140) · **265** (> FL140).
- Sectores con **± 10°** de flexibilidad: **paralela 110°** (A), **gota 70°** (B), **directa 180°** (C). HDG bug en el rumbo de alejamiento sobre el indicador.
- Estándar: alejamiento en los **110° a la izquierda** del rumbo actual → paralela; en los **70° a la derecha** → gota; resto directa. No estándar: espejo.
- Paralela: si a los **30 s** del segundo viraje no has interceptado, **directo a la estación**. Gota: **alejamiento − 30°** (estándar) durante 1 min.
- Crono desde **la cuadra o alas niveladas, lo último**. **Sobra → mitad y se resta**; **falta → doble y se suma** (1:20 → 50 s; 50 s → 1:20).

# aproximaciones

- ILS: estabilizarse en el localizador **antes** de la senda; el CDI se mueve más rápido cerca de la pista; corregir **hacia la aguja**.
- Poner el curso de la aproximación aunque **no afecte** al localizador. CDI a tope hasta estar dentro de **2,5°**.
- No volar las agujas: corregir con **actitud y potencia**. En la DA sin referencias visuales → **frustrada**.
- Bandera o deflexión completa del CDI → **frustrar**. Bandera de senda → no bajar de la **MDA**. Solo localizador = **no precisión**.
- **LNAV** (MDA, 0,3 NM) · **LNAV/VNAV** (DA, no precisión, Baro-VNAV con límites de temperatura) · **LP** (MDA, SBAS) · **LPV** (DA, SBAS, ≈ ILS CAT I).
- TAA: **FAF a 5 NM** del umbral, **IF 5 NM** más, **IAF a 3–6 NM** a los lados; **T = 90°**, **Y = 70°**; segmento inicial mín. **3 NM (CAT A)**–6 NM (CAT E).
- Áreas Directa, Base derecha y Base izquierda, **arco de 30 NM**. Viraje > **120°** en el IF sin IAF laterales → **entrada en espera**.
- RNAV: cargar pista, aproximación, transición y STAR; **RAIM** antes de pedirla; comprobar **APPROACH MODE** tras el IF.

# briefing-emergencias

- Briefings de salida, crucero y llegada: meteorología, terreno (**MSA/MEA/MVA**), procedimientos (nombre, fecha, radioayudas, lectura), configuración, anomalías, NOTAM.
- **MAYDAY ×3** (peligro) · **PAN-PAN** (urgencia). Datos: naturaleza, intenciones, posición/rumbo/altitud, combustible (h:min), POB, otros, indicativo.
- **7700**, pero bajo radar se mantiene el código hasta que lo pida el ATC. **7600** fallo de comunicaciones. **7500 prohibido** en VATSIM.
- Código de conducta **B6**: nunca emergencia para obtener prioridad; solo con ATC (no en UNICOM); terminarla si lo pide el controlador.
- **Combustible mínimo** ≠ emergencia: notificar los minutos que quedan.
- Fallo giroscópico: **panel parcial**, tapar el instrumento; **volar, navegar, comunicar**.
- Fallo de comunicaciones: en VMC, aterrizar lo antes posible. En IMC: ruta **asignada → directo desde vectores → prevista → plan de vuelo**; altitud: asignada, mínima IFR y prevista (la más alta); subir al llegar al aumento de MEA (antes si hay MCA).
- Llegar antes de la hora de aproximación → **espera**. Vectores sin giróscopo: **estándar** hasta final, luego **medio estándar**.
