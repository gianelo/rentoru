# Fase 41 — Un solo fondo de página

Dejar un único fondo de página para todo el sitio, definido como regla del sistema, en lugar de que cada pantalla pinte el suyo. Hoy conviven el blanco azulado del `body`, el blanco puro que algunas pantallas pintan encima y paneles de otros tonos.
Base `8e5d020`; numeración 41 por pedido del fundador (39 y 40 las está usando otro agente). Una tarea por PR ≤400 líneas a `dev`, con aceptación del fundador en navegador antes de cada push que cambie pantalla.

## Specs

- S1: Reporte del fundador al revisar «Listo» (37.5): «veo algo raro los fondos del sitio estan mal. en publicaciones todo el fondo es blanco. cierto o bueno del color ese blancusco. aca sale menta o magenta. entonces fallo alli y en la pagina principal tambien».
- S2: Alcance: «para revisar todo los fondos porque hay fgondo azul magente hay fondos blanco osea debemos dejar un solo fondo como tal».
- S3: Fuera de las tareas en curso: «por ahora no toquemos los fondos porque vamos hacerlos para todo el sistema».

## Hechos verificados en `8e5d020`

- `body` pinta `var(--bg)` (`#f0f5f9`, blanco azulado) a toda la altura (`src/styles/base.css:24–33`).
- Los pasos de publicar lo tapan: `.shell` pinta `var(--surface)` (`#ffffff`) con `min-block-size: 100dvh` (`app/publicar/publish-steps.module.css:14–18`). Por eso publicar se ve blanco.
- «Listo» (`app/publicar/listo/page.tsx`) no usa ese `.shell` y deja ver el `--bg` del `body`: el mismo flujo cambia de fondo en su última pantalla.
- Otras pantallas también pintan su fondo a pantalla completa: entrar (`app/(auth)/signin/signin.module.css:7`), espera del correo (`revisa-tu-correo/espera.module.css:7`) y el visor de fotos (`foto/[n]/visor.module.css:25`, oscuro a propósito).
- El inicio combina un panel `--surface` (`app/home.module.css:55`) sobre el `--bg` del `body`.
- Usos de fondo por token en hojas de componentes: `--surface` 45, `--tint` 19 (`#e3f6f5`, menta), `--bg` 15. No existe un rol que diga «éste es el fondo de la página».
- El tema `oscuro` redefine `--bg`, `--surface` y `--tint` (`src/styles/tokens.css:678–686`): cualquier decisión debe valer en los dos temas.

## Tareas

- [x] **41.1 Inventario medido.** Recorrer las superficies del producto y leer en Chromium el color que de verdad queda pintado detrás del contenido (como hizo la 14.25 con la placa), a 390 y 1440 px y en los dos temas. Entregar una matriz pantalla → elemento que pinta el fondo → token → color. Sin cambios de código. Hecho: matriz en «Inventario medido (41.1)»; sin publicar hasta que exista el PR.
- [x] **41.2 Decisión del fondo único.** Decidida por el fundador sin lámina comparativa (L3–L4): la página es blanca (`--surface`) en todo el sitio y las cajas se distinguen por su borde `--line`, como en publicar. El blanco es liso: se probaron sobre las pantallas reales tres tonos de papel (`#fcfaf5`, `#f8f4ea`, `#f3eddf`) y un grano de papel en dos intensidades, y el fundador eligió el blanco liso (L5–L7). Corrección: la lámina comparativa ya no hace falta porque el fundador eligió mirando el flujo real; las pantallas de 41.4–41.5 se aceptan en el navegador.
  - Texto original: Lámina comparativa derivada del sistema con las opciones reales (`--bg` o `--surface` como fondo de página) sobre tres pantallas representativas: un paso de publicar, el inicio y la ficha. Gate G1.
- [x] **41.3 Rol del sistema.** Hecho: `--page` (blanco liso) y `--footer-bg` (azulado del pie) en `src/styles/tokens.css` para los dos temas; `body` pinta `--page` en `base.css` y el pie usa `--footer-bg`; regla «Fondo de página» en `SISTEMA.md`. Prueba: `tests/e2e/fondo-de-pagina.spec.ts`, «41.3: el fondo pintado es --page y el pie es --footer-bg a 390/1440 px», proyectos `chromium` y `crawlability`; RED sin el rol, GREEN después, y dos mutaciones (página a `--bg`, pie a `--page`) que la ponen en rojo. Corrección: la prueba es de color servido y no prohíbe los pintores de pantalla completa que quedan; quitarlos es 41.4–41.5. Aceptado por el fundador en `localhost:3000` (2026-10-28): «ya lo vi. esta bien». Verificado localmente; publicación según su PR.
  - Texto original: Token de fondo de página para los dos temas en `src/styles/tokens.css`, aplicado una sola vez en `base.css`; regla en `SISTEMA.md` («la página no pinta su fondo; los paneles sí, con su propio rol»). Prueba que impida que una hoja de pantalla vuelva a pintar el fondo a pantalla completa, salvo las excepciones aprobadas en G2.
