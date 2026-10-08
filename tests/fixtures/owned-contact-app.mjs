import { writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import isolation from "./owned-contact-isolation.cjs";

export const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
export const appOrigin = "http://127.0.0.1:31467";
export const preload = path.join(repoRoot, "tests/fixtures/owned-contact-isolation.cjs");
export const appEnv = Object.freeze({
  ...isolation.synthetic,
  OWNED_CONTACT_APP_MODE: "dev-webpack",
  DATABASE_URL: "postgresql://owned:owned@127.0.0.1-pooler.rentas.invalid:55437/owned_contact",
  NEON_FETCH_ENDPOINT: "http://127.0.0.1:55438/sql",
  AUTH_URL: appOrigin,
  SITE_URL: appOrigin,
  NEXT_PUBLIC_SITE_URL: appOrigin,
  AUTH_SECRET: "owned-contact-synthetic-secret-not-for-production",
  AUTH_TRUST_HOST: "true",
  NEXT_TELEMETRY_DISABLED: "1",
  NODE_ENV: "development",
  NODE_OPTIONS: `--require=${preload}`,
});
export function validateEnv(env) {
  for (const [key, value] of Object.entries(appEnv)) {
    if (env[key] !== value) throw new Error(`DENIED owned app configuration: ${key}`);
  }
}

// Browser traffic has a stricter boundary than the Node DB/app allowlist.
export function proxyHandler(request = http.request) {
  return (incoming, response) => {
    let url;
    try {
      url = new URL(incoming.url);
    } catch {
      response.writeHead(403).end();
      return;
    }
    if (
      url.origin !== appOrigin ||
      url.username ||
      url.password ||
      incoming.headers.host !== "127.0.0.1:31467" ||
      incoming.headers.authorization ||
      incoming.headers["proxy-authorization"]
    ) {
      response.writeHead(403).end();
      return;
    }
    const headers = { ...incoming.headers };
    delete headers["proxy-connection"];
    const upstream = request(
      {
        protocol: "http:",
        hostname: "127.0.0.1",
        port: 31467,
        method: incoming.method,
        path: url.pathname + url.search,
        headers,
      },
      (reply) => {
        response.writeHead(reply.statusCode, reply.headers);
        reply.pipe(response);
      },
    );
    upstream.on("error", () => response.writeHead(502).end());
    incoming.pipe(upstream);
  };
}
function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen({ host: "127.0.0.1", port }, resolve);
  });
}
function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
    server.closeAllConnections();
  });
}
export async function startOwnedApp(env, factories = {}) {
  validateEnv(env);
  if (!(factories.preloaded ?? isolation.isPreloaded)()) throw new Error("DENIED missing preload");
  const tsconfigPath = ".tmp/rentoru-f367-browser/tsconfig.json";
  await (factories.writeFile ?? writeFile)(
    path.join(repoRoot, tsconfigPath),
    JSON.stringify(
      {
        extends: "../../tsconfig.json",
        compilerOptions: { incremental: false, tsBuildInfoFile: "./next/owned.tsbuildinfo" },
        include: [
          "../../next-env.d.ts",
          "../../app/**/*.ts",
          "../../app/**/*.tsx",
          "../../src/**/*.ts",
          "../../src/**/*.tsx",
          "../../components/**/*.tsx",
          "next/types/**/*.ts",
        ],
        exclude: ["../../node_modules"],
      },
      null,
      2,
    ),
  );
  const next = factories.next ?? (await import("next")).default;
  const createServer = factories.createServer ?? http.createServer;
  const app = next({
    dev: true,
    dir: repoRoot,
    hostname: "127.0.0.1",
    port: 31467,
  });
  let server;
  let sink;
  const stop = async () => {
    if (sink?.listening) await close(sink);
    if (server?.listening) await close(server);
    await app.close();
  };
  try {
    await app.prepare();
    server = createServer(app.getRequestHandler());
    sink = createServer(proxyHandler(factories.request));
    sink.on("connect", (_request, socket) => socket.end("HTTP/1.1 403 Forbidden\r\n\r\n"));
    sink.on("upgrade", (_request, socket) => socket.destroy());
    await listen(sink, 31468);
    await listen(server, 31467);
    return { stop };
  } catch (error) {
    await stop();
    throw error;
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const owned = await startOwnedApp(process.env);
  for (const signal of ["SIGINT", "SIGTERM"])
    process.once(signal, async () => {
      await owned.stop();
      process.exit(0);
    });
}
