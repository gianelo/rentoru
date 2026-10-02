# Fase 35 — auditoría de textos en español neutro

**Resultado de esta unidad:** planificación documental preparada el 2026-10-02; no es una auditoría realizada ni una implementación de textos. Las once tareas siguen pendientes. El fundador autorizó preparar este plan en un worktree aislado y entregarlo mediante push y PR a `dev` para que otro agente implemente después.

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

En 35.1, abrir una matriz que luego crece con cada tarea. No rellenarla como si hubiera observaciones que todavía no existen.

| Fuente exacta | Superficie / destinatario | Estado | Catálogo o helper | Consumidor real | Prueba de salida | Disposición y motivo |
|---|---|---|---|---|---|---|
| Pendiente de inventario | HTML / cliente / WhatsApp / correo / interno | Normal, vacío, error o sesión | Existente o agrupación mínima justificada | Ruta, componente o compositor | Archivo y nombre real al implementar | Corregir / conservar / excluir justificadamente / decisión pendiente |

Cada cierre debe registrar archivos y **pruebas nombradas observadas**, no una casilla aislada. Si cambia el alcance o la intención, elevar la propuesta al padre/fundador; no sustituir este plan por un checklist parcial.

## Tareas futuras — todas pendientes

Las referencias son puntos de entrada actuales; verificar estados y consumidores antes de escribir. La aceptación descrita es un contrato futuro, no evidencia de pruebas ejecutadas hoy.

- [ ] **35.1 Política, inventario y localización actual.** Confirmar política e inventariar fuente/superficie/estado/catálogo/consumidor/prueba/disposición, incluidos mensajes internos y exclusiones. Documentar el contrato de mantenibilidad y resolver ambigüedades antes de corregir.
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
| Worktree | Hermano `rentoru-fase35-textos-neutrales`; conservar durante la fase delegada activa |
| Ruta de escritura | Escritor delegado por unidad acotada de tres documentos; no promesa de escrituras futuras en paralelo |
| Verificación actual | Documentación pasiva: `git diff --check` y chequeo estructural Python; sin RED significativo, pruebas pnpm ni build |
| Controlador padre | Revisión, registro de verificación, commit convencional en español sin atribución, push y PR sólo a `dev`; escritor no ejecuta acciones terminales git |
| Entrega de esta unidad | PR de planificación únicamente; SHA de commit, número de PR y verificación quedan por registrar por el padre |
| Implementación posterior | Decidir ruta por tarea acotada; dividir en PR de ≤400 líneas revisables, pruebas incluidas; estimar 1,5–2× el cambio de comportamiento |
| Cierre del worktree | Retirar sólo tras completar/integrar la fase y comprobar seguridad según el fundador; push/PR no significa fase terminada |

No prometer que toda F35 cabe en un PR ni imponer una implementación monolítica. Este repositorio no exige issue previo, enlace de issue ni etiquetas `type:*`; esta unidad no crea issues.

**Siguiente paso:** el padre revisa y registra la verificación de estos tres documentos, prepara el commit y el PR de planificación a `dev`. Otro agente comienza por 35.1; no marcar ninguna tarea de producto por la entrega de este plan.