- [x] **41.4 Flujo de publicar y acceso.** Hecho junto con 41.5 (corrección: el trabajo resultó el mismo en todas las pantallas). Pie pegado al fondo, estándar pedido por el fundador al revisar 41.3 («debemos estandarizar eso») y aceptado («si usemos ese estandar»): `body` es columna de al menos `100dvh` (`base.css`) y el pie usa `margin-block-start: auto`; se quitó el `100dvh` de `.shell` de publicar y `.screen` de entrar y espera, y el `background: var(--surface)` de ficha, reportar, ayuda, legales y la pantalla de error. Mis avisos, editar e importar dejan 48 px antes del pie (tenían 0). Regla en `SISTEMA.md` («El pie va pegado al fondo»). Prueba: `tests/e2e/pie-al-fondo.spec.ts` (chromium y crawlability): RED sobre el antes (blanco bajo el pie en resultados a 1440, entrar estirada a 1144 px), GREEN después; capturas antes/después de 16 pantallas a 390 y 1440: sólo cambian las que tenían el problema. Pendiente: el aire de Mis avisos, editar e importar se midió con un script local, no con una prueba del repositorio (requieren sesión). Aceptado por el fundador en `localhost:3000` (2026-10-30): «si listo». Verificado localmente; publicación según su PR.
  - Texto original: Quitar los fondos propios de pantalla completa de publicar (pasos, revisar, «Listo»), entrar y espera; los paneles interiores conservan su rol. Aceptación del fundador.
- [x] **41.5 Resto del sitio.** Hecho dentro de 41.4 (ver arriba).
  - Texto original: Inicio, resultados, ficha, Mis avisos, importar, ayuda y legales según la matriz de 41.1. Aceptación del fundador.
