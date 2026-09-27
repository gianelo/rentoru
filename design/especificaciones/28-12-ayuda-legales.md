# 28.12 · Ayuda y legales — propuesta para aprobación

[Ver los tres arquetipos](../alternativas/28-12-ayuda-legales.html). Es un tablero independiente, no una modificación de las rutas. El selector CSS funciona sin JavaScript; el formulario del tablero ilustra la estructura, **no envía mensajes reales**.

## Derivación

No existe lámina específica para estas páginas. `design/reference/sistema/SISTEMA.md` exige Compacto + Menta para superficies no dibujadas. La propuesta importa `src/styles/tokens.css`, las hojas de producción de `SearchPill` y `Nav`, y la utilidad de accesibilidad. Conserva el ancho compartido de FormShell (600 px), controles de al menos 44 px, SearchPill móvil y dock A anónimo debajo de 768 px. La anatomía común agrega una categoría discreta, título y divisores entre secciones; sólo hay entrada cuando el cuerpo servido ya la tiene. El H1 propone el papel compartido de título de página (`--title-fs`, `--title-fw`, `--title-lh`), no el título de aviso de ficha: así se distingue de las preguntas H2 sin inventar valores. Es una **propuesta visual para aprobación del fundador**, no un cambio a CSS de producción. El texto real sigue siendo la autoridad. El aviso de borrador permanece inmediatamente debajo del título legal, antes de cualquier afirmación. No se agregan colores, fuentes, sombras ni iconos nuevos.

- **Ayuda — artículos:** `/ayuda/preguntas-frecuentes`, `/ayuda/como-contactar-al-dueno`, `/ayuda/como-publicar-un-aviso` y `/ayuda/como-reportar-un-aviso`. Categoría → título → encabezados y párrafos separados por ritmo y regla. La FAQ usa preguntas como encabezados, sin introducción inventada; las guías conservan sus listas y enlaces.
- **Ayuda — contacto:** `/ayuda/escribinos`. Categoría → título → texto introductorio existente → formulario con campos `name`, `email`, `message` y botón. El estado enviado reemplaza el formulario; el error conserva formulario y mensaje. El campo antispam sigue oculto.
- **Legal:** `/legal/terminos`, `/legal/privacidad`, `/legal/cookies`, `/legal/datos` y `/legal/normas`. Categoría → título → `DraftNotice` íntegro → párrafos y secciones con divisores. Enlaces y listas permanecen donde están.

El frame de esta propuesta **omite SiteFooter** para comparar la lectura y el dock dentro del viewport. El SiteFooter y sus enlaces de producción no cambian; su tablero anterior es una revisión separada.

## Anchos y lectura

- **390 × 840:** búsqueda GET con la estructura y SVG de SearchPill arriba, 60 px; contenido con margen 16 px y separación inferior para dock A flotante de 64 px. El tablero reproduce las formas y etiquetas anónimas del Nav servido, sin modificarlo.
- **768 × 1024:** Nav superior completo, sin dock; columna de lectura de 600 px y objetivos de 44 px incluso en tablet.
- **1440 × 900:** misma columna de lectura de 600 px centrada, sin estirar párrafos; Nav superior completo. Texto de cuerpo toma los tamaños de ficha de escritorio.

## Límites y decisiones pendientes

No reescribir copias, políticas, promesas legales ni estados; no añadir lecturas de sesión a layouts estáticos, dependencias de JS, ni cambios de producción. FAQ empieza con su primera pregunta, sin convertir metadata en texto de cuerpo. Los ejemplos de estados de contacto son simultáneos **sólo en el tablero** para revisar su tratamiento; en producción son mutuamente excluyentes. El tablero usa el marcado estático correspondiente a SearchPill/Nav, con su SVG de lupa y sus destinos GET; al implementarlo se reutilizan los componentes reales.

**Para aprobar:** ¿Sirve esta jerarquía editorial de categoría y secciones con regla para los tres roles? El aviso legal conserva borde sin tinte de selección. ¿Es suficiente el ancho de 600 px en tablet y desktop para lectura prolongada? No se solicita aprobar ningún cambio de texto ni de comportamiento.
