import { afterEach, describe, expect, it, vi } from "vitest";
import { authPagesFixture, ORIGIN, RETURN } from "../../../../tests/fixtures/auth-js-pages";

// Preserve the native markup/values and CSS, not only the translated words.
function preservation(html: string, original: string, verification = false) {
  // Only this exact default Verification href is authorized to change.
  if (verification)
    original = original.replace(
      `href="${ORIGIN}/api/auth/error?error=Verification/signin"`,
      `href="${ORIGIN}/api/auth/signin"`,
    );
  const tags = (body: string) =>
    body.match(/<[^>]+>/g)?.map((tag) => tag.replace(/ lang="[^"]*"/, ""));
  expect(tags(html)).toEqual(tags(original));
  expect(html.match(/<style[^>]*>[\s\S]*?<\/style>/g)).toEqual(
    original.match(/<style[^>]*>[\s\S]*?<\/style>/g),
  );
  expect(html.match(/<script[^>]*>[\s\S]*?<\/script>/g)).toEqual(
    original.match(/<script[^>]*>[\s\S]*?<\/script>/g),
  );
}

function copy(html: string, title: string, fragments: string[]) {
  for (const fragment of ['<html lang="es">', `<title>${title}</title>`, ...fragments]) {
    expect.soft(html.includes(fragment), fragment).toBe(true);
  }
}

function signin(html: string, original: string, explanation: boolean) {
  preservation(html, original);
  expect(html).toContain(`action="${ORIGIN}/api/auth/signin/google" method="POST"`);
  expect(html).toContain(`action="${ORIGIN}/api/auth/signin/email" method="POST"`);
  expect(html).toContain(`name="callbackUrl" value="${RETURN}"`);
  const csrf = [...html.matchAll(/name="csrfToken" value="([^"]+)"/g)].map((match) => match[1]);
  expect(csrf).toHaveLength(2);
  expect(csrf[0]).toMatch(/^[a-f0-9]{64}$/);
  expect(csrf[1]).toBe(csrf[0]);
  expect(html).toContain('type="email" name="email"');
  expect(html).toContain('placeholder="email@example.com"');
  expect(html).not.toContain("Google account email is not verified.");
  expect(html).not.toContain("PRIVATE fixture callback failure");
  if (!explanation) expect(html).not.toContain('class="error"');
  copy(html, "Entrar", [
    ">Entrar con Google</span>",
    ">Correo</label>",
    ">Entrar con Correo</button>",
    ...(explanation ? ["<p>Intenta entrar con otra cuenta.</p>"] : []),
  ]);
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.doUnmock("next-auth");
  vi.doUnmock("@/shared/db/client");
  vi.doUnmock("@auth/drizzle-adapter");
});

describe("35.2 — HTML final del GET de producción con Auth.js real", () => {
  it.each(["usado", "vencido"])(
    "enlace %s: diagnóstico combinado, 403 y acción nativa",
    async (kind) => {
      const fixture = await authPagesFixture();
      const url = fixture.email(kind === "vencido");
      if (kind === "usado") {
        const success = await fixture.get(url);
        expect(success.status).toBe(302);
        expect(success.headers.get("location")).toBe(RETURN);
        expect(success.headers.getSetCookie().join(";")).toContain("authjs.session-token=");
      }
      const { html, original } = await fixture.final(
        await fixture.get(url),
        "/api/auth/error?error=Verification",
        403,
      );
      expect(fixture.calls).toEqual([]);
      expect(html.match(/<a[^>]+href="([^"]+)"/)?.[1]).toBe(`${ORIGIN}/api/auth/signin`);
      preservation(html, original, true);
      copy(html, "Error", [
        "<h1>No se pudo entrar</h1>",
        "<p>El enlace para entrar ya no es válido.</p>",
        "<p>Puede haberse utilizado o haber vencido.</p>",
        ">Entrar</a>",
      ]);
    },
  );

  it("Google denegado: OAuthCallbackError, 200 y explicación genérica", async () => {
    const fixture = await authPagesFixture();
    const { html, original } = await fixture.final(
      await fixture.oauth(true),
      "/api/auth/signin?error=OAuthCallbackError",
      200,
    );
    expect(
      fixture.calls.every(
        (call) => call === "GET https://google.fixture.test/.well-known/openid-configuration",
      ),
    ).toBe(true);
    expect(fixture.errors).toEqual(["OAuthCallbackError"]);
    signin(html, original, true);
  });

  it("perfil Google no verificado: signin sin código ni causa inventada", async () => {
    const fixture = await authPagesFixture();
    const callback = await fixture.oauth();
    expect(fixture.unexpected).toEqual([]);
    expect(callback.status).toBe(302);
    expect(fixture.calls).toContain("POST https://google.fixture.test/token");
    expect(fixture.errors).toEqual(["OAuthProfileParseError"]);
    const { html, original } = await fixture.final(callback, "/api/auth/signin", 200);
    signin(html, original, false);
  });

  it("fallo deliberado de callback: Configuration 500 sin detalle privado", async () => {
    const fixture = await authPagesFixture();
    fixture.breakCallback();
    const { html, original } = await fixture.final(
      await fixture.get(fixture.email()),
      "/api/auth/error?error=Configuration",
      500,
    );
    expect(fixture.failures()).toBe(1);
    expect(fixture.calls).toEqual([]);
    preservation(html, original);
    expect(html).not.toContain("PRIVATE fixture callback failure");
    copy(html, "Error", [
      "<h1>Error del servidor</h1>",
      "<p>Hay un problema con la configuración del servidor.</p>",
      "<p>Consulta los registros del servidor para obtener más información.</p>",
    ]);
  });
});
