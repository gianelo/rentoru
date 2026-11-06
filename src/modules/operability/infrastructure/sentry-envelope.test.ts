import { afterEach, describe, expect, it, vi } from "vitest";
import type { FailureEvent } from "../domain/failure-event";
import { keepAlive, parseSentryDsn, sendFailureEvent } from "./sentry-envelope";

/**
 * **El envío a Sentry por su API pública de envelopes, sin SDK** (13.1).
 *
 * Lo que se fija acá es la frontera: a dónde va, con qué llave, que sin DSN
 * no sale nada, y que un Sentry caído nunca rompe la petición del visitante.
 */
const event: FailureEvent = {
  level: "error",
  platform: "node",
  logger: "rentoru",
  environment: "production",
  transaction: "/",
  message: { formatted: "Error: boom" },
  tags: { route: "/", boundary: "render", digest: "3f5d1a9c" },
};
const now = new Date("2026-11-05T12:00:00.000Z");
const eventId = "0123456789abcdef0123456789abcdef";
const dsn = "https://abc123@o9.ingest.us.sentry.io/456";

const stderr = vi.spyOn(console, "error").mockImplementation(() => {});
afterEach(() => stderr.mockClear());

describe("parseSentryDsn", () => {
  it("saca la dirección de ingesta y la llave pública del DSN", () => {
    expect(parseSentryDsn(dsn)).toStrictEqual({
      endpoint: "https://o9.ingest.us.sentry.io/api/456/envelope/",
      publicKey: "abc123",
    });
  });

  it("sin DSN, o con uno mal formado, no hay a dónde mandar", () => {
    expect(parseSentryDsn(undefined)).toBeNull();
    expect(parseSentryDsn("")).toBeNull();
    expect(parseSentryDsn("no-es-una-url")).toBeNull();
    expect(parseSentryDsn("https://o9.ingest.us.sentry.io/456")).toBeNull();
    expect(parseSentryDsn("https://abc123@o9.ingest.us.sentry.io/")).toBeNull();
  });
});

describe("sendFailureEvent", () => {
  it("manda el evento a la ingesta del DSN, con su llave y su identificador", async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 200 }));

    await sendFailureEvent(event, { dsn, fetch, now, eventId });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://o9.ingest.us.sentry.io/api/456/envelope/");
    expect((init.headers as Record<string, string>)["X-Sentry-Auth"]).toBe(
      "Sentry sentry_version=7, sentry_key=abc123, sentry_client=rentoru/1",
    );
    const [header, item, payload] = String(init.body)
      .split("\n")
      .map((l) => JSON.parse(l));
    expect(header).toStrictEqual({ event_id: eventId, sent_at: "2026-11-05T12:00:00.000Z" });
    expect(item).toStrictEqual({ type: "event" });
    expect(payload).toStrictEqual({ ...event, event_id: eventId, timestamp: 1793880000 });
    expect(stderr).not.toHaveBeenCalled();
  });

  it("sin DSN no manda nada", async () => {
    const fetch = vi.fn();

    await sendFailureEvent(event, { dsn: undefined, fetch, now, eventId });

    expect(fetch).not.toHaveBeenCalled();
  });

  /**
   * Un Sentry caído o una llave revocada no puede convertir un fallo en dos:
   * la petición sigue, y queda una línea en Vercel que dice que el envío no
   * llegó — sin el DSN, que lleva la llave.
   */
  it("si Sentry no responde, no lanza y deja una línea sin la llave", async () => {
    const rejecting = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    await expect(sendFailureEvent(event, { dsn, fetch: rejecting, now, eventId })).resolves.toBe(
      undefined,
    );

    const refusing = vi.fn(async () => new Response(null, { status: 429 }));
    await sendFailureEvent(event, { dsn, fetch: refusing, now, eventId });

    expect(stderr.mock.calls.map((c) => JSON.parse(String(c[0])))).toStrictEqual([
      { level: "error", event: "sentry-unreachable", status: null },
      { level: "error", event: "sentry-unreachable", status: 429 },
    ]);
    expect(JSON.stringify(stderr.mock.calls)).not.toContain("abc123");
  });
});

describe("keepAlive", () => {
  const key = Symbol.for("@next/request-context");
  afterEach(() => {
    delete (globalThis as Record<symbol, unknown>)[key];
  });

  /**
   * El render de React llama `onRequestError` sin esperarlo, y una función de
   * Vercel puede congelarse antes de que el envío salga. `waitUntil` la
   * mantiene viva hasta que termine.
   */
  it("le entrega el envío al waitUntil de Vercel cuando existe", () => {
    const waitUntil = vi.fn();
    (globalThis as Record<symbol, unknown>)[key] = { get: () => ({ waitUntil }) };
    const sending = Promise.resolve();

    keepAlive(sending);

    expect(waitUntil).toHaveBeenCalledWith(sending);
  });

  it("fuera de Vercel no hace nada y no lanza", () => {
    expect(() => keepAlive(Promise.resolve())).not.toThrow();
  });
});
