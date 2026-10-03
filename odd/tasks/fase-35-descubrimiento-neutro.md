# F35.3 — descubrimiento y búsqueda en español neutro

## Objetivo y límites
Auditar inicio, ciudad/zona, resultados, filtros, sugerencias, conteos, vacíos y parámetros obsoletos. Corregir estilo en los propietarios existentes y comprobar HTML servido/DOM cliente reales; sin i18n global, rediseño, dependencias, reglas de búsqueda, slugs/query, datos de usuarios, CSS/root/Field, formatos es-VE/UTC ni recursos ajenos. Preservar interpolación, escape, pluralización y lectura GET sin JavaScript.

## Base y entrega
- Base `dev`: `caeafb574e87941a286d251220524c9db6714ad2`, PR #371 fusionado por el fundador; árbol idéntico al HEAD 42e verificado. 35.2 terminada: CI 12 SUCCESS/10 duplicados SKIPPED, revisión nativa reconocida; cobertura global 84.48% no 90%, Lighthouse de preview no medido por 302.
- Worktree `rentoru-fase35-textos-neutrales`; corte A `fix/fase-35-busqueda-inicio-neutra`, creado desde dev. Corte B se abre desde dev tras entrega/integración de A; no merge automático ni push a dev/main.
- Estrategia: dos PR cohesivos secuenciales hacia dev, presupuesto absoluto 400 líneas añadidas+eliminadas por PR con tests/docs; objetivo 350, sin comprimir código ni quitar cobertura. Estimación A 180–260, B 200–320; reevaluar tras RED antes de ampliar.
- Exploración `musge1q0-1j-yfrf`: tres frases pendientes y brechas de consumidores; decisiones leídas en OpenSpec design 297–339/549–569. No dar por implementada una casilla.

## Hallazgos y disposición
| Fuente | Cambio/disposición | Consumidor y prueba necesaria |
|---|---|---|
| `listing-discovery/domain/home-collections.ts`, pregunta compartida | `¿En qué zona buscás?` → `¿En qué zona buscas?` | homeSearchForm/SearchPill en inicio/ciudad/zona; label y placeholder reales, GET y destino conservados. También alcanza shells de otras capacidades: registrar alcance, no declarar esas auditorías completas. |
| `listing-catalogue/domain/search-destination.ts`, unknown | `Probá` → `Prueba`; conservar `${typed.trim()}` | Inicio real con q desconocida, oración completa e interpolación/escape; no fabricar decisión ni HTML. |
| `listing-search/domain/search-accordion.ts`, STEP_COPY precio | `¿Cuánto podés pagar al mes?` → `¿Cuánto puedes pagar al mes?` | SearchPanel servido desde aplicación/rutas y modal mejorado; corte B. |
| Sugerencias, `${n} sugerencias` | Acreditar 0/1/N y corregir gramática si se reproduce; sin modificar reglas de sugerencias | SearchSuggestions real, estado accesible y Chromium; propietario a mapear antes de escribir B. |
| Vacíos, conteos y avisos obsoletos ya neutrales | Verificación de estados/disposición, no cambios gratuitos | Inicio/ciudad/zona, SearchOutcome/SearchResultsList, parámetros incompatibles; conservar enlaces, filtros y singular/plural. |

## Tareas
**En curso: 1.** Ruta delegada por lectura amplia y cambios multiarchivo; un escritor por vez. Ninguna tarea cerrada todavía.
1. [ ] **Corte A — RED/GREEN de inicio y pregunta compartida.** Añadir pruebas mínimas sobre consumidores reales para label/placeholder y q desconocida; observar RED antes de cambiar los dos catálogos, actualizar expectativas históricas. Mutar pregunta y ayuda desconocida por separado, detectar y restaurar. Conservar GET, destinos, datos e interpolación; registrar comando/nombre de test/commit.
2. [ ] **Corte A — verificación y entrega.** Focales, tipos/lint/tokens, funcional JS/no-JS aplicable e integración F36. Medir diff con cierre documental, ASSESS/revisión nativa del corte cuando corresponda, reconocer aprobación; commit y PR a dev, CI exacto. No cerrar toda 35.3 con A.
3. [ ] **Corte B — filtros, resultados y sugerencias.** Mapear propietario del estado accesible antes del cambio; pruebas RED del precio y gramática reproducida, GREEN mínimo en sus catálogos. Acreditar 0/1/N, vacíos y parámetros obsoletos en consumidores/HTML/modal/sugerencias, no sólo helpers. Preservar comportamiento, usuario y URLs.
4. [ ] **Corte B — cierre de 35.3.** Verificación proporcionada, mutantes restaurados, navegador y crawlability aplicables; registrar disposiciones y pruebas nombradas en matriz/canónico/OpenSpec. Commit/revisión reconocida/PR a dev/CI exacto ≤400; cierre técnico no equivale a producción ni a F35 completa.

