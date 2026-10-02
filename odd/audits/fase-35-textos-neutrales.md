# F35 — inventario y línea base (35.1)

**Inventario documental, no auditoría completa de copia.** Política: español neutro profesional con tuteo, sin voseo; conservar sustantivos venezolanos del producto.
La evidencia combina trazas estáticas del explorador, referencias contrastadas y pruebas deterministas existentes. No acredita despliegue, Chromium ni ausencia de voseo.
35.1 cerrada como inventario y línea base: 137/137 pruebas observadas y commit `506e101ad9a5e16f19d552e094452a922bf00327`, con evidencia en el registro canónico. 35.2–35.11 siguen pendientes; no se declara auditoría completa.

## Cómo leer la matriz

Cada grupo registra fuente, destinatario/estado, propietario del catálogo/helper, consumidor y prueba de salida existente. «Pendiente» significa revisar copia y completar cobertura en esa tarea, no fallo observado.
Los nombres de pruebas son reales; sólo las suites del registro de ejecución fueron ejecutadas en esta unidad. Las demás son referencias estáticas.
No se enumeran todos los literales ni se sustituye la auditoría de estados futuros por una lista de archivos.

### 35.2 — identidad y acceso

| Fuente / catálogo propietario | Superficie, destinatario y estado | Consumidor real | Prueba de salida / disposición |
|---|---|---|---|
| `src/modules/identity/domain/sign-in-page.ts:119–183` | HTML, visitante; entrada y regreso a publicar | `app/(auth)/signin/page.tsx:50–169` | `app/(auth)/signin/entrar-servida.test.tsx:48`: 35.2a: tuteo implementado; matriz «35.2a: sirve tuteo y conserva destino y error por la puerta %s» (cinco puertas), SignInDoor real (tres variantes) y ficha servida. RED 9/99, GREEN 99/99, mutación de garantía detectada y restaurada. Comandos/resultados en canónico «Evidencia 35.2a»; suite amplia inicialmente 3134 pasan/1 falla por expectativa obsoleta; padre autorizó `signin-return.test.ts`, dos literales corregidos sin alterar integración: focal 101/101 y suite amplia 3135/3135 pasan. Fuente `87c2d23` con revisión nativa aprobada/consumida; corrección `0886f38` revisada y reconocida; CI remoto fresco pendiente. Corrección de cuatro expectativas en `tests/measure/puerta.spec.ts`, `tests/e2e/entrar-sin-javascript.spec.ts` y `tests/e2e/puerta-de-whatsapp-sin-javascript.spec.ts`: measure 7/7, dos specs en Chromium/crawlability 8/8, mutaciones propias legal/título detectadas y restauradas con rebuild y GREEN. Evidencia/recursos en canónico; cobertura parcial, 35.2 abierta y 35.2b pausada |
| `src/modules/identity/domain/magic-link-request.ts:334–382` | HTML/cliente, solicitante; espera, error, otro dispositivo | `app/(auth)/signin/revisa-tu-correo/page.tsx:78–169` | `app/(auth)/signin/revisa-tu-correo/espera-servida.test.tsx:193`: «el aviso de que el enlace se abrió en otro dispositivo va servido y oculto». No prueba el sondeo cliente; pendiente |

### 35.3 — descubrimiento y búsqueda

| Fuente / catálogo propietario | Superficie, destinatario y estado | Consumidor real | Prueba de salida / disposición |
|---|---|---|---|
| `src/modules/listing-discovery/domain/home-collections.ts`; `src/modules/listing-catalogue/domain/search-destination.ts`; `src/modules/listing-search/domain/search-accordion.ts` | HTML, visitante; oferta, conteos, filtros y vacíos | `app/page.tsx`; `app/alquiler/[ciudad]/page.tsx`; `components/organisms/SearchPanel.tsx`; `components/organisms/SearchOutcome.tsx` | `app/alquiler/[ciudad]/busqueda-sin-javascript.test.tsx:235`: «29.1: sirve un formulario GET y un enlace de destino sin depender de sugerencias». Pendientes zona, parámetros obsoletos y matriz de estados |
| `components/client/SearchSuggestions.tsx:174–205` (etiqueta local y datos de destino) | DOM cliente, visitante; lista, estado accesible, Escape | `components/molecules/SearchPill.tsx:114` | `components/client/SearchSuggestions.test.tsx:78`: «muestra la lista de sugerencias al escribir una zona con avisos». happyDOM, no Chromium; pendiente prueba navegador |

