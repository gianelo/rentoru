# F36.2 — Logo como enlace al inicio

## Alcance y autorización

El fundador autoriza continuar 36.2 tras fusionar #364 y #366. Worktree propio `rentoru-fase36-publicacion`; rama `fix/fase-36-logo-inicio` desde `origin/dev` `e5ea87cd8ec11688d33aa5a8011d7d638546c44d`.

36.1 sigue parcial: baseline y fixture entregados no prueban publicación final ni reintento. Se difieren H36.2/H36.3; la reproducción del logo no enlazado ya permite esta corrección independiente. No declarar completada 36.1 por esta unidad.

Objetivo: marca enlazada a `/` en pasos, fotos y revisar; nombre accesible, foco visible y navegación nativa, conservando borrador. Sin reglas de negocio en componentes, refactor global, cambios de copy ajeno, loaders ni infraestructura nueva.

## Tareas

- [x] L36.2a — Mapeo observado por explorador read-only `murdvblh-c-gh63`, con spotcheck del coordinador. `PublishStep.tsx:158–169` sustituye marca por Atrás; fotos reutiliza ese shell. `revisar/page.tsx:114–123` es el segundo shell. D13/D15/D16 y SISTEMA exigen enlace nativo, target y tokens. `listo` es terminal, fuera de este corte. Sin comportamiento nuevo ni RED aplicable al mapeo. Commit documental `99147f5f03860bef7f26ac8bbbd54ae509046734`.
- [x] L36.2b — Implementación con RED/GREEN, dos mutaciones detectadas/restauradas y 44 pruebas focalizadas; commit de unidad `ebd9a5e1fd462257b13650201b1e3f5ee3b81133`: `PublishStep.tsx`, `revisar/page.tsx`, `publish-steps.module.css`; `logo-inicio.test.tsx` prueba los nueve pasos (flujo y `volver=revisar`) y revisar en HTML servido. Marca nativa junto a Atrás, target mínimo por token y foco nativo conservado.
- [x] L36.2c — Verificación funcional observada por `mure8sa4-e-aqkr`: 24/24 variantes de navegador pasan; registro en commit `c3ee6c6`. Revisión nativa `review-254f4d9c8ca34ece` aprobada y reconocida (autoridad consumida). [PR #367](https://github.com/gianelo/rentoru/pull/367) abierto a `dev`; CI remoto pendiente, sin merge. Checks focalizados, teclado/foco y navegación con/sin JS cuando aplicable; revisión nativa del corte, commit de unidad y PR ≤400 líneas. Fetch y revisar conflictos antes de push/PR; sin merge automático.

## Entorno y evidencia

PostgreSQL propio activo `rentoru-f36-pg`, loopback 55433; app propia 3001, proxy 55436. Fixtures asignados 55437/55438, sin procesos nuevos iniciados. No tocar PG F35/55435; coordinar antes de usar 3000/3100/5545 liberados. Sin producción ni credenciales reales.

Superficie derivada: `PublishStep.tsx`, `revisar/page.tsx`, `publish-steps.module.css` y prueba nueva `app/publicar/logo-inicio.test.tsx`. Marca visible junto a Atrás; salida existente intacta. Colisión móvil descartada en la matriz observada. Conservación refiere al borrador guardado, no autosalvar entradas sin enviar. Commit funcional observado; aceptación de navegador observada. Evaluación nativa del diff: riesgo medio, perfil grande; autoverificación del escritor suficiente para el riesgo, sin sustituir comprobación funcional de UI.

### Evidencia focalizada del escritor

- `pnpm exec vitest run app/publicar/logo-inicio.test.tsx`: RED observado, 19/19 fallan por marca textual sin enlace en header; GREEN mínimo, 19/19 pasan.
- Mutación propia sólo `href` de marca a `/mis-avisos` en `PublishStep.tsx`: mismo comando, 18 fallan / revisar pasa; restauración a `/`: 19 pasan.
- Mutación propia sólo `href` de marca a `/mis-avisos` en `revisar/page.tsx`: mismo comando, sólo «revisar conserva marca Inicio y Cambiar al paso» falla / 18 pasan; restauración: 19 pasan.
- `pnpm exec vitest run app/publicar/logo-inicio.test.tsx 'app/publicar/paso/[paso]/riel-y-boton.test.tsx' 'app/publicar/paso/[paso]/mapa-de-pasos.test.tsx' app/publicar/revisar/aviso-de-cambio.test.tsx app/publicar/fotos/PhotoUploader.test.tsx`: 5 archivos / 44 pruebas pasan tras formato.
- `pnpm exec biome check --write app/publicar/PublishStep.tsx app/publicar/revisar/page.tsx app/publicar/publish-steps.module.css app/publicar/logo-inicio.test.tsx`: formatea prueba; aviso de non-null corregido. Mismo check sin `--write`: limpio.
- `pnpm lint:tokens`: 290 hojas, sin literales; `git diff --check`: limpio.
- Límites del escritor: sin servicios, navegador, build ni suite amplia. Aviso React de method con action función observado en RED/mutación; no se cambian formularios.

### Verificación funcional independiente

- Commit `ebd9a5e`: 44 pruebas / cinco archivos, `pnpm typecheck`, Biome focalizado, `pnpm lint:tokens` (290 hojas) y `pnpm build` → exit 0.
- Chromium: tipo, título, fotos y revisar × 390×844 / 768×1024 / 1440×900 × JS encendido/apagado → 24/24. Marca 81.5×44 px, outline nativo 1px auto con offset 1px, sin recorte sticky, colisiones ni overflow. Tab, Enter y clic llegan a `/`; Back y GET `/publicar` conservan respuestas guardadas.
- Snapshot completo de nueve borradores (respuestas/fotos/vencimiento) y sesiones idéntico antes/después; 1045 GET, cero intentos no-GET/remotos/WebSocket. No setup ni escrituras de DB.
- Evidencia local ignorada: `test-results/f362-verifier-browser.mjs`, `.log` y `f362-focus-*.png`; no es una suite portable. Este resumen versionable conserva resultados, no capturas.
- Sólo app 3001/proxy 55436 propios iniciados y detenidos (PIDs 63860/63859); puertos liberados, PostgreSQL 55433 sigue activo. Consulta exploratoria read-only falló por tabla `users`; corregida, sin efecto en checks. El cambio de staged a commit durante inspección fue el commit autorizado del coordinador, no deriva ajena; estado reconciliado: sólo este registro modificado.
- Sin prueba de upload, publicación final, autosave de entradas sin enviar ni navegación `volver=revisar` en navegador; esa variante sí queda protegida por HTML servido.
