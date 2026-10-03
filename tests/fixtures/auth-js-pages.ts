import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { NextRequest } from "next/server";
import type { NextAuthConfig } from "next-auth";
import type { Adapter, AdapterUser, VerificationToken } from "next-auth/adapters";
import { expect, vi } from "vitest";

export const ORIGIN = "https://rentoru.test";
export const RETURN = `${ORIGIN}/publicar?desde=Sign%20in`;
export const NOW = new Date("2026-09-02T15:00:00Z");
const ISSUER = "https://google.fixture.test";
const PRIVATE_FAILURE = "PRIVATE fixture callback failure: Sign in";

/** Scoped browser-like jar. Values stay encoded exactly as Set-Cookie supplied them. */
export function cookieJar() {
  const stored = new Map<
    string,
    {
      name: string;
      value: string;
      domain: string;
      path: string;
      hostOnly: boolean;
      secure: boolean;
      expires: number;
    }
  >();
  return {
    receive(url: string, headers: Headers) {
      const source = new URL(url);
      for (const wire of headers.getSetCookie()) {
        const [pair = "", ...attributes] = wire.split(";");
        const separator = pair.indexOf("=");
        const name = pair.slice(0, separator).trim();
        const value = pair.slice(separator + 1);
        const attrs = new Map(
          attributes.map((attribute) => {
            const index = attribute.indexOf("=");
            return index < 0
              ? [attribute.trim().toLowerCase(), ""]
              : [attribute.slice(0, index).trim().toLowerCase(), attribute.slice(index + 1).trim()];
          }),
        );
        const domain = (attrs.get("domain") ?? source.hostname).replace(/^\./, "").toLowerCase();
        if (source.hostname !== domain && !source.hostname.endsWith(`.${domain}`)) continue;
        const candidatePath = attrs.get("path");
        const path = candidatePath?.startsWith("/")
          ? candidatePath
          : source.pathname.slice(0, source.pathname.lastIndexOf("/")) || "/";
        const expires = attrs.has("max-age")
          ? Date.now() + Number(attrs.get("max-age")) * 1000
          : attrs.has("expires")
            ? Date.parse(attrs.get("expires") ?? "")
            : Infinity;
        const key = `${name}\n${domain}\n${path}`;
        if (expires <= Date.now()) stored.delete(key);
        else
          stored.set(key, {
            name,
            value,
            domain,
            path,
            expires,
            hostOnly: !attrs.has("domain"),
            secure: attrs.has("secure"),
          });
      }
    },
    header(url: string) {
      const target = new URL(url);
      return [...stored.values()]
        .filter(
          (cookie) =>
            cookie.expires > Date.now() &&
            (target.hostname === cookie.domain ||
              (!cookie.hostOnly && target.hostname.endsWith(`.${cookie.domain}`))) &&
            (!cookie.secure || target.protocol === "https:") &&
            (target.pathname === cookie.path ||
              target.pathname.startsWith(`${cookie.path.replace(/\/$/, "")}/`)),
        )
        .sort((a, b) => b.path.length - a.path.length)
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join("; ");
    },
  };
}