## Evidencia observada — tarea 1, corte A (sin commit)
- Sólo dos catálogos cambiados: pregunta compartida y `Probá` → `Prueba`; reglas, interpolación y componentes intactos. `home-collections.test.ts` no necesitó cambios; `search-destination.test.ts` actualiza la pregunta histórica y afirma la ayuda completa.
- Inicio real: nuevos tests `F35.3: sirve la pregunta neutra en label y placeholder del inicio` y `F35.3: sirve la ayuda desconocida completa con texto recortado y escapado`. El segundo pasa q `  <nave> & "espacial"  ` por lookup sintético de vocabulario y decisión de dominio real; afirma párrafo completo, campo recortado y escape. No DB, red, HTML fabricado ni espía de decisión.
- Ciudad: caso existente `29.1: sirve un formulario GET y un enlace de destino sin depender de sugerencias`; zona: `trae los avisos activos de la zona en el cuerpo de la respuesta`. Ambos añaden label/placeholder asociados al input q, valor seleccionado real y GET/destinos conservados; inicio cubre pastilla vacía.
- RED: tras corregir expectativas de orden de atributos/valor de zona contra HTML real, 4 fallos/48 pases: pregunta antigua en inicio/ciudad/zona y ayuda antigua en inicio. Ningún catálogo cambiado antes de ese RED textual. GREEN: 52/52; expectativa histórica de pregunta de dominio observada después en rojo (1 fallo/135 pases) antes de actualizarla.
- `pnpm exec vitest run app/inicio-servido.test.tsx 'app/alquiler/[ciudad]/busqueda-sin-javascript.test.tsx' 'app/alquiler/[ciudad]/[zona]/zona-sin-javascript.test.tsx'`: RED anterior, GREEN 52/52 y repetición tras restaurar mutantes 52/52.
- `pnpm exec vitest run app/inicio-servido.test.tsx -t 'F35.3: sirve la pregunta neutra en label y placeholder del inicio'`: mutante sólo `buscas` → `buscás`, 1 fallo textual/10 omitidos por selección; restaurado en `finally`, igualdad exacta confirmada.
- `pnpm exec vitest run app/inicio-servido.test.tsx -t 'F35.3: sirve la ayuda desconocida completa con texto recortado y escapado'`: mutante sólo `Prueba` → `Probá`, 1 fallo de párrafo completo/10 omitidos por selección; restaurado en `finally`, igualdad exacta confirmada. Mutantes no simultáneos.
- `pnpm exec vitest run src/modules/listing-discovery/domain/home-collections.test.ts src/modules/listing-catalogue/domain/search-destination.test.ts app/inicio-servido.test.tsx 'app/alquiler/[ciudad]/busqueda-sin-javascript.test.tsx' 'app/alquiler/[ciudad]/[zona]/zona-sin-javascript.test.tsx'`: GREEN 136/136 en 5 archivos.
- `pnpm exec tsc --noEmit --incremental false`: PASS.
- `pnpm exec biome check src/modules/listing-discovery/domain/home-collections.ts src/modules/listing-catalogue/domain/search-destination.ts src/modules/listing-catalogue/domain/search-destination.test.ts app/inicio-servido.test.tsx 'app/alquiler/[ciudad]/busqueda-sin-javascript.test.tsx' 'app/alquiler/[ciudad]/[zona]/zona-sin-javascript.test.tsx'`: fallo inicial de formato propio en inicio, corregido; PASS en 6 archivos.
- `pnpm lint:tokens`: PASS, 295 estilos; `git diff --check`: PASS.
- Medición contra `caeafb574e87941a286d251220524c9db6714ad2`: 62 líneas TS/TSX + 4 del cierre C pasivo preexistente + 44 del nuevo plan = 110 revisables; margen 290 hasta 400 y 240 hasta objetivo 350. Forecast A original 180–260 conserva margen para entrega; no se comprimió cobertura. HEAD intacto.
- Tarea 1 sigue pendiente del commit del padre; 35.3 abierta. Funcional JS/no-JS, integración F36 y entrega pendientes (SSR no acredita Chromium). Pregunta compartida alcanza ficha/reportes/mis-avisos/importar/ayuda/legal sin cerrar esas auditorías. Precio, sugerencias, conteos, vacíos y parámetros obsoletos del corte B no modificados.

## Recursos y evidencia pendiente
Unitarios sintéticos sin proveedores ni DB real. Funcional sólo con PG propio F35 55435 tras verificar ID/labels/tmpfs/mounts y transporte Neon loopback read-only; reservar app/proxy propios antes de uso, sin seeds/migraciones/escrituras. PG retenido; 55439/55440 liberados por verificador anterior. No administrar puertos/procesos F36. Evidencia de tarea 1 abajo; commits, funcional y revisión de 35.3 pendientes. Los recibos de 35.2 no los sustituyen.
