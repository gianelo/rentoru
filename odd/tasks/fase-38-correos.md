# Fase 38 — Rediseño de los correos

Dar a los correos de Rentoru un diseño derivado del sistema, en lugar del HTML mínimo actual. La 35.10 sólo cambió sus textos; esta fase cambia su forma, sin tocar lo que dicen.
Base `a5575a1`; una tarea por PR ≤400 líneas a `dev`, en orden, con TDD sobre el HTML final compuesto (no sobre espías del proveedor) y aceptación del fundador antes de cada push que cambie un correo.

## Specs

- S1: Pedido del fundador: «aca son los emaisl que se envian aca debemos crear otra fase tambien 38 porque necesitamos rediseñar todos esos emails que tenemos creo. hay que validar eso aca solo cambiamos los texots.»
- S2: Cada correo sigue saliendo con `text` y `html`, y el `text` es la fuente de verdad legible sin HTML. **Corregida por L5**: los textos de 35.10 se acortan y se hacen más amables —«no texto tan largos mas cortos que sea entendible recuerda que pueden leerlos personas mayores», «nada de mucho tecnisimos»—; la lámina los propone y 38.3/38.4 llevan el mismo texto al dominio y al texto plano, con sus pruebas. El enlace de respaldo se escribe entero, nunca recortado: «la gente solo selecciona y copia».
- S4 (L6): sólo la versión clara; no se diseña tema oscuro para el correo.
- S3: Sin pantallas inventadas: el correo es una de las 16 superficies que AGENTS.md §2 manda derivar del sistema (mismos valores, misma jerarquía de botones), con una lámina aprobada antes de implementar.

## Hechos verificados en `a5575a1`

- Cinco correos. Al usuario: enlace para entrar (`identity`), aviso por vencer y purga de fotos (`listing-lifecycle`). Internos al operador: contacto del sitio (`site-contact`) y latido de la base (`operability`).
- El HTML lo arma una función copiada cuatro veces, idéntica salvo el nombre: `renderAuthMailHtml` (`identity/infrastructure/resend-mailer.ts:66`), `renderLifecycleHtml` (`listing-lifecycle/infrastructure/resend-lifecycle-mailer.ts:57`), `renderContactHtml` (`site-contact/infrastructure/resend-contact-mailer.ts:56`) y `renderHeartbeatHtml` (`operability/infrastructure/resend-heartbeat-mailer.ts:49`). Cada una parte el texto en párrafos, escapa el HTML y lo envuelve en un `<div>` con estilo en línea.
- Ese estilo usa `color:#101010`, que no es ningún valor del sistema: `--ink` es `#1e2022` (`src/styles/tokens.css:613`).
- Los enlaces salen como texto plano dentro del párrafo: no hay botón ni enlace con texto propio.
- Remitentes por variable de entorno: `AUTH_MAIL_FROM` (enlace y contacto), `LIFECYCLE_MAIL_FROM` y `HEARTBEAT_MAIL_FROM`; todos fallan cerrados si faltan.
- Los clientes de correo no entienden variables CSS (`var(--ink)`): los valores del sistema tienen que llegar resueltos, en estilos en línea.

## Tareas

