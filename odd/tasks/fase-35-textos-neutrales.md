# Fase 35 — auditoría de textos en español neutro

**Estado actual:** **35.1 y auditoría sustantiva 35.2 cerradas; PR [#371](https://github.com/gianelo/rentoru/pull/371) publicado a `dev`, CI remoto pendiente (tarea 4).** Fuente `b733ec35`/`12f75d2`, pruebas nombradas y recibos independientes/nativos en [cierre de identidad](fase-35-cierre-identidad.md), «Estado vigente»; entrada #364, espera #368 y soporte #370 entregados. No cierre de F35 ni inicio automático de 35.3. **Antecedentes históricos:** Según procedencia suministrada por el padre (no verificación independiente de este escritor), HEAD anterior `7242e9808d10a91cb959ea2e2fdf42b7a55e5fcb` obtuvo CI remoto fresco GREEN vía observador `murd8mqj-n-ez67`: todos los checks aplicables SUCCESS, 10 duplicados SKIPPED, ninguno fallido/pendiente. El fundador fusionó [PR #364](https://github.com/gianelo/rentoru/pull/364) en `80db5436890e7af62bbaa154c4ae5fd812771854` el `2026-10-02T19:51:57Z`. Nuevo corte 35.2b con GREEN unitario 48/48 y mutación restaurada; recibo posintegración del padre `murhzaho-z-13tr`: focal 67/67, suite 3160/3160, build fresco, Chromium/crawlability 6/6 y measure Chromium 5/5. Unidad propia `cdb22f8062a6f99b0d195593dde5ee4c1c627e92` («fix: neutraliza los textos de espera del enlace»); HEAD local `1a10d252b601f7ad1246781cffafe9513e29e5d1` en `feat/fase-35-espera-neutra` integra `631b4ee1777d794e543a9b015c740e9b740bc4dc` (F36 PR #367 fusionada por el fundador), no una fusión pública de F35. Registro pasivo/revisión/entrega pendientes. Las diez tareas de corrección completas siguen abiertas. PR #362 permanece MERGED; autorización permanente de entrega por unidad hacia `dev`, sin fusiones automáticas. CI/revisión históricos no acreditan el nuevo corte.

## Objetivo y autoridad

Adoptar español neutro, profesional y directo, con tuteo, sin voseo ni regionalismos marcados en los textos que genera Rentoru para sus usuarios. La nueva decisión del fundador reemplaza la instrucción de voseo de `design/reference/sistema/SISTEMA.md`; no demuestra que una petición equivalente nunca se haya hecho antes.

Esta unidad crea el plan canónico, añade Fase 35 al final de `openspec/changes/mvp-rental-listings/tasks.md` y sustituye únicamente el párrafo de idioma del sistema. Las láminas y sus textos quedan como referencias históricas; no autorizan reintroducir voseo en la implementación futura.

## Alcance y límites

| Entra en la auditoría futura | Límite que debe conservarse |
|---|---|
| Títulos, botones, etiquetas, placeholders, errores, ayudas y estados vacíos | Corregir estilo, no decisiones de producto ni diseño visual |
| Flujos de sesión y textos mejorados con JavaScript | Comprobar tanto el HTML base como el estado cliente real |
| Nombres accesibles, texto alternativo y metadata | Mantener semántica, enlaces, URLs y nombres de rutas |
| Texto saliente generado para WhatsApp | Separar la plantilla del mensaje escrito por el usuario; no reescribir este último |
| Correos transaccionales: asunto, texto plano y HTML | Verificar cada representación y su composición final |
| Legales | Sólo estilo; sin cambiar significado, obligaciones, plazos ni retención |
| Correos operativos internos | Inventariar con destinatario y disposición explícita; no contarlos silenciosamente como copia de usuario |

Conservar términos del producto venezolano, por ejemplo «aviso», «inmobiliaria», «puesto de estacionamiento» y «línea blanca». No clasificar todos los sustantivos coloquiales venezolanos como errores: cada disposición debe justificar si conserva o corrige el texto.

**No objetivos:** nuevos idiomas, framework de i18n, rutas por locale, cambios de zona horaria o formato de fecha, reglas de negocio nuevas, migraciones de datos o migración de `Field`. Tampoco sustituciones automáticas por regex, cambios de identificadores, códigos de error, columnas CSV, URLs o texto escrito por usuarios. Retirar `DraftNotice` o ratificar legales corresponde a F33, no a esta fase. No hay trabajo en `main`, fusiones automáticas, producción ni DB de producción o compartidas; sólo se permite la DB efímera propia de pruebas autorizada y registrada abajo.

## Línea base: evidencia localizada, no cobertura completa

| Referencia actual | Qué permite afirmar |
|---|---|
| `app/layout.tsx:51,89` | Open Graph declara `es_VE`; el documento usa `lang="es"`. Esto no garantiza neutralidad de los textos |
| `src/shared/format/spanish-date.ts:26–37` | Helpers de fechas con `Intl.DateTimeFormat("es-VE")` y UTC; conservar ese contrato |
| `app/publicar/step-copy.ts` | Catálogo local tipado de pasos y acciones; describe nueve pasos |
| `app/publicar/violation-copy.ts` | Catálogo tipado de mensajes por códigos de violación; el campo lo decide el dominio |
| Exploración previa de las superficies indicadas abajo | No se detectó infraestructura general de i18n; no es prueba de ausencia absoluta ni del historial de solicitudes |

Los grupos de tareas son un **mapa inicial para explorar**, no una afirmación de que todos los módulos, estados o mensajes ya fueron auditados. El inventario de catálogos comienza en 35.1 y debe completarse siguiendo sus consumidores.

## Contrato de mantenibilidad y conservación

- Reutilizar catálogos y helpers existentes para que cada mensaje siga siendo fácil de localizar y cambiar. Donde haga falta, añadir sólo agrupación tipada mínima por capacidad, con un propietario y consumidores identificados.
- No imponer un catálogo global ni centralizar reglas de negocio en el frontend. Dominio/aplicación siguen decidiendo el producto; `app/` y `components/` renderizan decisiones ya tomadas. La presentación por códigos puede conservar sus catálogos locales.
- Preservar interpolaciones, pluralización, conteos Unicode, límites del dominio, escape de HTML y codificación de enlaces. No alterar valores interpolados para arreglar la frase.
- Cualquier necesidad de idiomas, framework, locale routes, zona horaria o fechas requiere una decisión separada. No convertir la auditoría de estilo en una refactorización transversal.

### Registro obligatorio por hallazgo

La [matriz de 35.1](../audits/fase-35-textos-neutrales.md) registra fuentes, superficies/destinatarios, estados, propietarios, consumidores, pruebas reales y disposiciones por 35.2–35.11. Es inventario estático con línea base determinista, no auditoría completa ni prueba de despliegue. Cada tarea posterior ampliará sus estados y cobertura pendiente.

Cada cierre debe registrar archivos y **pruebas nombradas observadas**, no una casilla aislada. Si cambia el alcance o la intención, elevar la propuesta al padre/fundador; no sustituir este plan por un checklist parcial.

## Tareas de la fase — progreso

Las referencias son puntos de entrada actuales; verificar estados y consumidores antes de escribir. La aceptación descrita es un contrato futuro, no evidencia de pruebas ejecutadas hoy.

- [x] **35.1 Política, inventario y localización actual.** Confirmar política e inventariar fuente/superficie/estado/catálogo/consumidor/prueba/disposición, incluidos mensajes internos y exclusiones. Documentar el contrato de mantenibilidad y resolver ambigüedades antes de corregir.
  Referencias: `app/layout.tsx`, `src/shared/format/spanish-date.ts`, `app/publicar/{step-copy.ts,violation-copy.ts}`.
  Aceptación: rastrear ejemplos desde catálogo hasta HTML real, cliente y correo final; proteger locale/UTC y separación texto/código. El inventario debe distinguir pruebas existentes de cobertura pendiente.

- [x] **35.2 Identidad y acceso.** Auditoría técnica completa de entrar, registro, solicitud de enlace, espera, errores y regreso de sesión; PR #371 publicado, CI pendiente. Prueba `src/modules/identity/infrastructure/auth-pages-servidas.test.ts` — «Google sin vínculo: OAuthAccountNotLinked conserva cuenta, formulario y copia neutral» y «Verification loopback: firma nativa Next normalizada y destino configurado»; fuente `b733ec35`, evidencia completa en [cierre de identidad](fase-35-cierre-identidad.md), junto a antecedentes de entrada/espera y #364/#368/#370. Brecha global de cobertura preservada, no afirmación de piso global 90%.
  Referencias: `src/modules/identity/domain/{sign-in-page.ts,magic-link-request.ts}`, `app/(auth)/signin/`.
  Aceptación: ampliar `app/(auth)/signin/entrar-servida.test.tsx` y `revisa-tu-correo/espera-servida.test.tsx` para afirmar textos y nombres accesibles en estados reales; probar también los estados cliente que cambien.

- [ ] **35.3 Descubrimiento y búsqueda.** Auditar inicio, ciudad/zona, resultados, filtros, sugerencias, conteos, vacíos y avisos de parámetros obsoletos.
  Referencias: `src/modules/listing-search/domain/search-accordion.ts`, `src/modules/listing-catalogue/domain/search-destination.ts`, `app/alquiler/`, `components/client/SearchSuggestions.tsx`.
  Aceptación: textos de resultados y enlaces GET en HTML servido, pluralización e interpolaciones; sugerencias/paneles con JS en Chromium y lectura sin JS en crawlability. No cambiar slugs ni parámetros.

- [ ] **35.4 Publicación en nueve pasos.** Auditar instrucciones, campos, fotos, revisión, navegación, validaciones y errores de envío.
  Referencias: `app/publicar/{step-copy.ts,violation-copy.ts}`, `src/modules/listing-publication/domain/publication-steps.ts`.
  Aceptación: extender `app/publicar/paso-servido.test.tsx` con una matriz de los nueve pasos y estados afectados, además de fotos/contadores cliente. Las pruebas actuales de pasos no prueban por sí solas los nueve; preservar conteos Unicode y límites.

- [ ] **35.5 Gestión del publicador.** Auditar mis avisos, editar, activar, renovar, vencimiento y avisos de retención.
  Referencias: `app/mis-avisos/`, `src/modules/listing-lifecycle/domain/{retention-notice.ts,lifecycle-notice.ts}`.
  Aceptación: textos/acciones de estados en `app/mis-avisos/mis-avisos-contract.test.tsx` y `[id]/editar/editar-servido.test.tsx`, con fechas/interpolaciones y errores; sin cambiar tiempos de retención ni ciclo de vida.

- [ ] **35.6 Importación de cartera.** Auditar carga CSV, vista previa, errores por fila, resumen y confirmación.
  Referencias: `app/importar/{ImportarCartera.tsx,VistaPrevia.tsx,import-copy.ts}`, `src/modules/broker-bulk-import/domain/resolve-import-locations.ts`.
  Aceptación: ampliar `app/importar/importar-contract.test.tsx` y probar la vista previa cliente con filas correctas/erróneas y confirmación; observar valores escapados y cantidades sin modificar columnas CSV ni códigos.

- [ ] **35.7 Ficha, confianza y contacto.** Auditar reporte, mensajes de confianza, bloqueo/revelación y plantilla saliente WhatsApp.
  Referencias: `src/modules/listing-trust/domain/report-reason.ts`, `src/modules/contact-reveal/domain/reveal-message.ts`, `components/molecules/ContactBlock.tsx`, `app/alquiler/[ciudad]/[zona]/[slug]/`.
  Aceptación: HTML real bloqueado/revelado/reporte y estados cliente; decodificar el texto generado del enlace WhatsApp y preservar mensaje del usuario, privacidad, escape y condiciones de contacto. No basta probar el helper aislado.

- [ ] **35.8 Ayuda y contacto del sitio.** Auditar artículos, FAQ, formulario, errores y acuse.
  Referencias: `app/ayuda/`, `src/modules/site-contact/domain/contact-screen.ts`.
  Aceptación: textos y nombres accesibles del HTML servido, envío inválido y acuse en `app/ayuda/escribinos/page.test.tsx`; separar el correo dirigido al operador y registrar su disposición.

- [ ] **35.9 Estilo legal únicamente.** Revisar tuteo, neutralidad y consistencia sin ratificar contenido.
  Referencias: `app/legal/`, `odd/tasks/fase-33-ratificacion-legal.md` (frontera, no tarea de F35).
  Aceptación: ampliar `app/legal/terminos/page.test.tsx` y las pruebas servidas de páginas afectadas; cotejar significado, plazos, obligaciones y permanencia de `DraftNotice`. Elevar cualquier cambio sustantivo a decisión separada.

- [ ] **35.10 Correo transaccional de identidad y ciclo de vida.** Auditar asunto, texto plano y HTML, incluidos enlaces, fechas y cantidades.
  Referencias: `src/modules/identity/infrastructure/resend-mailer.ts`, `src/modules/listing-lifecycle/infrastructure/resend-lifecycle-mailer.ts`, sus dominios/compositores y pruebas actuales.
  Aceptación: afirmar las tres salidas finales compuestas con datos sintéticos, no sólo llamadas/espías al proveedor; conservar escaping, enlaces e interpolaciones. Inventariar aparte `site-contact/infrastructure/resend-contact-mailer.ts` y `operability/infrastructure/resend-heartbeat-mailer.ts` bajo `src/modules/`, con disposición interna explícita.

- [ ] **35.11 Superficies compartidas y cierre.** Auditar navegación, shells, errores globales, metadata y nombres accesibles; reconciliar cobertura y solicitar aceptación del fundador.
  Referencias: `app/{layout.tsx,error.tsx,not-found.tsx}`, `components/organisms/{Nav.tsx,SiteFooter.tsx}`, `components/organisms/AccountMenu.tsx`.
  Aceptación: HTML/metadata finales y estados de navegación cliente, Chromium con JS y crawlability sin JS en lectura; ninguna celda sin disposición, exclusiones justificadas y pruebas nombradas por tarea. CI o PR abierto no sustituyen aceptación del fundador.

## Disciplina de implementación posterior

Para cada cambio de comportamiento/texto verificable: escribir el test mínimo de salida y observar **RED antes de GREEN**, implementar el mínimo, triangular estados alternativos y hacer una mutación propia que vuelva rojo ese test; restaurar y volver a verificar. Afirmar cuerpo servido, DOM cliente o asunto/texto/HTML de correo según superficie; un espía sobre llamadas no acredita el texto que recibe la persona.

Las pruebas de dominio/catálogo complementan, no reemplazan, las de consumidores reales. Mantener lectura nativa sin JavaScript; los casos JS específicos no pueden presentarse como pruebas sin JS. Registrar nombres reales y resultados sólo al implementarlos, sin inventar pruebas futuras ya aprobadas.

## Ejecución y entrega

| Dato | Estado / responsabilidad |
|---|---|
| Rama y base de esta planificación | `docs/fase-35-textos-neutrales`, base `bf1d6b7` |
| Worktree y rama de ejecución | Hermano `rentoru-fase35-textos-neutrales`; `feat/fase-35-espera-neutra`, base inicial histórica `e5ea87c`; HEAD local `1a10d252b601f7ad1246781cffafe9513e29e5d1`, unidad propia `cdb22f8` e integración local de `631b4ee` (F36 #367) preservadas |
| Recursos de prueba actuales (recibos del padre) | PG propio `rentoru-f35-pg`, ID `c97ce629438052a00d643dc8fe56fc9735c7ba3db446754ec4e09ac841c4e0b7`, retenido en `127.0.0.1:55435`; PostgreSQL 18.6, `rentas_f35_test`/`f35_test`, etiquetas F35, tmpfs 256 MiB y sin mounts persistentes revalidados. Posintegración: proxy/appgroup `92255/92354` detenidos; Next `92458` (grupo `92441`, ancestro `92418`) observado en 127:3100 antes de measure y terminado por Playwright; adaptador ejecutable retirado. `55439/3100/55440` físicamente libres y reservas lógicas RELEASED; comprobación final sin SO_REUSEADDR. No tocar pares `55441` (diseño/túnel) ni `3001/55433/55436/55437/55438`; sin nuevos seeds/migraciones/limpieza global |
| Ruta de escritura | Escritor delegado por unidad acotada de tres documentos; no promesa de escrituras futuras en paralelo |
| Verificación de la planificación publicada | `git diff --check` y chequeos estructurales Python: pasan; verificación independiente aprobada tras corregir dos rutas. Revisión nativa `review-f27234322075d036`: aprobada y reconocimiento completado. Documentación pasiva, sin RED significativo, pruebas pnpm ni build |
| Controlador padre | Revisión, registro de verificación, commit convencional en español sin atribución, push y PR sólo a `dev`; escritor no ejecuta acciones terminales git |
| Entrega de esta unidad | Plan publicado en commit `c2341af82620242a8f7a32b9083d2a7d26924882`; [PR #362](https://github.com/gianelo/rentoru/pull/362) MERGED por el fundador en `0341dcf51a19a7c50f1727273c5b2b82ade5864a` |
| Implementación posterior | Decidir ruta por tarea acotada; dividir en PR de ≤400 líneas revisables, pruebas incluidas; estimar 1,5–2× el cambio de comportamiento |
| Limpieza al cerrar la fase | Eliminar el worktree tras comprobar cambios y commits; eliminar también contenedores y recursos Docker de pruebas creados y registrados por F35. No ejecutar limpieza global ni tocar recursos ajenos; push/PR no significa fase terminada |

### Verificación 35.1

Escritor delegado, ruta multiarchivo limitada a inventario, canónico y línea 35.1 del espejo OpenSpec. Sin cambios de producto/copia/tests, servicios ni recursos Docker. El inventario distingue trazas estáticas de pruebas ejecutadas y registra cobertura pendiente; HTML servido, cliente happyDOM y correo dominio/adaptador no equivalen a despliegue ni a todas las salidas finales.
Documentación pasiva: no hay RED significativo ni mutación aplicable. Las pruebas existentes caracterizan la base; futuros cambios requieren RED/GREEN, mutación restaurada y consumidor renderizado, no espías.

| Comando exacto / comprobación | Resultado observado |
|---|---|
| `git diff --check` | Pasa, sin salida |
| `env -u DATABASE_URL -u TEST_DATABASE_URL -u RESEND_API_KEY -u AUTH_MAIL_FROM -u LIFECYCLE_MAIL_FROM TZ=UTC pnpm exec vitest run src/shared/format/spanish-date.test.ts app/publicar/step-copy.test.ts app/publicar/violation-copy.test.ts app/importar/import-copy.test.ts 'app/(auth)/signin/entrar-servida.test.tsx' app/publicar/paso-servido.test.tsx app/importar/importar-contract.test.tsx components/client/SearchSuggestions.test.tsx components/molecules/ContactBlock.test.tsx` | 9 archivos, 102/102 tests pasan (704 ms) |
| `env -u DATABASE_URL -u TEST_DATABASE_URL -u RESEND_API_KEY -u AUTH_MAIL_FROM -u LIFECYCLE_MAIL_FROM TZ=UTC pnpm exec vitest run src/modules/identity/domain/magic-link.test.ts src/modules/identity/infrastructure/email-provider.test.ts src/modules/identity/infrastructure/resend-mailer.test.ts src/modules/listing-lifecycle/domain/lifecycle-notice.test.ts src/modules/listing-lifecycle/infrastructure/resend-lifecycle-mailer.test.ts` | 5 archivos, 35/35 tests pasan (242 ms); sin entrega real de correo |
| Python estructural de sólo lectura (UTF-8, once casillas canónicas abiertas una vez, espejo sólo 35.1, referencias existentes, grupos/trazas/límites/limpieza, conteos) | Pasa: 94 referencias concretas existentes, grupos 35.2–35.11 y trazas/límites/limpieza presentes. Diff contra HEAD: canónico +19/−10, espejo +1/−1; inventario nuevo 112 líneas aparte (143 líneas revisables con progreso previo). Padre conserva cierre/commit |

**Cierre 35.1:** inventario `odd/audits/fase-35-textos-neutrales.md` y registro canónico, commit `506e101ad9a5e16f19d552e094452a922bf00327`. Se observaron 137/137 pruebas de línea base, incluido `entrar-servida.test.tsx` — «por la puerta de publicar dibuja el título, los tres pasos y un formulario de verdad». ASSESS: riesgo medio, `reviewDue=false` por `under_budget`; no exige verificador independiente con este perfil de escritor. Revisión nativa diferida al cierre de rebanada; no se declara consumida para este inventario. Sin push/PR de implementación ni Docker propios.

No prometer que toda F35 cabe en un PR ni imponer una implementación monolítica. Este repositorio no exige issue previo, enlace de issue ni etiquetas `type:*`; esta unidad no crea issues.

### Evidencia 35.2a — corrección de CI verificada localmente

**Cierre de la corrección:** commit `0886f38475bd235519afcc250e8acc9456740bed`, árbol `389747145a326ba451b9931e6bed1cf296c77d24`, idéntico al candidato de seis archivos revisado. Revisión nativa `review-da16ca4a44731eab` aprobada y reconocimiento completado; autoridad consumida. Después se integró `origin/dev` (`445f4bc`, PR #365 del otro agente) sin conflictos. La aprobación corresponde a esta unidad de corrección, no al árbol global posterior ni al registro documental de cierre; verificar preservación de F36 y bytes de producto/tests antes de push.

**Incidente CI en `d7d1cda` y corrección focal:** RED histórico local: measure 1 falla/6 pasan por `aceptás`; e2e 4 fallan/4 pasan por `Entrá` entre Chromium y crawlability (`Volvés` no alcanzado). Primer intento detenido por transporte Neon externo con credenciales ficticias; procesos terminados, sin Docker en ese intento. Continuación: PG propio migrado/sembrado, proxy comprobado con POST/driver Neon y header ficticio contra DB `rentas_f35_test`, usuario `f35_test`, 6 avisos/2 ciudades. En esta corrección se revalidaron ID/etiquetas/binding/tmpfs, `pg_isready` y URL propia; entorno sanitizado y `NEON_FETCH_ENDPOINT=http://127.0.0.1:5545/sql` explícito, sin repetir transporte remoto ni auditar paquetes/sandbox OS. Sólo cuatro expectativas cambiaron: `aceptás→aceptas`, dos `Entrá→Entra`, `Volvés→Vuelves`. `pnpm test:measure tests/measure/puerta.spec.ts`: GREEN 7/7; mutación A sólo `SIGN_IN_LEGAL` a `aceptás`: «31.8: narrow door retains native legal links and a reachable no-JS close» falla por texto (5000 ms), otras 6 pasan; restauración 7/7. `pnpm build` y `pnpm exec playwright test tests/e2e/entrar-sin-javascript.spec.ts tests/e2e/puerta-de-whatsapp-sin-javascript.spec.ts --project=chromium --project=crawlability --workers=1 --retries=0`: pasan, 8/8 sin saltos, incluida garantía `Vuelves`. Mutación B sólo título de `contactDoorFor` a `Entrá`, rebuild y `pnpm exec playwright test tests/e2e/puerta-de-whatsapp-sin-javascript.spec.ts --project=chromium --project=crawlability --workers=1 --retries=0`: «sale entera en el HTML y sus dos envíos son formularios nativos, no un enlace que sólo un script entendería» falla en ambos proyectos por título (5000 ms); restauración inmediata, rebuild y ambos specs 8/8. Tres builds pasan; `pnpm exec biome check tests/measure/puerta.spec.ts tests/e2e/entrar-sin-javascript.spec.ts tests/e2e/puerta-de-whatsapp-sin-javascript.spec.ts`, `pnpm typecheck` y `git diff --check` pasan; ambos dominios idénticos byte a byte a HEAD. Diff combinado contra merge-base de `origin/dev`, incluidos documentos pendientes: +289/−71, 360 líneas (<400). Preflight inicial corrigió sólo la comprobación del formato tmpfs equivalente (268435456 bytes); no inició servicios en ese intento. `UntrustedHost` sigue observado, no causal ni ocultado. En aquel punto no había suites amplias nuevas ni GREEN remoto y CI fresco seguía pendiente; la revisión posterior se registra arriba. Estado histórico superado por la procedencia de CI/fusión del encabezado; 35.2 sigue abierta.

**Commit de trabajo:** `87c2d230a9d704a32c9d4826bb627c5bfcf98e6d`, árbol `95114588b0fb99b59ce12a28ae97a8840c0e5542`, idéntico al candidato revisado. Revisión nativa `review-491e016321f4f5e6` aprobada (`review-reliability`); reconocimiento completado y autoridad consumida. Después se integró `origin/dev` sin conflictos, conservando F36 del otro agente; esto no fusiona el producto en `dev`. El registro posterior es documentación pasiva, sin RED significativo; requiere comprobación estructural.

Sólo copia en `identity/domain/sign-in-page.ts` y `contact-reveal/domain/sign-in-door.ts`; reglas, rutas, formularios, privacidad e interpolaciones intactas. RED observado antes de producto: 9/99 fallan, nombres «35.2a: sirve tuteo y conserva destino y error por la puerta %s» (cinco puertas), «35.2a: renderiza la puerta real neutra %s/%s/%s» (tres variantes) y «35.2a: sirve la puerta neutra y el aviso bloqueado sin revelar el contacto»: esperaban `Entra`, recibían `Entrá`. GREEN 99/99. Mutación propia: sólo `RETURN_ASSURANCE` volvió a `Volvés…`; el caso servido de `/alquiler/distrito-capital/chacao/apartamento-2h` falló por garantía (más dos protecciones existentes); restaurada inmediatamente.

| Comando exacto | Resultado observado |
|---|---|
| `env -u DATABASE_URL -u TEST_DATABASE_URL -u RESEND_API_KEY -u AUTH_MAIL_FROM -u LIFECYCLE_MAIL_FROM TZ=UTC pnpm exec vitest run src/modules/identity/domain/sign-in-page.test.ts src/modules/contact-reveal/domain/sign-in-door.test.ts 'app/(auth)/signin/entrar-servida.test.tsx' components/organisms/SignInDoor.test.tsx 'app/alquiler/[ciudad]/[zona]/[slug]/ficha-servida.test.tsx'` | RED 9/99; GREEN 99/99; mutación 3/99 fallan; restauración 99/99 |
| `env -u DATABASE_URL -u TEST_DATABASE_URL -u RESEND_API_KEY -u AUTH_MAIL_FROM -u LIFECYCLE_MAIL_FROM TZ=UTC pnpm test:unit` | Inicial: 3134 pasan, 1 falla: `signin-return.test.ts` — «la pantalla de entrar reconoce el destino y promete volver al mismo aviso» esperaba `Entrá y volvés…`, entonces fuera de alcance. Tras autorización del padre y corrección: 278 archivos, 3135/3135 pasan |
| `env -u DATABASE_URL -u TEST_DATABASE_URL -u RESEND_API_KEY -u AUTH_MAIL_FROM -u LIFECYCLE_MAIL_FROM TZ=UTC pnpm typecheck` | Pasa |
| `pnpm lint:tokens` | Pasa, 289 archivos |
| `pnpm exec biome check src/modules/identity/domain/sign-in-page.ts src/modules/identity/domain/sign-in-page.test.ts src/modules/contact-reveal/domain/sign-in-door.ts src/modules/contact-reveal/domain/sign-in-door.test.ts 'app/(auth)/signin/entrar-servida.test.tsx' components/organisms/SignInDoor.test.tsx 'app/alquiler/[ciudad]/[zona]/[slug]/ficha-servida.test.tsx'` | Pasa tras corregir formato propio y quitar aserción no nula |

Corrección acotada autorizada por el padre: `app/alquiler/[ciudad]/[zona]/[slug]/signin-return.test.ts`, sólo dos expectativas completas (`Entra y vuelves…`, `Vuelves…`), sin cambios de lógica, fixtures ni fuente de producto adicional. RED reconfirmado con `env -u DATABASE_URL -u TEST_DATABASE_URL -u RESEND_API_KEY -u AUTH_MAIL_FROM -u LIFECYCLE_MAIL_FROM TZ=UTC pnpm exec vitest run 'app/alquiler/[ciudad]/[zona]/[slug]/signin-return.test.ts'`: 1 falla/1 pasa. El comando focal de la tabla añadiendo este archivo pasa: 6 archivos, 101/101; Biome añadiéndolo pasa: 8 archivos. Typecheck y lint:tokens repetidos: pasan. Integración ficha → href servido → signin real y destino nativo intacta.

**Alcance histórico del escritor inicial de 35.2a:** sin Docker, DB, servicios, proveedores, red ni acciones terminales git; aquel SSR no acreditaba Chromium/crawlability. La corrección focal posterior sí usa PG/proxy/Next propios y acredita los dos specs en ambos proyectos, no toda F35. 35.2 sigue abierta.

**Entrega histórica observada al publicar, antes de estos metadatos pasivos (CI pendiente entonces, measure/e2e fallaron después):** PR #364 OPEN hacia `dev`, HEAD `d7d1cdab16645658800b90c5ba542ce0b1ac52b6`, 348 líneas iniciales (+281/−67); prueba nativa sólo del corte `87c2d23`, escritor 3135/3135 e independiente posintegración 101/101 y tipos pasan, ocho TS idénticos y F36 preservada. CI remoto en ese HEAD: lint/types/tokens SUCCESS, test/build/measure/integration/preview INPROGRESS, Vercel PENDING y duplicados SKIPPED por política; navegador/build no ejecutados localmente, metadatos actuales aún sin commit del padre.

**Siguiente paso:** el padre debe leer el canónico y reflejarlo en memoria 818 antes del escritor de producto; iniciar sólo la unidad 35.2b abajo. PR #364 ya está MERGED según procedencia del padre; las aprobaciones `87c2d23`/`0886f38` y su CI permanecen históricas, no reutilizables como revisión/GREEN de 35.2b. No cerrar 35.2 completa; fusiones y promoción a `main` siguen siendo decisiones del fundador.

### Unidad 35.2b — espera neutra (Stage 2: GREEN funcional; entrega pendiente)

RED unitario reconfirmado y GREEN 48/48 observados por el escritor; navegador RED histórico suministrado por el padre. Sólo cinco literales de producto corregidos; GREEN funcional preintegración y posintegración suministrado por el padre se registra abajo; integración local completada, revisión nativa/entrega pendientes. Estimación del corte completo: 230–330 líneas cambiadas, documentos incluidos; no hay cierre de 35.2.
1. RED observado en `src/modules/identity/domain/magic-link-request.test.ts` y `app/(auth)/signin/revisa-tu-correo/espera-servida.test.tsx`: 8 fallan por copia antigua, 40 pasan (48). HappyDOM ejecuta con `node:vm` los bytes exactos del script servido seleccionado por endpoint, no el script React ni una reescritura. False→true alcanza revelación, `role=status` y parada antes de fallar por texto neutro completo. 204/rechazo/tick estrictamente posterior al vencimiento y HTML ya vencido sin sondeo pasan como caracterización de guardas existentes, no comportamiento nuevo. Metadata se afirma por export, no `<title>` servido.
2. Stage 2 aplica sólo cinco literales: `Revisá→Revisa`, `Abrilo y entrás→Ábrelo y entras`, `Mirá→Mira`, aviso completo `Podés/acá→Puedes/aquí` en `magic-link-request.ts:343/351/355/363` y metadata `Revisá→Revisa` en `page.tsx:22`. GREEN 48/48; mutación sólo del aviso completo a la frase antigua: el caso DOM «false mantiene oculto; true revela el aviso neutro completo y detiene el sondeo» falla en `textContent`, tras revelar/parar; 16 casos no seleccionados. Restauración en `finally`, focal 48/48, también tras formato. Script/visibilidad intactos; e2e preparado sin cambios del escritor, heading y título exacto en el caso existente de espera.
3. RED real de navegador anterior a GREEN proviene del padre (registro abajo); entonces GREEN de navegador y build final estaban pendientes del verificador separado, ahora acreditados por su recibo posterior. Unidad propia ya comprometida; registro pasivo, revisión nativa de la unidad exacta/reconocimiento y push/PR a `dev` pendientes del padre. Ninguna aprobación/CI previa cuenta para este corte.

**Evidencia histórica Stage 1 (reconfirmada en Stage 2 antes de fuente):** `env -u DATABASE_URL -u TEST_DATABASE_URL -u RESEND_API_KEY -u AUTH_MAIL_FROM -u LIFECYCLE_MAIL_FROM TZ=UTC pnpm exec vitest run src/modules/identity/domain/magic-link-request.test.ts 'app/(auth)/signin/revisa-tu-correo/espera-servida.test.tsx'`: exit 1, RED de texto 8/48, sin errores de configuración/arnés. Dominio: «muestra de vuelta la dirección tecleada, para cazar el tipeo sin volver», «explica por qué podría no llegar, y el vencimiento dibujado es el de verdad», «dice que la sesión quedó en el otro dispositivo, no que ya entró acá». Servido: «exporta el título neutro y conserva el canonical, no mide el title servido», «false mantiene oculto; true revela el aviso neutro completo y detiene el sondeo», «muestra de vuelta la dirección tecleada, que es como se caza el tipeo sin volver», «explica por qué podría no llegar, con las tres razones de la lámina», «el aviso de que el enlace se abrió en otro dispositivo va servido y oculto». Expectativas completas conservadas; sin GREEN ni mutación de copia en esta etapa.

E2E preparado sólo en el caso existente de espera: heading neutro y `toHaveTitle("Revisa tu correo — Rentoru")`. Composición leída estáticamente: raíz `app/layout.tsx` usa título string `Rentoru`, sin template; no hay layouts intermedios en `app/(auth)`. El export de página aporta el título completo; RED Chromium/crawlability y `<title>` real observados según el registro siguiente, GREEN de navegador pendiente en aquel momento, superado por el recibo posterior. Registro histórico Stage 1: sin Playwright, build, servicios, DB, proveedores, red ni acciones git de aquel escritor; fuentes de dominio/página y sección F36 preservadas byte a byte en ese estado previo a GREEN.
**RED de navegador histórico (recursos y pendientes de aquel momento):** `muremtsy-r-nck3` verificó transporte PG propio y build; el primer filtro con anclas devolvió «No tests found», no RED funcional. Diagnóstico separado con `--list` validó dos casos; `murf253z-t-vd66` ejecutó `pnpm exec playwright test tests/e2e/entrar-sin-javascript.spec.ts --grep 'la espera del enlace se lee entera' --project=chromium --project=crawlability --workers=1 --retries=0`: dos fallos esperados por heading `Revisa`/`Revisá`. La aserción de título posterior no se alcanzó; prueba suplementaria real con cookie sintética y `expect(page).toHaveTitle(...)` primero confirmó en ambos contextos HTTP 200 y `Revisa tu correo — Rentoru`/`Revisá tu correo — Rentoru`, sin solicitudes externas suplementarias. Fuentes/tests intactos; build correcto reutilizado. PG exacto `c97ce…`, etiquetas/binding/tmpfs/base/usuario y POST/driver Neon revalidados contra `rentas_f35_test`/`f35_test`, 6 avisos/2 ciudades, con `NEON_FETCH_ENDPOINT=http://127.0.0.1:55440/sql` y entorno saneado. Primer proxy/app `67862/68000` y reintento `69795/69797` terminaron; `55439/55440` libres, PG `55435` retenido. Reserva temporal de estos dos puertos conservada para GREEN; `3000/3100/5545` sin reserva F35. Sin seed/proveedores/migraciones/F36; GREEN de navegador todavía pendiente (GREEN unitario/mutación registrados arriba).
**Comandos históricos Stage 2 preintegración (sin servicios ni navegador):**

| Comando exacto | Resultado |
|---|---|
| `env -u DATABASE_URL -u TEST_DATABASE_URL -u RESEND_API_KEY -u AUTH_MAIL_FROM -u LIFECYCLE_MAIL_FROM TZ=UTC pnpm exec vitest run src/modules/identity/domain/magic-link-request.test.ts 'app/(auth)/signin/revisa-tu-correo/espera-servida.test.tsx'` | Antes de fuente: RED 8/48, 40 pasan; GREEN 48/48, restauración 48/48 y tras formato 48/48 |
| `env -u DATABASE_URL -u TEST_DATABASE_URL -u RESEND_API_KEY -u AUTH_MAIL_FROM -u LIFECYCLE_MAIL_FROM TZ=UTC pnpm exec vitest run 'app/(auth)/signin/revisa-tu-correo/espera-servida.test.tsx' -t 'false mantiene oculto; true revela el aviso neutro completo y detiene el sondeo'` | Mutación exclusiva: RED 1 por frase completa visible antigua; 16 no seleccionados; fuente restaurada en `finally` |
| `pnpm exec biome check src/modules/identity/domain/magic-link-request.ts src/modules/identity/domain/magic-link-request.test.ts 'app/(auth)/signin/revisa-tu-correo/page.tsx' 'app/(auth)/signin/revisa-tu-correo/espera-servida.test.tsx' tests/e2e/entrar-sin-javascript.spec.ts` | Inicial: dos diferencias de formato en test servido; corrección mecánica y GREEN, 5 archivos |
| `env -u DATABASE_URL -u TEST_DATABASE_URL -u RESEND_API_KEY -u AUTH_MAIL_FROM -u LIFECYCLE_MAIL_FROM TZ=UTC pnpm typecheck --incremental false` | Pasa; sin escritura de caché incremental fuera de alcance |
| `pnpm lint:tokens` | Pasa, 289 archivos |

Documentos pasivos: sin RED propio significativo; conservar historia y casillas abiertas. No suite amplia, Playwright, build, DB, proveedores ni acciones terminales git del escritor. Antes de fuente ambos hashes coinciden con los suministrados y con HEAD. Python de sólo lectura posterior confirma exclusivamente los cinco reemplazos; función de script idéntica a HEAD (SHA256 `07284567d45b27d7cd8d6ffe3a126b6e711c00e2b1a5442f4082477bd44e1a93`), F36 completo/22 filas y dominios de entrada/garantía compartidos intactos. Once tareas canónicas conservadas, 35.2 abierta; `git diff --check` pasa. Diff anterior a esta reconciliación contra base/HEAD `e5ea87c`: 8 rutas, +148/−24, 172 líneas incluidas pruebas/documentos (<400); el padre debe recontar el corte final y conservar el límite de PR completo ≤400.

Límites: conservar privacidad, expiración/ventana, formularios, destino, Google e invariantes; el escritor no inicia servicios ni toca DB/proveedores/dependencias/schema/layout/auth/CSS/navegación/F36. La verificación posterior de navegador sólo puede usar recursos F35 propios autorizados, con coordinación y entorno aislado. PG propio `55435` sigue retenido; `55439/3100/55440` ya liberados en el ledger actual, no autorización de reutilización.
**Recibos funcionales históricos preintegración suministrados por el padre (no ejecución de este escritor):** `murfw3fn-v-1uqf` y `murgelcw-w-q5ys`; entorno CI=1/TZ=UTC, credenciales DB/proveedores ambientales ausentes, `.env.example` solamente, URLs propias/ficticias y loopback, preview-bypass vacío.

| Comando / comprobación | Resultado del recibo |
|---|---|
| `pnpm test:unit` | EXIT 0; 278 archivos, 3141/3141, sin fallos ni saltos |
| `pnpm build` | EXIT 0; fresco después de los cinco literales: compilación/tipos/generación pasan; no reutiliza build RED |
| `pnpm exec playwright test tests/e2e/entrar-sin-javascript.spec.ts --project=chromium --project=crawlability --workers=1 --retries=0` | EXIT 0; 6/6, sin saltos/flaky/unexpected. «la espera del enlace se lee entera»: heading línea 75 y `<title>` servido línea 76 `Revisa tu correo — Rentoru` alcanzados en ambos proyectos; caso completo hasta línea 101 conserva dirección/vencimiento/countdown/Google/destino/formularios sin enviar |
| `pnpm test:measure tests/measure/entrar.spec.ts` (spec original mediante adaptador temporal fuera de Git) | Bloqueo inicial histórico: config línea 26 exponía Next dev en 0.0.0.0. Resuelto sólo en runtime con `--hostname 127.0.0.1` y rebasing absoluto equivalente de testDir/outputDir/server cwd; import del config original y deepStrictEqual semántico con comando restaurado PASS. EXIT 0, Chromium 5/5, sin saltos/fallos/reintentos: 15.7 desktop 420px/x90/pasos 590 y móvil 328px; 15.9 desktop 520/x380/Google al lado y móvil 328 apilado; redirecciones sin cookie/signin pasan. No edición versionada de config/spec/harness/dependencias |

Transporte propio antes del build y del measure: POST `/sql` 200 y driver Neon EXIT 0 contra PG 18.6, 6 avisos/2 ciudades; URLs propias/ficticias comprobadas. Next observado en `127.0.0.1:3100` antes de tests. Sin mail/OAuth/envíos/proveedores/F36 admin; sin externos observados en logs examinados, **no auditoría de paquetes**. Cinco literales/hashes de fuente/tests, SHA del script arriba, F36/22 filas y dominios compartidos preservados según recibos. Logs temporales: `f35-functional-green-aod2wwtt` y `f35-measure-green-opteqywj`.

**Recibo actual posintegración `murhzaho-z-13tr` (suministrado por el padre):** HEAD limpio `1a10d25`, rango `631b4ee..HEAD`: 8 rutas, +162/−25, 187 líneas antes de este registro pasivo. Los siete paths upstream comprometidos/F36 (excepto fila propia 35.2 del espejo), 22 filas F36, 11 tareas F35, cinco hashes fuente/tests, cuatro literales de dominio y uno de metadata y SHA del script arriba permanecen estables.

| Comando / prueba posintegración | Recibo: todos EXIT 0 |
|---|---|
| Focal dominio/espera servida + `app/publicar/logo-inicio.test.tsx` | 67/67 (48 propios + 19 F36) |
| `pnpm test:unit`; `pnpm typecheck --incremental false`; `pnpm lint:tokens`; Biome cinco archivos propios | 279 archivos, 3160/3160; tipos PASS; tokens 290; Biome PASS |
| `pnpm build`; e2e completo `entrar-sin-javascript.spec.ts`, Chromium/crawlability | Build integrado fresco compilación/tipos/generación PASS; 6/6 sin saltos/flaky/unexpected, heading 75/título 76 reales y caso completo hasta 101 preservados |
| `pnpm exec playwright test tests/measure/entrar.spec.ts --config=<temp>/f35-integrated-adapter-sxhc1qg9/loopback.config.ts` | 5/5; configuración original importada, sólo hostname127/rebases equivalentes, deepStrictEqual PASS; tests/settings originales intactos. No ejecución del comando estándar con binding inseguro |

Runtime posintegración saneado CI=1/TZ=UTC, `.env.example`, proveedores ausentes, auth ficticia, URLs loopback y NEON_FETCH_ENDPOINT explícito 55440: POST200/driver Neon EXIT0 antes de build **y** measure contra PG propio 18.6, 6 avisos/2 ciudades; también URL ficticia original de measure llega a PG propio. Identidad/etiquetas/tmpfs256MiB/no mounts revalidados; procesos/puertos finales en ledger actual. Sin mail/OAuth/envíos/uploads/seeds/migraciones/DB compartida/admin; no auditoría de paquetes. Evidencia funcional sólo del recibo, no ejecutada por este escritor.

**Revisión 35.2b cerrada:** registro pasivo `01df1d4a130bac692a47eae08549f8caf74fad64`; rebanada propia de ocho archivos/198 líneas revisada sobre árbol `4b7cb772538c191e1a60ae83fb23d13dcb75d9f4`. `review-e71857e1c613e4f2` aprobada por fiabilidad; reconocimiento nativo completado, autoridad consumida en revisión `sha256:4b5ba8a15d73e28a6d1e08dcf544ebbc18d6e655c7aeb266811a49e0f18eab51`. Sólo acredita este corte, no cambios posteriores. Upstream `631b4ee` integrado localmente, sin fusión pública de F35.

**Continuación autorizada por el fundador:** completar 35.2 antes de la entrega: comprobar HTML final de enlace usado, enlace vencido y errores OAuth/Google, reutilizando copia neutra existente cuando corresponda. Explorador de sólo lectura `murju30v-11-oj3k`; aún sin disposición ni implementación de estos casos. Registrar cobertura real y corregir sólo defectos de texto, sin nuevas reglas de producto; preservar presupuesto total ≤400 o separar cortes revisables si la evidencia exige más. PR a `dev` pendiente; nunca merge automático, `main` ni push directo a `dev`; 35.2 sigue abierta. Respuestas pendientes tardías del temporizador no están cubiertas; no corregir su semántica como estilo.
