# F36 — Arnés local de publicación

## Intención y autorización

El fundador eligió pruebas completas aisladas para 36.1b, mediante PR pequeños a `dev`. Esta unidad de infraestructura apoya `odd/tasks/fase-36-cierre-publicacion.md`; crear fixtures no cambia reglas de negocio ni cierra 36.1.

## Worktree y límites

- Worktree: `rentoru-fase36-publicacion`; rama `test/fase-36-baseline-fotos` desde `origin/dev` `445f4bce3881770790b574dde94d80bd25c4bf6b`.
- PostgreSQL propio: `rentoru-f36-pg`, loopback 55433, DB `rentas_test`. App 3001, proxy HTTP 55436; puertos previstos de fixtures 55437/55438 requieren comprobar disponibilidad.
- No usar recursos F35 ni puertos 3000/3100/55435/5545. Sin producción, credenciales reales ni destinos de DB arbitrarios.
- El fixture HTTP compatible con S3 prueba bytes almacenados y comportamiento de aplicación, no firmas ni equivalencia de Cloudflare. El preload Neon cambia configuración del transporte de prueba; no afirmar transporte de runtime inalterado.
- Primer corte sin código de aplicación, reglas de dominio, migraciones, dependencias ni copy F35.

## Unidades de trabajo

- [ ] H36.1 — Almacén local de bytes fotográficos y pruebas Node focalizadas implementados; entrega pendiente de revisión/commit del padre. Archivos: `tests/fixtures/f36-photo-store.mjs` y `tests/fixtures/f36-photo-store.test.mjs`. PUT/GET/DELETE, bucket fijo, CORS local, payload acotado y limpieza determinista; evidencia abajo. No cierra 36.1.
- [ ] H36.2 — Puente WebSocket hacia PostgreSQL fijo y preload de routing Neon sólo para pruebas. Pendiente; derivar rutas después de H36.1. Restringir a DB propia loopback; observar tráfico WebSocket y commit/rollback reales antes de declarar compatibilidad. PR separado, sin fallback remoto.
- [ ] H36.3 — Caracterización autenticada en navegador con bytes reales de originales/derivadas y lectura de DB. Pendiente H36.1/H36.2. Upload/Atrás/recarga, éxito final y fallos/reintentos acotados, conservando exclusión mismo/otro publicador. Medir loader aparte. PR separado; 36.1 parcial mientras falte evidencia.

## Verificación y entrega

Primer corte: `node --test tests/fixtures/f36-photo-store.test.mjs`; no necesita app/navegador completo para el contrato del fixture. `git diff --check` y formato/lint de archivos cambiados. Estas pruebas no verifican publicación. Fetch de `dev` antes de cada push/PR; comprobar solapamiento y repetir checks tras integrar cambios. Sin merge automático. Límite de 400 líneas revisables por PR incluyendo pruebas/docs: dividir unidades coherentes, no comprimir código.

## Evidencia y próximo paso

Exploración: R2 admite endpoint local, pero no hay seam de proyecto para routing Neon WebSocket. Baseline existente: 177 pruebas de publicación y ocho variantes Chromium; upload/final reales aún no verificados. Verificación independiente: seis pruebas pasan, Biome y `git diff --cached --check` sin errores; CLI observado y cerrado. Próximo: revisión nativa y entrega de H36.1; H36.2/H36.3 siguen pendientes, sin iniciarlas en este corte.

### Contrato del fixture H36.1

`startPhotoStore({ port: 0 })` devuelve `{ url, close }`; importar no inicia servicios. Host fijo `127.0.0.1`, bucket `f36-photos`, memoria solamente. CLI: `node tests/fixtures/f36-photo-store.mjs`, puerto 55437, mensaje de inicio/error y cierre SIGINT/SIGTERM. Las pruebas sólo usan puertos efímeros; colisiones rechazan sin buscar otro puerto. Verificador independiente comprobó CLI en 55437 libre: arranque, PUT/GET con seis bytes idénticos, DELETE/404, colisión `EADDRINUSE` del segundo proceso (exit 1) y SIGTERM del propio (exit 0), dejando el puerto libre. SIGINT no ejercitado.

Límite por PUT: `MAX_BODY_BYTES = 8 * 1024 * 1024` (8 MiB), suficiente para fixtures comprimidos; 413 descarta chunks sin crear/reemplazar objetos. No limita el total de objetos: herramienta local de prueba, no servicio de producción. CORS sólo permite `http://localhost:3001` y `http://127.0.0.1:3001`; sin Origin admite SDK servidor. Query presign ignorada, claves decodificadas por segmento sin normalizar rutas. DELETE devuelve 204 incluso si no existe. Sin filesystem, proxy, firmas AWS, paridad Cloudflare/CORS completa, WS ni prueba de publicación.

### Evidencia focalizada (Node v22.23.3)

- RED: `node --test tests/fixtures/f36-photo-store.test.mjs` → exit 1, `ERR_MODULE_NOT_FOUND` del fixture antes de implementarlo.
- GREEN: mismo comando → seis pruebas pasan, exit 0.
- Mutación temporal: quitar sólo guarda de bucket → mismo comando, exit 1; únicamente `bucket and path guards reject malformed or traversal keys` falla (`/other/photo`, 200 ≠ 400). Guarda restaurada; repetición → 6/6, exit 0.
- Pruebas restantes: `PUT GET DELETE preserve photo bytes, type and presigned keys`; `binding guard and collision fail closed; close is repeatable`; `CORS permits only local app origins and AWS upload headers`; `oversize bodies return 413 without replacing existing bytes` (Content-Length y chunked); `aborted uploads never store partial bytes and close stops live sockets`.
- Formato/lint: primer `pnpm exec biome check tests/fixtures/f36-photo-store.mjs tests/fixtures/f36-photo-store.test.mjs` falló por formato y regex de controles; corregidos sólo esos archivos con `pnpm exec biome check --write tests/fixtures/f36-photo-store.mjs tests/fixtures/f36-photo-store.test.mjs`. Repetición sin `--write`: exit 0. `git diff --check`: exit 0; `git diff --no-index --check /dev/null <archivo>` para cada uno de los tres archivos nuevos: sin diagnósticos (exit 1 por diferencias). Presupuesto: 336 líneas nuevas + 3 del diff previo del padre = 339, bajo 400; excede objetivo orientativo 320. No equivale a revisión independiente.
