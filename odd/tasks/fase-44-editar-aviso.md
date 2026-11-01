# Fase 44 — Editar un aviso

Rediseñar `/mis-avisos/[id]/editar` a la altura del flujo de publicar y corregir los problemas de datos que encontró el fundador ([#290](https://github.com/gianelo/rentoru/issues/290)): fotos que se borran sin guardar, cambios que se pierden al fallar y un precio vacío que se ignora en silencio.
Base `c4b0266`. Una tarea por PR ≤400 líneas a `dev`; aceptación del fundador en navegador antes de cada push que cambie pantalla.

## Specs

- S1 ([comentario](https://github.com/gianelo/rentoru/issues/290#issuecomment-6459317452)): «no hay un responses bien hecho hay que rediseñar completamente esta esta pantalla… mira el flujo muy hermoso que tenemos en la parte de publicar».
- S2: «Al darle para quitar una foto… no hay un load en un Spinner… si yo no he guardado los cambios todavía las fotos se eliminan no puedo recuperarla… al momento que se guarden los cambios es que se guarda ese quitar foto con un aviso de qué diga recuerda que esa foto serán eliminadas».
- S3: «cualquier input que está dentro de acá debería ser dinámico ir avisando porque falta texto para poder completar el campo».
- S4: «el campo que falló fue el descripción… le di a guardar aviso y ahí se reinició todo» (precio, habitaciones y metros cuadrados volvieron a los valores anteriores).
- S5: «quise guardar el aviso con precios cero… hizo como si se guardara pero no se guardó… debería de avisarle pues es que tiene que colocar un precio ya que es un campo obligatorio».
- S6 ([comentario](https://github.com/gianelo/rentoru/issues/290#issuecomment-6459365811)): «no me deja cambiar cuál es la portada y esas cosas esa función le deja acá en el editar no están».

## Hechos verificados en `c4b0266`

- Quitar foto es inmediato y destructivo: cada foto tiene su formulario (`app/mis-avisos/[id]/editar/page.tsx:363`) y `quitarFotoDelAviso` (`app/mis-avisos/actions.ts:208`) la desprende al instante, borrando también sus derivadas en R2; el texto lo dice (`page.tsx:284`). No hay confirmación ni estado de espera.
- Los cambios se pierden al fallar: `guardarEdicion` (`actions.ts:375`) redirige con códigos de motivo, nunca con los valores (`:398`, `:417`), y la página vuelve a pintar todo desde la base (`defaultValue` en `page.tsx:408–635`).
- Precio vacío: se ignora y se conserva el anterior (`listing-edit.ts:209`), y la edición «sale bien» sin avisar. Precio 0: falla la validación (`publishable-listing.ts:281–282`) y, por el punto anterior, arrastra la pérdida del resto.
- Portada y orden: editar sólo permite quitar y agregar; la portada es siempre la posición 0 (`page.tsx:358`). Publicar sí tiene mover, portada y arrastre (`draft-photo-actions.ts:101–147`).
- Validación viva: editar usa `<input>`/`<textarea>` simples; no reutiliza `PublicationTitleField` ni `PublicationDescriptionField` (36.8, 36.9).

## Tareas

- [ ] **44.1 Lámina de editar**, derivada del flujo de publicar, a 390/768/1440. Gate G1.
- [x] **44.2a Formulario en su propio componente.** Hecho: el `<form>` de guardar y sus ayudantes (`mensaje`, `invalido`, `claseControl`, `etiqueta`, `publisherTypes`) viven en `app/mis-avisos/[id]/editar/EditarForm.tsx` (`"use client"`); recibe `aviso`, `motivos` y `medidas` como datos planos y calcula `placeListingEditViolations` adentro, porque un `Map` no cruza el borde de servidor a cliente. `page.tsx` conserva fotos, `SubirFoto`, los formularios de quitar y el bloque de negativas sin campo. Evidencia: volcado del HTML servido antes/después en dos casos (sin negativas, y con `description.tooShort,priceUsd.required&largoDescripcion=24`) idéntico byte a byte (10273 y 10619 bytes); `pnpm vitest run app/mis-avisos` 95/95; `typecheck`, `biome` y `lint:tokens` en verde; build de producción en verde. Corrección: la prueba que leía el fuente de `page.tsx` («el formulario envía a la acción de servidor, nunca a un manejador de cliente») ahora lee `EditarForm.tsx` y prohíbe `onSubmit` en vez de `"use client"`, porque lo prohibido es un manejador que intercepte el envío y la directiva es el objetivo de G2; mutación `onSubmit={undefined}` la pone roja a ella sola. Sin cambio de pantalla: no requiere aceptación en navegador. Excepción al límite de 400 líneas concedida por el fundador al elegir G2 (L3): 685 líneas, movimiento mecánico. Verificado localmente; publicado en el PR #494 (pendiente de merge).
  - Texto original: Mover el `<form>` de guardar y sus ayudantes de `page.tsx` a `EditarForm.tsx` (componente cliente) sin cambiar un byte del HTML servido. Es el terreno de 44.2, 44.4 (espera) y 44.6 (validación viva).
- [ ] **44.2 No perder lo escrito.** Ante un rechazo, la página vuelve a mostrar los valores enviados con el error junto a su campo, sin depender de JavaScript. Decidido (G2): la acción devuelve valores y errores por `useActionState`, que React dibuja antes de hidratar; la descripción no viaja por la URL (18.19).
- [ ] **44.3 Precio obligatorio.** Un precio vacío es un error visible, no un «sin cambios» silencioso.
- [ ] **44.4 Quitar fotos al guardar.** Las fotos marcadas se quitan recién al guardar, con aviso de que se eliminarán y estado de espera; si falla el guardado, no se borra nada. Alto riesgo: borra objetos en R2, va con verificación independiente.
- [ ] **44.5 Portada y orden en editar**, reutilizando las acciones de fotos de publicar.
- [ ] **44.6 Validación viva** con los mismos campos de título y descripción que publicar.
- [ ] **44.7 Aceptación integrada** en los tres anchos, con y sin JavaScript.

## Gates

| Gate | Decisión del fundador | Bloquea |
| --- | --- | --- |
| G1 | Lámina de editar | 44.2 en adelante (las correcciones de datos 44.2–44.4 pueden ir antes si el fundador lo prefiere) |
| G2 | Cómo vuelve lo escrito al fallar — **decidido (2026-11-01): formulario con estado (`useActionState`), en dos PR: 44.2a mueve el formulario a su componente con excepción de tamaño; 44.2 devuelve valores y errores.** Descartado: devolver todo menos la descripción por la URL | 44.2 |

## Log

- L1 (2026-10-28): issue [#290](https://github.com/gianelo/rentoru/issues/290), comentarios de editar citados en S1–S6.
- L2: numeración del fundador: «42 entrada, 43 Mis avisos, 44 Editar Avisos y 45 Importar Cartera».
- L3 (2026-11-01): «dale hagamoslo vamos con la fase 44». Ante las dos rutas para devolver lo escrito, eligió «A. Formulario con estado», que incluía la excepción de tamaño para el PR del movimiento. Orden acordado: 44.2, 44.3 y 44.4 antes de la lámina.
