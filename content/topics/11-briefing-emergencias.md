---
id: briefing-emergencias
num: 11
title: Briefing y emergencias
src: Sección 7 · págs. 95–98
---

## Briefings

Los briefings sirven para **repasar procedimientos y factores operacionales** de cada fase, y los externos que pueden afectarla. Mejoran la **consciencia situacional** y preparan la respuesta ante una anomalía o emergencia.

| Salida / despegue | Crucero | Llegada / aproximación |
|---|---|---|
| Meteorología / ATIS | Meteorología: fenómenos significativos, precipitación, altimetría | Meteorología / ATIS |
| Terreno: **MSA** y elevación del aeródromo | **Combustible en ruta**: consumo acorde a lo planificado | Terreno: **MSA, MVA** (altitud mínima de vectorización) y elevación |
| **SID**: nombre, fecha de efectividad, radioayudas y lectura del procedimiento | Terreno: **MEA** (MOCA en VFR) | **STAR**: nombre, fecha, radioayudas y lectura |
| Plano del aeródromo, rodaje previsto y frecuencias | **Desviaciones** si hacen falta | **Aproximación**: tipo (ILS, VOR, RNAV…), nombre, fecha, radioayudas, frecuencias, lectura y **frustrada** |
| Tipo de despegue: normal, campo corto, campo blando… | Anomalías | Plano del aeródromo y rodaje a plataforma |
| Configuración: flaps, velocidades, combustible y **TOW** | Preguntas o comentarios | Configuración: flaps, **LW**, velocidades |
| **Anomalías antes y después de VR** | | Anomalías en descenso, aproximación o frustrada |
| NOTAM relevantes | | NOTAM, **alternativa y combustible** |
| Preguntas o comentarios | | Preguntas o comentarios |

## Emergencia y urgencia

- **Emergencia** (peligro): situación seria o de peligro inminente que requiere **asistencia inmediata**: fuego, fallo mecánico, daño estructural…
- **Urgencia**: no hay peligro inmediato pero se necesita ayuda para que no empeore: por ejemplo, **poco combustible**.
- La meteorología puede convertirse en emergencia (entrar sin querer en una tormenta, granizo, hielo severo). **Si no se puede mantener la MEA** o el vuelo deja de ser seguro, se declara emergencia.

### Cómo declararla

En la frecuencia asignada:

> MAYDAY MAYDAY MAYDAY (peligro) · PAN-PAN (urgencia)

Y después toda la información relevante:

1. Naturaleza del peligro o urgencia (p. ej. fallo de motor).
2. Intenciones y solicitud inmediata.
3. Posición, rumbo y altitud.
4. Combustible remanente en **horas y minutos**.
5. Personas a bordo.
6. Cualquier otra información útil.
7. Indicativo.

También puede indicarse con el transpondedor **7700**; pero **bajo control radar se mantiene el código actual** hasta que el controlador pida cambiarlo.

> [!vatsim] **Código de conducta de VATSIM, punto B6**: ningún vuelo puede declarar emergencia para **obtener prioridad** sobre otro. Solo se declaran emergencias **con control de tránsito** (nunca en **UNICOM**), y si el controlador pide terminarla hay que hacerlo **de inmediato o desconectarse**. Está **prohibido el 7500** y simular secuestros o interferencia ilícita.

Conocer los procedimientos del avión ayuda, pero el manual no cubre todas las situaciones posibles.

## Combustible mínimo

Si el combustible permite **muy poca o ninguna demora**, se notifica **combustible mínimo** al controlador, indicando los **minutos aproximados** que se puede seguir en vuelo. **No es una emergencia**, pero cualquier demora imprevista podría convertirla en una.

## Fallo de instrumento giroscópico

El fallo de uno o más giroscópicos (bomba de vacío o sistema eléctrico) se vuela con **panel parcial** y se notifica al ATC. Como no suele poder anticiparse, hay que estar siempre preparado.

- Un buen **cross-check** detecta el fallo enseguida: se compara con otros instrumentos. Ejemplo: el indicador de actitud falla en recto y nivelado; si el avión entra en un viraje ascendente se ve en altímetro, variómetro e indicador de rumbo.
- **Tapar el instrumento averiado** para no distraerse.

> [!key] Prioridad: **volar el avión**; con el avión controlado, **navegar** y **notificar** al ATC.

## Fallo de comunicaciones

Se avisa con el transpondedor **7600**.

> [!vatsim] En VATSIM siempre queda la opción de **comunicarse por texto** si falla el audio.

- **En VMC**: continuar en VMC y **aterrizar lo antes posible**.
- **En IMC**, la ruta, por este orden:
  1. La **asignada** en la última autorización.
  2. Bajo **vectores radar**: **directo** al punto, ruta o aerovía de la autorización.
  3. Sin ruta asignada: la que el controlador indicó como **prevista**.
  4. Sin asignada ni prevista: la del **plan de vuelo**.
- **Altitud**: según la **altitud o nivel asignado** en la última autorización, la **mínima para la operación IFR** y la que el controlador indicó **prever**. Si la asignada o prevista es **menor que la MEA** de un tramo posterior, se sube **al llegar al punto en que aumenta la MEA**; si ese punto tiene **MCA**, se sube con anticipación para cruzarlo a ella o por encima.

(El curso enumera los tres criterios de altitud sin decir cómo combinarlos; la norma de la que procede, la FAA 91.185, manda volar **la más alta de las tres** en cada tramo, que es lo que implica el ejemplo de la MEA.)

### Aproximación con fallo de comunicaciones

- Si la autorización llega hasta el punto en el que empieza la aproximación, se inicia **lo más cerca posible de la hora prevista de aproximación o de la ETA**. Si se llega antes, **espera**.

## Fallo del indicador de rumbo

Notificarlo al ATC, que puede dar una **vectorización sin giróscopo** («inicie el viraje», «pare el viraje»). Los virajes se hacen a **razón estándar** hasta que indiquen el viraje a final; desde ahí, a **razón medio estándar**.
