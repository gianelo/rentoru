# Fase 32 — landing en ciudad vacía

**Rama:** `fix/fase-32-ciudad-vacia`, worktree temporal `/Users/gianelo/Documents/Dev/py/rentoru-ciudad-vacia`, creado desde `dev` (`4ea928e`, PR #354 fusionado). No modificar el worktree principal de F31.

**Decisión del fundador:** en `/alquiler/<ciudad>` sin filtros y con `cityTotal === 0`, servir la landing completa «Gratis para publicar. Sin comisión.» ya aprobada en el inicio. Una búsqueda filtrada sin coincidencias, o una ciudad con avisos activos cuyas portadas no permiten mostrar tarjetas, conserva el estado de resultados actual. No cambiar `/alquiler/<ciudad>/<zona>`, SEO de rutas refinadas, búsqueda GET ni lectura sin JavaScript.

**Reglas de implementación:** ninguna decisión de negocio en `app/` o componentes; reutilizar el modelo/copia y el marcado/estilos de la landing, sin inventar otra pantalla. **TDD estricto, fuente: `AGENTS.md` §1**; runner exacto focalizado: `pnpm exec vitest run <ruta-de-test>`. RED antes de GREEN, mutación de la regla y HTML servido que falle si no llega a la ruta. Ningún acceso a la base o contenedor de F30. Pronóstico: ~280–350 líneas authored entre C1/C2/C3; estrategia `ask-on-risk` si la revisión pasa de ~400 líneas. Commit convencional en español por unidad, pruebas y docs junto con comportamiento; push/PR/merge requieren decisión aparte para este nuevo alcance.

**Rutas de trabajo:** C1 y C2 delegadas a `gentle-ai-worker` por múltiples archivos no triviales; C3 a `gentle-ai-verify` por comandos de verificación. Sólo el padre registra evidencia y commits, con un único escritor activo.

## C1 — Extraer sólo presentación compartida

- [x] `app/_components/LaunchLanding.tsx` recibe `HomeLanding` ya resuelto y reutiliza `app/home.module.css`; `app/page.tsx` mantiene el HTML, CTA, tokens y semántica. Prueba: `app/_components/LaunchLanding.test.tsx`, más `app/inicio-servido.test.tsx`.
- [x] RED real: importación ausente (falló 1); GREEN 1/1 y regresión 27/27; mutación del `href` del CTA hizo fallar **esta** prueba (1/1), restaurada a GREEN. Verificador independiente: Biome 3 archivos, 27/27 y `git diff --check` verdes. Instalación aislada `pnpm install --frozen-lockfile --ignore-scripts`, sin modificar lockfile. Commit: registrar al cerrar.

## C2 — Resolver ciudad vacía en dominio y servirla en resultados

- [ ] Función pura que exige URL sin filtros y `cityTotal === 0`, con modelo de landing de la ciudad sin duplicar la copia; pruebas negativas para filtro sin coincidencias, inventario activo sin portadas y estado no canónico.
- [ ] `app/alquiler/[ciudad]/page.tsx` sólo renderiza la decisión, conservando Nav y GET. Pruebas del **HTML servido** sin JavaScript: ciudad vacía recibe CTA y texto de su ciudad; búsqueda filtrada vacía mantiene sus salidas, inventario sin portada no invita a publicar, metadata de filtros conserva noindex. RED → GREEN → mutación y restauración. Commit: pendiente.

## C3 — Verificar el conjunto y registrar evidencia

- [ ] Tests focalizados y unitarios, typecheck, lint, lint:tokens, build, budget:bundle, `git diff --check` y revisión de tamaño; integración/E2E completos sólo si hay base de prueba propia o por CI tras autorización de entrega.
- [ ] Registrar resultados, límites y commits aquí; cerrar el último work-unit commit. Si un check falla, mantener tarea abierta y corregir antes de afirmar cierre. Commit: pendiente.

**Entrega:** pendiente de implementación y verificación. El PR #354 ya fusionado pertenece a la landing del inicio, no a esta corrección nueva.
