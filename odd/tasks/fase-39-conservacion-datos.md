# Fase 39 — Conservación y derechos sobre los datos

Documento canónico de la fase: inventario verificado, decisiones con su porqué y su porqué no, y tareas. Primero se discute y se decide. De lo decidido salen la Política de privacidad y Tratamiento de datos, y se cierra la 23.5. Ninguna tarea de implementación arranca con una decisión abierta.

## Specs

- S1 — Fundador, 2026-10-25: «vamos a crear la fase nueva para esto pero la idea es discutirla y decidir el porque lo que se va hacer y porque no y de alli comcluir los terminos y condiciones. y que es lo mejor y que es lo que maneja airbnb»
- S2 — Principio: un plazo de conservación es un comportamiento del sistema, no un texto. La política sólo promete lo que el código cumple.
- S3 — Cada decisión registra lo que hay hoy (con evidencia), lo que hace Airbnb, las opciones con su porqué y su porqué no, la recomendación y lo que decidió el fundador.

## Inventario verificado (2026-10-25, base `origin/dev` c3a6195)

| Dato | Para qué existe | Hoy se conserva | Evidencia |
|---|---|---|---|
| `user` (nombre, correo, contacto) | Identificar la cuenta | Siempre; no existe borrar cuenta | sin `delete(users)` en `src/` ni `app/` |
| `account`, `session` | Entrar | La sesión vence a los 30 días sin actividad; las dos se borran en cascada con `user` | `@auth/core` `maxAge`; `schema.ts` `onDelete: cascade` |
| `verificationToken` (enlace por correo) | Entrar sin contraseña | 15 minutos | `identity/domain/magic-link.ts:12` |
| `verified_contact` | Mostrar «verificado el …» | Mientras exista la cuenta (cascada) | `schema.ts` `verified_contact` |
| `listing.contact_value` | Que el interesado escriba | **Siempre, aunque el aviso venza**: la fila del aviso nunca se borra | `schema.ts` `contact_value notNull`; `listing-photo-purge.port.ts` («no hay un `deleteListing`») |
| Fotos del aviso | Mostrarlo | Se borran 15 días después del vencimiento, con aviso previo | `listing-lifecycle/domain/expiry.ts:25` |
| `publish_draft` | Retomar una publicación | 24 horas | `listing-publication/domain/draft-expiry.ts:15`; cron `draft-sweep` |
| Subidas `incoming/` | Fotos aún sin asociar | 7 días | `draft-expiry.ts:30` |
| `contact_reveal_event` (quién, cuándo, mensaje) | Límite de 40/24 h, evidencia ante estafa, métrica | **Siempre**; nada lo borra y frena el borrado del usuario | `drizzle/0005_hesitant_brood.sql:11-12` (`restrict`); `design.md` Open Questions |
| `listing_report` (quién, motivo, explicación) | Ocultar con 3 reportes y revisar | **Siempre**; nada lo borra y frena el borrado del usuario | `drizzle/0013_giant_shriek.sql:17` (`restrict`) |
| `moderation_action`, `job_run`, `listing_reminder` | Operación | Siempre; sin datos de identidad directos | `schema.ts` |
| `bulk_import_batch` | Historial de importación | Siempre; sólo conteos y el `publisher_id` | `schema.ts` `bulkImportBatches` |
| Mensajes de «Escríbenos» | Atender consultas | No se guardan en la base: llegan al correo personal del fundador y quedan ahí | `site-contact/infrastructure/resend-contact-mailer.ts` |
| Registros de Vercel y Neon | Operar el sitio | Según el plan del proveedor | sin control propio |

## Qué hace Airbnb (fuentes leídas el 2026-10-24/25)

- Conserva los datos «mientras sean necesarios» para el fin con que se obtuvieron. Los criterios son la relación activa, las obligaciones legales y la defensa ante reclamos. Las copias residuales en respaldos se borran en un tiempo limitado (Política de Privacidad §10, `help/article/3175`).
- Distingue **desactivar** (reversible: oculta el perfil y los anuncios) de **eliminar** (permanente: verifica la identidad, borra la cuenta y los datos personales salvo lo que debe guardar por seguridad o por ley, y las reseñas pueden seguir visibles) (`help/article/240`, `2273`, `2267`).
- Permite ver los datos y pedir una copia descargable desde Cuenta → Privacidad (`help/article/2273`).
- Para la IA y el análisis usa desidentificación y seudonimización (§11).
- Diferencia de fondo: Airbnb nunca expone el teléfono antes de una reserva, y Rentoru sí revela el contacto. Por eso aquí pesa más el registro de quién vio qué.

## Decisiones

Formato de cada una: **Hoy**, **Airbnb**, **Opciones (por qué sí / por qué no)**, **Recomendación**, **Decidido**.

