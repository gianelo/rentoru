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
const path = require("node:path");
const root = path.resolve(import.meta.dirname, "../..");
const owned = path.join(root, ".tmp/rentoru-f367-browser");
const declaration = path.join(root, "next-env.d.ts");
const cached = path.join(owned, "generated/next-env.d.ts");
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
  const inspect = vi.fn((file: string) => ({ isSymbolicLink: () => file.endsWith("escape") }));
  const canonical = vi.fn((file: string) => file);
  for (const [target, source] of [
    [fs, require("node:fs")],
    [fs.promises, require("node:fs").promises],
  ]) {
    for (const [name, value] of Object.entries(source)) {
      if (typeof value === "function") Object.assign(target, { [name]: call });
    }
  }
  Object.assign(fs, {
    constants: require("node:fs").constants,
    lstatSync: inspect,
    realpathSync: canonical,
  });
  Object.assign(fs.promises, { realpath: canonical });
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
  return { ...primitives, call, fetchCall, inspect, canonical };
}

describe("owned filesystem confinement", () => {
  it("aliases only the exact declaration, retaining virtual identity and missing-cache semantics", async () => {
    const p = setup();
    const io = p.fs as unknown as Record<string, (...args: unknown[]) => unknown>;
    for (const name of [
      "readFileSync",
      "readFile",
      "statSync",
      "stat",
      "accessSync",
      "access",
      "existsSync",
      "writeFileSync",
      "writeFile",
    ]) {
      io[name]?.(declaration, "synthetic");
      expect(p.call.mock.calls.at(-1)?.[0]).toBe(cached);
    }
    expect(io.realpathSync?.(declaration)).toBe(declaration);
    const asyncIo = p.fs.promises as unknown as Record<string, (...args: unknown[]) => unknown>;
    await expect(asyncIo.realpath?.(declaration)).resolves.toBe(declaration);
    p.call.mockImplementation(() => {
      throw Object.assign(new Error("missing cache"), { code: "ENOENT" });
    });
    p.inspect.mockImplementationOnce(() => {
      throw Object.assign(new Error("missing ancestor"), { code: "ENOENT" });
    });
    expect(() => io.statSync?.(declaration)).toThrow("missing cache");
    expect(p.call.mock.calls.at(-1)?.[0]).toBe(cached);
    p.call.mockImplementation(() => false as unknown as string);
    expect(io.existsSync?.(declaration)).toBe(false);
    expect(p.call.mock.calls.at(-1)?.[0]).toBe(cached);
  });
  it("pairs callback/promise aliases and confines opened handles throughout their lifetime", async () => {
    const p = setup();
    const io = p.fs as unknown as Record<string, (...args: unknown[]) => unknown>;
    const asyncIo = p.fs.promises as unknown as Record<string, (...args: unknown[]) => unknown>;
    const callback = vi.fn();
    p.call.mockImplementationOnce((...args) => {
      (args.at(-1) as (error: null, result: string) => void)(null, cached);
      return "native";
    });
    io.realpath?.(declaration, callback);
    expect(callback).toHaveBeenCalledWith(null, declaration);
    await expect(asyncIo.realpath?.(new URL(`file://${declaration}`))).resolves.toBe(declaration);
    p.call.mockImplementationOnce(() => 17 as unknown as string);
    p.fs.openSync(`${owned}/output`, "w");
    expect(io.writeSync?.(17, "synthetic")).toBe("native");
    io.closeSync?.(17);
    expect(() => io.writeSync?.(17, "synthetic")).toThrow(/DENIED/);
    const handle = {
      fd: 18,
      write: vi.fn(),
      writev: vi.fn(),
      writeFile: vi.fn(),
      appendFile: vi.fn(),
      truncate: vi.fn(),
      chmod: vi.fn(),
      chown: vi.fn(),
      utimes: vi.fn(),
      close: vi.fn(),
    };
    p.call.mockImplementationOnce(() => handle as unknown as string);
    await p.fs.promises.open(`${root}/source.ts`, "r");
    expect(() => handle.chmod()).toThrow(/DENIED/);
    expect(() => handle.write()).toThrow(/DENIED/);
  });
  it("denies all nonowned path mutations before native calls, including declaration lookalikes", () => {
    const p = setup();
    const io = p.fs as unknown as Record<string, (...args: unknown[]) => unknown>;
    const asyncIo = p.fs.promises as unknown as typeof io;
    for (const name of [
      "writeFile",
      "appendFile",
      "truncate",
      "unlink",
      "rm",
      "mkdir",
      "rmdir",
      "mkdtemp",
      "chmod",
      "chown",
      "utimes",
      "createWriteStream",
    ]) {
      for (const file of [
        path.join(root, "tsconfig.json"),
        `${declaration}.bak`,
        path.join(owned, "../other/x"),
        "/outside/file",
      ]) {
        expect(() => io[name]?.(file, "synthetic")).toThrow(/DENIED/);
        if (asyncIo[name]) expect(() => asyncIo[name]?.(file, "synthetic")).toThrow(/DENIED/);
        if (io[`${name}Sync`])
          expect(() => io[`${name}Sync`]?.(file, "synthetic")).toThrow(/DENIED/);
      }
    }
    expect(p.call).not.toHaveBeenCalled();
    expect(() => p.fs.promises.open(declaration, "r+")).not.toThrow();
    expect(p.call).toHaveBeenCalledWith(cached, "r+");
  });
  it("checks both move operands and copy destination; refuses links and recursive copies", () => {
    const p = setup();
    const io = p.fs as unknown as Record<string, (...args: unknown[]) => unknown>;
    const asyncIo = p.fs.promises as unknown as typeof io;
    for (const name of [
      "rename",
      "renameSync",
      "link",
      "linkSync",
      "symlink",
      "symlinkSync",
      "cp",
      "cpSync",
    ]) {
      expect(() => io[name]?.(`${owned}/x`, `${root}/x`)).toThrow(/DENIED/);
      expect(() => io[name]?.(`${root}/x`, `${owned}/x`)).toThrow(/DENIED/);
      if (asyncIo[name]) expect(() => asyncIo[name]?.(`${root}/x`, `${owned}/x`)).toThrow(/DENIED/);
    }
    expect(() => io.copyFileSync?.(`${root}/app/page.tsx`, `${root}/x`)).toThrow(/DENIED/);
    expect(p.call).not.toHaveBeenCalled();
    io.copyFileSync?.(`${root}/app/page.tsx`, `${owned}/x`);
    expect(p.call).toHaveBeenCalledWith(`${root}/app/page.tsx`, `${owned}/x`);
  });
  it("validates ancestors for namespace and alias reads/writes, never following escape links", () => {
    const p = setup();
    expect(() => p.fs.openSync(`${owned}/escape/file`, "w")).toThrow(/DENIED/);
    p.canonical.mockImplementation((file) => (file === owned ? "/outside" : file));
    expect(() => p.fs.readFileSync(declaration)).toThrow(/DENIED/);
    expect(() => p.fs.openSync(declaration, "w")).toThrow(/DENIED/);
    expect(p.call).not.toHaveBeenCalled();
  });
  it("guards write-capable opens and descriptors while allowing owned output and stdout", () => {
    const p = setup();
    const io = p.fs as unknown as Record<string, (...args: unknown[]) => unknown>;
    const constants = require("node:fs").constants;
    for (const flags of ["w", "a", "r+", constants.O_RDWR, constants.O_CREAT]) {
      expect(() => p.fs.openSync(`${root}/source.ts`, flags)).toThrow(/DENIED/);
    }
    for (const name of [
      "write",
      "writeSync",
      "ftruncate",
      "ftruncateSync",
      "fchmod",
      "fchown",
      "futimes",
    ])
      expect(() => io[name]?.(9, "synthetic")).toThrow(/DENIED/);
    expect(() => io.createWriteStream?.(`${owned}/stdout`, { fd: 9 })).toThrow(/DENIED/);
    expect(p.call).not.toHaveBeenCalled();
    io.writeSync?.(1, "synthetic");
  });
});

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
        __dirname: path.join(root, "tests/fixtures"),
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
      for (const port of [55437, 55438, 31467, 31468])
        expect(method(port, "127.0.0.1")).toBe("native");
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
