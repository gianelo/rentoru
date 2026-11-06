import { failureEvent } from "@/modules/operability/domain/failure-event";
import { failureLogLine, failureReport } from "@/modules/operability/domain/failure-report";
import { keepAlive, sendFailureEvent } from "@/modules/operability/infrastructure/sentry-envelope";

/**
 * **Una línea de JSON por fallo, en el único sitio donde caben las tres
 * fronteras** (tarea 11b.4).
 *
 * Next llama `onRequestError` para todo lo que falla del lado del servidor —
 * componentes de servidor, manejadores de ruta y acciones—, con el **mismo
 * digest** que la frontera de error acaba de dibujarle al visitante. Ésa es la
 * juntura: quien nos cita un código nos lleva a una línea.
 *
 * Desde la 13.1 el mismo reporte sale también hacia Sentry, que lo guarda
 * treinta días y avisa por correo; Vercel guarda la línea sólo uno.
 *
 * Vercel captura `stdout`/`stderr`, así que el valor no es escribirlo sino
 * escribirlo en una forma que se pueda buscar y alertar. Qué puede aparecer en
 * esa forma no se decide acá: lo decide `failure-report.ts`, con el suelo de
 * cobertura del 90 % encima. Este archivo sólo elige de dónde sale cada campo,
 * y **la ruta sale del patrón y no de la URL** — `/renovar/<token>` lleva la
 * llave de renovación en el camino.
 */
export async function onRequestError(
  error: unknown,
  _request: { path: string; method: string; headers: unknown },
  context: { routerKind: string; routePath: string; routeType: string },
): Promise<void> {
  const input = {
    // El conjunto que Next puede mandar es cerrado —`render`, `route`,
    // `action`, `middleware`— y el dominio lo vuelve a cerrar, así que un
    // valor nuevo de una versión futura queda anotado como desconocido en
    // vez de entrar sin mirar.
    boundary: context.routeType,
    route: context.routePath,
    digest: (error as { digest?: string })?.digest,
    cause: error,
  };
  console.error(failureLogLine(input));

  // **El mismo reporte, también en Sentry** (13.1): Vercel guarda la línea un
  // día; Sentry treinta, y avisa por correo. Sin `SENTRY_DSN` no sale nada.
  const sending = sendFailureEvent(
    failureEvent(failureReport(input), {
      environment: process.env.VERCEL_ENV,
      release: process.env.VERCEL_GIT_COMMIT_SHA,
    }),
    {
      dsn: process.env.SENTRY_DSN,
      fetch: (url, init) => fetch(url, init),
      now: new Date(),
      eventId: crypto.randomUUID().replaceAll("-", ""),
    },
  );
  keepAlive(sending);
  await sending;
}