**D1 — Registro de contactos revelados.**
- Hoy: se guardan para siempre la identidad de quien vio el contacto y el mensaje que escribió.
- Airbnb: conserva mientras haga falta y desidentifica lo que sigue usando.
- (a) Para siempre. Por qué sí: es simple. Por qué no: expone datos sin un fin vigente y no se puede justificar ante un pedido de *habeas data*.
- (b) Borrar la fila a los N meses. Por qué sí: minimiza los datos. Por qué no: destruye la métrica, y `design.md` advierte que no existe otra copia.
- (c) Anonimizar a los N meses, borrando el usuario y el mensaje y conservando el aviso, la ciudad y la fecha. Por qué sí: la métrica sigue intacta y el dato personal desaparece. Por qué no: exige una migración que permita columnas nulas y un job nuevo.
- Recomendación: (c) a los **12 meses**, que cubre la decisión de continuar o pivotar a los 6 meses y deja margen para investigar una estafa.
- Decidido: —

**D2 — Reportes.**
- Hoy: se guardan para siempre el denunciante, el motivo y la explicación.
- (a) Para siempre. Por qué no: no hay un fin que lo justifique una vez revisado el aviso.
- (b) Anonimizar a los 12 meses, borrando el denunciante y la explicación y conservando el motivo y la fecha. Por qué sí: sigue sirviendo como historial del aviso.
- (c) Borrar al resolverse. Por qué no: se pierde el patrón de un publicador que reincide.
- Recomendación: (b), con una excepción: nada se anonimiza mientras el aviso siga oculto por reportes y sin resolver.
- Decidido: —

**D3 — Contacto guardado en los avisos vencidos.**
- Hoy: `listing.contact_value` se conserva para siempre, aunque nadie pueda verlo.
- (a) Dejarlo. Por qué no: guarda un teléfono sin ningún uso.
- (b) Borrarlo cuando se purgan las fotos, 15 días después del vencimiento. Por qué sí: el enlace de renovación vence ese mismo día (`listing-lifecycle/domain/renewal-token.ts:27`), así que el contacto ya no tiene uso. Falta confirmar en 39.3 si «Mis avisos» permite reactivar un aviso purgado. Por qué no: pide una migración porque hoy la columna es `NOT NULL`.
- Recomendación: (b), dentro del mismo job de purga.
- Decidido: —

**D4 — Cierre de cuenta.**
- Hoy: no existe, y el `restrict` de D1 y D2 lo impide.
- Airbnb: ofrece desactivar y eliminar, las dos con autoservicio.
- (a) A pedido por correo, ejecutado por el titular con un caso de uso probado. Por qué sí: es poco trabajo y un volumen bajo; cumple los 30 días. Por qué no: es manual.
- (b) Una pantalla de autoservicio. Por qué sí: es lo que hace Airbnb. Por qué no: hoy agrega pantalla, verificación y pruebas sin una demanda medida.
- (c) Además, desactivar. Por qué no: un aviso ya vence solo a los 30 días, que es el efecto de desactivar.
- Recomendación: (a) ahora y (b) como seguimiento. El cierre retira los avisos, borra el contacto y las fotos, anonimiza D1 y D2 y borra la cuenta, las sesiones y el contacto verificado.
- Decidido: —

**D5 — Copia de los datos.**
- Airbnb: archivo descargable.
- Recomendación: a pedido por correo, en JSON, dentro de los 30 días. No se construye una pantalla.
- Decidido: —

**D6 — Plazo de respuesta a los derechos.**
- Decidido (fundador, 2026-10-24): **30 días**.

**D7 — Mensajes de «Escríbenos».**
- Hoy: quedan en el correo personal del fundador sin plazo.
- (a) Borrarlos a mano a los 12 meses y decirlo. (b) No prometer plazo. Por qué no (b): el dato existe y la política tendría que callarlo.
- Recomendación: (a).
- Decidido: —

**D8 — Respaldos y registros de los proveedores.**
- Recomendación: declarar lo mismo que Airbnb §10.3: copias residuales por un tiempo limitado, según cada proveedor. Rentoru no puede prometer un plazo propio.
- Decidido: —

## Tareas

- [ ] 39.1 Decidir D1–D8 con el fundador y registrar cada respuesta aquí y en `design.md` → Open Questions.
- [ ] 39.2 Migración (una sola y en serie, AGENTS.md §6): `contact_reveal_event.tenant_user_id`, `listing_report.reporter_id` y `listing.contact_value` pasan a admitir nulos, y las claves foráneas a usuario pasan a `ON DELETE SET NULL`. Alto riesgo: verificador independiente.
- [ ] 39.3 Job de conservación (cron en `vercel.json`, cerrado si falta `CRON_SECRET`) que anonimice D1 y D2 y vacíe D3 al purgar las fotos.
- [ ] 39.4 Caso de uso para cerrar una cuenta (D4) y exportar sus datos (D5), con pruebas de integración contra una base de datos propia.
- [ ] 39.5 Privacidad y Tratamiento de datos con los plazos reales, Términos 10.3 y Privacidad §7–§8 alineados. Cierra la redacción de la 23.5, que todavía espera la ratificación.

## Log

- L1 — S1, verbatim.
- L2 — Hallazgo del 2026-10-25: las preguntas de plazo se le hicieron al fundador antes de verificarlas en el código. El inventario de arriba las responde con evidencia.
- L3 — Fuentes de Airbnb: `help/article/3175` (§10–§11), `240`, `2273`, `2267`, `2908`.
