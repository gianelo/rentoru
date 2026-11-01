# Fase 45 — Importar cartera

Destrabar la importación de cartera, que hoy no se puede probar porque pide un contacto que el producto no deja configurar, y terminar su prueba manual ([#290](https://github.com/gianelo/rentoru/issues/290)).
Base `c4b0266`. Una tarea por PR ≤400 líneas a `dev`; aceptación del fundador en navegador antes de cada push que cambie pantalla. Acceso: sólo cuentas con `user.bulk_import_enabled = true`.

## Specs

- S1 ([comentario](https://github.com/gianelo/rentoru/issues/290#issuecomment-6459784880)): «la distribución yo la veo bien no sé si podemos mejorar algo tanto en… tablet como en la de Desktop».
- S2: «hay que validar ver que la plantilla de CSv sea la correcta con los campos específicos de publicación hay que validar eso no le no lo pude validar».
- S3: «cuando intento cargar un archivo en error de que no tengo una configuración contacto predeterminado esto es raro ya que no hay una opción de configurar contacto predeterminado… si lo agregamos en el mismo Excel o creamos la función para poder agregar… una forma de contactar predeterminada en la cuenta».
- S5 (2026-10-29): «el mensaje sale abajo creo que deberiamos de tener una pantalla de success. y tambienagregar spinner loader para revisar avisos. y todo eso».
- S6 (2026-10-30): «el nombre de la zona que es el campo que se busca en el buscado busca por palabra s yo pongo bella vista salen todo lo que tenga bella vista pero en el CSV hay que ponerlo exacto sino falla como zona no existe algo asi. creo que deberia manejarse igual o no se para prevenir o no se si en el mismo excel poner los valores que pueden ser aceptados no se ya que la gente se puede equivocar y no se como poder mejorar eso. en la misma pantalla que muestra el error darle el selector o las sugerencias y que elija. no se son ideas debe ser algo muy facil de usar buena UX/UI».
- S4: «no pude probar nada más porque no me deja cargar el archivo por el problema del contacto… luego… seguimos con las pruebas de esta parte del importar». Pendientes del issue: el formato explicado, el error por fila y motivo, la vista previa antes de crear y que lo importado aparezca en Mis avisos.

## Hechos verificados en `c4b0266`

- El error: `ImportMissingAccountContactError` (`src/modules/broker-bulk-import/application/run-import-validation.ts:26–31`, lanzado en `:80`) cuando la cuenta no tiene `user.contact_method` y `user.contact_value` (`schema.ts:73–74`). La API lo devuelve como `cuenta-sin-contacto` (`app/api/bulk-import/route.ts:106`).
- **Nada en el producto escribe esas columnas**: sólo las lee `drizzle-import-account-contact.ts:20`; no hay pantalla de cuenta. El mensaje pide algo que el producto no ofrece.
- Plantilla: una sola lista (`csv-import-columns.ts:61–77`) alimenta el lector y la plantilla (`app/importar/plantilla/route.ts`). Obligatorias: `referencia_externa, titulo, descripcion, precio_usd, ciudad, zona`; opcionales: tipo, habitaciones, baños, metros, estacionamientos y las cinco características. Fuera a propósito: el contacto (sale de la cuenta), `publisher_type` y las fotos (se agregan después en Mis avisos).
- Errores: rechazos de archivo entero (`route.ts:98–107`) y errores por fila en la vista previa como «Fila N · ref» con su motivo (`VistaPrevia.tsx:67–69`, `import-copy.ts:158`).

## Tareas

- [x] **45.1 Decidir de dónde sale el contacto** (G1) — decidido 2026-10-27 (L3): campo en la pantalla de importar: una forma de configurar el contacto predeterminado en la cuenta, o columnas de contacto en el CSV. Validarlo contra los mismos formatos de contacto de publicar (36.14).
- [x] **45.2 Implementar lo decidido** — evidencia en tasks.md 45.2 (L4), con prueba de integración que deje de lanzar `cuenta-sin-contacto` cuando el contacto existe, y que siga rechazando cuando no.
- [x] **45.3 Plantilla = campos de publicar.** Hecha (L6): prueba de paridad y columna `punto_referencia`. Publicada en #489 (L7), merge pendiente. Prueba que compara la plantilla con los campos que exige publicar y documenta cada diferencia intencional (contacto, tipo de publicador, fotos).
- [x] **45.4 Completar la prueba manual pendiente**: formato explicado, error por fila y motivo, vista previa antes de crear y avisos importados visibles en Mis avisos (fase 43). Hecha en local el 2026-11-01 (L8); «crear» ya se había visto en el preview (L5). Dos hallazgos que pasan a 45.6 y 45.7.
- [ ] **45.5 Aceptación integrada** en los tres anchos (S1: revisar tablet y escritorio).
- [ ] **45.7 Zonas tolerantes al importar** (S6): sugerir o elegir la zona desde la vista previa en vez de exigir el nombre exacto. Pendiente de diseño.
- [ ] **45.6 Mejorar el flujo de importar** (S5): pantalla de éxito después de crear, en vez del mensaje al pie; estado de carga al revisar y al crear; la vista previa lista también las filas válidas con la misma anatomía de fila que las erróneas (L8); mensaje honesto ante un 500 (hoy «Revisa la conexión», que culpa a la red). Como `SISTEMA.md` no define un estado de carga, primero se extiende el sistema y recién después se dibuja.

## Gates

| Gate | Decisión del fundador | Bloquea |
| --- | --- | --- |
| G1 | Contacto en la cuenta o en el CSV | Resuelto (L3): campo en la pantalla de importar |

## Log

- L1 (2026-10-28): issue [#290](https://github.com/gianelo/rentoru/issues/290), comentario de importar citado en S1–S4.
- L2: numeración del fundador: «42 entrada, 43 Mis avisos, 44 Editar Avisos y 45 Importar Cartera».
- L3 (2026-10-27): G1 decidido por el fundador: «1. Campo en la pantalla de importar». El contacto se pide antes de subir el archivo, se valida con `publicationContactSchema` (36.14), la vista previa no escribe nada y «crear» lo guarda como predeterminado en `user.contact_*`; la próxima vez aparece prellenado. Sin migración ni pantalla de cuenta. Worktree `rentoru-phase45-task-45-2`, rama `feat/importar-contacto-predeterminado`, base `7ca36aa`.
- L4 (2026-10-28): 45.2 aceptada por el fundador en local («si lo acepto»). Unidad A `1d679c8` (caso de uso, adaptador, integración); unidad B `0b86f07` + `d365163` (ruta, pantalla, foco al resultado tras «le doy a revisar y no hace nada… no mueve la pantalla a los errores»). Unidad 3854/3854; integración 30/30 en base desechable; 13 mutaciones atrapadas. Hallazgos: (1) «crear» da 500 en local porque `neon-http-proxy` no traduce el WebSocket de `getTransactionalDatabase`; se prueba en el preview. (2) Ante un 500 la pantalla dice «Revisa la conexión», que culpa a la red: mejora aparte. (3) El contacto se guarda antes de crear los avisos; si la creación falla queda guardado (dato válido y confirmado). (4) El archivo del fundador traía ciudades «Cabimas», «Caracas», «Santa Rita» que la validación rechaza; la plantilla servida hoy trae «Distrito Capital»: revisar en 45.3. (5) «Fila 2» se queda con la numeración de la hoja (fundador: «dejemoslo así»).
- L5 (2026-10-29): preview probado por el fundador: «lo creo y lo que hace es crear como borrador dentro de mis avisos». «Crear» funciona de punta a punta. Pide 45.6 (S5).
- L6 (2026-10-30): 45.3. La comparación entre la plantilla y `DraftListing` encontró el punto de referencia sin columna; el fundador: «si hay que agregar el punto de referencia tambien». Se agregó `punto_referencia`. Las ciudades del archivo del fundador (Cabimas, Caracas…) son las de la taxonomía actual; `rentas-pg` tiene la siembra vieja (Distrito Capital, Maracaibo). El fundador autorizó volver a sembrar («si claro siembrala de nuevo»), pero `reseed-taxonomy` se negó por los 6 avisos e2e de `e2e-owner`: falta decidir cómo. El fundador pide la 45.7 (S6).
- L7 (2026-10-31): 45.3 publicada en [#489](https://github.com/gianelo/rentoru/pull/489) a `dev` tras integrar dev 67d2240 con merge normal (9c9abcf). En la PC nueva (Windows) la unidad da 3818/3858: las 37 fallas aisladas son idénticas en dev y vienen de rutas de Windows (`C:\C:\…`, barras invertidas, `status null` al lanzar procesos). `rentas-pg` resembrada con la taxonomía actual (5 ciudades, 5796 zonas) y los avisos demo (22 avisos, 36 fotos): se borraron los 6 avisos e2e que bloqueaban el reseed. En Windows los scripts de siembra salen sin hacer nada por la guarda `import.meta.url === file://argv[1]`; se arrancaron importando sus funciones con `tsx -e`.
- L8 (2026-11-01): 45.4 probada por el fundador en `localhost:3001` (worktree 45.3, `rentas-pg` resembrada) con dos archivos: uno válido de 3 filas y otro con zona inexistente, precio con letras, fila sin título con tipo desconocido y ciudad «Distrito Capital». Formato, error por fila con motivo y vista previa funcionan; el fundador: «bien esta bien entonces concluimos». Hallazgos: (1) con un archivo sin fallos la vista previa muestra sólo el contador «N listas para crear» y no lista las filas válidas (`VistaPrevia.tsx` sólo detalla las filas con error): se puede confirmar sin ver qué se crea; va a 45.6. (2) Las sugerencias de zona son sólo texto: «ya sale la sugerencias pero que se tiene que cambiar el archivo no? no se selecciona?». Es la 45.7, confirmada por la prueba: la elección debe viajar con el archivo al crear, conservando la razón de `resolve-import-locations.ts` (nada se escribe sin confirmación humana).
