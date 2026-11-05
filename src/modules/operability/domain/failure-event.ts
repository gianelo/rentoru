import type { FailureReport } from "./failure-report";

/**
 * **El evento que sale hacia Sentry, armado desde el reporte y desde nada más**
 * (13.1).
 *
 * No hay SDK a propósito: el de Sentry captura por defecto la URL de la
 * petición, los encabezados, las URLs salientes —las firmadas de R2— y la
 * pila. Este evento sólo puede llevar lo que `failureReport` ya cerró, más dos
 * valores del despliegue. El identificador y la hora los pone el envío, que
 * es donde está el reloj.
 */
export interface FailureEvent {
  readonly level: "error";
  readonly platform: "node";
  readonly logger: "rentoru";
  readonly environment: Environment;
  readonly release?: string;
  /** Sentry muestra la ruta como título secundario del issue. */
  readonly transaction: string;
  readonly message: { readonly formatted: string };
  readonly tags: Readonly<Record<string, string>>;
}

const ENVIRONMENTS = ["production", "preview", "development"] as const;
type Environment = (typeof ENVIRONMENTS)[number];

export interface Deployment {
  /** `VERCEL_ENV`. */
  readonly environment?: string;
  /** `VERCEL_GIT_COMMIT_SHA`. */
  readonly release?: string;
}

export function failureEvent(report: FailureReport, deployment: Deployment): FailureEvent {
  // Un entorno que Vercel no manda no abre un tablero nuevo en Sentry.
  const environment = ENVIRONMENTS.includes(deployment.environment as Environment)
    ? (deployment.environment as Environment)
    : "development";
  const release =
    deployment.release && /^[0-9a-f]{7,40}$/.test(deployment.release)
      ? deployment.release
      : undefined;

  return {
    level: "error",
    platform: "node",
    logger: "rentoru",
    environment,
    ...(release ? { release } : {}),
    transaction: report.route,
    message: { formatted: report.cause },
    // El digest es lo que el visitante nos cita: como etiqueta, se busca.
    tags: {
      route: report.route,
      boundary: report.boundary,
      ...(report.digest ? { digest: report.digest } : {}),
    },
  };
}