### 35.4 — publicación

| Fuente / catálogo propietario | Superficie, destinatario y estado | Consumidor real | Prueba de salida / disposición |
|---|---|---|---|
| `app/publicar/step-copy.ts:11–17`; `app/publicar/violation-copy.ts:12–34` (Records tipados) | HTML, publicador; nueve pasos, validación, revisión | `app/publicar/PublishStep.tsx`; `app/publicar/paso/[paso]/page.tsx`; `app/publicar/revisar/page.tsx` | `app/publicar/paso-servido.test.tsx:70`: «dice los caracteres escritos, en puntos de código». No cubre por sí sola nueve pasos; pendiente matriz completa |
| `app/publicar/photo-action-copy.ts`; `app/publicar/listo/page.tsx:42–51` | Cliente fotos / HTML éxito, publicador | `app/publicar/fotos/PhotoUploader.tsx`; `app/publicar/listo/page.tsx` | Catálogo probado en `app/publicar/photo-action-copy.test.ts`; salida fotos/listo pendiente. Hallazgo: afirma que la ficha aún se construye; disposición semántica pendiente, no corregir como simple tuteo |

### 35.5 — gestión del publicador

| Fuente / catálogo propietario | Superficie, destinatario y estado | Consumidor real | Prueba de salida / disposición |
|---|---|---|---|
| `src/modules/listing-publication/domain/publisher-listing-board.ts`; `src/modules/listing-lifecycle/domain/retention-notice.ts` | HTML, publicador; activo, vencido, sin fotos, retención | `app/mis-avisos/page.tsx`; `app/mis-avisos/SubirFoto.tsx` | `app/mis-avisos/mis-avisos-contract.test.tsx:302`: «un aviso vencido sin fotos sirve la otra promesa, y no la del conteo». Pendiente estados y carga dinámica |
| Catálogos step/violation; `app/renovar/[token]/route.ts:68–123`; `app/importar/import-copy.ts` | HTML, publicador; editar, activar, renovar y token inválido | `app/mis-avisos/[id]/editar/page.tsx`; `app/renovar/[token]/route.ts`; `app/mis-avisos/actions.ts` | `app/mis-avisos/[id]/editar/editar-servido.test.tsx:417`: «traduce los códigos que vuelven en la URL al castellano de publicar». Renovación/activación pendiente; conservar plazos |

### 35.6 — importación

| Fuente / catálogo propietario | Superficie, destinatario y estado | Consumidor real | Prueba de salida / disposición |
|---|---|---|---|
| `app/importar/import-copy.ts`; `src/modules/broker-bulk-import/domain/resolve-import-locations.ts` | Cliente/HTML, inmobiliaria; filas válidas, errores y resumen | `app/api/bulk-import/route.ts`; `app/importar/ImportarCartera.tsx`; `app/importar/VistaPrevia.tsx` | `app/importar/importar-contract.test.tsx:104`: «cuenta las dos mitades y nombra cada fila con problema y su razón». Pendiente fetch/confirmación; excluir columnas CSV, códigos y valores del usuario |

### 35.7 — ficha, confianza y contacto

| Fuente / catálogo propietario | Superficie, destinatario y estado | Consumidor real | Prueba de salida / disposición |
|---|---|---|---|
| `src/modules/listing-trust/domain/report-reason.ts`; `src/modules/listing-trust/domain/report-screen.ts`; `src/modules/contact-reveal/domain/reveal-message.ts` | HTML, inquilino; bloqueo, reporte y feedback | `app/alquiler/[ciudad]/[zona]/[slug]/page.tsx`; `components/molecules/ContactBlock.tsx` | `app/alquiler/[ciudad]/[zona]/[slug]/ficha-servida.test.tsx`: salida servida existente; pendiente seleccionar/ampliar casos afectados |
| `src/modules/contact-reveal/domain/revealable-contact.ts:237–249`; `components/molecules/ContactBlock.tsx:113` | WhatsApp/cliente, inquilino→publicador; plantilla o mensaje escrito | `components/molecules/ContactBlock.tsx`; `components/client/CopyContact.tsx` | `components/molecules/ContactBlock.test.tsx:297`: «lleva el mensaje que escribió el inquilino, no la plantilla». Conservar texto usuario; pendiente decodificar enlace final y portapapeles |
| `app/alquiler/[ciudad]/[zona]/[slug]/foto/[n]/page.tsx`; `app/alquiler/[ciudad]/[zona]/[slug]/foto/[n]/PhotoViewerKeys.tsx` | HTML/cliente, visitante; visor, navegación y nombres accesibles | Ruta foto y mejora por teclado | Pendiente prueba de salida afectada y Chromium; conservar enlaces nativos, no rediseñar visor |

