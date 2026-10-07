import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import { sendContactMessage } from "../../src/modules/site-contact/application/send-contact-message";
import {
  ContactMailerSendError,
  ResendContactMailer,
} from "../../src/modules/site-contact/infrastructure/resend-contact-mailer";

const require = createRequire(import.meta.url);
const nativeRead = require("node:fs").readFileSync;
const { install, synthetic } = require("./owned-contact-isolation.cjs");
function setup(env = synthetic, activate = true) {
  const call = vi.fn((..._args: unknown[]) => "native");
  const fetchCall = vi.fn(async (..._args: unknown[]) => new Response("native"));
  const fs = {
    readFileSync: call,
    readFile: call,
    openSync: call,
    open: call,
    createReadStream: call,
    promises: { readFile: call, open: call },
  };
  const primitives = {
    fs,
    net: { Socket: { prototype: { connect: call } }, Server: { prototype: { listen: call } } },
    http: { request: call, get: call },
    https: { request: call, get: call },
    dns: { lookup: call, resolve: call, promises: { lookup: call } },
    dgram: { createSocket: call },
    global: { fetch: fetchCall },
  };
  if (activate) install(primitives, env);
  return { ...primitives, call, fetchCall };
}

describe("owned contact isolation", () => {
  it("imports inertly and refuses missing or nonsynthetic preload configuration", () => {
    expect(require("node:fs").readFileSync).toBe(nativeRead);
    expect(() => setup({})).toThrow(/DENIED/);
    for (const key of Object.keys(synthetic)) {
      expect(() => setup({ ...synthetic, [key]: "unexpected" })).toThrow(/DENIED/);
    }
  });
  it("activates the intentional preload before callers, failing closed without its marker", () => {
    const p = setup(synthetic, false);
    const sync = vi.fn();
    const source = nativeRead(require.resolve("./owned-contact-isolation.cjs"), "utf8");
    const load = (env: Record<string, string>) =>
      runInNewContext(source, {
        module: { exports: {}, parent: { id: "internal/preload" } },
        process: { env },
        globalThis: p.global,
        URL,
        Headers,
        Response,
        require: (name: string) =>
          name === "node:module"
            ? { syncBuiltinESMExports: sync }
            : (p[name.slice(5) as keyof typeof p] ?? require(name)),
      });
    expect(() => load({})).toThrow(/DENIED/);
    expect(sync).not.toHaveBeenCalled();
    load(synthetic);
    expect(sync).toHaveBeenCalledOnce();
    expect(() => p.fs.readFileSync(".env.local")).toThrow(/DENIED/);
    expect(p.call).not.toHaveBeenCalled();
  });
  it.each([".env", ".env.local", ".aws/credentials", ".ssh/id_ed25519", "cert.pem"])(
    "denies credential reads before any underlying call: %s",
    (file) => {
      const p = setup();
      for (const read of [
        p.fs.readFileSync,
        p.fs.readFile,
        p.fs.openSync,
        p.fs.open,
        p.fs.createReadStream,
      ]) {
        expect(() => read(file)).toThrow(/DENIED/);
      }
      expect(() => p.fs.promises.readFile(new URL(file, "file:///owned/"))).toThrow(/DENIED/);
      expect(() => p.fs.promises.open(Buffer.from(file))).toThrow(/DENIED/);
      expect(p.call).not.toHaveBeenCalled();
    },
  );
  it("permits ordinary source reads but refuses unverifiable descriptors", () => {
    const p = setup();
    expect(() => p.fs.readFileSync(7)).toThrow(/DENIED/);
    expect(p.fs.readFileSync("app/page.tsx")).toBe("native");
  });
  it.each([
    "https://example.invalid",
    "http://127.0.0.1:3000",
    "http://localhost:31467",
    "http://127.0.0.1:55433",
  ])("denies outbound routing without native calls: %s", async (url) => {
    const p = setup();
    await expect(p.global.fetch(url)).rejects.toThrow(/DENIED/);
    expect(() => p.http.request(url)).toThrow(/DENIED/);
    expect(p.call).not.toHaveBeenCalled();
    expect(p.fetchCall).not.toHaveBeenCalled();
  });
  it("restricts sockets and listeners to exclusive literal loopbacks", () => {
    const p = setup();
    for (const method of [p.net.Socket.prototype.connect, p.net.Server.prototype.listen]) {
      for (const args of [
        [3001, "127.0.0.1"],
        [31467],
        [{ port: 31467, host: "0.0.0.0" }],
        ["/tmp/socket"],
      ]) {
        expect(() => method(...args)).toThrow(/DENIED/);
      }
      expect(p.call).not.toHaveBeenCalled();
      for (const port of [55437, 55438, 31467]) expect(method(port, "127.0.0.1")).toBe("native");
      p.call.mockClear();
    }
    expect(p.net.Socket.prototype.connect([{ port: 55437, host: "127.0.0.1" }])).toBe("native");
  });
  it("denies DNS and datagrams; allows only owned HTTP endpoints", async () => {
    const p = setup();
    expect(() => p.dns.lookup("example.invalid")).toThrow(/DENIED/);
    expect(() => p.dns.promises.lookup("localhost")).toThrow(/DENIED/);
    expect(() => p.dgram.createSocket("udp4")).toThrow(/DENIED/);
    expect(() => p.https.get("https://127.0.0.1:31467")).toThrow(/DENIED/);
    expect(() => p.http.get({ hostname: "127.0.0.1", port: 31467, socketPath: "/tmp/x" })).toThrow(
      /DENIED/,
    );
    expect(p.call).not.toHaveBeenCalled();
    expect(await (await p.global.fetch("http://127.0.0.1:55438/sql")).text()).toBe("native");
    expect(p.fetchCall).toHaveBeenCalledWith("http://127.0.0.1:55438/sql", { redirect: "error" });
    expect(p.http.request({ hostname: "127.0.0.1", port: 31467 })).toBe("native");
  });
  it.each([false, true])(
    "returns SDK success/error without delivery (failure=%s)",
    async (failure) => {
      const p = setup();
      const response = await p.global.fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${synthetic.RESEND_API_KEY}` },
        body: JSON.stringify({
          from: synthetic.AUTH_MAIL_FROM,
          to: [synthetic.CONTACT_MAIL_TO],
          subject: "Escribinos: mensaje de Owned Test",
          text: failure ? "synthetic\n\n[owned-provider-error]" : "synthetic",
        }),
      });
      expect(response.status).toBe(failure ? 422 : 200);
      expect(await response.json()).toEqual(
        failure
          ? { name: "validation_error", message: "owned provider error" }
          : { id: "owned-contact-message" },
      );
      expect(p.call).not.toHaveBeenCalled();
      expect(p.fetchCall).not.toHaveBeenCalled();
    },
  );
  it("real application and Resend SDK propagate the marked provider error, never success", async () => {
    const p = setup();
    const responses: unknown[] = [];
    vi.stubGlobal("fetch", async (input: string, options: RequestInit) => {
      const response = await p.global.fetch(input, options);
      responses.push(await response.clone().json());
      return response;
    });
    try {
      const mailer = new ResendContactMailer(
        synthetic.RESEND_API_KEY,
        synthetic.AUTH_MAIL_FROM,
        synthetic.CONTACT_MAIL_TO,
      );
      const result = await sendContactMessage(
        {
          name: "Owned Test",
          email: "visitor@owned.invalid",
          honeypot: "",
          message: "Falta una zona en la ciudad.\n\n[owned-provider-error]",
        },
        { mailer },
      ).catch((error: unknown) => error);
      expect(responses).toEqual([{ name: "validation_error", message: "owned provider error" }]);
      expect(result).toBeInstanceOf(ContactMailerSendError);
      expect((result as Error).message).toContain("owned provider error");
      expect(p.call).not.toHaveBeenCalled();
      expect(p.fetchCall).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("refuses unknown SDK paths, recipients, methods and keys", async () => {
    const p = setup();
    const valid = {
      method: "POST",
      headers: { Authorization: `Bearer ${synthetic.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: synthetic.AUTH_MAIL_FROM,
        to: synthetic.CONTACT_MAIL_TO,
        subject: "Zona",
      }),
    };
    for (const options of [
      { ...valid, method: "GET" },
      { ...valid, headers: {} },
      { ...valid, body: "{}" },
      {
        ...valid,
        body: JSON.stringify({
          from: synthetic.AUTH_MAIL_FROM,
          to: "other@owned.invalid",
          subject: "Zona",
        }),
      },
    ]) {
      await expect(p.global.fetch("https://api.resend.com/emails", options)).rejects.toThrow(
        /DENIED/,
      );
    }
    await expect(p.global.fetch("https://api.resend.com/domains", valid)).rejects.toThrow(/DENIED/);
    expect(p.call).not.toHaveBeenCalled();
    expect(p.fetchCall).not.toHaveBeenCalled();
  });
});
