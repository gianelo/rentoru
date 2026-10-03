import { afterEach, describe, expect, it, vi } from "vitest";
import { authPagesFixture, cookieJar, NOW, ORIGIN } from "../../../../tests/fixtures/auth-js-pages";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.doUnmock("next-auth");
  vi.doUnmock("@/shared/db/client");
  vi.doUnmock("@auth/drizzle-adapter");
});

describe("35.2 — fundamento del arnés Auth.js real", () => {
  it("jar conserva valores wire, sustituye por scope y respeta elegibilidad/borrado", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    const jar = cookieJar();
    const receive = (value: string) =>
      jar.receive(`${ORIGIN}/api/auth/csrf`, new Headers({ "set-cookie": value }));
    receive("callback=Sign%2520in; Path=/; Secure");
    receive("csrf=retained; Path=/api/auth; HttpOnly");
    receive("callback=Sign%2520in-new; Path=/; Secure");
    expect(jar.header(`${ORIGIN}/api/auth/signin`)).toBe("csrf=retained; callback=Sign%2520in-new");
    expect(jar.header(`${ORIGIN}/publicar`)).toBe("callback=Sign%2520in-new");
    expect(jar.header("http://rentoru.test/publicar")).toBe("");
    expect(jar.header("https://evil.test/api/auth")).toBe("");
    receive("csrf=gone; Path=/api/auth; Max-Age=0");
    receive("expired=gone; Path=/; Expires=Tue, 01 Sep 2026 00:00:00 GMT");
    expect(jar.header(`${ORIGIN}/api/auth/signin`)).toBe("callback=Sign%2520in-new");
  });

  it("JSON/CSRF conserva campos, cookie HttpOnly y ausencia de transporte", async () => {
    const fixture = await authPagesFixture();
    const csrf = await fixture.get(`${ORIGIN}/api/auth/csrf`);
    expect(csrf.status).toBe(200);
    expect(csrf.headers.get("content-type")).toBe("application/json");
    expect(await csrf.json()).toEqual({ csrfToken: expect.stringMatching(/^[a-f0-9]{64}$/) });
    expect(csrf.headers.getSetCookie().join(";")).toContain("HttpOnly");
    expect(fixture.unexpected).toEqual([]);
  });
});
