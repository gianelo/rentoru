import { afterEach, describe, expect, it, vi } from "vitest";
import { authPageResponse } from "./auth-page-response";

const BASE = "https://rentoru.test";
const SIGNIN = `${BASE}/api/auth/signin`;
afterEach(() => vi.unstubAllEnvs());

describe("adaptación estrecha de respuestas Auth.js", () => {
  it("localiza nodos controlados sin tocar atributos, valores, scripts ni styles", async () => {
    const opaque = '<input value="Sign in with Google"/><a href="/Sign In">Email</a>';
    const raw =
      '<script>const x = "<p>Try signing in with a different account.</p>";</script><style>p:before{content:"Email"}</style>';
    const body = `<html lang="en"><title>Sign In</title>${opaque}${raw}<span>Sign in with Google</span><label>Email</label><button>Sign in with Correo</button><p>Try signing in with a different account.</p></html>`;
    const response = new Response(body, {
      headers: {
        "content-type": "text/html",
        "set-cookie": "csrf=opaque; HttpOnly",
        "x-preserve": "Sign In",
      },
      statusText: "Native",
    });
    response.headers.append("set-cookie", "callback=Sign%2520in; Secure");
    const result = await authPageResponse(new Request(SIGNIN), response);
    expect(result.headers.getSetCookie()).toEqual(response.headers.getSetCookie());
    expect([...result.headers]).toEqual([...response.headers]);
    expect(result.statusText).toBe("Native");
    const html = await result.text();
    expect(html).toContain('<html lang="es"><title>Entrar</title>');
    expect(html).toContain(opaque + raw);
    expect(html).toContain(
      "<span>Entrar con Google</span><label>Correo</label><button>Entrar con Correo</button><p>Intenta entrar con otra cuenta.</p>",
    );
  });

  it("Verification cambia atributos propios, nunca data-lang ni href dentro de otro valor", async () => {
    vi.stubEnv("AUTH_URL", "https://configured.test");
    const url = `${BASE}/api/auth/error?error=Verification`;
    const broken = "https://configured.test/api/auth/error?error=Verification/signin";
    const note = `data-note=' href="${broken}"'`;
    const body = `<html data-lang="en" lang="en"><a class="button" ${note} href="${broken}">Sign in</a></html>`;
    const response = new Response(body, { status: 403, headers: { "content-type": "text/html" } });
    const result = await authPageResponse(new Request(url), response);
    expect(await result.text()).toBe(
      `<html data-lang="en" lang="es"><a class="button" ${note} href="https://configured.test/api/auth/signin">Entrar</a></html>`,
    );
  });

  it.each(["AUTH_URL", "NEXTAUTH_URL"])(
    "repara sólo firma Google exacta con origen normalizado por %s",
    async (key) => {
      vi.stubEnv("AUTH_URL", undefined);
      vi.stubEnv("NEXTAUTH_URL", undefined);
      vi.stubEnv(key, "https://configured.test/api/auth");
      const request = new Request(`${BASE}/api/auth/callback/google?code=opaque%20value`);
      const location =
        "https://configured.test/api/auth/callback/google?code=opaque%20value/signin";
      const response = new Response(null, {
        status: 302,
        headers: { location, "set-cookie": "native=Sign%2520in; HttpOnly" },
      });
      const result = await authPageResponse(request, response);
      expect(result.headers.get("location")).toBe("https://configured.test/api/auth/signin");
      expect(result.headers.getSetCookie()).toEqual(response.headers.getSetCookie());
      expect(result.status).toBe(302);
    },
  );

  it("conserva POST, JSON, páginas ajenas y redirects que no son la firma autorizada", async () => {
    const callback = `${BASE}/api/auth/callback/google?code=opaque`;
    for (const [url, method, status, type, location] of [
      [SIGNIN, "POST", 200, "text/html", ""],
      [SIGNIN, "GET", 200, "application/json", ""],
      [`${BASE}/otra`, "GET", 200, "text/html", ""],
      [`${SIGNIN}?error=Other`, "GET", 200, "text/html", ""],
      [`${BASE}/api/auth/error?error=Other`, "GET", 500, "text/html", ""],
      [callback, "GET", 302, "text/plain", "https://external.test/signin"],
      [callback, "GET", 302, "text/plain", `${BASE}/publicar?desde=Sign%20in`],
      [callback, "GET", 307, "text/plain", `${callback}/signin`],
      [
        `${BASE}/api/auth/callback/email`,
        "GET",
        302,
        "text/plain",
        `${BASE}/api/auth/callback/email/signin`,
      ],
    ] as const) {
      const response = new Response("Sign In", {
        status,
        headers: { "content-type": type, location },
      });
      expect(await authPageResponse(new Request(url, { method }), response)).toBe(response);
    }
  });
});
