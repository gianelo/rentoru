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
- [x] **41.2 Decisión del fondo único.** Decidida por el fundador sin lámina comparativa (L3–L4): la página es blanca (`--surface`) en todo el sitio y las cajas se distinguen por su borde `--line`, como en publicar. Corrección: la lámina comparativa ya no hace falta porque el fundador eligió mirando el flujo real; las pantallas de 41.4–41.5 se aceptan en el navegador.
  - Texto original: Lámina comparativa derivada del sistema con las opciones reales (`--bg` o `--surface` como fondo de página) sobre tres pantallas representativas: un paso de publicar, el inicio y la ficha. Gate G1.
- [ ] **41.3 Rol del sistema.** Token de fondo de página para los dos temas en `src/styles/tokens.css`, aplicado una sola vez en `base.css`; regla en `SISTEMA.md` («la página no pinta su fondo; los paneles sí, con su propio rol»). Prueba que impida que una hoja de pantalla vuelva a pintar el fondo a pantalla completa, salvo las excepciones aprobadas en G2.
- [ ] **41.4 Flujo de publicar y acceso.** Quitar los fondos propios de pantalla completa de publicar (pasos, revisar, «Listo»), entrar y espera; los paneles interiores conservan su rol. Aceptación del fundador.
- [ ] **41.5 Resto del sitio.** Inicio, resultados, ficha, Mis avisos, importar, ayuda y legales según la matriz de 41.1. Aceptación del fundador.
- [ ] **41.6 Aceptación integrada.** Recorrido en los dos temas, `crawlability` y `lint:tokens`; cierre en este documento, `tasks.md` y Engram.

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
| G1 | Qué fondo único lleva la página — **decidido (2026-10-28): blanco `--surface` en todas las pantallas, cajas con borde `--line`** | 41.3 en adelante |
| G2 | Excepciones que conservan fondo propio. Propuesta: sólo el visor oscuro de fotos; el pie pasa a blanco con su borde superior | 41.3 |

## Log

- L1 (2026-10-25), durante la aceptación de 37.5: «veo algo raro los fondos del sitio estan mal. en publicaciones todo el fondo es blanco. cierto o bueno del color ese blancusco. aca sale menta o magenta. entonces fallo alli y en la pagina principal tambien. como estructura esta bien. todo esta como es para cerrar toda esa tarea por ahora no toquemos los fondos porque vamos hacerlos para todo el sistema. entonces. de una vamos a crear otra fase para esto. fase 41 porque hay otro agente creado otras fases. para revisar todo los fondos porque hay fgondo azul magente hay fondos blanco osea debemos dejar un solo fondo como tal.»
- L2 (2026-10-28): «Arranquemos aca con la fase 41». 41.1 medida; ver «Inventario medido (41.1)».
- L3 (2026-10-28): «a mi me gusta mas el estilo de publicar que el fondo es blanco y tiene bordes las cajas y todo eso.»
- L4 (2026-10-28): «pero hay que aplicarlo en todos lados»
