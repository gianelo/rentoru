import type { FailureEvent } from "../domain/failure-event";

/**
 * **El envío a Sentry por su API pública de envelopes, sin SDK** (13.1).
 *
 * Un envelope son tres líneas de JSON: la cabecera, el tipo del ítem y el
 * evento. Es todo lo que hace falta para que Sentry agrupe, alerte y deje
 * buscar por el código del fallo, y lo único que viaja es lo que el dominio
 * cerró (`failureEvent`).
 */
export interface SentryTarget {
  readonly endpoint: string;
  readonly publicKey: string;
}

/** `https://<llave>@<host>/<proyecto>` → dirección de ingesta y llave. */
export function parseSentryDsn(dsn: string | undefined): SentryTarget | null {
  if (!dsn) return null;
  let url: URL;
  try {
    url = new URL(dsn);
  } catch {
    return null;
  }
  const projectId = url.pathname.replace(/^\/+|\/+$/g, "");
  if (!url.username || !/^\d+$/.test(projectId)) return null;

  return {
    endpoint: `${url.protocol}//${url.host}/api/${projectId}/envelope/`,
    publicKey: url.username,
  };
}

export interface SendDeps {
  readonly dsn: string | undefined;
  readonly fetch: (url: string, init: RequestInit) => Promise<Response>;
  readonly now: Date;
  /** 32 caracteres hexadecimales, como los pide Sentry. */
  readonly eventId: string;
  readonly timeoutMs?: number;
}

/**
 * **Nunca lanza.** Un Sentry caído o una llave revocada no puede convertir un
 * fallo en dos: la petición del visitante sigue, y queda una línea en Vercel
 * que dice que el envío no llegó — sin el DSN, que lleva la llave.
 */
export async function sendFailureEvent(event: FailureEvent, deps: SendDeps): Promise<void> {
  // Sin DSN no hay a dónde mandar, y la línea de Vercel sigue siendo el registro.
  const target = parseSentryDsn(deps.dsn);
  if (!target) return;

  const body = [
    JSON.stringify({ event_id: deps.eventId, sent_at: deps.now.toISOString() }),
    JSON.stringify({ type: "event" }),
    JSON.stringify({ ...event, event_id: deps.eventId, timestamp: deps.now.getTime() / 1000 }),
  ].join("\n");

  let status: number | null = null;
  try {
    const response = await deps.fetch(target.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${target.publicKey}, sentry_client=rentoru/1`,
      },
      body,
      signal: AbortSignal.timeout(deps.timeoutMs ?? 2000),
    });
    if (response.ok) return;
    status = response.status;
  } catch {
    // Red caída o tiempo agotado: no hay código de estado que anotar.
  }
  console.error(JSON.stringify({ level: "error", event: "sentry-unreachable", status }));
}

/**
 * El render de React llama `onRequestError` sin esperarlo, y una función de
 * Vercel puede congelarse antes de que el envío salga. La plataforma le pasa
 * su `waitUntil` a Next en este símbolo global —el que lee
 * `next/dist/server/after/builtin-request-context.js`, y por eso funciona
 * `after()`—; fuera de Vercel no existe y no hace falta.
 */
export function keepAlive(sending: Promise<void>): void {
  const context = (globalThis as Record<symbol, unknown>)[Symbol.for("@next/request-context")] as
    | { get?: () => { waitUntil?: (p: Promise<unknown>) => void } | undefined }
    | undefined;
  context?.get?.()?.waitUntil?.(sending);
}
