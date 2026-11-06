# Fallos: dónde verlos y cómo encontrar el de un cliente

Tarea 13.1. Cada fallo del servidor deja **dos rastros con el mismo código**:

| Dónde | Cuánto dura | Para qué |
|---|---|---|
| Vercel → Logs | 1 día (plan Pro) | Mirar en vivo lo que acaba de pasar |
| Sentry | 30 días (plan gratis) | Te avisa por correo y te deja buscar la queja de la semana pasada |

Lo que viaja a los dos es el mismo reporte cerrado de
`src/modules/operability/domain/failure-report.ts`: frontera, **patrón** de ruta
(`/renovar/[token]`, nunca la URL con el token), el código del fallo y la causa
sin correos ni teléfonos. No viajan encabezados, cookies, pila ni URL. No hay SDK
de Sentry: el envío está en `src/modules/operability/infrastructure/sentry-envelope.ts`.

## Configurarlo una vez

1. Crea una cuenta en sentry.io (plan **Developer**, gratis) y un proyecto de
   plataforma **Node.js**. No hace falta el asistente ni instalar nada.
2. En *Project Settings → Client Keys (DSN)* copia el DSN
   (`https://<llave>@<host>/<número>`).
3. En Vercel → *Settings → Environment Variables*, agrega `SENTRY_DSN` en
   **Production** y **Preview**, marcada como **Sensitive**: no llega a ningún
   navegador, y con ella cualquiera podría gastar tu cuota de 5.000 errores al mes.
   Después, redespliega.
4. En *Alerts*, confirma que exista la regla «a new issue is created» con aviso
   por correo (Sentry la crea por defecto en los proyectos nuevos).

Si el DSN falta o está mal formado, no se manda nada y la línea de Vercel sigue.
Si Sentry no responde, la visita no se entera: queda una línea
`"event":"sentry-unreachable"` en Vercel con el código HTTP y sin la llave.

## Cuando un cliente se queja

- **Si te manda el «Código del fallo» de la pantalla:** en Sentry → *Issues*,
  busca `digest:<código>`. Si pasó hace menos de un día, también aparece en
  Vercel → Logs buscando el código.
- **Si no hay código:** en Sentry, filtra por `route:` y por el entorno
  (`production` o `preview`), y ubícate por la hora.

## Qué todavía no se ve

- Los fallos **manejados**, los que no rompen la página: el correo del enlace
  mágico que no salió, el formulario de contacto, la foto que devolvió 503 y el
  barrido de borradores. Es el corte B de la 13.1, y le agrega el id de la cuenta
  y una huella del correo para encontrar a la persona.
- Los errores del **navegador**. Quedaron fuera por decisión (2026-11-05): el SDK
  de navegador se come el margen del presupuesto de JS.
- La caída total del sitio la cubre otro mecanismo, `scripts/heartbeat.ts`, en
  GitHub Actions.
