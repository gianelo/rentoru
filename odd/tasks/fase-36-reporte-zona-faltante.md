# Fase 36.7 — Reporte interno de zona faltante

## Objetivo y decisión

Sustituir el mailto de «Avisanos» al publicar por Escribinos contextual. El usuario eligió **mensaje libre guiado**: conservar nombre, correo y mensaje; pedir ciudad, nombre de zona y explicación mediante instrucciones, sin campos nuevos ni inferir una ciudad de la búsqueda. Un reporte no crea ni habilita una zona. Continuar toda la fase 36 sobre dev antes de entregar dev → main.

Contrato: `odd/tasks/fase-36-cierre-publicacion.md:216–219`; OpenSpec: `openspec/changes/mvp-rental-listings/tasks.md:2952`. El transporte de Escribinos existente y su destinatario de configuración se reutilizan.

## Alcance y límites

- Formulario y navegación nativos: entrada contextual y respuesta segura. El usuario aclaró que el regreso después de enviar es al **paso 2, Zona**, `/publicar/paso/zona`, conservando el borrador guardado y `?volver=revisar` cuando corresponda. La mención del padre a «paso 3» fue un error de delegación, no una decisión del producto.
- No prometer que se guardan automáticamente campos aún no enviados del paso de publicación.
- Validación en dominio/aplicación. Ninguna regla de producto en componentes. No aceptar un retorno externo o elegido libremente por el visitante.
- Mantener Escribinos general, validación de mensaje 20–2000, honeypot y configuración de destinatario existentes. No precargar una plantilla que pase sola la validación.
- Sin tabla, migración, otro sistema de reportes, nuevas zonas, ampliación geográfica o cambio de buscador.
- Sin producción, secretos, acceso a `.env`, seed ni merge a main. Publicación y transporte externo requieren autorización específica.
- Preservar cambios locales de `odd/tasks/ci-importacion-masiva-duplicada.md`, documento ajeno `odd/tasks/limpieza-docker-pruebas-antiguas.md` y recursos F35/F36. No incluirlos en commits de 36.7.

## Unidades de trabajo

- [ ] **P36.7.1 — Entrada contextual y retorno nativo.** Dominio de pantalla/contexto, enlace interno desde publicar y HTML de formulario con instrucciones y regreso. TDD RED/GREEN y mutaciones de mailto, contexto y retorno. Estado: implementada y verificada independientemente; commit y evaluación de riesgo pendientes.
- [ ] **P36.7.2 — Envío y respuesta contextual seguros.** Mantener contexto en POST/acuse/negativa; entrada válida, vacía, spam y fallo de entrega. Afirmar HTML final, no sólo invocaciones. TDD RED/GREEN y mutaciones de falso éxito, pérdida de contexto y retorno externo.
- [ ] **P36.7.3 — Verificación y cierre de aceptación.** Recorrido con JavaScript desactivado y borrador guardado intacto; pruebas y checks aplicables completos; transporte real en entorno expresamente autorizado; reconciliar OpenSpec con archivos/pruebas y registrar commits. No cerrar con checks pendientes.

## Ruta, rama y presupuesto

Rama: `feat/fase-36-reporte-zona-faltante`, desde `origin/dev` `5446c16354ae34c7223cc5bbcfa36afce5e10913`. Un escritor a la vez. P36.7.1 y P36.7.2: delegación a gentle-ai-worker por cambios no triviales en varios archivos; P36.7.3: verificador para recorrido externo y checks amplios. El padre conserva decisiones y reconciliación.

Estimación inicial: 550–750 líneas autoradas, incluidas pruebas y documentación; aproximadamente 250–350 para entrada, 250–350 para respuesta y aceptación. Acumulado observado sin commits: 320 líneas de código/pruebas en P36.7.1 (+317/−3), además de este documento. Estrategia elegida por el usuario: feature-branch-chain; rama tracker y cortes encadenados de revisión hasta 400 líneas, destino final dev. La elección organiza commits locales; no autoriza push, creación de PR ni merge a main. No comprimir ni omitir pruebas para ajustar presupuesto. No crear PR ni hacer push sin autorización.

Cada unidad debe conservar comportamiento, pruebas y documentación en su commit Conventional Commit en español. Registrar SHA y evaluación nativa de riesgo al cerrar cada unidad; la revisión no se dispara por marcar una tarea.

## Evidencia y siguiente paso

Exploración: mailto sigue en PublishStep; Escribinos tiene formulario, validación y transporte pero no contexto/retorno ni feedback contextual de fallo de entrega. No existe implementación de 36.7. Destinatario fijo por configuración, no seleccionable en POST.

Primer intento del escritor detenido sin cambios ni pruebas por la referencia errónea a «paso 3». El usuario resolvió el destino: Zona (paso 2), después de enviar. Se retoma P36.7.1 con instrucciones corregidas; P36.7.2 llevará ese contexto hasta la respuesta POST. Temporal propio `.tmp/rentoru-f367-entry/` bajo limpieza del padre al finalizar.

P36.7.1: RED observado en seis aserciones de comportamiento del HTML (mailto, guía y retorno); GREEN 41/41 pruebas, cinco archivos. Se corrigieron dos expectativas sobre orden de atributos sin reducir comprobaciones. Mutaciones de mailto, contexto y retorno: RED en pruebas nombradas, restauración byte-exact por SHA256 y GREEN posterior. Comandos: `bash .tmp/rentoru-f367-entry/verify.sh tests`, `biome` (seis archivos PASS) y `types` (TypeScript sin emisión/incremental PASS); diff check acotado PASS. Aviso React del caller mockeado observado, sin parche de producción para ocultarlo.

ASSESS prospectivo no pudo evaluar archivos untracked sin declaración explícita: riesgo unassessable, tratado como alto. Verificador independiente `muxbiafo-1c-l6en`: `bash .tmp/rentoru-f367-entry/verify.sh tests` 41/41 PASS, cinco archivos; diff check PASS. Conservó las nueve pruebas generales originales y comprobó HTML del caller real, whitelist, retorno Zona/revisar y guardas del runner. Aviso React conocido observado. No se afirma aprobación nativa ni commit. POST contextual, navegador sin JavaScript y transporte real siguen pendientes. Siguiente paso: registrar tracker y primer corte local, evaluar únicamente sus rangos comprometidos y continuar P36.7.2.
