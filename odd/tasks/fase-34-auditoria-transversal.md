# Fase 34 — auditoría transversal de medidas

**Estado:** pendiente, separada de la aceptación funcional de F31 por decisión del fundador. Origen: comentario `5873505887` de [#288](https://github.com/gianelo/rentoru/issues/288). La ficha ya tiene pruebas a varias medidas, pero eso **no demuestra** que el resto de las pantallas haya sido auditado.

- [ ] **34.1 Inventariar y medir las superficies restantes.** Definir qué pantallas entran y comprobar cada una a 390×844, 768×1024 y 1440×900 (más 440×956 donde corresponda): contenido centrado, sin solapes ni scroll horizontal, acciones alcanzables y cierre/foco de paneles. Registrar pantalla, resultado, reproducción y evidencia, diferenciando fallos existentes de cambios nuevos. Derivar cualquier ajuste visual del sistema de diseño antes de implementarlo, con RED/GREEN, mutación y prueba del HTML servido.

**Fuera de alcance:** no reabrir la ficha ya aceptada como si la auditoría global se hubiera hecho, no ratificar legales (F33), no promover a `main` automáticamente. Pendiente hasta observación real; ningún check de CI de F31 lo sustituye.
