# F36.13 — Un contacto entre tres canales

## Decisión vigente

El fundador corrigió la premisa de WhatsApp único: «el whatsapp no es obligatorio es una opcion mas» y «debe haber 1 contacto cualquier de los 3». Se exige un contacto elegido entre WhatsApp, teléfono y correo. Para WhatsApp, el número debe ser venezolano y estar correctamente formado; no se comprueba existencia de cuenta. Conservar `wa.me`, `tel:` y `mailto:`. El fundador confirma teléfono también limitado a Venezuela, con móviles y fijos. La implementación futura debe permitir añadir países sin complejidad excesiva: política de país centralizada en dominio, sólo Venezuela activa; sin framework genérico ni expansión geográfica actual.

## Alcance y límites

Esta unidad reconcilia la decisión y compatibilidad en documentación; no modifica comportamiento, validadores, esquema, datos, autenticación ni servicios. La validación concreta de país/formato pertenece a 36.14, cuya premisa debe corregirse sin declararla implementada. No convertir contactos históricos ni inferir WhatsApp de un teléfono. No migración de esquema/datos propuesta para mantener el modelo multicanal existente.

## Inicio verificado

- Cwd: `/Users/gianelo/Documents/Dev/py/rentoru-phase36-task-36-13`.
- Rama: `fix/fase-36-whatsapp-compatible`.
- Base fresca `origin/dev`: `919da49dba89d3a6ea9136a5fa784ddb0eaa0d92`; árbol limpio antes de crear este registro.
- Sin app servida por esta tarea; URL no disponible. Sin recursos DB/test propios; recursos manuales e históricos intactos.
- Presupuesto provisional: ≤400 adiciones + eliminaciones, documentos y cierre incluidos; un candidato documental directo a dev, sin publicación autorizada.

## Inventario leído, no ejecutado

| Superficie | Evidencia y disposición |
|---|---|
| Alta | `app/publicar/PublishStep.tsx`, `step-values.ts`, `actions.ts`; tres canales. Conservar elección y exigir un contacto. |
| Borradores | `src/modules/listing-publication/domain/stored-draft.ts`, `application/publication-draft-session.ts`; preservar método, valor y progreso. |
| Legado | `src/shared/db/schema.ts`, `src/modules/contact-reveal/infrastructure/drizzle-contact-reveal.ts`; contactos por aviso, no defaults propagados. |
| Edición | `src/modules/listing-publication/domain/listing-edit.ts`, `app/mis-avisos/actions.ts`; mantener cambios multicanal explícitos. |
| Importación | `src/modules/broker-bulk-import/application/run-import-validation.ts`, `confirm-import.ts`; escribe directamente por repositorio. Mantener defaults y activación existentes. |
| Defaults | `src/modules/broker-bulk-import/infrastructure/drizzle-import-account-contact.ts`; no usar correo de login ni inventar escritor de perfil. |
| Revelación | `src/modules/contact-reveal/domain/revealable-contact.ts`, `components/molecules/ContactBlock.tsx`; conservar destino real por canal. |

El validador compartido también protege edición, importación y activación; no convertirlo en WhatsApp-only. El formato actual de 10–13 dígitos no acredita por sí solo validez venezolana. No se inspeccionaron datos reales ni se ejecutaron pruebas.

## Cortes recuperables

- [x] T0 — Fuentes y formatos. Tabla UIT leída; formatos aprobados por el fundador y requisito internacional de `wa.me` explícito. Límite de FAQ registrado abajo.
- [x] T1 — Reconciliar decisiones e índices. `design.md`, plan F36 y tasks central mantienen tres canales; WhatsApp único preservado como antecedente superado. 36.14 pendiente.
- [x] T2 — Verificar documentación. `git diff --check` y comprobación Python de coherencia, cinco formatos, 14 rutas del inventario y alcance exclusivo de cuatro documentos: PASS, exit 0. Diff leído.
- [x] T3 — Preparar cierre. Skill task-close cargada; evidencia y límites registrados abajo. Commit autorizado por el fundador; push directo a dev solicitado, pendiente resolver ruta frente a §6.

## Superficies de edición

