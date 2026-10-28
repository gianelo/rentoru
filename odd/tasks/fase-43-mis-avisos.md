# Fase 43 — Mis avisos

Rediseñar `/mis-avisos` y darle las acciones que le faltan ([#290](https://github.com/gianelo/rentoru/issues/290)): estado vacío, portadas, borradores, renovar, ocultar o eliminar, y la cabecera de cuenta.
Base `c4b0266`. Una tarea por PR ≤400 líneas a `dev`; aceptación del fundador en navegador antes de cada push que cambie pantalla. El fondo de la página es de la fase 41.

## Specs

- S1 ([vacío](https://github.com/gianelo/rentoru/issues/290#issuecomment-6459087057)): «La pantalla de mis avisos está completamente fea… cuando en mis avisos no tienes absolutamente nada… debería de salir la pantalla de publicar aviso OK o hacer una pantalla específicamente cuando no tienes ningún aviso esto tenemos que decidirlo».
- S2 ([con avisos](https://github.com/gianelo/rentoru/issues/290#issuecomment-6459171079)): «hay que diseñar completamente esta pantalla está muy cargada»; «las imágenes… no se cargan… queda una imagen ahí como vacía»; «El responsive es importante»; «El filtro funciona»; «mis avisos el total cero no se ven todavía… cerrar sesión también está ahí como atravesado»; «sale el botón del nombre… y sale mis avisos yo creo que eso deberíamos quitarlo porque… dentro está la opción de mis avisos».
- S3 ([borradores](https://github.com/gianelo/rentoru/issues/290#issuecomment-6459348279)): «Creo que el filtro borrador dentro de mis avisos desaparecer porque sólo podemos tener un borrador en publicar… al menos que ese filtro sea cuando se cargan avisos de forma masiva… hay que definir eso bien».
- S4 ([ocultar o eliminar](https://github.com/gianelo/rentoru/issues/290#issuecomment-6459379629)): «Desde la acción mis avisos tenemos que poder eliminar avisos o ocultar avisos».
- S5 ([renovar](https://github.com/gianelo/rentoru/issues/290#issuecomment-6459457513)): «un aviso vencido… no es la opción de renovarlo o de republicarlo… debemos crearla».

## Hechos verificados en `c4b0266`

- Vacío: `app/mis-avisos/page.tsx:157–161` dibuja un solo párrafo, sin acción; la línea de resumen y «Cerrar sesión» siguen arriba.
- Portadas: el tablero no dibuja ninguna imagen (`page.tsx:252`, `<div className={styles.miniatura}>`); el puerto sólo trae `photoCount` (`publisher-listing-board.ts:52–66`, `drizzle-publisher-listings.ts:35–55`).
- Borradores: el tablero lee sólo la tabla `listing` (`drizzle-publisher-listings.ts:49–55`); «Borradores» son las filas `status = 'draft'` de la importación. El borrador de publicar (`publish_draft`) nunca aparece.
- Ocultar o eliminar: no existe ninguna acción del dueño; el único `hidden` llega por reportes.
- Renovar: sólo con el enlace del correo (`app/renovar/[token]/route.ts`). Ya está planificado como **9.31** (abierta), con la tabla de decisiones del fundador. Además `renovar/route.ts:70` promete «Entra a tu cuenta para volver a publicar el aviso», un botón que no existe.
- Resumen: `page.tsx:123` dibuja «0 en total · 0 no se ven todavía» aun sin avisos. «Cerrar sesión» es un formulario suelto (`page.tsx:151`, decisión 28.11).
- Cabecera: el disparador de `AccountMenu` es un enlace «Mis avisos» más el avatar (`components/organisms/Nav.tsx:119–127`), y el menú repite «Mis avisos» (`nav-account.ts:151`).

## Tareas

- [ ] **43.1 Lámina de Mis avisos.** Con avisos, sin avisos (decisión de S1) y los estados de cada tarjeta, a 390/768/1440. Gate G1.
- [ ] **43.2 Portadas.** El puerto devuelve la miniatura de portada y la tarjeta la dibuja como la de resultados; sin foto, el aviso dice que le falta.
- [ ] **43.3 Qué es un borrador.** Decidir (G2) si el borrador de publicar aparece en Mis avisos y si el filtro «Borradores» queda sólo para la importación; implementar lo decidido.
- [ ] **43.4 Renovar y volver a publicar.** Implementar la **9.31** con sesión, no con token, y alinear el texto de `renovar/route.ts:70`.
- [ ] **43.5 Ocultar o eliminar un aviso propio.** Definir con el fundador (G3) qué significa cada acción, distinguiendo el oculto por el dueño del oculto por reportes, y coordinarlo con la conservación de datos de la fase 39.
- [ ] **43.6 Cabecera y cierre de sesión.** Quitar el «Mis avisos» duplicado del disparador y llevar «Cerrar sesión» al menú, en todas las pantallas; coordinar con 28.6.
- [ ] **43.7 Aceptación integrada** en los tres anchos, con y sin JavaScript.

## Gates

| Gate | Decisión del fundador | Bloquea |
| --- | --- | --- |
| G1 | Lámina con y sin avisos | 43.2 en adelante |
| G2 | Borrador de publicar en Mis avisos, y alcance del filtro | 43.3 |
| G3 | Semántica de ocultar y eliminar | 43.5 |

## Log

- L1 (2026-10-28): issue [#290](https://github.com/gianelo/rentoru/issues/290), comentarios de Mis avisos citados en S1–S5.
- L2: numeración del fundador: «42 entrada, 43 Mis avisos, 44 Editar Avisos y 45 Importar Cartera».