/** Real production configuration/route; only storage, credentials and transport are replaced. */
export async function authPagesFixture() {
  vi.resetModules();
  for (const key of [
    "AUTH_URL",
    "NEXTAUTH_URL",
    "AUTH_REDIRECT_PROXY_URL",
    "AUTH_GOOGLE_ID",
    "AUTH_GOOGLE_SECRET",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "RESEND_API_KEY",
    "AUTH_MAIL_FROM",
  ]) {
    vi.stubEnv(key, undefined);
  }
  vi.stubEnv("TZ", "UTC");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  const unexpected: string[] = [];
  const calls: string[] = [];
  const errors: string[] = [];
  const tokens = new Map<string, VerificationToken>();
  let broken = false;
  let verified = false;
  let deliberateFailures = 0;
  const user = {
    id: "fixture-user",
    email: "sign.in@example.test",
    emailVerified: null,
  } as AdapterUser;
  const adapter = {
    createVerificationToken: async (token) => {
      tokens.set(token.token, token);
      return token;
    },
    useVerificationToken: async ({ token }) => {
      if (broken) {
        deliberateFailures++;
        throw new Error(PRIVATE_FAILURE);
      }
      const found = tokens.get(token) ?? null;
      tokens.delete(token);
      return found;
    },
    getUser: async () => user,
    getUserByEmail: async () => user,
    getUserByAccount: async () => null,
    getSessionAndUser: async () => null,
    createUser: async (value) => ({ ...value, id: "fixture-user" }),
    updateUser: async (value) => ({ ...user, ...value }),
    linkAccount: async (value) => value,
    createSession: async (value) => value,
    updateSession: async (value) => ({
      ...value,
      userId: value.userId ?? user.id,
      expires: value.expires ?? NOW,
    }),
    deleteSession: async () => undefined,
  } satisfies Adapter;
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwt = () => {
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const body = `${encode({ alg: "RS256" })}.${encode({
      iss: ISSUER,
      aud: "fixture-client",
      sub: "google-user",
      iat: NOW.getTime() / 1000,
      exp: NOW.getTime() / 1000 + 3600,
      email: user.email,
      name: "Sign in",
      email_verified: verified,
    })}`;
    return `${body}.${sign("RSA-SHA256", Buffer.from(body), privateKey).toString("base64url")}`;
  };
  const transport = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input);
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");
    calls.push(`${method} ${url}`);
    if (url === `${ISSUER}/.well-known/openid-configuration` && method === "GET") {
      return Response.json({
        issuer: ISSUER,
        authorization_endpoint: `${ISSUER}/authorize`,
        token_endpoint: `${ISSUER}/token`,
        userinfo_endpoint: `${ISSUER}/userinfo`,
        jwks_uri: `${ISSUER}/jwks`,
        response_types_supported: ["code"],
        subject_types_supported: ["public"],
        id_token_signing_alg_values_supported: ["RS256"],
      });
    }
    if (url === `${ISSUER}/token` && method === "POST") {
      return Response.json({
        access_token: "fixture-access",
        token_type: "bearer",
        expires_in: 3600,
        id_token: jwt(),
      });
    }
    unexpected.push(`${method} ${url}`);
    throw new Error("Unexpected fixture transport");
  };
  vi.stubGlobal("fetch", async () => {
    unexpected.push("global fetch");
    throw new Error("Forbidden network");
  });
  vi.doMock("@/shared/db/client", () => ({ db: {} }));
  vi.doMock("@auth/drizzle-adapter", () => ({ DrizzleAdapter: () => adapter }));
  const raw: Response[] = [];
  vi.doMock("next-auth", async () => {
    const actual = await vi.importActual<typeof import("next-auth")>("next-auth");
    return {
      ...actual,
      default: (config: NextAuthConfig) => {
        const providers = config.providers.map((provider) => {
          if (typeof provider === "function")
            throw new Error("Unexpected production provider factory");
          if (provider.id !== "google") return provider;
          return {
            ...provider,
            options: {
              ...provider.options,
              issuer: ISSUER,
              clientId: "fixture-client",
              clientSecret: "fixture-secret",
            },
            [actual.customFetch]: transport,
          };
        });
        const result = actual.default({
          ...config,
          providers,
          secret: "fixture-only-secret-not-a-credential",
          trustHost: true,
          basePath: "/api/auth",
          logger: { error: (error) => errors.push(error.name) },
        });
        const get = result.handlers.GET;
        return {
          ...result,
          handlers: {
            ...result.handlers,
            GET: async (request: NextRequest) => {
              const response = await get(request);
              raw.push(response.clone());
              return response;
            },
          },
        };
      },
    };
  });
  const route = await import("../../app/api/auth/[...nextauth]/route");
  const cookies = cookieJar();
  const request = (url: string, init?: RequestInit) =>
    new NextRequest(url, {
      ...init,
      headers: { cookie: cookies.header(url), ...init?.headers },
    } as never);
  async function get(url: string) {
    const response = await route.GET(request(url));
    cookies.receive(url, response.headers);
    return response;
  }
  async function oauth(denied = false) {
    const csrf = await get(`${ORIGIN}/api/auth/csrf`);
    const { csrfToken } = await csrf.json();
    const start = await route.POST(
      request(`${ORIGIN}/api/auth/signin/google`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ csrfToken, callbackUrl: RETURN }),
      }),
    );
    expect(start.status).toBe(302);
    const location = start.headers.get("location");
    if (!location) throw new Error("OAuth start omitted Location");
    const destination = new URL(location);
    expect(destination.origin).toBe(ISSUER); // Never follow the external authorization URL.
    expect(destination.searchParams.get("code_challenge_method")).toBe("S256");
    cookies.receive(`${ORIGIN}/api/auth/signin/google`, start.headers);
    const params = new URLSearchParams(
      denied ? { error: "access_denied" } : { code: "fixture-code" },
    );
    const state = destination.searchParams.get("state");
    if (state) params.set("state", state);
    return get(`${ORIGIN}/api/auth/callback/google?${params}`);
  }
  function email(expired = false) {
    const token = "fixture-magic-token";
    tokens.set(
      createHash("sha256").update(`${token}fixture-only-secret-not-a-credential`).digest("hex"),
      {
        identifier: user.email,
        token: createHash("sha256")
          .update(`${token}fixture-only-secret-not-a-credential`)
          .digest("hex"),
        expires: new Date(NOW.getTime() + (expired ? -1000 : 60000)),
      },
    );
    return `${ORIGIN}/api/auth/callback/email?${new URLSearchParams({ token, email: user.email, callbackUrl: RETURN })}`;
  }
  async function final(response: Response, path: string, status: number) {
    expect(unexpected).toEqual([]);
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(`${ORIGIN}${path}`);
    const location = response.headers.get("location");
    if (!location) throw new Error("Callback omitted Location");
    const served = await get(location);
    expect(served.status).toBe(status);
    expect(served.headers.get("content-type")).toBe("text/html");
    expect(unexpected).toEqual([]);
    const original = raw.at(-1);
    if (!original) throw new Error("Production GET did not traverse real Auth.js");
    expect([...served.headers]).toEqual([...original.headers]);
    return { html: await served.text(), original: await original.text() };
  }
  return {
    get,
    oauth,
    email,
    final,
    calls,
    errors,
    unexpected,
    breakCallback: () => {
      broken = true;
    },
    failures: () => deliberateFailures,
    verifyProfile: () => {
      verified = true;
    },
  };
}