### 35.8 — ayuda y contacto del sitio

| Fuente / catálogo propietario | Superficie, destinatario y estado | Consumidor real | Prueba de salida / disposición |
|---|---|---|---|
| `app/ayuda/`; `src/modules/site-contact/domain/contact-screen.ts` | HTML, visitante; cinco páginas, formulario, error y acuse | `app/ayuda/escribinos/page.tsx` y artículos | `app/ayuda/escribinos/page.test.tsx:75`: «dibuja el acuse y ningún formulario cuando llega `?enviado`». Pendiente revisar artículos/errores; conservar ruta escribinos |

### 35.9 — legales

| Fuente / catálogo propietario | Superficie, destinatario y estado | Consumidor real | Prueba de salida / disposición |
|---|---|---|---|
| `app/legal/`; `app/legal/draft-notice.tsx` | HTML, visitante; cinco páginas y aviso de borrador | `app/legal/terminos/page.tsx`, privacidad, cookies, normas y datos | `app/legal/terminos/page.test.tsx:12`: «carries the unratified-draft notice». Sólo estilo; cotejo de significado pendiente. `DraftNotice` y ratificación pertenecen a F33 |

### 35.10 — correo transaccional e interno

| Fuente / catálogo propietario | Superficie, destinatario y estado | Consumidor real | Prueba de salida / disposición |
|---|---|---|---|
| `src/modules/identity/domain/magic-link.ts:24–30` | Correo, solicitante; enlace de acceso | `src/modules/identity/infrastructure/email-provider.ts:71–73` → `src/modules/identity/infrastructure/resend-mailer.ts:97–105` | `src/modules/identity/infrastructure/resend-mailer.test.ts:68`: «manda el asunto y el cuerpo que compuso el dominio, sin reescribirlos»; HTML/escape en :93–99. Revisar voseo generado; composición final de tres representaciones pendiente |
| `src/modules/listing-lifecycle/domain/lifecycle-notice.ts:60–73` | Correo, publicador; vencimiento/purga, fechas y cantidades | `src/modules/listing-lifecycle/application/send-lifecycle-notices.ts` → `src/modules/listing-lifecycle/infrastructure/resend-lifecycle-mailer.ts` | `src/modules/listing-lifecycle/domain/lifecycle-notice.test.ts`; `src/modules/listing-lifecycle/infrastructure/resend-lifecycle-mailer.test.ts`: dominio/adaptador existentes. Pendiente las tres salidas finales con datos sintéticos |
| `src/modules/site-contact/domain/contact-message.ts`; `src/modules/site-contact/infrastructure/resend-contact-mailer.ts:33–35,97–107` | Correo interno al operador `CONTACT_MAIL_TO`; recepción de contacto | Compositor → adaptador de contacto | `src/modules/site-contact/infrastructure/resend-contact-mailer.test.ts`: referencia, no ejecutada. Adaptar envoltorio generado en 35.10; excluir texto usuario, direcciones, diagnósticos y códigos |
| `src/modules/operability/domain/heartbeat.ts`; `scripts/heartbeat.ts:31`; `src/modules/operability/infrastructure/resend-heartbeat-mailer.ts:86–94` | Correo interno a `HEARTBEAT_MAIL_TO`; salud operativa | Script → aplicación → adaptador heartbeat | `src/modules/operability/infrastructure/resend-heartbeat-mailer.test.ts`: referencia, no ejecutada. Adaptar sólo envoltorio generado; excluir diagnósticos, códigos y valores técnicos |

### 35.11 — compartidas y cierre

