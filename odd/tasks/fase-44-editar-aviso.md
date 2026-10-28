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
- [ ] **44.2 No perder lo escrito.** Ante un rechazo, la página vuelve a mostrar los valores enviados con el error junto a su campo, sin depender de JavaScript.
- [ ] **44.3 Precio obligatorio.** Un precio vacío es un error visible, no un «sin cambios» silencioso.
- [ ] **44.4 Quitar fotos al guardar.** Las fotos marcadas se quitan recién al guardar, con aviso de que se eliminarán y estado de espera; si falla el guardado, no se borra nada. Alto riesgo: borra objetos en R2, va con verificación independiente.
- [ ] **44.5 Portada y orden en editar**, reutilizando las acciones de fotos de publicar.
- [ ] **44.6 Validación viva** con los mismos campos de título y descripción que publicar.
- [ ] **44.7 Aceptación integrada** en los tres anchos, con y sin JavaScript.

## Gates

| Gate | Decisión del fundador | Bloquea |
| --- | --- | --- |
| G1 | Lámina de editar | 44.2 en adelante (las correcciones de datos 44.2–44.4 pueden ir antes si el fundador lo prefiere) |

## Log

- L1 (2026-10-28): issue [#290](https://github.com/gianelo/rentoru/issues/290), comentarios de editar citados en S1–S6.
- L2: numeración del fundador: «42 entrada, 43 Mis avisos, 44 Editar Avisos y 45 Importar Cartera».
