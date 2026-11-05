import { afterEach, describe, expect, it, vi } from "vitest";
import { onRequestError } from "./instrumentation";

/**
 * **La costura entre el fallo y `stdout`** (tarea 11b.4).
 *
 * `onRequestError` es la única frontera que Next llama para las TRES que
 * pueden fallar —componentes de servidor, manejadores de ruta y acciones—,
 * así que registrar acá es registrar una vez en vez de tres.
 *
 * Lo que estas pruebas fijan no es el formato: eso lo prueba
 * `failure-report.test.ts`. Es **de dónde sale la ruta**, que es la diferencia
 * entre un registro buscable y una filtración.
 */
const stderr = vi.spyOn(console, "error").mockImplementation(() => {});

afterEach(() => {
  stderr.mockClear();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function lastLine(): Record<string, unknown> {
  const call = stderr.mock.calls.at(-1);
  if (!call) throw new Error("no se escribió ninguna línea");
  return JSON.parse(String(call[0]));
}

describe("onRequestError", () => {
  /**
   * **La prueba que justifica el archivo.** `request.path` es la URL real, y
   * `/renovar/<token>` lleva **en el camino** la llave que renueva el aviso de
   * otra persona: escribirla en `stdout` la publicaría en el panel de Vercel.
   * `context.routePath` es el patrón, que es lo que se busca y lo que se
   * alerta.
   */
  it("registra el PATRÓN de ruta y nunca la URL con el token adentro", async () => {
    await onRequestError(
      Object.assign(new Error("boom"), { digest: "3f5d1a9c" }),
      { path: "/renovar/tok_9c2b3f5d1a", method: "GET", headers: {} },
      { routerKind: "App Router", routePath: "/renovar/[token]", routeType: "render" },
    );

    expect(lastLine()).toStrictEqual({
      level: "error",
      event: "failure",
      boundary: "render",
      route: "/renovar/[token]",
      digest: "3f5d1a9c",
      cause: "Error: boom",
    });
  });

  it("escribe UNA sola línea por fallo", async () => {
    await onRequestError(
      new Error("boom"),
      { path: "/", method: "GET", headers: {} },
      {
        routerKind: "App Router",
        routePath: "/",
        routeType: "route",
      },
    );

    expect(stderr).toHaveBeenCalledTimes(1);
    expect(String(stderr.mock.calls[0]?.[0])).not.toContain("\n");
  });
});

/**
 * **El mismo fallo, también en Sentry** (13.1). Vercel guarda la línea un
 * día; Sentry la guarda treinta, avisa por correo y deja buscar por el código
 * que el visitante nos cita.
 */
describe("onRequestError hacia Sentry", () => {
  const renovar = () =>
    onRequestError(
      Object.assign(new Error("boom para ana@correo.com"), { digest: "3f5d1a9c" }),
      { path: "/renovar/tok_9c2b3f5d1a", method: "GET", headers: { cookie: "s=1" } },
      { routerKind: "App Router", routePath: "/renovar/[token]", routeType: "render" },
    );

  it("manda el reporte saneado, y nunca la URL, los encabezados ni el correo", async () => {
    vi.stubEnv("SENTRY_DSN", "https://abc123@o9.ingest.us.sentry.io/456");
    vi.stubEnv("VERCEL_ENV", "production");
    const fetch = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetch);

    await renovar();

    expect(fetch).toHaveBeenCalledTimes(1);
    const body = String((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body);
    const event = JSON.parse(body.split("\n")[2] ?? "");
    expect(event.tags).toStrictEqual({
      route: "/renovar/[token]",
      boundary: "render",
      digest: "3f5d1a9c",
    });
    expect(event.message).toStrictEqual({ formatted: "Error: boom para [oculto]" });
    expect(event.environment).toBe("production");
    for (const leak of ["tok_9c2b3f5d1a", "ana@correo.com", "cookie"]) {
      expect(body).not.toContain(leak);
    }
    expect(stderr).toHaveBeenCalledTimes(1);
  });

  it("sin SENTRY_DSN no manda nada, y la línea de Vercel queda igual", async () => {
    vi.stubEnv("SENTRY_DSN", "");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    await renovar();

    expect(fetch).not.toHaveBeenCalled();
    expect(lastLine().digest).toBe("3f5d1a9c");
  });
});
