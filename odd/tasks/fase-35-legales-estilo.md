# F35.9 — Estilo legal neutro
Objetivo: tuteo neutro en las cinco páginas legales sin cambiar significado; rama `fix/fase-35-legales-estilo`, base `aee3f4c`.
Entrega: PR a dev ≤400 A+D; Vitest servido, gates bajo lock, aceptación del fundador antes del push.

## Specs
- S1: «35.9 legal style only»; contrato canónico: «Revisar tuteo, neutralidad y consistencia sin ratificar contenido.»
- S2: «ampliar `app/legal/terminos/page.test.tsx` y las pruebas servidas de páginas afectadas; cotejar significado, plazos, obligaciones y permanencia de `DraftNotice`. Elevar cualquier cambio sustantivo a decisión separada.»
- S3: «Strict TDD on the served HTML/consumer, mutation check, full gates (test:unit, typecheck, lint, lint:tokens).»
- S4: «Copy changes are screen changes: get the founder's explicit browser acceptance of the served version BEFORE pushing.»
- S5: comandos pesados bajo `lockf /tmp/rentoru-f35-heavy.lock` (regla del fundador, 2026-10-23).

## Tasks
- T1 [S1–S3] in_progress; delegada: 17 literales de voseo en `app/legal/*/page.tsx` y una prueba servida por página afectada.
- T2 [S3–S5] pending; padre: gates bajo lock, versión servida y aceptación.
- T3 [S1–S5] pending; padre: cierre en OpenSpec/canónico/auditoría, commit, PR y cierre de recursos.

## Log
L1 — Cola original del fundador: «Your queue, in order: 35.5 publisher management (mis avisos, editar, activar, renovar, vencer) → 35.9 legal style only». 35.5 publicada en PR #437 antes de empezar esta tarea.
L2 — Inicio: worktree `rentoru-phase35-task-35-9` desde `origin/dev` `aee3f4c`, limpio. Inventario de sólo lectura: 17 literales con voseo en términos (2), privacidad (5), cookies (4), datos (5) y normas (1). Metadata, etiquetas ARIA y `DraftNotice` ya son neutros. Ninguna prueba actual afirma esas frases. No hay rutas `escribinos` en `app/legal/`.
L3 — Fuera de alcance por sustantivo (elevar, no tocar): `privacidad` «registro de a quién le revelaste un contacto» no es voseo pero contradice `datos` (quién vio tu contacto) y roza la retención abierta en 33.2; las afirmaciones «únicas dos cookies» de `cookies` las verifica 33.1. Plazos, límites, obligaciones y leyes se conservan tal cual.
L4 — T1 (delegada): RED `pnpm exec vitest run app/legal -t "F35.9"` 5 fallos/41 omitidos con la fuente original; GREEN `pnpm exec vitest run app/legal` 7 archivos/46 pruebas. Mutación: restaurar sólo «¿Podés navegar sin ellas?» hace fallar únicamente `CookiesPage > F35.9: addresses the reader in neutral tuteo, not voseo`; restaurado, 46/46. Prueba por página en `app/legal/{terminos,privacidad,cookies,datos,normas}/page.test.tsx` — «F35.9: addresses the reader in neutral tuteo, not voseo». Biome sobre los 10 archivos: OK.
L5 — Gates (job-16, test:unit y typecheck bajo `lockf /tmp/rentoru-f35-heavy.lock`): EXIT 0 en test:unit (321 archivos/3668 pruebas), typecheck --incremental false, lint (8 warnings/2 infos preexistentes) y lint:tokens (323 archivos). HTML servido por `pnpm dev` en 3102 desde este worktree (cwd verificado, sin DB): las cinco páginas responden 200 con `DraftNotice`; frases neutras presentes y ningún voseo previo. Envío de la solicitud de aceptación al coordinador rechazado; se publica en el panel. Sin aceptación, commit ni push.