- [x] **38.1 Lámina de correo.** Derivada de `SISTEMA.md`: cabecera con la marca, cuerpo, una acción primaria por correo (Entrar, Renovar), enlace de respaldo en texto, pie que explica por qué llega el correo. Móvil y escritorio, modo claro y oscuro del cliente. Cubre los tres correos al usuario. Gate G1.
  - v1 escrita: `design/pantallas/Rentoru - Correo-v1.html` y `correo-v1.css`, con los roles de `src/styles/tokens.css` (sin valores nuevos). Seis marcos: los tres correos a 390 px y 640 px, sólo claro (S4). Anatomía: tarjeta `--surface` con borde `--line` y radio `--r` sobre página blanca, máximo 600 px; cabecera con la palabra «Rentoru» (`--disp`, `--brandbar-h`); título `--title-fs`; **una sola primaria** (`--accent`, `--action-h`); enlace de respaldo en `--meta`; bloque de apoyo `--bg` o, cuando es una fecha límite, `--warn`/`--warn-bg`; pie `--soft`/`--meta-fs` con el porqué del correo.
  - Textos propuestos (S2 corregida): entrar — «Entra a Rentoru», «Toca el botón para entrar. No necesitas contraseña.», botón «Entrar a Rentoru», «O copia este enlace en tu navegador:» + URL entera, bloque «Vale por 15 minutos · Se usa una sola vez.», «¿No pediste entrar? Ignora este correo.»; vence — bloque con título y «Vence el» + fecha, «¿Sigue disponible? Renuévalo y queda 30 días más.», botón «Renovar mi aviso», «Si no lo renuevas, deja de verse en las búsquedas. Puedes activarlo después.»; purga — bloque con título, «Venció el» y «Las fotos se borran el» + fecha, «Renuévalo antes de esa fecha y conservas las fotos.», botón «Renovar mi aviso», «Pasada esa fecha, las fotos no se pueden recuperar.». Pie: «Te escribimos porque…» y «Rentoru · alquileres en Distrito Capital y Maracaibo».
  - Medido en Chromium: sin desborde horizontal en ningún marco; tarjeta 356/590 px; botón 46 px de alto, ancho completo en móvil y al contenido en escritorio; acento `#272343`, el de `tokens.css`. Sin app servida: lámina estática. `lint:tokens` PASS. **G1 aprobado** (L7). Publicada en #504 a `dev`; merge pendiente del fundador.
- [ ] **38.2 Un solo renderizador.** Módulo compartido de diseño de correo que reemplaza las cuatro copias; recibe bloques ya decididos por cada dominio (párrafo, acción con `href` y etiqueta) y devuelve HTML con estilos en línea. Valores del sistema en una sola tabla resuelta, con una prueba que la compara contra `tokens.css` para que no se desvíen. Comprobar: escape, enlaces e interpolaciones iguales a hoy en los cinco correos; HTML compuesto exacto; mutación.
- [ ] **38.3 Enlace para entrar.** Botón «Entrar a Rentoru» con el enlace de un solo uso, enlace de respaldo y vigencia de 15 minutos visibles. El texto plano no cambia.
- [ ] **38.4 Avisos de ciclo de vida.** Vencimiento y purga con el título del aviso, la fecha y el botón de renovar; la purga deja claro qué se pierde. El texto plano no cambia.
- [ ] **38.5 Correos internos.** Aplicar la decisión G2 a contacto y latido; en el de contacto, el mensaje del visitante sigue escapado y sin reescribir.
- [ ] **38.6 Prueba en clientes reales.** Envío de los correos rediseñados a la bandeja del fundador desde un entorno autorizado (Gate G3): Gmail web y móvil, Apple Mail y Outlook, claro y oscuro; peso por debajo del recorte de Gmail (~102 KB). Cierre en este documento, `tasks.md` y Engram.

## Gates

| Gate | Decisión del fundador | Bloquea |
| --- | --- | --- |
| G1 | Aprobar la lámina de correo — **aprobada** (L7, v1 con L5 y L6 aplicados) | 38.2 en adelante |
| G2 | Correos internos: mismo diseño que los del usuario o versión sobria sin marca | 38.5 |
| G3 | Desde qué entorno y a qué bandeja se envían las pruebas reales | 38.6 |

## Log

- L1 (2026-10-23), durante la 35.10: «aca son los emaisl que se envian aca debemos crear otra fase tambien 38 porque necesitamos rediseñar todos esos emails que tenemos creo. hay que validar eso aca solo cambiamos los texots.»
- L2: «si pero vamos a generarla de una vez la fase 38 para terla guardad.»
- L3: la 35.10 (#444) deja los textos en tuteo; esta fase parte de esos textos y no los reescribe.
- L4 (2026-11-02): «listo vamos entonces con 38.1 primero disenamos y luego montamos.» Worktree `rentoru-phase38-task-38-1`, rama `docs/fase-38-lamina-correo`, base `af40880`.
- L5: «ok yta lo vi el link debe mostrarse todo no ccc.... porque eso avece sla gente solo selecciona y copia no le da click derecho copiar enlace tiene que ser sencillo. tambien una cosa que veo si que los textos estan bien. pero debemos ser un poco mas minimalista osea no texto tan largos mas cortos que sea entendible recuerda que pueden leerlos personas mayores. y tambien deben ser textos amigables nada de mucho tecnisimos que la gente no pueda entender.»
- L6: «y solo la version light la oscura no tiene sentido. solo una»
- L7: aprobación G1 de la v1 corregida: «si ahora si»
