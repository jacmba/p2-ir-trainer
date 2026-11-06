---
id: interceptaciones
num: 7
title: Interceptación, mantenimiento e inversión de curso
src: Sección 7 · págs. 75–81
---

## Conceptos

- **Rumbo de interceptación**: el rumbo elegido para resolver la interceptación. Lo esencial es la relación entre la **distancia a la estación** y los **grados que el avión está desplazado** del curso; puede ajustarse para lograr una razón de interceptación adecuada.
- **Ángulo de interceptación**: diferencia entre el rumbo de interceptación y el curso deseado. **No debe superar 90°**: si lo supera, una interceptación en alejamiento se convierte en una de acercamiento y viceversa.
- **Razón de interceptación**: se ve en el movimiento de la aguja; depende del ángulo, la velocidad terrestre, la distancia y si se va hacia o desde la estación. Decide el **anticipo** para virar al curso.

> [!key] Cuanto **más lejos** de la estación, **más despacio** se mueve la aguja; cuanto **más cerca**, **más rápido**. El anticipo del viraje final depende de esa razón.

## Interceptación en acercamiento

En acercamiento **curso y radial son opuestos**. Se compara la **cabeza de la aguja del RMI** (curso actual hacia la estación) con el **curso deseado** (puesto en el CDI). A la diferencia se la llama **P**.

![fig:interceptacion|Reglas de interceptación según la diferencia entre el curso actual y el deseado]

| Diferencia | Regla | Rumbo de interceptación |
|---|---|---|
| **Menor de 15°** | **Deseado – Cabeza – Doble P** | Cabeza ± **2P**, hacia el lado contrario al deseado |
| **15° a 60°** | **Deseado – Cabeza – 30°** | Cabeza ± **30°** |
| **60° a 90°** (corte máximo) | **Deseado – Cabeza – hasta 90** | El que deja el curso deseado **a 90°** |
| **Más de 90°** (ruta pasada) | Rumbo radial hasta la cuadra | Rumbo **opuesto al curso deseado** hasta tener la estación a 90° (aguja horizontal); luego tiempo, 90° hacia la cabeza y otros 90° hacia el mismo lado |

La forma de leerlo: se mira primero la **punta del CDI** (curso deseado), luego la **cabeza del RMI** (curso actual), y se sigue en ese sentido sumando lo que diga la regla.

### Ejemplos del curso

- **< 15°**: curso actual **135°**, deseado **145°** → P = 10°. El actual queda a la izquierda del deseado → se restan 2P: **135 − 20 = 115°**. Se mantiene hasta que el CDI empieza a centrarse y se vira a 145° con pequeñas correcciones.
- **15–60°**: actual **250°**, deseado **210°** → 40°. La cabeza está a la derecha del deseado → **250 + 30 = 280°**.
- **60–90°**: actual **330°**, deseado **045°** → 75°. La cabeza está a la izquierda → se vira por la izquierda hasta tener el deseado a 90°: **315°**.
- **> 90°** (ruta pasada): en el radial 180 volando a la estación (curso 360) hay que entrar por el radial 030 (curso 210) → 150°. Se vuela rumbo **030°** (opuesto al deseado) hasta que la aguja queda **horizontal** (a la cuadra). Entonces se toma tiempo; al terminar se estará en un radial desde el que se aplica una de las reglas anteriores. Por ejemplo, en el radial 060 la diferencia es 30° → «Deseado – Cabeza – 30°»: 240 + 30 = **270°**.

> [!vatsim] El resumen de la regla de ruta pasada habla de **contar 1 minuto** y virar 90° + 90° hacia la cabeza, pero el ejemplo resuelto del curso cronometra **2 minutos** y después vuelve a aplicar la regla de interceptación que corresponda. La idea es la misma: tomar distancia a la cuadra y luego interceptar con un ángulo de corte ≤ 90°.

## Interceptación en alejamiento

En alejamiento **curso y radial coinciden**. Se compara la **cola del RMI** (radial actual) con el **radial deseado**.

| Diferencia | Regla | Rumbo de interceptación |
|---|---|---|
| **Menor de 15°** | **Radial deseado – P** | Radial deseado ± **P** |
| **15° a 90°** | **Radial deseado – 45°** | Radial deseado ± **45°** |
| **Más de 90°** (ruta pasada) | Rumbo radial hasta la cuadra | Rumbo = **radial deseado** hasta estar a la cuadra; luego **45° hacia el lado de la cabeza** |

### Ejemplos del curso

- **< 15°**: radial actual **320**, deseado **330** → 10°. Se mira la cola (320), luego el CDI (330) y se siguen 10° más: **340°**. Si el deseado quedara a la izquierda, se restarían.
- **15–90°**: radial actual **120**, deseado **050** → 70°. El deseado está a la izquierda → **050 − 45 = 005°**.
- **> 90°**: rumbo 090 y hay que salir por el radial **240**. Se vira por la derecha a **240°**, se mantiene hasta la cuadra (aguja horizontal) y se vira por la izquierda a **195°** (45° de corte) hasta interceptar.

> [!key] **Acercamiento**: < 15 → 2P · 15–60 → 30° · 60–90 → hasta 90° · > 90 → ruta pasada. **Alejamiento**: < 15 → P · 15–90 → 45° · > 90 → ruta pasada.

## Mantenimiento de curso

En acercamiento se mantiene el rumbo hasta que la **cabeza** del RMI muestra una desviación; se reintercepta con las técnicas anteriores y se corrige el viento:

- El **viento viene del lado hacia el que se ha ido la cabeza** de la aguja.
- Tras reinterceptar, se **apunta la nariz al viento** tantos grados como la deflexión de la primera interceptación.
- Para conocer el viento es imprescindible **mantener el rumbo** después de la primera interceptación.
- Si la cabeza se mueve **hacia el índice superior**, la corrección fue **pequeña**; si se **aleja** del índice superior, fue **demasiada**.
- Hacer **pequeños ajustes**: el ángulo de corrección cambia con la distancia a la estación.
- En **alejamiento** se trabaja igual pero con la **cola**, y el análisis es **al revés**: cola hacia el índice superior = corrección **demasiado grande**; alejándose = **pequeña**.

## Inversión de curso

Para pasar de acercamiento a alejamiento (o al revés) por el mismo curso. **Hay que tener el curso interceptado.**

1. Con el selector de rumbo, marcar un rumbo **45° desde el curso** hacia el lado por el que se invertirá.
2. Virar a ese rumbo y, con alas niveladas, **tomar tiempo**.
3. Mantenerlo **1 minuto**. A los **45 s**, llevar el selector de rumbo al **recíproco del rumbo que se vuela**, por el **lado opuesto** al primer viraje, y poner en el selector de curso el **curso opuesto** al inicial.
4. Al minuto, **virar al rumbo recíproco por el lado opuesto** al viraje inicial, para quedar con ángulo de interceptación con el nuevo curso. Comprobar que el CDI queda por encima del selector de curso.
5. Virar al curso con el **anticipo** según la razón de interceptación.

Ejemplo: en el curso 360, viraje por la derecha a **045°**, 1 min, viraje por la izquierda a **225°** (recíproco de 045) e interceptación del curso **180°** con 45° de corte. En las cartas de aproximación este procedimiento se llama **viraje reglamentario**.
