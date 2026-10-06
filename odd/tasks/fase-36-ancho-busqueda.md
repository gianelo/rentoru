# 36.4 — Ancho coherente del buscador del encabezado

## Estado vigente — cierre de36.4

36.4 completada: commit final `1bf348af`, presente en dev; `components/organisms/Nav.module.css` y `tests/measure/nav-search-width.spec.ts` — «Nav ${viewport.width} ${javaScriptEnabled ? "JS" : "sin JS"}: ancho, centro y contratos». Medidas observadas358/232/420: SearchPill del Nav general, no ZoneSearch de publicación. Los pendientes de amend/review/PR siguientes pertenecen al corte histórico, superado por esta entrega. Sin nueva ejecución funcional ni consulta remota/CI.36.1 continúa parcial.

## Política aprobada

SearchPill del **Nav general**, no ZoneSearch de publicación. Móvil fluido; desktop 420 px conforme a los boards; tablet fluida con columnas simétricas. El fundador eligió conservar el centro exacto de pantalla en tablet y aceptar 232 px a 768, con zona abreviada y contador en dos líneas cuando hay filtros. No son 232 fijos en todos los anchos tablet ni 358 fijos globales.

Aprobaciones de soporte: fixture aislada `app/measure/nav/page.tsx` y prueba asociada, sin DB, cerrada salvo `MEASURE_HARNESS_ENABLED="true"`; targets ≥44 px sólo en acciones de headers con pastilla desktop visible. Mobile-only/no-pill conservan su geometría previa. Esta excepción de altura no autoriza otras modificaciones de anatomía.

## Problema y evidencia original

