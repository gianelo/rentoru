// Test-only preload. Importing this module does not patch native primitives.
const path = require("node:path");
const { fileURLToPath } = require("node:url");
const synthetic = Object.freeze({
  OWNED_CONTACT_ISOLATION: "rentoru-f367",
  RESEND_API_KEY: "re_owned_contact_synthetic",
  AUTH_MAIL_FROM: "Rentoru Test <sender@owned.invalid>",
  CONTACT_MAIL_TO: "recipient@owned.invalid",
});
const ports = new Set([55437, 55438, 31467, 31468]);
let preloaded = false;
function denied() {
  throw new Error("DENIED owned contact isolation");
}
function checkRead(file) {
  // An inherited descriptor has no verifiable pathname.
  if (typeof file === "number") denied();
  const absolute = path.resolve(file instanceof URL ? fileURLToPath(file) : String(file));
  if (
    /(^|\/)(\.env(?:\.[^/]*)?|\.npmrc|\.netrc|credentials|id_rsa|id_ed25519|[^/]*\.pem|[^/]*\.key)(\/|$)/i.test(
      absolute,
    ) ||
    /\/(\.ssh|\.aws|\.gnupg|\.config\/gcloud|Keychains)(\/|$)/i.test(absolute)
  )
    denied();
}
function endpoint(host, port) {
  if (host !== "127.0.0.1" || !ports.has(Number(port))) denied();
}
function checkSocket(args) {
  // net.connect() passes its normalized argument array to Socket.connect().
  if (Array.isArray(args[0])) args = args[0];
  const first = args[0];
  if (first && typeof first === "object") {
    if (first.path || first.fd !== undefined) denied();
    endpoint(first.host, first.port);
  } else {
    endpoint(args[1], first);
  }
}
function checkHttp(input, options, protocol) {
  if (typeof input === "string" || input instanceof URL) {
    const url = new URL(input);
    if (url.protocol !== "http:" || url.username || url.password) denied();
    endpoint(url.hostname, url.port);
  } else {
    options = input;
  }
  if (options && typeof options === "object") {
    if (options.socketPath || (options.protocol && options.protocol !== "http:")) denied();
    endpoint(options.hostname ?? options.host, options.port);
  }
  if (protocol !== "http:") denied();
}
function wrap(target, name, check) {
  const original = target[name];
  target[name] = function (...args) {
    check(args);
    return original.apply(this, args);
  };
}
// Next's declaration keeps its root identity; only its bytes live in owned output.
const root = path.resolve(__dirname, "../..");
const owned = path.join(root, ".tmp/rentoru-f367-browser");
const declaration = path.join(root, "next-env.d.ts");
const cached = path.join(owned, "generated/next-env.d.ts");
function installFiles(fs) {
  const inspect = fs.lstatSync.bind(fs);
  const canonical = fs.realpathSync.bind(fs);
  const descriptors = new Set();
  const constants = require("node:fs").constants;
  const writeMask =
    constants.O_WRONLY |
    constants.O_RDWR |
    constants.O_CREAT |
    constants.O_TRUNC |
    constants.O_APPEND;
  const writable = (flags) =>
    typeof flags === "number" ? Boolean(flags & writeMask) : /[wa+]/.test(flags ?? "r");
  const fd = (value, stdout = false) => {
    if (!descriptors.has(value) && !(stdout && (value === 1 || value === 2))) denied();
  };
  function validate(file) {
    if (file !== owned && !file.startsWith(`${owned}${path.sep}`)) denied();
    for (let ancestor = file; ; ancestor = path.dirname(ancestor)) {
      try {
        if (inspect(ancestor).isSymbolicLink() || canonical(ancestor) !== ancestor) denied();
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      if (ancestor === root) break;
    }
  }
  function map(file, mutation = false) {
    if (typeof file === "number") {
      if (!mutation) denied();
      fd(file);
      return file;
    }
    checkRead(file);
    const absolute = path.resolve(file instanceof URL ? fileURLToPath(file) : String(file));
    const physical = absolute === declaration ? cached : absolute;
    if (mutation || physical === cached || physical.startsWith(`${owned}${path.sep}`))
      validate(physical);
    return mutation || absolute === declaration || physical.startsWith(`${owned}${path.sep}`)
      ? physical
      : file;
  }
  function identity(result) {
    return Buffer.isBuffer(result) ? Buffer.from(declaration) : declaration;
  }
  function wrapFile(target, name, original) {
    if (typeof original !== "function") return;
    const base = name.replace(/Sync$/, "");
    const opening = base === "open";
    target[name] = function (...args) {
      // Watchpack expects permission failures through fs.lstat's asynchronous callback.
      // Only credential-policy denial is translated; no filesystem primitive runs.
      if (target === fs && name === "lstat" && typeof args[0] !== "number") {
        const callback = args.at(-1);
        if (typeof callback === "function") {
          try {
            checkRead(args[0]);
          } catch (error) {
            if (error.message !== "DENIED owned contact isolation") throw error;
            error.code = "EACCES";
            queueMicrotask(() => callback(error));
            return;
          }
        }
      }
      // No link creation or recursive traversal that could introduce unvalidated descendants.
      if (/^(link|symlink|cp)$/.test(base)) denied();
      if (/^(write|writev|ftruncate|fchmod|fchown|futimes)$/.test(base))
        fd(args[0], /^write/.test(base));
      else if (base === "close") descriptors.delete(args[0]);
      else if (base === "rename") {
        args[0] = map(args[0], true);
        args[1] = map(args[1], true);
      } else if (base === "copyFile") {
        args[0] = map(args[0]);
        args[1] = map(args[1], true);
      } else {
        if (base === "createReadStream" && args[1]?.fd !== undefined) denied();
        const stream = base === "createWriteStream";
        if (stream && args[1]?.fd !== undefined) {
          fd(args[1].fd, true);
          return original.apply(this, args);
        }
        const mutation =
          stream ||
          (opening && writable(args[1])) ||
          /^(writeFile|appendFile|truncate|mkdir|mkdtemp|rmdir|rm|unlink|chmod|chown|utimes|lutimes|lchmod|lchown)$/.test(
            base,
          );
        const virtual =
          base === "realpath" &&
          path.resolve(args[0] instanceof URL ? fileURLToPath(args[0]) : String(args[0])) ===
            declaration;
        args[0] = map(args[0], mutation);
        const transform = (result) => {
          if (opening && writable(args[1])) {
            descriptors.add(typeof result === "number" ? result : result.fd);
          }
          if (opening && result && typeof result === "object") {
            for (const method of [
              "write",
              "writev",
              "writeFile",
              "appendFile",
              "truncate",
              "chmod",
              "chown",
              "utimes",
            ]) {
              wrap(result, method, () => fd(result.fd));
            }
            wrap(result, "close", () => descriptors.delete(result.fd));
          }
          return virtual ? identity(result) : result;
        };
        const callback = args.at(-1);
        if ((opening || virtual) && typeof callback === "function") {
          args[args.length - 1] = (error, result) =>
            callback(error, error ? result : transform(result));
        }
        const result = original.apply(this, args);
        if ((opening || virtual) && typeof callback !== "function") {
          return target === fs.promises || result?.then
            ? Promise.resolve(result).then(transform)
            : transform(result);
        }
        return result;
      }
      return original.apply(this, args);
    };
    if (original.native) {
      const native = {};
      wrapFile(native, name, original.native);
      target[name].native = native[name];
    }
  }
  const operations =
    /^(readFile|open|createReadStream|createWriteStream|stat|lstat|access|exists|realpath|readdir|opendir|readlink|writeFile|appendFile|truncate|mkdir|mkdtemp|rmdir|rm|unlink|chmod|chown|utimes|lutimes|lchmod|lchown|rename|copyFile|link|symlink|cp|write|writev|ftruncate|fchmod|fchown|futimes|close)(Sync)?$/;
  for (const target of [fs, fs.promises]) {
    for (const name of Object.keys(target)) {
      if (operations.test(name)) wrapFile(target, name, target[name]);
    }
  }
}
function install(p, env) {
  for (const [key, value] of Object.entries(synthetic)) {
    if (env[key] !== value) denied();
  }
  installFiles(p.fs);
  wrap(p.net.Socket.prototype, "connect", checkSocket);
  wrap(p.net.Server.prototype, "listen", checkSocket);
  for (const [transport, protocol] of [
    [p.http, "http:"],
    [p.https, "https:"],
  ]) {
    for (const name of ["request", "get"]) {
      wrap(transport, name, ([input, options]) => checkHttp(input, options, protocol));
    }
  }
  // Cover resolve* variants and Resolver instances, not only lookup().
  for (const target of [
    p.dns,
    p.dns.promises,
    p.dns.Resolver?.prototype,
    p.dns.promises.Resolver?.prototype,
  ]) {
    if (!target) continue;
    for (const name of Object.getOwnPropertyNames(target)) {
      if (/^(lookup|resolve|reverse)/.test(name) && typeof target[name] === "function")
        target[name] = denied;
    }
  }
  // Node listen's lookupAndListen asks for all addresses even for a literal IP.
  // Synthesize only this exact loopback; never retain or invoke native DNS.
  p.dns.lookup = (hostname, options, callback) => {
    if (typeof options === "function") {
      callback = options;
      options = undefined;
    }
    if (hostname !== "127.0.0.1" || typeof callback !== "function") denied();
    if (typeof options === "number") options = { family: options };
    if (options !== undefined) {
      if (!options || typeof options !== "object" || Array.isArray(options)) denied();
      if (Object.keys(options).some((key) => key !== "family" && key !== "all")) denied();
      if (options.family !== undefined && options.family !== 0 && options.family !== 4) denied();
      if (options.all !== undefined && typeof options.all !== "boolean") denied();
    }
    queueMicrotask(() => {
      if (options?.all) callback(null, [{ address: "127.0.0.1", family: 4 }]);
      else callback(null, "127.0.0.1", 4);
    });
  };
  p.dgram.createSocket = denied;
  const nativeFetch = p.global.fetch;
  p.global.fetch = async function (input, options = {}) {
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
    if (url.href === "https://api.resend.com/emails") {
      // Only the known SDK POST shape is simulated; never call native fetch.
      if (
        options.method !== "POST" ||
        new Headers(options.headers).get("authorization") !== `Bearer ${synthetic.RESEND_API_KEY}`
      )
        denied();
      const body = JSON.parse(options.body);
      const to = Array.isArray(body.to) ? body.to : [body.to];
      if (
        body.from !== synthetic.AUTH_MAIL_FROM ||
        to.length !== 1 ||
        to[0] !== synthetic.CONTACT_MAIL_TO ||
        typeof body.subject !== "string"
      )
        denied();
      // Exactly two LF or CRLF lines and a terminal test marker; no payload normalization.
      const failed =
        typeof body.text === "string" &&
        /(?:^|[^\r\n])(?:\n\n|\r\n\r\n)\[owned-provider-error\](?![\s\S])/.test(body.text);
      return new Response(
        JSON.stringify(
          failed
            ? { name: "validation_error", message: "owned provider error" }
            : { id: "owned-contact-message" },
        ),
        {
          status: failed ? 422 : 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
    checkHttp(url, undefined, "http:");
    // Redirects must not escape the allowlist inside native fetch.
    return nativeFetch.call(this, input, { ...options, redirect: "error" });
  };
}
function preload(env) {
  install(
    {
      fs: require("node:fs"),
      net: require("node:net"),
      http: require("node:http"),
      https: require("node:https"),
      dns: require("node:dns"),
      dgram: require("node:dgram"),
      global: globalThis,
    },
    env,
  );
  require("node:module").syncBuiltinESMExports();
  preloaded = true;
}
module.exports = { install, synthetic, isPreloaded: () => preloaded };
// Node's --require loader identifies itself before Next can load dotenv.
if (module.parent?.id === "internal/preload") preload(process.env);