- [x] **41.6 Aceptación integrada.** Hecho sobre `dev` en `67d2240` (todas las tareas anteriores integradas: #477, #480, #484 y #487), con build de producción y `next start` en `localhost:3000` contra `rentas-pg` por el proxy local. Checks en verde: `lint:tokens` (329 hojas, sin literales), `typecheck`, `fondo-de-pagina.spec.ts` y `pie-al-fondo.spec.ts` en `chromium` y `crawlability` (10/10), `crawlability` completo (69 en verde, 15 omitidas por diseño). Las 4 que escriben datos exigen una base propia: `publicar-entrada` (8/8), `ficha-contacto-revelacion` y `reporte-con-motivo` pasaron contra un Postgres de la tarea en `127.0.0.1:55431/55433` con app en `:3001`; `paginacion-catalogo` (29.2) necesita además su base efímera dedicada y queda cubierta por su pierna de CI. Aceptado por el fundador en el tema menta (L9). Corrección: el recorrido en tema oscuro queda pendiente de su revisión («el oscuro lo veo luego»); los roles `--page` y `--footer-bg` existen en ambos temas y `lint:tokens` exige valores en los dos. Verificado localmente; publicación según su PR.
  - Texto original: Recorrido en los dos temas, `crawlability` y `lint:tokens`; cierre en este documento, `tasks.md` y Engram.

## Seguimientos fuera de la fase

- `scripts/seed-e2e.ts` y `scripts/seed-pagination-e2e.ts` no corren en Windows: su guardia de «invocado directamente» (comparar `import.meta.url` con `file://` más `process.argv[1]`) compara `file:///C:/...` con `file://C:\...` y nunca coincide, así que `pnpm db:test:seed:e2e` termina en silencio sin sembrar. En 41.6 se invocó `seedE2e()` por `tsx -e`. Arreglo sugerido: `pathToFileURL(process.argv[1]).href`.
- El aire de 48 px antes del pie en Mis avisos, editar e importar sigue sin prueba en el repositorio (ver 41.4).

## Inventario medido (41.1)

Medido en Chromium sobre `7ca36aa` (worktree `rentoru-phase41-task-41-1`, `next dev` en `:3041` contra `rentas-pg`): 29 rutas × 390 y 1440 px × `menta` y `oscuro` (este último forzando `data-theme`, porque ningún visitante llega a él). En cada pantalla se subió desde el punto `(4 px, 40 % del alto)` —el margen lateral— y desde el centro hasta el primer elemento con fondo propio. Las pantallas con sesión usaron una sesión temporal de `e2e-publicante`, borrada al terminar; `bulk_import_enabled` se activó para medir `/importar` y se devolvió a `false`. Una segunda pasada con el servidor ya compilado repitió los resultados.

Tokens: `--bg` = `#f0f5f9` (oscuro `#1b1830`); `--surface` = `#ffffff` (oscuro `#272343`).

| Grupo | Pantallas | Quién pinta el fondo | Token |
| --- | --- | --- | --- |
| A — se ve el `body` | inicio, resultados (ciudad y zona), 404, error de carga, **Listo**, Mis avisos, editar, importar | `body` (`src/styles/base.css:24–33`); el pie repinta el mismo valor (`components/organisms/SiteFooter.module.css:12`) | `--bg` |
| B — la pantalla tapa el `body` a pantalla completa | ficha (`[slug]/ficha.module.css:12`), reportar (`reportar.module.css:12`), ayuda ×5 (`app/ayuda/ayuda.module.css:4`), legales ×5 (`app/legal/legal.module.css:7`), entrar (`signin.module.css:8`), espera (`espera.module.css:8`), publicar: pasos y revisar (`.shell`, `publish-steps.module.css:14–18`) | hoja de la pantalla | `--surface` |
| C — fondo propio a propósito | visor de fotos (`foto/[n]/visor.module.css:26`) | hoja de la pantalla | `--viewer-bg` (oscuro) |

Hallazgos:

- **Dos fondos de página conviven**: 9 pantallas muestran `--bg`; ficha, reportar, ayuda (5), legales (5), entrar, espera y todo el flujo de publicar pintan `--surface` encima. Ninguna pinta `--tint` (menta) a pantalla completa; el «menta» que se ve en «Listo» es el `--bg` azulado al lado del blanco de los pasos.
- **Saltos dentro de un mismo recorrido**: publicar es blanco y «Listo» azulado; resultados es azulado y la ficha blanca; Mis avisos y editar son azulados, pero editar reutiliza los controles de publicar, que está en blanco.
- **El tema oscuro repite la misma estructura** (mismos elementos pintan, mismos tokens): una decisión sobre el rol vale para los dos temas.
- `--tint` aparece sólo en paneles y controles: el relleno de los controles (`--ctl`) coincide con `--bg` en menta y con `--tint` en oscuro. No es fondo de página.

Límites de la medición: sin borrador, `/publicar/paso/fotos`, `quien` y `revisar` redirigen a `tipo`, y la espera sin ticket redirige a `/signin`; para esas pantallas el pintor sale de la hoja (`revisar/page.tsx` y `PublishStep.tsx` usan `.shell`; `espera.module.css:6–9`), no del navegador. Es el servidor de desarrollo, no un build de producción; el CSS es el mismo.

## Gates

| Gate | Decisión del fundador | Bloquea |
| --- | --- | --- |
| G1 | Qué fondo único lleva la página — **decidido (2026-10-28): blanco liso `--surface` en todas las pantallas, cajas con borde `--line`; sin tono papel ni textura** | 41.3 en adelante |
| G2 | Excepciones que conservan fondo propio — **decidido (2026-10-28): el visor oscuro de fotos y el pie azulado.** El pie recibe su propio rol de color en el sistema (en menta vale lo mismo que el `--bg` actual) y conserva su borde superior | 41.3 |

## Log

- L1 (2026-10-25), durante la aceptación de 37.5: «veo algo raro los fondos del sitio estan mal. en publicaciones todo el fondo es blanco. cierto o bueno del color ese blancusco. aca sale menta o magenta. entonces fallo alli y en la pagina principal tambien. como estructura esta bien. todo esta como es para cerrar toda esa tarea por ahora no toquemos los fondos porque vamos hacerlos para todo el sistema. entonces. de una vamos a crear otra fase para esto. fase 41 porque hay otro agente creado otras fases. para revisar todo los fondos porque hay fgondo azul magente hay fondos blanco osea debemos dejar un solo fondo como tal.»
- L2 (2026-10-28): «Arranquemos aca con la fase 41». 41.1 medida; ver «Inventario medido (41.1)».
- L3 (2026-10-28): «a mi me gusta mas el estilo de publicar que el fondo es blanco y tiene bordes las cajas y todo eso.»
- L4 (2026-10-28): «pero hay que aplicarlo en todos lados»
- L5 (2026-10-28): «que te parece si dejamos el pie asi? con ese color?»
- L6 (2026-10-28): «sino usamos blanco blanco sino algo como de papel osea un color papel de libro algo asi. puedes mostrarme algunas pantallas para ver como se veria.» Tras ver la galería de tonos: «si por ahora blanco queda mejor y no le podemos dar textura a ese blanco de laguna forma para que se vea como si fuese papel».
- L7 (2026-10-28): tras ver la galería de grano sutil y marcado: «blanco liso».
- L8 (2026-10-28): ante la propuesta «el visor de fotos oscuro y el pie azulado», con el pie en su propio rol de color: «si claro asi exactamente. confirmo los dos».
- L9 (2026-10-31): «recuerda que para hacer tus pruebas aca debes usar la abse de datos local». Tras el recorrido integrado en `localhost:3000`: «si aceptado el oscuro lo veo luego. todo esta bien».
