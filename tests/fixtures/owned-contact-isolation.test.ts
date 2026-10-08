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
    dns: {
      lookup: call,
      lookupPromise: call,
      lookupService: call,
      resolve: call,
      resolve4: call,
      reverse: call,
      Resolver: { prototype: { resolve4: call } },
      promises: {
        lookup: call,
        reverse: call,
        resolve4: call,
        Resolver: { prototype: { resolve4: call } },
      },
    },
    dgram: { createSocket: call },
    global: { fetch: fetchCall },
  };
  if (activate) install(primitives, env);
  return { ...primitives, call, fetchCall, inspect, canonical };
}

describe("owned filesystem confinement", () => {
  it("delivers credential lstat callback EACCES asynchronously once without filesystem calls", async () => {
    const p = setup();
    const io = p.fs as unknown as Record<string, (...args: unknown[]) => unknown>;
    for (const file of [
      "/Users/gianelo/.aws",
      `${root}/.aws`,
      `${owned}/.aws`,
      new URL("file:///mock/.aws/credentials"),
      Buffer.from("/mock/.aws"),
    ]) {
      const callback = vi.fn();
      expect(() => io.lstat?.(file, { bigint: true }, callback)).not.toThrow();
      expect(callback).not.toHaveBeenCalled();
      await Promise.resolve();
      expect(callback).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ message: "DENIED owned contact isolation", code: "EACCES" }),
      );
      await Promise.resolve();
      expect(callback).toHaveBeenCalledTimes(1);
      expect(p.call).not.toHaveBeenCalled();
      expect(p.inspect).not.toHaveBeenCalled();
      expect(p.canonical).not.toHaveBeenCalled();
    }
  });
  it("lets the installed Watchpack scan callback handle denied mock metadata without throwing", async () => {
    // Extract only the actual compiled callback; never instantiate a native watcher.
    const source = nativeRead(require.resolve("next/dist/compiled/watchpack/watchpack.js"), "utf8");
    const marker = "r.lstat(t,((i,s)=>{if(this.closed)return;if(i)";
    const position = source.indexOf(marker);
    expect(position).toBeGreaterThan(-1);
    const end = source.indexOf("c()}))", position);
    expect(end).toBeGreaterThan(position);
    const completed = vi.fn();
    const watcher = { closed: false, setMissing: vi.fn(), onScanError: vi.fn() };
    const file = `${root}/.aws`;
    const callback = runInNewContext(
      source.slice(position + "r.lstat(t,(".length, end + "c()}".length),
      Object.assign(watcher, { t: file, e: true, c: completed }),
    );
    const p = setup();
    const io = p.fs as unknown as Record<string, (...args: unknown[]) => unknown>;
    expect(() => io.lstat?.(file, callback)).not.toThrow();
    expect(completed).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(watcher.setMissing).toHaveBeenCalledExactlyOnceWith(file, true, "scan (EACCES)");
    expect(watcher.onScanError).not.toHaveBeenCalled();
    expect(completed).toHaveBeenCalledOnce();
    expect(p.call).not.toHaveBeenCalled();
    expect(p.inspect).not.toHaveBeenCalled();
    expect(p.canonical).not.toHaveBeenCalled();
  });
  it("keeps other credential APIs synchronous and ordinary lstat callback passthrough", () => {
    const p = setup();
    const io = p.fs as unknown as Record<string, (...args: unknown[]) => unknown>;
    const asyncIo = p.fs.promises as unknown as typeof io;
    const callback = vi.fn();
    for (const name of ["lstatSync", "readFile", "readFileSync", "stat"])
      expect(() => io[name]?.("/mock/.aws", callback)).toThrow("DENIED owned contact isolation");
    expect(() => io.lstat?.("/mock/.aws")).toThrow(/DENIED/);
    expect(() => io.lstat?.(7, callback)).toThrow(/DENIED/);
    expect(() => asyncIo.lstat?.("/mock/.aws")).toThrow(/DENIED/);
    expect(callback).not.toHaveBeenCalled();
    expect(p.call).not.toHaveBeenCalled();
    expect(p.inspect).not.toHaveBeenCalled();
    expect(p.canonical).not.toHaveBeenCalled();
    expect(io.lstat?.(`${root}/app`, callback)).toBe("native");
    expect(p.call).toHaveBeenCalledExactlyOnceWith(`${root}/app`, callback);
  });
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

