# CI — Lighthouse decide con la mediana de tres corridas

El presupuesto de LCP (2500 ms) se decidía con una sola corrida de Lighthouse, y la misma página de inicio daba resultados a uno y otro lado del límite sin cambios en su camino. Se pasa a tres corridas y mediana; el umbral no cambia.
Rama `ci/lighthouse-mediana`, base `ab6c236`; un PR a `dev`.

## Specs

- S1: El fundador necesita publicar a `main` y el CI de staging falla sólo en `budget`: «el agente esta parado ahora. investiga tu. necesit publicar a main».
- S2: Decisión del fundador sobre la propuesta (tres corridas con mediana, sin tocar 2500 ms): «si vamos con las lighthouse».

## Evidencia

Resúmenes sanitizados `lighthouse-diagnostic-*` de los runs de staging, mismo elemento LCP en los tres (IMG 156×117 en la primera tarjeta):

| Run | Commit | LCP | Bytes | TTFB | Descarga imagen | Retraso de render |
| --- | --- | --- | --- | --- | --- | --- |
| 39172309647 | `64b4570` | 2336 ✅ | 152 321 | 689 | 797 | 116 |
| 40005313943 | `46c74ee` | 2603 ❌ | 152 292 | 695 | 1269 | 56 |
| 40017090146 | `79bab7e` | 2512 ❌ | 152 379 | 705 | 661 | 563 |

- Entre `46c74ee` y `79bab7e` sólo cambió el #447 (specs de `measure` y dos constantes de publicar): nada en el camino de la página de inicio, y el LCP varió 91 ms.
- Ninguno de los 22 PR de la promoción #446 toca la página de inicio ni sus imágenes; el peso de la página es el mismo.
- El exceso cae en una fase distinta en cada fallo (red en uno, render en el otro). Una regresión empujaría siempre la misma fase.
- Antecedente: `odd/tasks/ci-diagnostico-lcp.md` registra un fallo de 2707 ms en `dev` sin causa atribuida.
- E2E y `measure` no golpean el preview (cada uno usa su base y servidor), así que no compiten con Lighthouse: hipótesis de contención descartada.

## Cambio

- `lighthouserc.json`: `numberOfRuns` 1 → 3 y `aggregationMethod: "median"` en las tres entradas de `assertMatrix`. Umbrales intactos (2500 ms; 512 000 y 235 520 bytes).
- **El valor por defecto de LHCI es `optimistic`** (`@lhci/utils/src/assertions.js:139`): para un máximo toma la corrida más rápida. Tres corridas sin `median` habrían aflojado el gate en silencio.

## Verificación

- `scripts/lighthouse-summary.test.ts` — «only enables passed assertion retention without changing the source budgets» (config exacto, ajustado) y «decides the LCP budget on the median of three runs, never the fastest one» (nuevo, por el evaluador real `getAllAssertionResults` de LHCI: [2400, 2600, 2700] falla con 2600; [2900, 2400, 2450] pasa). RED 2/2 antes del cambio; GREEN 34/34.
- Mutantes detectados y restaurados byte a byte: sin `aggregationMethod` (vuelve `optimistic`), `optimistic` explícito y `numberOfRuns: 1`. Sin `median`, falla también la prueba del evaluador, no sólo la del archivo.
- El resumen sanitizado ya lee todos los `lhr-*.json` ordenados; su prueba de varios reportes sigue en verde. El job `budget` no tiene `timeout-minutes` que tres corridas puedan agotar.
- La medición real queda pendiente del próximo CI de staging: este cambio no promete verde, cambia cuántas muestras deciden.

## Log

- L1: fallos de `budget` en staging tras la promoción #446 (runs 40005313943 y 40017090146); `measure` ya en verde con #447.
- L2: «el agente esta parado ahora. investiga tu. necesit publicar a main».
- L3: «si vamos con las lighthouse».
