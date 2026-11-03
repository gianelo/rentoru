# Brief: Editar aviso (fase 44, tarea 44.1, gate G1)

Read first: `design/system.md` (tokens and component rules; use ONLY those values) and `odd/tasks/fase-44-editar-aviso.md` until `## Log` (S1–S6 are the founder's words).

## Goal

Redesign `/mis-avisos/[id]/editar` so it feels like the publish flow the founder likes (S1: «mira el flujo muy hermoso que tenemos en la parte de publicar»), on ONE screen that edits an already published listing. The artboard is a design direction, not production code.

## Audience and content (real, no lorem ipsum)

A Caracas owner editing their active listing. Use this listing:

- Title: «Apartamento amoblado en La Castellana» (title max 90 chars)
- Description: 3 real sentences about a 3-room apartment, high floor, equipped kitchen, 24 h security, near Altamira metro (min 120, max 1 200 chars)
- Price: 610 (USD per month, integer only)
- Habitaciones 3 · Baños 2 · Puestos de auto 1 (zero allowed) · Metros cuadrados 128
- Tipo de propiedad: Apartamento / Casa / Anexo / Habitación (radio cards; Apartamento selected)
- Referencia (optional): «Frente a la panadería La Castellana»
- Lo que tiene la propiedad (checkbox rows): Planta eléctrica (checked), Agua regular, Amoblado (checked), Vigilancia 24 h (checked), Línea blanca
- Cómo te contactan: WhatsApp / Teléfono / Correo (radio; WhatsApp selected) + Tu dato de contacto «0412 123 4567»
- Quién publica: Dueño (selected) / Inmobiliaria, with the one-way notice «Un dueño puede pasar a inmobiliaria; una inmobiliaria no vuelve a dueño.»
- Zona y ciudad are NOT editable: show «Altamira · Caracas» as read-only text with a hint that they belong to the listing's address.
- Photos: 3 of max 6. Photo 1 is «portada». Names: «Foto 1 (portada)», «Foto 2», «Foto 3». Draw thumbnails as hatched placeholders using the `--thumb` token, 4:3.
- Buttons: «Guardar cambios» (level 1 Acción) and «Cancelar» (level 3 Neutro) → back to «← Mis avisos».

## States that MUST be drawn (each direction, at least at 390 and 1440)

1. **Default** (everything filled, no errors).
2. **Rejected save** (S4/S5): description shortened to 27 chars shows the error BELOW the field: «✱ Mínimo 120 caracteres. Vas 27.»; Baños empty shows «✱ obligatorio. ¿Cuántos baños tiene?». RULE (founder, 2026-11-02, supersedes the 2026-11-01 «arriba»): errors go BELOW the control, everywhere: label → control → error → help/counter. Numeric rows in error stay rows (label left, 120 px control with 2 px `--err` border right) and the message sits directly under the row, spanning its width.
3. **Photo marked for removal** (S2, 44.4): Foto 2 marked «Se quitará al guardar» with an «Deshacer» action, dimmed but still visible; a notice near Guardar: «Recuerda: la foto marcada se eliminará al guardar.» Nothing is deleted until save.
4. **Saving** (S2): the Guardar button in a waiting state (disabled look + text «Guardando…»), no spinner image: text and the `--loading-duration` idea only. Respect `prefers-reduced-motion`.
5. **Cover and order** (S6, 44.5): each photo has «Hacer portada», «Subir» / «Bajar» as text actions (glyphs `↑` `↓` allowed; no icons). Cover is marked «Portada» with the level-2 selection style.
6. **Live validation** (S3, 44.6): under title and description a counter line «Vas 27 · mínimo 120» in `--meta` using `.counterLine`; deficit in `--warn`.

## Viewports

Draw the same screen three times inside the artboard, side by side or stacked, labelled: **390 px** (mobile), **768 px** (tablet) and **1440 px** (desktop, container 1100, form column 520 like publish). The artboard itself is 1440 wide; use fixed-width frames for the 390 and 768 views (overflow hidden, real CSS pixels).

## Hard rules

- One self-contained HTML file: inline CSS, no JS needed (a few lines for theme toggle are fine), no external URLs, fonts, images or scripts. System font stack only (`--sans`, `--mono` from system.md).
- Copy the token block from `design/system.html` (`:root`, `.t-menta`, `.t-oscuro`) verbatim; add a theme toggle so the founder can see **menta and oscuro**.
- Use the component rules from system.md: field anatomy (error → label → control → help), `.numbers` rows, choice cards, three-button hierarchy, page `--page`, footer `--footer-bg` stuck to the bottom, nav bar on top («Rentoru» wordmark + «Mis avisos»).
- Glyphs are text characters; no icon package; no new SVGs.
- Accessible: semantic landmarks, labels tied to controls, `aria-invalid` + `aria-describedby` on errors, WCAG AA contrast, visible focus styles.
- Spanish UI copy, neutral, «tú» forms (never voseo). Code comments in English.
- Do not touch any other file in the repository.
