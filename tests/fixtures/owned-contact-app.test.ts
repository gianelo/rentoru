import { createRequire } from "node:module";
import { describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const { synthetic } = require("./owned-contact-isolation.cjs");
const appPath = "./owned-contact-app.mjs";
const app = await import(appPath);
const env = {
  ...app.appEnv,
  OWNED_CONTACT_BROWSER: "/approved/chromium-1234/chrome",
  OWNED_CONTACT_BROWSER_CACHE: "/approved/cache",
};
for (const [key, value] of Object.entries(env)) vi.stubEnv(key, String(value));
const { ownedConfig } = await import("./owned-contact-playwright.config");
vi.unstubAllEnvs();

function servers() {
  function server() {
    const s = {
      listening: false,
      on: vi.fn<(name: string, callback: (...args: unknown[]) => void) => void>(),
      once: vi.fn(),
      listen: vi.fn((_options, done) => {
        s.listening = true;
        done();
      }),
      close: vi.fn((done) => {
        s.listening = false;
        done();
      }),
      closeAllConnections: vi.fn(),
    };
    return s;
  }
  const list = [server(), server()];
  const createServer = vi.fn().mockReturnValueOnce(list[0]).mockReturnValueOnce(list[1]);
  return { createServer, list, writeFile: vi.fn() };
}
describe("owned app and browser setup", () => {
  it("supplies and requires the root layout SITE_URL", () => {
    expect(app.appEnv.SITE_URL).toBe(app.appOrigin);
    expect(() => app.validateEnv({ ...env, SITE_URL: undefined })).toThrow(/SITE_URL/);
    expect(() => app.validateEnv({ ...env, SITE_URL: "https://wrong.invalid" })).toThrow(
      /SITE_URL/,
    );
  });
  it("rejects missing synthetic configuration before factories or preparation", async () => {
    const next = vi.fn();
    for (const key of Object.keys(synthetic)) {
      await expect(app.startOwnedApp({ ...env, [key]: "wrong" }, { next })).rejects.toThrow(
        /DENIED/,
      );
    }
    await expect(app.startOwnedApp(env, { next, preloaded: () => false })).rejects.toThrow(
      /preload/,
    );
    expect(next).not.toHaveBeenCalled();
  });
  it("uses public Next options, exclusive listeners and an explicit clean stop", async () => {
    const s = servers();
    const instance = { prepare: vi.fn(), getRequestHandler: vi.fn(), close: vi.fn() };
    const next = vi.fn(() => instance);
    const owned = await app.startOwnedApp(env, { ...s, next, preloaded: () => true });
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        dev: true,
        dir: app.repoRoot,
        hostname: "127.0.0.1",
        port: 31467,
      }),
    );
    expect(s.list[0]?.listen).toHaveBeenCalledWith(
      { host: "127.0.0.1", port: 31467 },
      expect.any(Function),
    );
    expect(s.list[1]?.listen).toHaveBeenCalledWith(
      { host: "127.0.0.1", port: 31468 },
      expect.any(Function),
    );
    const connect = s.list[1]?.on.mock.calls.find(([name]) => name === "connect");
    const socket = { end: vi.fn() };
    connect?.[1]({}, socket);
    expect(socket.end).toHaveBeenCalledWith("HTTP/1.1 403 Forbidden\r\n\r\n");
    await owned.stop();
    expect(instance.close).toHaveBeenCalledOnce();
    for (const server of s.list) expect(server.closeAllConnections).toHaveBeenCalledOnce();
  });
  it("uses the standard custom server and root config rather than unsupported overrides", async () => {
    const next = vi.fn((options) => {
      expect(options).not.toHaveProperty("customServer");
      expect(options).not.toHaveProperty("conf");
      expect(options).not.toHaveProperty("webpack");
      return { prepare: vi.fn(), getRequestHandler: vi.fn(), close: vi.fn() };
    });
    const owned = await app.startOwnedApp(env, { ...servers(), next, preloaded: () => true });
    await owned.stop();
  });
  it("keeps Next TypeScript generation in an owned config with correctly based includes", async () => {
    const s = servers();
    const next = vi.fn((..._args: unknown[]) => ({
      prepare: vi.fn(),
      getRequestHandler: vi.fn(),
      close: vi.fn(),
    }));
    const owned = await app.startOwnedApp(env, { ...s, next, preloaded: () => true });
    expect(next.mock.calls[0]?.[0]).not.toHaveProperty("conf");
    expect(s.writeFile).toHaveBeenCalledWith(
      `${app.repoRoot}.tmp/rentoru-f367-browser/tsconfig.json`,
      expect.any(String),
    );
    const config = JSON.parse(s.writeFile.mock.calls[0]?.[1]);
    expect(config).toMatchObject({
      extends: "../../tsconfig.json",
      compilerOptions: { incremental: false },
    });
    expect(config.include).toEqual([
      "../../next-env.d.ts",
      "../../app/**/*.ts",
      "../../app/**/*.tsx",
      "../../src/**/*.ts",
      "../../src/**/*.tsx",
      "../../components/**/*.tsx",
      "next/types/**/*.ts",
    ]);
    await owned.stop();
  });
  it.each([
    "http://example.invalid/",
    "http://127.0.0.1:55438/sql",
    "http://localhost:31467/",
    "https://127.0.0.1:31467/",
    "http://user:pass@127.0.0.1:31467/",
    "/relative",
  ])("never forwards forbidden browser target %s", (url) => {
    const request = vi.fn(() => ({ on: vi.fn() }));
    const response = { writeHead: vi.fn().mockReturnThis(), end: vi.fn() };
    const incoming = { url, headers: { host: "127.0.0.1:31467" }, pipe: vi.fn() };
    app.proxyHandler(request)(incoming, response);
    expect(response.writeHead).toHaveBeenCalledWith(403);
    expect(request).not.toHaveBeenCalled();
  });
  it("forwards only app HTTP via object options, rejecting authorization and forged Host", () => {
    const request = vi.fn(() => ({ on: vi.fn() }));
    const response = { writeHead: vi.fn().mockReturnThis(), end: vi.fn() };
    const incoming = {
      url: `${app.appOrigin}/ayuda/escribinos?q=1`,
      headers: { host: "127.0.0.1:31467" },
      method: "POST",
      pipe: vi.fn(),
    };
    for (const headers of [
      { host: "evil.invalid" },
      { ...incoming.headers, authorization: "synthetic" },
      { ...incoming.headers, "proxy-authorization": "synthetic" },
    ])
      app.proxyHandler(request)({ ...incoming, headers }, response);
    expect(request).not.toHaveBeenCalled();
    app.proxyHandler(request)(incoming, response);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        hostname: "127.0.0.1",
        port: 31467,
        path: "/ayuda/escribinos?q=1",
        method: "POST",
      }),
      expect.any(Function),
    );
  });
  it("fails closed and confines an explicit cached browser with no JS or shared server", () => {
    expect(() => ownedConfig({})).toThrow(/DENIED/);
    const config = ownedConfig(env);
    expect(config.workers).toBe(1);
    expect(config.use).toMatchObject({
      baseURL: app.appOrigin,
      javaScriptEnabled: false,
      proxy: { server: "http://127.0.0.1:31468", bypass: "<-loopback>" },
    });
    expect(config.use.launchOptions.args).toContain("--proxy-bypass-list=<-loopback>");
    expect(config.use.launchOptions.args).toContain(
      "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
    );
    expect(config.webServer.reuseExistingServer).toBe(false);
    expect(config.testMatch).toBe("escribinos-zona-sin-javascript.spec.ts");
  });
});
