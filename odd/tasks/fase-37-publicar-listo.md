# Fase 37 — Pantalla «Listo» de publicar

**Fase cerrada el 2026-10-25**: 37.1–37.6 integradas en `dev` (#454, #455, #458, #457, #459). Seguimientos: fondo de página en la fase 41; unificar los dos formateadores privados de fecha con año (`lifecycle-notice.ts:64`, `app/renovar/[token]/route.ts:64`) con `fullSpanishDate`.

Implementar la confirmación posterior a publicar según la lámina `design/pantallas/Rentoru - Publicar - Listo-v2.html` (v1 en #441; v2 aprobada en 37.1). Hoy `app/publicar/listo/page.tsx` sólo recibe `?id=`, muestra ese UUID como «Referencia» y dice que la ficha «se está construyendo», lo que ya no es cierto: la ficha existe y `buildListingPath` arma su ruta.
Base `0a68af8`; una tarea por PR ≤400 líneas a `dev`, en orden, con TDD sobre el HTML servido y aceptación del fundador en navegador antes de cada push que cambie pantalla.

## Specs

- S1: Pedido del fundador: «la 35-a exacto esta pantalla debemos disedñarla».
- S2: Alcance del fundador: «vamos a generar una fase nueva fase 37 para implementar esta nueva pantalla. ya que debemos agregar preview de las imagenes, funcionalidadesd e botones unos que ya tenemos otros que no. y todo eso».
- S3: La lámina v1 aprobada como base: aviso con foto de portada, precio, tipo y zona, medidas y placa del publicador; «Activo hasta» con fecha concreta; acciones «Ver mi aviso» (única primaria), «Ir a Mis avisos» (neutro), «Publicar otro aviso» (enlace de texto) y bloque «Compártelo» con «Compartir por WhatsApp» (neutro).
- S4: Sin UUID visible, sin texto de página en construcción, sin JavaScript necesario y sólo tokens del sistema (AGENTS.md §2).

## Hechos verificados en `0a68af8`

- Las derivadas de cada foto se generan dentro de `publishListing` (`src/modules/listing-publication/application/publish-listing.ts:227`), antes de redirigir a `/publicar/listo`: la portada ya existe al llegar.
- El aviso se escribe `status: "active"` con `expiresAt` a `LISTING_ACTIVE_DAYS` (`publish-listing.ts:271–273`).
- `buildListingPath` (`src/modules/listing-discovery/domain/listing-url.ts:76`) da la ruta pública; `site-base-url.ts` da el origen absoluto y falla cerrado sin `SITE_URL`.
- El único puerto de lectura del publicador es `PublisherListingsPort.listByPublisher` (lista completa): no hay lectura de un aviso propio por id.

## Tareas

- [x] **37.1 Lámina v2.** Dar al ✓ un rol de confirmación propio en vez de `--wait-mark-*`. Gate G1: aprobación del fundador de la v2 antes de 37.2. Comprobar: lámina renderizada en 390/768/1440.
  - **Corrección con razón:** la tarea pedía bajar «Compártelo» en escritorio a la altura de la tarjeta. Se probó y el fundador la rechazó (L4): queda arriba de la columna lateral, como en v1.
  - Hecho: `git mv` a `design/pantallas/Rentoru - Publicar - Listo-v2.html` y `publicar-listo-v2.css`; el ✓ usa `--done-mark-size`/`--done-mark-fs` (56 px/22 px), declarados en la lámina como propuesta para 37.2. Medido en Chromium contra v1: misma geometría en 390/768/1440 para ✓, título, tarjeta, acciones y «Compártelo», sin desbordamiento horizontal.
  - G1 aprobado por el fundador (L5). Sin app servida: lámina estática.
- [x] **37.2 Roles del sistema.** Tokens del rol de confirmación y de la miniatura de «Listo» en `src/styles/tokens.css` y `design/reference/sistema/tokens.css`; sección «Publicar · Listo» en `SISTEMA.md`. Comprobar: `pnpm lint:tokens` (cada token con lector).
  - Hecho en 37.4b: `--done-mark-size`/`--done-mark-fs` (56/22) en `src/styles/tokens.css` junto a `--wait-mark-*`, con su lector en `app/publicar/listo/listo.module.css`; la miniatura reutiliza `--mis-avisos-thumb-*`, `--card-w-desktop` y `--card-photo-ratio`, sin token nuevo. Sección «Publicar · Listo — fase 37» en `SISTEMA.md`. `design/reference/sistema/tokens.css` no lleva el rol porque tampoco lleva `--wait-mark-*`. `lint:tokens` PASS.
- [x] **37.3 Lectura del aviso recién publicado.** Puerto de lectura nuevo al lado del de escritura (AGENTS.md §3): `(publisherId, listingId)` → resumen (precio, tipo, zona y ciudad, medidas, tipo de publicador, `expiresAt`, derivadas de portada, partes de la ruta). Sólo devuelve avisos del propio publicador; ajeno, inexistente o no activo devuelve nada (falla cerrado). Dominio puro que arma la vista: fecha en es-VE/UTC y destinos de las acciones. Comprobar: integración contra Postgres real (propio, ajeno, inexistente, vencido) y unidad del dominio con mutación.
  - Hecho: `PublishedListingPort.findOwnActive(publisherId, listingId, now)` (`application/ports/published-listing.port.ts`) con `DrizzlePublishedListing` (`infrastructure/drizzle-published-listing.ts`): dueño, `status = 'active'` y `expires_at > now` en el WHERE, una fila. `readPublishedListing` (`application/read-published-listing.ts`) descarta sin consultar un id que no es UUID (`domain/listing-id.ts`) y suma la portada con el `ListingPhotosPort` de la ficha; sin fila de portada conserva el aviso.
  - **Corrección con razón:** el dominio que arma la vista (vigencia con año y destinos) pasa a 37.4, junto con la pantalla que lo llama: un dominio probado sin llamador es justo lo que AGENTS.md §1 advierte, y además dejaba esta tarea por encima de 400 líneas. Su borrador ya está escrito; la fecha con año irá por un `fullSpanishDate` compartido en lugar de una tercera copia privada del formateador (`lifecycle-notice.ts:64` y `app/renovar/[token]/route.ts:64`).
  - Pruebas: `tests/integration/published-listing.test.ts` contra Postgres propio (propio activo, ajeno, inexistente, vencido por fecha con `active`, `expired`, `hidden`, `draft`, y el SQL con los tres filtros en el WHERE); `read-published-listing.test.ts` y `listing-id.test.ts`. RED con esqueletos de comportamiento equivocado; GREEN. Mutantes detectados y restaurados: sin dueño, sin estado, sin vencimiento y sin validar UUID. La prueba del SQL miraba también el SELECT y no atrapaba el vencimiento; se acotó al WHERE y ahora lo atrapa.
- [x] **37.4 Pantalla.** Recrear la lámina aprobada en `app/publicar/listo/page.tsx` sólo con lo que llega decidido de 37.3: cabecera del flujo, resumen con portada de derivada pública, «Activo hasta», tres acciones como enlaces reales. Gate G3: qué se muestra cuando 37.3 no devuelve aviso. Comprobar: prueba del HTML servido (portada, fecha, tres `href`, sin UUID ni «se está construyendo»), Chromium 390/440/768/1440 con y sin JS, aceptación del fundador.
  - G3 decidido por el fundador: «redigiri a mis avisos recuerda que los ids solo deben verse por la cuenta que los publico para que no puedan ver avisos otrs personas que no son las que se publico. ojo hablo de esa proteccion».
  - **Corrección con razón:** se entrega en dos cortes encadenados porque junta pasa de 400 líneas. 37.4a (comportamiento y protección) y 37.4b (diseño de la lámina, tokens de 37.2 y `SISTEMA.md`); la aceptación en navegador va sobre la versión final, antes de subir cualquiera de los dos.
  - 37.4a hecho: `app/publicar/listo/page.tsx` pide sesión, lee con `readPublishedListing(session.userId, id, now)` y, si no hay aviso, redirige a `/mis-avisos` igual sea cual sea la causa, así la respuesta no revela qué ids existen. Dibuja portada (`thumb`/`card` como la tarjeta de resultados), precio con `Price`, tipo y zona con `PROPERTY_TYPE_LABEL`, medidas, `PublisherBadge`, vigencia con `<time>` y los tres destinos. Sin UUID visible ni «se está construyendo». Dominio `publishedListingView` (`domain/published-listing-view.ts`) y `fullSpanishDate` en `src/shared/format/spanish-date.ts`, en vez de una tercera copia privada del formateador con año.
  - 37.4a pruebas: `app/publicar/listo/listo-servido.test.tsx` (RED contra la página anterior, 4/4 GREEN), `published-listing-view.test.ts`, `spanish-date.test.ts` («fullSpanishDate»). Mutantes detectados y restaurados: redirigir distinto según la causa (oráculo), no pasar la cuenta de la sesión, «Ver mi aviso» sin destino real, portada sin `alt` y portada con un solo derivado.
  - 37.4b hecho: estilos de la lámina v2 en `listo.module.css`; «Ver mi aviso» con `buttons.action` (única primaria), «Ir a Mis avisos» con `buttons.neutral` y «Publicar otro aviso» como enlace de texto. `listo-servido.test.tsx` suma «draws one primary action…» y «gives the check mark its own confirmation role…»; escritas después del CSS, se validaron con mutantes (dos primarias; ✓ con `--wait-mark-*`), los dos detectados.
  - Medido en Chromium contra la app servida y Postgres propio: 390/440/768/1440 con y sin JavaScript, 200, sin desbordamiento, portada cargada (`thumb` en móvil, `card` desde 768), botones de 44 px. Protección en vivo: id ajeno, inexistente e inventado responden igual, `307 → /mis-avisos`.
  - Aceptación del fundador en navegador (2026-10-24, `127.0.0.1:3112/publicar/listo`, servido desde `rentoru-phase37-task-37-4`, `page.tsx` `65c518d2…` y `listo.module.css` `8bacc1fd…`): «si la acepto».
- [x] **37.5 Compartir por WhatsApp.** El dominio arma `https://wa.me/?text=` con el mensaje (Gate G2) y la URL absoluta del aviso; sin `SITE_URL` el bloque no se dibuja, nunca un enlace relativo. Comprobar: `href` exacto en el HTML servido y caso sin origen.
  - G2 aprobado por el fundador: «si me sirve» sobre el texto «Mira este aviso en Rentoru: {tipo} en {zona}, ${precio} al mes. {URL}».
  - Hecho: `whatsAppShareHref` (`domain/whatsapp-share.ts`) arma `https://wa.me/?text=` con la URL absoluta (`new URL(ruta, base)`); base inválida o que no es `http(s)` devuelve `null` y la pantalla no dibuja el bloque. `page.tsx` usa `readSiteBaseUrl`; «Compártelo» con botón neutro, en escritorio (≥1100 px) arriba de la columna lateral (lámina v2) y en móvil/tablet debajo de las acciones.
  - Pruebas: `whatsapp-share.test.ts` (texto exacto, codificación, bases rechazadas) y «offers the approved message…» en `listo-servido.test.tsx`; RED y GREEN. Mutantes detectados y restaurados: cualquier protocolo, ruta relativa y compartir como acción primaria. Medido en Chromium: 390/440/768/1440 con y sin JavaScript, 200, sin desbordamiento, `href` absoluto; en escritorio «Compártelo» a la altura de la ✓.
  - Aceptación del fundador en navegador (2026-10-25, `127.0.0.1:3114/publicar/listo`, servido desde `rentoru-phase37-task-37-5`, `page.tsx` `8aa32e96…`, `listo.module.css` `7612c369…`, `whatsapp-share.ts` `5a995021…`): «como estructura esta bien. todo esta como es para cerrar toda esa tarea por ahora no toquemos los fondos porque vamos hacerlos para todo el sistema». El fondo de la pantalla no coincide con el del resto del flujo; queda fuera de esta tarea y pasa a la fase 41 (fondos de todo el sistema).
- [x] **37.6 Aceptación integrada.** Recorrido publicar → «Listo» → ficha / Mis avisos / Publicar otro en `dev`, `crawlability` y `budget:bundle`; cierre en este documento, `tasks.md` y Engram.
  - Cerrada 2026-10-25. Recorrido del fundador en dev.rentoru.com (publicar → «Listo» → ficha, Mis avisos, Publicar otro y Compartir por WhatsApp): «si todo bien.» Sobre `dev` `001e17b`: suite 3770/3770, `typecheck`, `lint` y `lint:tokens` PASS; `pnpm build` PASS con `SITE_URL` y `DATABASE_URL` sintéticos; `budget:bundle` PASS (`/publicar/listo` 104,71 KB; peor ruta `/publicar/paso/[paso]` 128,58 de 130 KB, que subió 0,41 KB desde la promoción anterior sin cambios de la fase 37 en esa ruta: queda 1,42 KB de margen). CI de `dev` run 40211227404 en verde: E2E lectura (incluida crawlability sin JavaScript), auth y publicación. El fondo de la pantalla queda para la fase 41.

## Gates

| Gate | Decisión del fundador | Bloquea |
| --- | --- | --- |
| G1 | Aprobar la lámina v2 — **aprobado** (L5) | 37.2 en adelante |
| G2 | Texto del mensaje de WhatsApp | 37.5 |
| G3 | Si el aviso no se puede leer: redirigir a `/mis-avisos` o confirmación genérica sin datos | 37.4 |

## Log

- L1 (2026-10-23): «la 35-a exacto esta pantalla debemos disedñarla» — sobre el hallazgo de 35.4 de que `listo/page.tsx` sigue diciendo que la ficha se está construyendo.
- L2: «te pare porque hice unos cambios a la laminas. revisalos de nuevo. recuerda que para las imagenes necesitamos esa funcionalidad. y todo. como eta fase es de puro texto yo pienso voy a mandar al agente hacer commit y push aparetir de esto vamos a generar una fase nueva fase 37 para implementar esta nueva pantalla. ya que debemos agregar preview de las imagenes, funcionalidadesd e botones unos que ya tenemos otros que no. y todo eso».
- L3: lámina v1 integrada por el fundador en #441 (`0a68af8`); revisión del coordinador: jerarquía de botones, sin UUID y sin JS correctos; observaciones de «Compártelo» en escritorio y del rol del ✓ pasan a 37.1.
- L4 (2026-10-24), sobre la propuesta de bajar «Compártelo»: «pero lo de compartir porque no esta arriba del todo esta como en el medio raro en escritorio en los otros esta bien». Se vuelve al layout de v1.
- L5: aprobación G1 de la v2 (sólo el rol propio del ✓): «si la apruebo.»
- L6 (2026-10-25), recorrido integrado del fundador en dev.rentoru.com: «si todo bien.»
