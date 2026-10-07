// Test-only preload. Importing this module does not patch native primitives.
const path = require("node:path");
const { fileURLToPath } = require("node:url");
const synthetic = Object.freeze({
  OWNED_CONTACT_ISOLATION: "rentoru-f367",
  RESEND_API_KEY: "re_owned_contact_synthetic",
  AUTH_MAIL_FROM: "Rentoru Test <sender@owned.invalid>",
  CONTACT_MAIL_TO: "recipient@owned.invalid",
});
const ports = new Set([55437, 55438, 31467]);
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
function install(p, env) {
  for (const [key, value] of Object.entries(synthetic)) {
    if (env[key] !== value) denied();
  }
  for (const name of ["readFileSync", "readFile", "openSync", "open", "createReadStream"]) {
    wrap(p.fs, name, ([file]) => checkRead(file));
  }
  for (const name of ["readFile", "open"]) {
    wrap(p.fs.promises, name, ([file]) => checkRead(file));
  }
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
      const failed =
        typeof body.text === "string" && body.text.endsWith("\n\n[owned-provider-error]");
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
}
module.exports = { install, synthetic };
// Node's --require loader identifies itself before Next can load dotenv.
if (module.parent?.id === "internal/preload") preload(process.env);