describe("owned loopback lookup", () => {
  it.each(["options", "all", "callback"])(
    "synthesizes loopback lookup asynchronously once without native DNS: %s",
    async (shape) => {
      const p = setup();
      const callback = vi.fn();
      const args =
        shape === "callback"
          ? ["127.0.0.1", callback]
          : ["127.0.0.1", shape === "all" ? { all: true } : { family: undefined }, callback];
      p.dns.lookup(...args);
      expect(callback).not.toHaveBeenCalled();
      await Promise.resolve();
      expect(callback.mock.calls).toEqual([
        shape === "all" ? [null, [{ address: "127.0.0.1", family: 4 }]] : [null, "127.0.0.1", 4],
      ]);
      await Promise.resolve();
      expect(callback).toHaveBeenCalledTimes(1);
      expect(p.call).not.toHaveBeenCalled();
    },
  );
  it("executes Node lookupAndListen with mocked cluster listening only", async () => {
    const source = (process as unknown as { binding(name: string): { net: string } }).binding(
      "natives",
    ).net;
    const start = source.indexOf("function lookupAndListen(");
    expect(start).toBeGreaterThan(-1);
    const end = source.indexOf("\n}", start) + 2;
    const p = setup();
    const listenInCluster = vi.fn();
    const caller = runInNewContext(`(${source.slice(start, end)})`, {
      dns: p.dns,
      filterOnlyValidAddress: (addresses: { family: number }[]) =>
        addresses.find((address) => address.family === 4),
      listenInCluster,
    });
    const server = { _listeningId: 1, emit: vi.fn() };
    p.call.mockImplementationOnce(() => {
      caller(server, 31468, "127.0.0.1", 511, false, 0);
      return "native";
    });
    p.net.Server.prototype.listen({ host: "127.0.0.1", port: 31468 });
    expect(listenInCluster).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(listenInCluster).toHaveBeenCalledExactlyOnceWith(
      server,
      "127.0.0.1",
      31468,
      4,
      511,
      undefined,
      false,
      0,
    );
    expect(server.emit).not.toHaveBeenCalled();
    // Only the mock listener ran, never the mock standing in for native DNS.
    expect(p.call).toHaveBeenCalledExactlyOnceWith({ host: "127.0.0.1", port: 31468 });
  });
  it("supports only IPv4 family signatures and rejects every other DNS path", async () => {
    const p = setup();
    const callback = vi.fn();
    for (const options of [undefined, 0, 4, { family: 0 }, { family: 4, all: false }])
      p.dns.lookup("127.0.0.1", options, callback);
    await Promise.resolve();
    expect(callback.mock.calls).toEqual(Array(5).fill([null, "127.0.0.1", 4]));
    callback.mockClear();
    for (const host of ["localhost", "example.invalid", "127.0.0.2", "::1", "127.0.0.1."])
      expect(() => p.dns.lookup(host, callback)).toThrow(/DENIED/);
    for (const options of [
      6,
      null,
      "4",
      [],
      { family: 6 },
      { family: "4" },
      { all: 1 },
      { hints: 0 },
    ])
      expect(() => p.dns.lookup("127.0.0.1", options, callback)).toThrow(/DENIED/);
    expect(() => p.dns.lookup("127.0.0.1")).toThrow(/DENIED/);
    for (const method of [
      p.dns.lookupPromise,
      p.dns.lookupService,
      p.dns.resolve,
      p.dns.resolve4,
      p.dns.reverse,
      p.dns.Resolver.prototype.resolve4,
      p.dns.promises.lookup,
      p.dns.promises.reverse,
      p.dns.promises.resolve4,
      p.dns.promises.Resolver.prototype.resolve4,
    ])
      expect(() => method("127.0.0.1", callback)).toThrow(/DENIED/);
    for (const options of [
      { host: "127.0.0.1", port: 31468, fd: 7 },
      { host: "127.0.0.1", port: 31468, path: "/mock/socket" },
    ])
      expect(() => p.net.Server.prototype.listen(options)).toThrow(/DENIED/);
    await Promise.resolve();
    expect(callback).not.toHaveBeenCalled();
    expect(p.call).not.toHaveBeenCalled();
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
  it.each(["\n\n", "\r\n\r\n"])(
    "real application and Resend SDK propagate the marked provider error, never success (%j)",
    async (separator) => {
      const p = setup();
      const responses: unknown[] = [];
      const texts: string[] = [];
      vi.stubGlobal("fetch", async (input: string, options: RequestInit) => {
        texts.push(JSON.parse(String(options.body)).text);
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
            message: `Falta una zona en la ciudad.${separator}[owned-provider-error]`,
          },
          { mailer },
        ).catch((error: unknown) => error);
        expect(texts).toEqual([
          `Owned Test <visitor@owned.invalid> escribió desde "Escribinos":\n\nFalta una zona en la ciudad.${separator}[owned-provider-error]`,
        ]);
        expect(responses).toEqual([{ name: "validation_error", message: "owned provider error" }]);
        expect(result).toBeInstanceOf(ContactMailerSendError);
        expect((result as Error).message).toContain("owned provider error");
        expect(p.call).not.toHaveBeenCalled();
        expect(p.fetchCall).not.toHaveBeenCalled();
      } finally {
        vi.unstubAllGlobals();
      }
    },
  );
  it.each([
    "ordinary synthetic message",
    "synthetic\n\n[owned-provider-error] continued",
    "synthetic\r\n\r\n[owned-provider-error]\n",
    "synthetic\n[owned-provider-error]",
    "synthetic\n\n\n[owned-provider-error]",
    "synthetic\r\n\r\n\r\n[owned-provider-error]",
    "synthetic\n\r\n[owned-provider-error]",
    "synthetic\r\r[owned-provider-error]",
  ])("keeps ordinary and near-miss SDK messages successful: %j", async (text) => {
    const p = setup();
    const response = await p.global.fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${synthetic.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: synthetic.AUTH_MAIL_FROM,
        to: synthetic.CONTACT_MAIL_TO,
        subject: "Zona",
        text,
      }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: "owned-contact-message" });
    expect(p.call).not.toHaveBeenCalled();
    expect(p.fetchCall).not.toHaveBeenCalled();
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
