# Fase 32 — landing en ciudad vacía

**Rama:** `fix/fase-32-ciudad-vacia`, worktree temporal `/Users/gianelo/Documents/Dev/py/rentoru-ciudad-vacia`, creado desde `dev` (`4ea928e`, PR #354 fusionado). No modificar el worktree principal de F31.

**Decisión del fundador:** en `/alquiler/<ciudad>` sin filtros y con `cityTotal === 0`, servir la landing completa «Gratis para publicar. Sin comisión.» ya aprobada en el inicio. Una búsqueda filtrada sin coincidencias, o una ciudad con avisos activos cuyas portadas no permiten mostrar tarjetas, conserva el estado de resultados actual. No cambiar `/alquiler/<ciudad>/<zona>`, SEO de rutas refinadas, búsqueda GET ni lectura sin JavaScript.

**Reglas de implementación:** ninguna decisión de negocio en `app/` o componentes; reutilizar el modelo/copia y el marcado/estilos de la landing, sin inventar otra pantalla. **TDD estricto, fuente: `AGENTS.md` §1**; runner exacto focalizado: `pnpm exec vitest run <ruta-de-test>`. RED antes de GREEN, mutación de la regla y HTML servido que falle si no llega a la ruta. Ningún acceso a la base o contenedor de F30. Pronóstico: ~280–350 líneas authored entre C1/C2/C3; estrategia `ask-on-risk` si la revisión pasa de ~400 líneas. Commit convencional en español por unidad, pruebas y docs junto con comportamiento; push/PR/merge requieren decisión aparte para este nuevo alcance.

**Rutas de trabajo:** C1 y C2 delegadas a `gentle-ai-worker` por múltiples archivos no triviales; C3 a `gentle-ai-verify` por comandos de verificación. Sólo el padre registra evidencia y commits, con un único escritor activo.

## C1 — Extraer sólo presentación compartida

- [x] `app/_components/LaunchLanding.tsx` recibe `HomeLanding` ya resuelto y reutiliza `app/home.module.css`; `app/page.tsx` mantiene el HTML, CTA, tokens y semántica. Prueba: `app/_components/LaunchLanding.test.tsx`, más `app/inicio-servido.test.tsx`.
- [x] RED real: importación ausente (falló 1); GREEN 1/1 y regresión 27/27; mutación del `href` del CTA hizo fallar **esta** prueba (1/1), restaurada a GREEN. Verificador independiente: Biome 3 archivos, 27/27 y `git diff --check` verdes. Instalación aislada `pnpm install --frozen-lockfile --ignore-scripts`, sin modificar lockfile. Commit de C1: `197b3be`.

## C2 — Resolver ciudad vacía en dominio y servirla en resultados

**Estado:** verificado, pendiente de registrar commit.

- [x] `cityEmptyLanding` en `src/modules/listing-discovery/domain/home-collections.ts` exige URL sin filtros y `cityTotal === total === 0` (falla cerrado ante señales contradictorias); comparte el constructor de `HomeLanding` con el inicio sin fabricar una vista. `home-collections.test.ts` («reutiliza la landing completa para la ciudad canónica sin inventario», «rechaza filtros, inventario activo y totales contradictorios») prueba positivos y negativos.
- [x] `app/alquiler/[ciudad]/page.tsx` dibuja la decisión de dominio dentro del mismo `Container`, conserva Nav/GET y los estados de resultados restantes. `app/alquiler/[ciudad]/busqueda-sin-javascript.test.tsx` («sirve La Guaira sin encabezado de resultados en su slug canónico», «caracteriza metadata canónica y filtros de La Guaira», «sirve la landing completa y el GET de Nav en la ciudad canónica sin avisos», «no confunde una búsqueda filtrada ni avisos sin portada con ciudad vacía») protege el **HTML servido**, CTA y SEO. RED real 3 pruebas (2 dominio, 1 HTML); el test adicional de La Guaira falló sin `Container` y GREEN tras el ajuste; caracterización SEO ya era GREEN. Mutación de regla y de cableado hizo fallar las nuevas pruebas de HTML, ambas restauradas. Verificador independiente: 84/84, typecheck, Biome 4 archivos y diff check verdes. Commit de C2: `8dca138`.

**Límite de C2:** no hubo navegador real ni base de prueba propia; `renderToStaticMarkup` afirma HTML sin ejecutar JavaScript. CI/E2E completos siguen pendientes de una entrega autorizada.

## C3 — Verificar el conjunto y registrar evidencia

**Estado:** en curso; C1/C2 acumulan 319 líneas revisables antes de este registro y de los checks globales.

- [ ] Tests focalizados y unitarios, typecheck, lint, lint:tokens, build, budget:bundle, `git diff --check` y revisión de tamaño; integración/E2E completos sólo si hay base de prueba propia o por CI tras autorización de entrega.
- [ ] Registrar resultados, límites y commits aquí; cerrar el último work-unit commit. Si un check falla, mantener tarea abierta y corregir antes de afirmar cierre. Commit: pendiente.

**Entrega:** pendiente de implementación y verificación. El PR #354 ya fusionado pertenece a la landing del inicio, no a esta corrección nueva.