[Comentario #289/5956065320](https://github.com/gianelo/rentoru/issues/289#issuecomment-5956065320) explicita que es un problema general del header, no del wizard. Capturas vistas: [tablet](https://github.com/user-attachments/assets/7b09d11a-16e3-4ff0-9d4c-954bf067f57b) y [desktop](https://github.com/user-attachments/assets/da9dcc65-c73c-4838-b171-9f37d798ddcf). Los antiguos 358/440/520 del baseline eran radios de tipo, no mediciones del buscador.

Causas: wrapper `search` de ancho intrínseco pese al formulario 100%/max420 (`Nav.tsx:91–97`, `Nav.module.css:42–52`, `SearchPill.module.css:5–10`); grid tablet reservaba 250 por extremo y dejaba 196 al centro (`Nav.module.css:223–239`). Boards de Lista/Filtros desktop y Cuenta/Importar 14i respaldan 420.

## Alcance y entrega

Worktree `rentoru-fase36-publicacion`; rama `fix/fase-36-ancho-busqueda` desde `origin/dev` `2ceade1185d73817a65dc222d48a32cde47501b0`. Una unidad coherente de CSS, tests y sistema, PR a `dev`, merge humano. Límite 400 líneas revisables; sin excepción heredada de 36.3. Inventario independiente: 312 líneas de implementación; recalcular junto con este documento y cambios restantes.

No modificar copy, reglas de negocio, iconos/JS, wizard, sugerencias/catalogación, dock ni headers fuera del alcance. GET nativo, teclado/foco, marca/acciones y contenedor desktop 1100 intactos. Preservar las dos líneas preexistentes de `odd/tasks/fase-36-transicion-entrada.md`, fuera del commit. Corrección del estado anterior:36.1 parcial y36.3 completada; este plan mantiene36.6–36.22 pendientes, sin añadir36.23/36.24.

Entorno limpio sin DATABASE_URL para browser/unitarios, DB/POST/proveedores/credenciales/seed/migraciones prohibidos. DSN ficticia inválida permitida sólo para build separado. Loopback 3001 sólo si libre, procesos propios, F35 y demo 55441/tunnel protegidos; no limpiezas amplias. Artefactos propios `test-results/f364-*`; conservar evidencia anterior, no sobrescribirla.

## Unidad de trabajo

- [x] **36.4 — Aplicar y verificar la política responsive aprobada.** Cerrada en `1bf348af`, archivo/prueba nombrados en «Estado vigente». **Registro histórico:** en curso; un commit funcional con pruebas/documentación. Ruta delegada: exploradores `mut80ys1-1s-4825`/`mut87n6p-1t-0hxr`, escritor continuado hasta `mut9efgu-1w-fjfy`, verificador `mut9wygc-1x-9ntd`. Padre conserva staging, review y delivery.

## Resultados observados

| Comprobación | Evidencia y resultado |
|---|---|
| RED real antes de CSS | Cuatro fallos 768/1440 JS/noJS, dos casos móvil pasan. |
| GREEN focalizado | Seis Playwright / 23 unitarias pasan; fixture monta Nav productivo. |
| Mutaciones/restauración | Wrapper: sólo 1440 JS/noJS falla; bookends: sólo 768 JS/noJS falla; restauraciones seis pases. Guard: tres fallos nombrados, restauración 23 pases. |
| Geometría JS/noJS | Móvil 358→358; tablet 196→232; desktop vacío 244 / zona 336,84 / filtros 347,52→420. Centros 195/384/720, sin solapes visibles. Targets autorizados 44; casos excluidos mantienen 40. |
| Independiente: unitarios/tipos/lint | 291 archivos / 3.242 tests, sin skips; tipos, Biome sin warnings, tokens (301 archivos) y diff pasan. Referencia design excluida por configuración existente. |
| Independiente: build/bundle | Flag measure ausente, DSN ficticia sólo de build + SITE_URL loopback; 25/25 estáticas. Bundle: 24 rutas, máximo 112,43 KB gzip ≤130; no delta antes/después medido. |
| Independiente: browser | `mutb2tea-1z-w1je`: seis pases en 11,3 s, un worker, cero skips/retries. Imágenes nuevas y geometría JS/noJS confirman 358/232/420, centrado y targets; GET/foco/sugerencias pasan. |

Evidencia: `test-results/f364-evidence.json`, `f364-boxes-after-*`, `f364-nav-after-{390,768,1440}.png`; reporte histórico `test-results/test-results/f364-report.json`. Los gates ejecutados por cada actor no se atribuyen a otro.

## Límites y siguiente paso

Next 15.5.23 dev y build comparten `.next/`; sin metadata inicial, preservación del build previo **desconocida**, límite de evidencia y no fallo de producto. Build actual pasó; no recuperación inferida. Una precarga de inicio durante mutación falló cerrada por DB ausente; allowlist final sólo fixture/assets, sin ese error. Puerto 3001 libre al terminar verificadores.

Prefijo y assert exacto de tablet verificados. Browser independiente con `F364_ARTIFACT_PREFIX=f364-independent-closure-a`, reporter line y output propio; GET sólo fixture/assets loopback, HTTP200 en seis casos, sin POST ni externos. Evidencia `test-results/f364-independent-closure-a-{summary,restoration}.json`, imágenes/boxes con ese prefijo y seis trazas. Resultados de envío y apertura del menú de cuenta fuera de cobertura.

Build conocido `Qj_3Qnu6t5SxxcN-RIJSh` archivado/restaurado mediante renames, sin borrar: 600 entradas y metadata idénticas, 21 evidencias protegidas y 996 fingerprints fuente/config intactos; puerto3001 libre. Esto sólo acredita ese build conocido, no el anterior desconocido. Inventario final previo a esta actualización: 317 líneas de implementación / 366 con documento. Fetch de dev mantiene base2ceade1, sin integración nueva.

Checkpoint `33acfe672db325dc5939fbb28b9df26bab1e3538`: ocho archivos / 368 líneas, evaluación medium y revisión `review-fd44b213af280c14` aprobada; ACK consumió autoridad exacta. Revisión no sustituye portabilidad: antes de push el padre detectó que el spec fija origen/goto a3001, mientras el runner estándar usa baseURL3100. Ese test nuevo fallaría en CI; no publicar aún.

Portabilidad corregida sólo en spec: baseURL configurada, HTTP(S)/loopback/sin credenciales, sin fallback. En3002: RED seis fallos3001 pese a fixture200; GREEN seis, mutación3001 seis fallos, restauración seis pases. Sin cambios de diseño, CSS, fixtures o negocio. Guardas negativas inspeccionadas estructuralmente, no ejecutadas.

Incidente TS2307 resuelto sin cambiar tsconfig: cachés Next generadas trasladadas por rename a `node_modules/.cache/f364-next-archives/`, ya excluido. Proof `test-results/f364-archive-relocation-a.json`; 107/133 entradas con hashes y metadata idénticos. Independiente `mutcozr7-22-m7pm`: typecheck/Biome/diff antes y después PASS; browser seis pases en11s, sin skips/retries, fixture200. Tres imágenes abiertas confirman358/232/420 y tradeoffs tablet aprobados. Prefijo `f364-portability-independent-a`; prueba final `test-results/f364-portability-independent-final-a.json`.

Preservación final:601 entradas producción/buildQj intactos;64 raíces de evidencia incluido reporte anidado, ambas cachés y996 fingerprints fuente intactos. Sólo tsconfig.tsbuildinfo generado cambió. Preflight inicial EADDRINUSE falló antes de renames; inspección vacía/reintento PASS;3002 libre. Sólo warning Next de lockfiles múltiples. Unidades/build/bundle anteriores siguen aplicables: cambió únicamente el spec.

Commit: checkpoint33acfe6; amend funcional preparado. Revisión nueva y PR pendientes; aceptar en dev sólo tras merge humano. Recibo anterior no autoriza estos bytes.
