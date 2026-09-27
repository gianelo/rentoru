# 28.12 · Ayuda y legales — diseño aprobado

[Ver las vistas por tamaño y rol](../alternativas/28-12-ayuda-legales-vistas.html). El índice independiente permite elegir Móvil 390 × 840, iPad 768 × 1024 o Escritorio 1440 × 900 y FAQ, Escribinos o Legal sin JavaScript: los enlaces de rol cargan fragmentos del tablero en un iframe con ancho real para activar las media queries importadas de Nav y SearchPill. En el índice, la tira de controles del tablero se oculta y el fragmento elige el artículo aun con el radio FAQ marcado. [Abrir el tablero directamente](../alternativas/28-12-ayuda-legales.html) conserva sus radios CSS y su comportamiento responsive sin fragmento. Ninguna de las dos vistas modifica las rutas; el formulario ilustra la estructura, **no envía mensajes reales**.

## Derivación

No existe lámina específica para estas páginas. `design/reference/sistema/SISTEMA.md` exige Compacto + Menta para superficies no dibujadas. La propuesta importa `src/styles/tokens.css`, las hojas de producción de `SearchPill` y `Nav`, y la utilidad de accesibilidad. Conserva el ancho compartido de FormShell (600 px), controles de al menos 44 px, SearchPill móvil y dock A anónimo debajo de 768 px. La anatomía común agrega una categoría discreta, título y divisores entre secciones; sólo hay entrada cuando el cuerpo servido ya la tiene. El H1 propone el papel compartido de título de página (`--title-fs`, `--title-fw`, `--title-lh`), no el título de aviso de ficha: así se distingue de las preguntas H2 sin inventar valores. El fundador aprobó este tratamiento en las tres medidas canónicas; su anatomía se aplicó a las diez rutas, sin alterar el contenido ni los estados existentes. El texto real sigue siendo la autoridad. El aviso de borrador permanece inmediatamente debajo del título legal, antes de cualquier afirmación. No se agregan colores, fuentes, sombras ni iconos nuevos. Los enlaces dentro del cuerpo de los artículos usan `--accent`, subrayado y desplazamiento de 3 px: la tabla de color de `design/reference/sistema/SISTEMA.md` asigna `--accent` a los enlaces, por encima del `--ink` que usaba antes este tablero. Esto no alcanza los enlaces del Nav ni del SiteFooter.

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

**Aprobado:** la jerarquía de los tres roles y la lectura de 600 px en tablet/escritorio. El aviso legal conserva borde sin tinte de selección. `tests/measure/legal-pages.spec.ts`, `help-pages.spec.ts` y `contact-page.spec.ts` miden el HTML de las diez rutas reales, sin JavaScript, en los tres tamaños; los tests de artículo y contacto protegen orden y estados servidos. La verificación visual de las páginas reales queda registrada aparte. El E2E autenticado/crawlability de T2c sigue pendiente de datos de prueba aislados.