| Fuente / catálogo propietario | Superficie, destinatario y estado | Consumidor real | Prueba de salida / disposición |
|---|---|---|---|
| `src/modules/identity/domain/nav-account.ts`; `src/modules/site-footer/domain/footer-links.ts` | HTML/cliente, visitante o sesión; navegación y menú | `components/organisms/Nav.tsx`; `components/organisms/AccountMenu.tsx`; `components/organisms/SiteFooter.tsx`; `app/layout.tsx:66–92` | `components/organisms/AccountMenu.dismiss.test.tsx:93`: «aria-expanded refleja el estado, en los dos sentidos». Pendiente salida y nombres afectados |
| `src/modules/operability/domain/failure-report.ts`; `app/error.tsx`; `app/global-error.tsx`; `app/not-found.tsx` | HTML/cliente, visitante; fallo, fallo raíz y ausencia | Boundaries y página de ausencia | `app/pantallas-de-fallo.test.tsx:49`: «no filtra el mensaje ni la pila del error». Pendiente reconciliar cobertura global-error y estados cliente |
| `app/layout.tsx:43–58`; `src/modules/listing-discovery/domain/social-card.ts`; `app/opengraph-image.tsx` | Metadata y tarjeta OG/social, buscador/receptor de enlace | Layout e imagen OG (también Twitter) | `app/opengraph-image.test.tsx`: referencia estática. Hallazgo: descripción raíz en inglés; disposición de contenido pendiente, no traducción silenciosa |

## Contratos y exclusiones

- Conservar `app/layout.tsx:51,89`: OG `es_VE`, documento `lang="es"`; `src/shared/format/spanish-date.ts:26–37`: `es-VE`/UTC. No nuevos idiomas, framework ni migración de `Field`.
- Mantener propiedad por capacidad: Records tipados de step/violation/import y helpers existentes; agrupación tipada mínima sólo si falta, sin catálogo global ni reglas de negocio en componentes.
- Conservar códigos de error y su correspondencia de campo en dominio, Unicode, límites, interpolaciones, plurales, escape HTML y codificación URL. No cambiar datos para corregir frases.
- Excluir texto usuario, rutas, identificadores, columnas CSV y valores literales técnicos. Voseo citado en documentación histórica es evidencia, no copia nueva aprobada.
- Contribución: no implementada, excluida/diferida (D8). `/measure`: superficie interna histórica, fuera del alcance público. No ampliar alcance ni ratificar legales.

## Trazas de prueba y límites

HTML: sign-in-page → página signin → `entrar-servida.test.tsx` renderiza y afirma título/formulario; step-copy → PublishStep → `paso-servido.test.tsx` afirma cuerpo servido. No son espías sobre llamadas; no acreditan todos los estados.
Cliente: destino/etiqueta → SearchSuggestions montado por SearchPill → `SearchSuggestions.test.tsx` escribe y afirma lista DOM en happyDOM. No es navegador Chromium ni prueba de despliegue.
Correo: composeMagicLinkEmail → email-provider → ResendMailer entrega subject/text y HTML escapado. Pruebas del dominio, proveedor y adaptador caracterizan piezas existentes; fixtures de adaptador y tests HTML separados no prueban las tres representaciones finales de todos los correos.
Pendiente por 35.2+: RED/GREEN propio, mutación restaurada y salida renderizada afectada; completar clientes, nueve pasos, fotos, confirmación CSV, WhatsApp, metadata, legales y correo final. No afirmar «cero voseo».

## Pendientes de disposición, no correcciones autorizadas por este inventario

| Hallazgo | Próximo responsable |
|---|---|
| Descripción raíz inglesa (`app/layout.tsx:47`) | 35.11: decidir contenido equivalente antes de traducir |
| Promesa obsoleta sobre ficha (`app/publicar/listo/page.tsx:48–51`) | 35.4: elevar disposición semántica; no inventar destino/acción |
| Envoltorios internos con texto libre o datos técnicos | 35.10: adaptar frase generada, conservar cargas del usuario y diagnósticos |
| Estados todavía sin prueba de consumidor completa | Cada grupo: registrar prueba y resultado antes de cierre |

## Ejecución de línea base

Documentación pasiva: no hay cambio de comportamiento ni RED significativo; no se inventan tests nuevos ni mutaciones. Las suites existentes caracterizan la base, no un GREEN de copia corregida.
Comandos exactos y resultados: registro canónico en `odd/tasks/fase-35-textos-neutrales.md`, sección «Verificación 35.1».
Sin red, servicios, DB, Docker ni servidor. Ningún recurso Docker creado por esta unidad; el padre conserva el registro y la limpieza sólo de recursos propios F35, nunca global ni de otros agentes.
