# CI — límites de lectura del catálogo

## Contrato

Rama `ci/diagnostico-catalogo-zonas`, desde `origin/dev` (`5446c16354ae34c7223cc5bbcfa36afce5e10913`), en worktree separado para conservar la app y sesión F36.7. Complementa `ci-importacion-masiva-duplicada.md`; no afirma corrección causal. Sin producción, `.env`, credenciales de aplicación, instalaciones, merge ni cambios a `main`.

## Evidencia y decisión

CI #388 y #393: `catalogue.listZones` tarda 4113/4322 y 3136/3230 ms; siete heads lo leen en 18–38 ms. Local, catálogo real de 5797 filas: caller 60,535/24,277 ms; driver 40,328/20,748 ms; adquisición 7,955/0,099 ms incluida en driver; residual 20,207/3,529 ms. Replay 21,438 ms; EXPLAIN separado 12,881 ms, planificación 0,168 ms. No reproducimos la lentitud histórica. Las mediciones locales no demuestran causa ni corrección.

Hipótesis de la próxima ejecución CI: espera de adquisición/driver frente a residual del adaptador. Instrumentar únicamente el caso duplicado existente, bajo `CI=true`, conservando consultas, parámetros, receptor, resultados, errores, fixtures, limpieza y límite de 5000 ms. Registrar sólo identificadores secuenciales de consulta, tiempos y conteos, nunca SQL, parámetros ni datos. Restaurar observación en `finally`. Ningún rerun ciego: el próximo push debe aportar estas fronteras.

## Tareas

- [ ] Probar transparencia y restauración del observador con RED/GREEN y mutación.
- [ ] Integrar observación en el caller real y verificar el caso sobre PostgreSQL exclusivo 55439; no usar el baseline F36.7.
- [ ] Publicar una unidad ≤400 líneas con PR a `dev`; registrar CI y la siguiente decisión, sin llamar GREEN causal a un pase.

## Límites y evidencia pendiente

Padre controla Git, revisión nativa, recursos y documentos; un escritor. PostgreSQL nuevo `rentoru-ci-catalogue-slow` en 127.0.0.1:55439; app/PG/proxy y sesión F36.7, F35/F36 y documento ajeno de limpieza permanecen intactos. El diagnóstico anterior y sus archivos modificados quedan conservados en el worktree principal. CI remoto, revisión nativa y causa siguen pendientes. No aumentar timeout, omitir aserciones ni cambiar lógica de producto.
