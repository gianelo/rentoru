# Fase 42 — Entrar

Corregir lo que el fundador encontró en la prueba manual de entrar ([#290](https://github.com/gianelo/rentoru/issues/290)): el enlace mágico llega tres veces, el contador de reenvío no avanza, la cabecera cambia de lado según el ancho y falta un captcha.
Base `c4b0266`. Una tarea por PR ≤400 líneas a `dev`; aceptación del fundador en navegador antes de cada push que cambie pantalla. El fondo de estas pantallas es de la fase 41.

## Specs

- S1 ([comentario](https://github.com/gianelo/rentoru/issues/290#issuecomment-6459017691)): «me llegaron en el Magic Link cuando lo pedí sólo una vez me llegó el correo tres veces a la misma hora y el mismo momento esto está mal hay que arreglarlo».
- S2 ([comentario](https://github.com/gianelo/rentoru/issues/290#issuecomment-6459002370)): «el timer para volver a enviar el e-mail está en un minuto pero no corras ese minuto o sea se queda un minuto solo o sea tú tienes que ser dinámico».
- S3 ([390](https://github.com/gianelo/rentoru/issues/290#issuecomment-6458913124), [768](https://github.com/gianelo/rentoru/issues/290#issuecomment-6458928339), [1440](https://github.com/gianelo/rentoru/issues/290#issuecomment-6458941276)): «volver a los avisos a la izquierda como lo tenemos y rentó completamente a la derecha»; en tablet y escritorio «no está centrado la parte de entrar» y «deberíamos de cumplir con lo mismo que tenemos en Mobile»; en la espera, «dejamos cambiar correo a la izquierda».
- S4 ([comentario](https://github.com/gianelo/rentoru/issues/290#issuecomment-6458913124)): «deberíamos de colocar es el capchat de cloudflare para darle un poquito más de seguridad».

## Hechos verificados en `c4b0266`

- Un solo camino de envío: `sendVerificationRequest` (`src/modules/identity/infrastructure/email-provider.ts:66`) envía una vez; `ResendMailer.send` no reintenta. Un solo proveedor de correo (`auth.ts:32–38`).
- La única protección es la cookie del ticket: sin ticket, `magic-link-request.ts:218` devuelve siempre «enviar»; la cookie se escribe **después** del envío (`app/(auth)/signin/actions.ts:124`). No hay límite por buzón en el servidor, y el botón no se deshabilita mientras el POST está en curso (`components/atoms/buttons.tsx`, sin `useFormStatus`).
- El contador es texto estático de servidor (`revisa-tu-correo/page.tsx:62` y `:122`), a propósito: las tareas 15.9 y 15.12 lo cerraron «sin una línea de cliente». Hacerlo avanzar revierte esa decisión.
- `DoorBar` (`app/(auth)/signin/DoorBar.tsx`, `signin.module.css:15–38` y `:217–228`): a 390 px «Volver» a la izquierda y la marca al centro; desde 768 px la marca a la izquierda y «Volver» a la derecha.
- No hay captcha (`turnstile`, `captcha`, `cloudflare`: sin resultados en `src`, `app` y `components`).

## Tareas

- [ ] **42.1 Diagnosticar el envío triple.** Reproducir en dev y distinguir con evidencia, no con suposiciones: varios envíos del mismo formulario, varias pestañas o un reintento del SDK (IDs de petición en los logs y en el panel de Resend). Sin corrección hasta tener la causa.
- [ ] **42.2 Un solo correo por pedido.** Corregir la causa confirmada y agregar un límite por buzón en el servidor que falle cerrado, más el botón deshabilitado mientras envía (mejora progresiva sobre el formulario nativo). Prueba de integración del límite.
- [ ] **42.3 Contador vivo.** Mejora progresiva: sin JavaScript queda el texto actual; con JavaScript cuenta hacia atrás y muestra el reenvío al llegar a cero. Gate G1.
- [ ] **42.4 Cabecera y puerta.** «Volver»/«Cambiar de correo» a la izquierda y «Rentoru» a la derecha en los tres anchos; la puerta centrada en tablet y escritorio. Lámina derivada del sistema antes de implementar (G2).
- [ ] **42.5 Captcha.** Investigar Cloudflare Turnstile para el pedido de enlace: claves y variables, privacidad, qué pasa sin JavaScript y si falla cerrado. Gate G3 antes de implementar.
- [ ] **42.6 Aceptación integrada** en los tres anchos, con y sin JavaScript.

## Gates

| Gate | Decisión del fundador | Bloquea |
| --- | --- | --- |
| G1 | Revertir la decisión 15.9/15.12 de un contador sin cliente | 42.3 |
| G2 | Lámina de la cabecera y la puerta | 42.4 |
| G3 | Captcha sí o no, y con qué proveedor, tras la investigación | 42.5 |

## Log

- L1 (2026-10-28): issue [#290](https://github.com/gianelo/rentoru/issues/290), comentarios de entrar citados en S1–S4.
- L2: «Sí hay que agregar otra fase para para la parte de entrada. Seira 42 entrada, 43 Mis avisos, 44 Editar Avisos y 45 Importar Cartera».
