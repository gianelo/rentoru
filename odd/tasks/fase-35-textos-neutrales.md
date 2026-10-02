# Fase 35 — auditoría de textos en español neutro

**Estado actual:** ejecución autorizada por el fundador el 2026-10-02 en el mismo worktree. **35.1 cerrada como inventario y línea base**; **35.2a implementada; expectativas e2e/measure corregidas y verificadas localmente, entrega pendiente de revisión y CI remoto nuevos**, commit `87c2d23`, revisión nativa aprobada y reconocimiento completado; [PR #364](https://github.com/gianelo/rentoru/pull/364) OPEN hacia `dev`. 35.2b (espera/script/metadata) pendiente; las diez tareas de corrección completas siguen abiertas. PR #362 MERGED por el fundador, `0341dcf51a19a7c50f1727273c5b2b82ade5864a`; rama `feat/fase-35-textos-neutrales` sincronizada con `origin/dev`, conservando el plan F36 integrado en `ee31148`. El fundador autoriza commit, push y PR hacia `dev` para cada unidad terminada; PR pequeños, independientes y secuenciales, sin fusiones automáticas.

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

**No objetivos:** nuevos idiomas, framework de i18n, rutas por locale, cambios de zona horaria o formato de fecha, reglas de negocio nuevas, migraciones de datos o migración de `Field`. Tampoco sustituciones automáticas por regex, cambios de identificadores, códigos de error, columnas CSV, URLs o texto escrito por usuarios. Retirar `DraftNotice` o ratificar legales corresponde a F33, no a esta fase. No hay trabajo en `main`, fusiones, producción ni DB.

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

- [ ] **35.2 Identidad y acceso.** Auditar entrar, registro, solicitud de enlace, espera, errores y regreso de sesión.
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
| Worktree y rama de ejecución | Hermano `rentoru-fase35-textos-neutrales`; rama `feat/fase-35-textos-neutrales` desde `e870f06`, con la planificación publicada de base |
| Recursos de prueba | F35 autoriza recursos propios sólo para reproducir CI: contenedor planeado `rentoru-f35-pg`, PostgreSQL 18 en `127.0.0.1:55435`, DB `rentas_f35_test`, almacenamiento efímero tmpfs de 256 MB en `/var/lib/postgresql` sin volúmenes persistentes, proxy `5545` con `NEON_FETCH_ENDPOINT` loopback explícito, Next producción `3000` y measure `3100` secuenciales. Preflight: puertos libres y contenedor inexistente antes de creación. Contenedor propio activo `c97ce629438052a00d643dc8fe56fc9735c7ba3db446754ec4e09ac841c4e0b7`, PostgreSQL 18.6, usuario `f35_test`, etiquetas de propietario/worktree F35 y tmpfs comprobados; sin volúmenes adicionales. Corrección verificada; proxies manuales `37764/38100/38214` y últimos pares proxy/Next `38888/38910`, `39181/39204` terminaron; puertos `3000/3100/5545` libres, sólo PG `55435` retenido, sin reseed ni limpieza Docker. Registrar propiedad F35 y actualizar IDs antes de cierre; no reutilizar ni eliminar recursos ajenos, incluidos `rentoru-f36-pg` y puertos `3001/55433/55436` |
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

**Incidente CI en `d7d1cda` y corrección focal:** RED histórico local: measure 1 falla/6 pasan por `aceptás`; e2e 4 fallan/4 pasan por `Entrá` entre Chromium y crawlability (`Volvés` no alcanzado). Primer intento detenido por transporte Neon externo con credenciales ficticias; procesos terminados, sin Docker en ese intento. Continuación: PG propio migrado/sembrado, proxy comprobado con POST/driver Neon y header ficticio contra DB `rentas_f35_test`, usuario `f35_test`, 6 avisos/2 ciudades. En esta corrección se revalidaron ID/etiquetas/binding/tmpfs, `pg_isready` y URL propia; entorno sanitizado y `NEON_FETCH_ENDPOINT=http://127.0.0.1:5545/sql` explícito, sin repetir transporte remoto ni auditar paquetes/sandbox OS. Sólo cuatro expectativas cambiaron: `aceptás→aceptas`, dos `Entrá→Entra`, `Volvés→Vuelves`. `pnpm test:measure tests/measure/puerta.spec.ts`: GREEN 7/7; mutación A sólo `SIGN_IN_LEGAL` a `aceptás`: «31.8: narrow door retains native legal links and a reachable no-JS close» falla por texto (5000 ms), otras 6 pasan; restauración 7/7. `pnpm build` y `pnpm exec playwright test tests/e2e/entrar-sin-javascript.spec.ts tests/e2e/puerta-de-whatsapp-sin-javascript.spec.ts --project=chromium --project=crawlability --workers=1 --retries=0`: pasan, 8/8 sin saltos, incluida garantía `Vuelves`. Mutación B sólo título de `contactDoorFor` a `Entrá`, rebuild y `pnpm exec playwright test tests/e2e/puerta-de-whatsapp-sin-javascript.spec.ts --project=chromium --project=crawlability --workers=1 --retries=0`: «sale entera en el HTML y sus dos envíos son formularios nativos, no un enlace que sólo un script entendería» falla en ambos proyectos por título (5000 ms); restauración inmediata, rebuild y ambos specs 8/8. Tres builds pasan; `pnpm exec biome check tests/measure/puerta.spec.ts tests/e2e/entrar-sin-javascript.spec.ts tests/e2e/puerta-de-whatsapp-sin-javascript.spec.ts`, `pnpm typecheck` y `git diff --check` pasan; ambos dominios idénticos byte a byte a HEAD. Diff combinado contra merge-base de `origin/dev`, incluidos documentos pendientes: +289/−71, 360 líneas (<400). Preflight inicial corrigió sólo la comprobación del formato tmpfs equivalente (268435456 bytes); no inició servicios en ese intento. `UntrustedHost` sigue observado, no causal ni ocultado. No suites amplias nuevas ni GREEN remoto; revisión del nuevo candidato y CI fresco corresponden al padre; 35.2 abierta y 35.2b pausada.

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

**Siguiente paso:** padre debe revisar el nuevo candidato de tests/documentación, publicar la corrección y comprobar CI remoto fresco; la aprobación fuente del corte `87c2d23` no autoriza este candidato ni declara PR #364 listo para fusión. Sólo entonces esperar la fusión del [PR #364](https://github.com/gianelo/rentoru/pull/364) OPEN hacia `dev` por el fundador; después refrescar `dev` e iniciar 35.2b (espera/script/metadata) como nuevo corte secuencial, según autorización permanente para cada unidad terminada. No cerrar 35.2 antes de completar sus consumidores ni acumular el siguiente corte sobre un PR abierto. Las fusiones de producto y la promoción a `main` siguen siendo decisiones del fundador; preservar los avances y recursos del otro agente.
