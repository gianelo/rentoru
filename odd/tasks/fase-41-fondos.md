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

- [ ] **41.1 Inventario medido.** Recorrer las superficies del producto y leer en Chromium el color que de verdad queda pintado detrás del contenido (como hizo la 14.25 con la placa), a 390 y 1440 px y en los dos temas. Entregar una matriz pantalla → elemento que pinta el fondo → token → color. Sin cambios de código.
- [ ] **41.2 Decisión del fondo único.** Lámina comparativa derivada del sistema con las opciones reales (`--bg` o `--surface` como fondo de página) sobre tres pantallas representativas: un paso de publicar, el inicio y la ficha. Gate G1.
- [ ] **41.3 Rol del sistema.** Token de fondo de página para los dos temas en `src/styles/tokens.css`, aplicado una sola vez en `base.css`; regla en `SISTEMA.md` («la página no pinta su fondo; los paneles sí, con su propio rol»). Prueba que impida que una hoja de pantalla vuelva a pintar el fondo a pantalla completa, salvo las excepciones aprobadas en G2.
- [ ] **41.4 Flujo de publicar y acceso.** Quitar los fondos propios de pantalla completa de publicar (pasos, revisar, «Listo»), entrar y espera; los paneles interiores conservan su rol. Aceptación del fundador.
- [ ] **41.5 Resto del sitio.** Inicio, resultados, ficha, Mis avisos, importar, ayuda y legales según la matriz de 41.1. Aceptación del fundador.
- [ ] **41.6 Aceptación integrada.** Recorrido en los dos temas, `crawlability` y `lint:tokens`; cierre en este documento, `tasks.md` y Engram.

## Gates

| Gate | Decisión del fundador | Bloquea |
| --- | --- | --- |
| G1 | Qué fondo único lleva la página | 41.3 en adelante |
| G2 | Excepciones que conservan fondo propio (p. ej. el visor oscuro de fotos) | 41.3 |

## Log

- L1 (2026-10-25), durante la aceptación de 37.5: «veo algo raro los fondos del sitio estan mal. en publicaciones todo el fondo es blanco. cierto o bueno del color ese blancusco. aca sale menta o magenta. entonces fallo alli y en la pagina principal tambien. como estructura esta bien. todo esta como es para cerrar toda esa tarea por ahora no toquemos los fondos porque vamos hacerlos para todo el sistema. entonces. de una vamos a crear otra fase para esto. fase 41 porque hay otro agente creado otras fases. para revisar todo los fondos porque hay fgondo azul magente hay fondos blanco osea debemos dejar un solo fondo como tal.»
