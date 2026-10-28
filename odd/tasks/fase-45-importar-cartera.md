# Fase 45 — Importar cartera

Destrabar la importación de cartera, que hoy no se puede probar porque pide un contacto que el producto no deja configurar, y terminar su prueba manual ([#290](https://github.com/gianelo/rentoru/issues/290)).
Base `c4b0266`. Una tarea por PR ≤400 líneas a `dev`; aceptación del fundador en navegador antes de cada push que cambie pantalla. Acceso: sólo cuentas con `user.bulk_import_enabled = true`.

## Specs

- S1 ([comentario](https://github.com/gianelo/rentoru/issues/290#issuecomment-6459784880)): «la distribución yo la veo bien no sé si podemos mejorar algo tanto en… tablet como en la de Desktop».
- S2: «hay que validar ver que la plantilla de CSv sea la correcta con los campos específicos de publicación hay que validar eso no le no lo pude validar».
- S3: «cuando intento cargar un archivo en error de que no tengo una configuración contacto predeterminado esto es raro ya que no hay una opción de configurar contacto predeterminado… si lo agregamos en el mismo Excel o creamos la función para poder agregar… una forma de contactar predeterminada en la cuenta».
- S4: «no pude probar nada más porque no me deja cargar el archivo por el problema del contacto… luego… seguimos con las pruebas de esta parte del importar». Pendientes del issue: el formato explicado, el error por fila y motivo, la vista previa antes de crear y que lo importado aparezca en Mis avisos.

## Hechos verificados en `c4b0266`

- El error: `ImportMissingAccountContactError` (`src/modules/broker-bulk-import/application/run-import-validation.ts:26–31`, lanzado en `:80`) cuando la cuenta no tiene `user.contact_method` y `user.contact_value` (`schema.ts:73–74`). La API lo devuelve como `cuenta-sin-contacto` (`app/api/bulk-import/route.ts:106`).
- **Nada en el producto escribe esas columnas**: sólo las lee `drizzle-import-account-contact.ts:20`; no hay pantalla de cuenta. El mensaje pide algo que el producto no ofrece.
- Plantilla: una sola lista (`csv-import-columns.ts:61–77`) alimenta el lector y la plantilla (`app/importar/plantilla/route.ts`). Obligatorias: `referencia_externa, titulo, descripcion, precio_usd, ciudad, zona`; opcionales: tipo, habitaciones, baños, metros, estacionamientos y las cinco características. Fuera a propósito: el contacto (sale de la cuenta), `publisher_type` y las fotos (se agregan después en Mis avisos).
- Errores: rechazos de archivo entero (`route.ts:98–107`) y errores por fila en la vista previa como «Fila N · ref» con su motivo (`VistaPrevia.tsx:67–69`, `import-copy.ts:158`).

## Tareas

- [ ] **45.1 Decidir de dónde sale el contacto** (G1): una forma de configurar el contacto predeterminado en la cuenta, o columnas de contacto en el CSV. Validarlo contra los mismos formatos de contacto de publicar (36.14).
- [ ] **45.2 Implementar lo decidido**, con prueba de integración que deje de lanzar `cuenta-sin-contacto` cuando el contacto existe, y que siga rechazando cuando no.
- [ ] **45.3 Plantilla = campos de publicar.** Prueba que compara la plantilla con los campos que exige publicar y documenta cada diferencia intencional (contacto, tipo de publicador, fotos).
- [ ] **45.4 Completar la prueba manual pendiente**: formato explicado, error por fila y motivo, vista previa antes de crear y avisos importados visibles en Mis avisos (fase 43).
- [ ] **45.5 Aceptación integrada** en los tres anchos (S1: revisar tablet y escritorio).

## Gates

| Gate | Decisión del fundador | Bloquea |
| --- | --- | --- |
| G1 | Contacto en la cuenta o en el CSV | 45.2 en adelante |

## Log

- L1 (2026-10-28): issue [#290](https://github.com/gianelo/rentoru/issues/290), comentario de importar citado en S1–S4.
- L2: numeración del fundador: «42 entrada, 43 Mis avisos, 44 Editar Avisos y 45 Importar Cartera».
