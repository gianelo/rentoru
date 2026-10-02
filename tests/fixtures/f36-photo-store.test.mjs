import assert from "node:assert/strict";
import { request } from "node:http";
import test from "node:test";
import { MAX_BODY_BYTES, startPhotoStore } from "./f36-photo-store.mjs";

async function fixture(t) {
  const store = await startPhotoStore({ port: 0 });
  t.after(() => store.close());
  return store;
}

function raw(url, path, options = {}) {
  return new Promise((resolve, reject) => {
    const { body, ...headers } = options;
    const req = request(url, { path, ...headers }, (res) => {
      res.resume();
      res.on("end", () => resolve(res.statusCode));
    });
    req.on("error", reject);
    req.end(body);
  });
}

test("PUT GET DELETE preserve photo bytes, type and presigned keys", async (t) => {
  const { url } = await fixture(t);
  const key = "/f36-photos/incoming/publisher/draft/photo%20one.jpg";
  const bytes = Buffer.from([0, 255, 216, 10, 128, 0]);
  const put = await fetch(`${url}${key}?X-Amz-Signature=fixture`, {
    method: "PUT",
    headers: { "Content-Type": "image/jpeg" },
    body: bytes,
  });
  assert.equal(put.status, 200);
  const get = await fetch(`${url}${key}`);
  assert.equal(get.headers.get("content-type"), "image/jpeg");
  assert.deepEqual(Buffer.from(await get.arrayBuffer()), bytes);
  assert.equal((await fetch(`${url}${key}`, { method: "DELETE" })).status, 204);
  assert.equal((await fetch(`${url}${key}`)).status, 404);
  assert.equal((await fetch(`${url}${key}`, { method: "DELETE" })).status, 204);
});

test("binding guard and collision fail closed; close is repeatable", async (t) => {
  await assert.rejects(startPhotoStore({ host: "0.0.0.0", port: 0 }), /loopback/);
  for (const port of [3000, 3100, 55435, 5545, -1, 65536]) {
    await assert.rejects(startPhotoStore({ port }), /Invalid fixture port/);
  }
  const store = await fixture(t);
  assert.equal(new URL(store.url).hostname, "127.0.0.1");
  await assert.rejects(startPhotoStore({ port: Number(new URL(store.url).port) }), /EADDRINUSE/);
  await store.close();
  await store.close();
  await assert.rejects(fetch(`${store.url}/f36-photos/photo`));
});

test("CORS permits only local app origins and AWS upload headers", async (t) => {
  const { url } = await fixture(t);
  for (const origin of ["http://localhost:3001", "http://127.0.0.1:3001"]) {
    const res = await fetch(`${url}/f36-photos/photo`, {
      method: "OPTIONS",
      headers: { Origin: origin },
    });
    assert.equal(res.status, 204);
    assert.equal(res.headers.get("access-control-allow-origin"), origin);
    assert.match(res.headers.get("access-control-allow-headers"), /content-type/);
    assert.match(res.headers.get("access-control-allow-headers"), /x-amz-checksum-crc32/);
  }
  const denied = await fetch(`${url}/f36-photos/photo`, {
    method: "PUT",
    headers: { Origin: "https://external.example" },
    body: "not stored",
  });
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.get("access-control-allow-origin"), null);
  assert.equal((await fetch(`${url}/f36-photos/photo`)).status, 404);
});

test("bucket and path guards reject malformed or traversal keys", async (t) => {
  const { url } = await fixture(t);
  for (const path of [
    "/other/photo",
    "/f36-photos",
    "/f36-photos/",
    "/f36-photos/a//b",
    "/f36-photos/../photo",
    "/f36-photos/%2e%2e/photo",
    "/f36-photos/a%2Fb",
    "/f36-photos/%00",
    "/f36-photos/%ZZ",
    "/f36-photos/a%5Cb",
  ]) {
    assert.equal(await raw(url, path, { method: "PUT" }), 400, path);
  }
  assert.equal(await raw(url, "/f36-photos/photo", { method: "POST" }), 405);
});

test("oversize bodies return 413 without replacing existing bytes", async (t) => {
  const { url } = await fixture(t);
  const target = `${url}/f36-photos/photo`;
  await fetch(target, { method: "PUT", body: "original" });
  const res = await fetch(target, {
    method: "PUT",
    body: Buffer.alloc(MAX_BODY_BYTES + 1),
  });
  assert.equal(res.status, 413);
  assert.equal(await (await fetch(target)).text(), "original");
  const missing = `${url}/f36-photos/missing`;
  assert.equal(
    (
      await fetch(missing, {
        method: "PUT",
        body: Buffer.alloc(MAX_BODY_BYTES + 1),
      })
    ).status,
    413,
  );
  assert.equal((await fetch(missing)).status, 404);
  assert.equal(
    await raw(url, "/f36-photos/chunked", {
      method: "PUT",
      body: Buffer.alloc(MAX_BODY_BYTES + 1),
      headers: { "Transfer-Encoding": "chunked" },
    }),
    413,
  );
  assert.equal((await fetch(`${url}/f36-photos/chunked`)).status, 404);
});

test("aborted uploads never store partial bytes and close stops live sockets", async (t) => {
  const store = await fixture(t);
  const req = request(`${store.url}/f36-photos/partial`, { method: "PUT" });
  req.on("error", () => {});
  req.write("partial");
  await new Promise((resolve) => req.on("socket", (socket) => socket.on("connect", resolve)));
  assert.equal((await fetch(`${store.url}/f36-photos/partial`)).status, 404);
  req.destroy();
  assert.equal((await fetch(`${store.url}/f36-photos/partial`)).status, 404);
  // A second unfinished upload must not prevent deterministic shutdown.
  const pending = request(`${store.url}/f36-photos/pending`, { method: "PUT" });
  pending.on("error", () => {});
  pending.write("unfinished");
  await new Promise((resolve) => pending.on("socket", (socket) => socket.on("connect", resolve)));
  const disconnected = new Promise((resolve) => pending.on("close", resolve));
  await store.close();
  await disconnected;
});