- `openspec/changes/mvp-rental-listings/design.md`
- `openspec/changes/mvp-rental-listings/tasks.md`
- `odd/tasks/fase-36-cierre-publicacion.md`
- `odd/tasks/fase-36-contacto-compatible.md` (tracking propiedad del padre)

## Formatos aprobados y fuentes

«si los formatos de entrada los apruebo. el wa.me tiene que ser internacional logicamente.»

- Equivalentes: `0412 123 4567`, `4121234567`, `+58 412 1234567`, `0058 412 1234567`, `584121234567` → `+584121234567`.
- Admitir espacios, guiones y paréntesis alrededor del prefijo; rechazar extensiones, letras, países distintos, longitud incorrecta y `+58 0412…`, sin reparación silenciosa.
- Destinos: `https://wa.me/584121234567` y `tel:+584121234567`; correo conserva `mailto:`. No comprobar titularidad, asignación real ni cuenta WhatsApp.
- Política centralizada de país en dominio; sólo Venezuela activa. Formatos y canonización se implementarán en 36.14, no aquí.
- [Plan CONATEL publicado por UIT](https://www.itu.int/dms_pub/itu-t/oth/02/02/T02020000E30002PDFE.pdf), comunicación 7.V.2025: siete páginas extraídas con TLS validado, `curl | pdftotext -layout - -`, exit 0. P.2: país 58, prefijo nacional 0, internacional 00, número nacional de 10 dígitos. Pp.6–7: móviles 412, 414, 415 (Globalstar), 416, 422, 424, 426. Pp.2–6: fijos geográficos, incluidos 212 y 261; p.6: no geográficos 400, 500, 501, 800. Es la tabla publicada en 2025, no prueba de ausencia de actualizaciones posteriores ni de asignación de cada número.
- [FAQ WhatsApp](https://faq.whatsapp.com/5913398998672934): extracción directa no disponible por render JS. Resultado oficial indexado indica dígitos internacionales sin cero nacional, signo `+`, paréntesis ni guiones; no afirmar lectura primaria completa. El formato internacional es además requisito explícito del fundador.

## Estado y siguiente paso

Fuentes/formatos aprobados y premisas reconciliadas localmente. La validación actual admite 10–13 dígitos, guarda escritura del usuario y revelación infiere 58; riesgos deducidos, no ejecutados: `+58 0412 1234567` conserva cero indebido y `+1 212 555 0134` recibe 58. 36.14 debe abordar nuevos valores sin convertir legado; secuenciar alta, edición e importación según sus callers compartidos, no dar por cubierto import porque publica por repositorio directamente.

36.13 cerrada documentalmente y publicada directamente a dev por excepción explícita del fundador: `75bf7ba` (decisión) y `80ac622` (sincronización de cierres). Push no forzado exit 0; `git ls-remote origin refs/heads/dev` confirmó `80ac622a75bcef7b4cb6ff96928000481e01f033`, coincidente con HEAD. No hubo PR ni merge humano, sino push autorizado. 36.14 sigue sin implementar; autorizado reutilizar este mismo worktree para ella. Sin cambios de código, app servida ni DB. Mantener worktree y recursos históricos/manuales; no limpieza autorizada.

## Evidencia de cierre local

- Alcance: cuatro documentos, sin código, esquema, datos ni autenticación modificados. Siete superficies conservadas en el inventario; 14 rutas comprobadas existentes.
- Checks: `git diff --check` PASS; Python inline con assertions de tres canales, cinco equivalencias, 36.14 pendiente, ausencia de retirada de canales y lista exacta de archivos PASS (exit 0). Readback del diff realizado.
- TDD, mutación, unit/integration/e2e y browser: no aplicables a este cambio de documentación pasiva; no se afirma comportamiento implementado ni probado. CI y merge no ejecutados.
- Presupuesto antes de esta evidencia: 99/400 líneas (37 tracked + 62 untracked); recuento final con cierre informado al entregar.
- Cwd/rama/base: los indicados en Inicio verificado. No app servida ni recursos propios que detener. Ruta de §6: candidato documental a dev por PR y merge humano. Commit autorizado; solicitud de push directo requiere resolver la discrepancia de ruta.
- Límite: FAQ primaria de WhatsApp no recuperable; formato internacional decidido explícitamente por el fundador. Plan UIT leído de 2025, no certificación de asignación actual de cada número.
