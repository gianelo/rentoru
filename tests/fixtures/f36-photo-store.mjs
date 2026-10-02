import { createServer } from "node:http";
import { pathToFileURL } from "node:url";

export const MAX_BODY_BYTES = 8 * 1024 * 1024;
const origins = new Set(["http://localhost:3001", "http://127.0.0.1:3001"]);
const allowedHeaders = [
  "content-type",
  "authorization",
  "x-amz-date",
  "x-amz-content-sha256",
  "x-amz-security-token",
  "x-amz-checksum-crc32",
  "x-amz-checksum-crc32c",
  "x-amz-checksum-sha1",
  "x-amz-checksum-sha256",
  "x-amz-sdk-checksum-algorithm",
  "amz-sdk-invocation-id",
  "amz-sdk-request",
].join(", ");

function objectKey(target) {
  const segments = target.split("?")[0].split("/");
  if (segments.shift() !== "" || segments.shift() !== "f36-photos") return null;
  const decoded = segments.map(decodeURIComponent);
  if (
    !decoded.length ||
    decoded.some((part) => !part || part === "." || part === ".." || /\p{Cc}|[/\\]/u.test(part))
  )
    return null;
  return decoded.join("/");
}

export async function startPhotoStore({ port = 0, host = "127.0.0.1" } = {}) {
  if (host !== "127.0.0.1") throw new Error("Only fixed loopback 127.0.0.1 is allowed");
  if (
    !Number.isInteger(port) ||
    port < 0 ||
    port > 65535 ||
    [3000, 3100, 55435, 5545].includes(port)
  )
    throw new Error("Invalid fixture port");
  const objects = new Map();
  const server = createServer((req, res) => {
    res.on("error", () => req.destroy());
    const finish = (status) => {
      req.resume();
      if (res.headersSent || res.destroyed) return;
      res.writeHead(status);
      res.end();
    };
    const origin = req.headers.origin;
    if (origin !== undefined && !origins.has(origin)) return finish(403);
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", "PUT, GET, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", allowedHeaders);
    }
    let key;
    try {
      key = objectKey(req.url);
    } catch {
      return finish(400);
    }
    if (!key) return finish(400);
    if (req.method === "OPTIONS") return finish(204);
    if (req.method === "DELETE") {
      objects.delete(key);
      return finish(204);
    }
    if (req.method === "GET") {
      const object = objects.get(key);
      if (!object) return finish(404);
      res.writeHead(200, { "Content-Type": object.type });
      res.end(object.bytes);
      return;
    }
    if (req.method !== "PUT") return finish(405);
    let chunks = [];
    let size = 0;
    let failed = false;
    const discard = () => {
      failed = true;
      chunks = [];
    };
    req.on("error", () => {
      discard();
      if (!res.destroyed) finish(400);
    });
    req.on("aborted", discard);
    req.on("data", (chunk) => {
      if (failed) return;
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        discard();
        finish(413);
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (failed) return;
      objects.set(key, {
        bytes: Buffer.concat(chunks),
        type: req.headers["content-type"] || "application/octet-stream",
      });
      chunks = [];
      finish(200);
    });
  });
  server.requestTimeout = 5000;
  server.headersTimeout = 5000;
  server.timeout = 5000;
  server.on("clientError", (_error, socket) => {
    if (socket.writable) socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
    else socket.destroy();
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  let closing;
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close() {
      closing ??= new Promise((resolve, reject) => {
        server.close((error) => {
          objects.clear();
          error ? reject(error) : resolve();
        });
        server.closeAllConnections();
      });
      return closing;
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const store = await startPhotoStore({ port: 55437 });
    console.log(`F36 photo byte store listening at ${store.url} (no signature validation)`);
    for (const signal of ["SIGINT", "SIGTERM"])
      process.once(signal, () => {
        void store.close();
      });
  } catch (error) {
    console.error(`F36 photo byte store startup failed: ${error.message}`);
    process.exitCode = 1;
  }
}
