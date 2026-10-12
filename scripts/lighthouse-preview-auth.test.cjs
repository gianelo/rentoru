const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { authorizePreview } = require("./lighthouse-preview-auth.cjs");

const url = "https://preview.example.vercel.app/";
const secret = "private-bypass-value";

test("exchanges bypass only on root and installs only host-scoped cookie", async () => {
  const calls = [];
  const cookies = [];
  await authorizePreview({
    url,
    secret,
    fetch: async (target, options) => {
      calls.push({ target, options });
      return {
        status: 307,
        headers: { get: () => "_vercel_jwt=opaque; Path=/; Secure; HttpOnly; SameSite=Lax" },
      };
    },
    browser: { setCookie: async (...items) => cookies.push(...items) },
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].target, url);
  assert.equal(calls[0].options.redirect, "manual");
  assert.deepEqual(calls[0].options.headers, {
    "x-vercel-protection-bypass": secret,
    "x-vercel-set-bypass-cookie": "true",
  });
  assert.deepEqual(cookies, [
    {
      name: "_vercel_jwt",
      value: "opaque",
      url,
      path: "/",
      secure: true,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  assert.equal(JSON.stringify(cookies).includes(secret), false);
});

test("refuses absent or foreign-domain cookies without leaking credentials", async () => {
  for (const cookie of [
    null,
    "_vercel_jwt=opaque; Domain=vercel.app; Path=/",
    "_vercel_jwt=opaque; Path=/, other=opaque; Path=/",
    "bad cookie=opaque; Path=/subpath",
    "_vercel_jwt=opaque; Path=/; Domain=preview.example.vercel.app",
  ]) {
    let installed = false;
    await assert.rejects(
      authorizePreview({
        url,
        secret,
        fetch: async () => ({ status: 302, headers: { get: () => cookie } }),
        browser: {
          setCookie: async () => {
            installed = true;
          },
        },
      }),
      /bypass cookie unavailable/,
    );
    assert.equal(installed, false);
  }
});

test("accepts one Set-Cookie with an Expires comma", async () => {
  const cookies = [];
  await authorizePreview({
    url,
    secret,
    fetch: async () => ({
      status: 302,
      headers: {
        getSetCookie: () => ["_vercel_jwt=opaque; Expires=Wed, 21 Oct 2027 07:28:00 GMT; Path=/"],
        get: () => assert.fail("must use getSetCookie when available"),
      },
    }),
    browser: { setCookie: async (cookie) => cookies.push(cookie) },
  });
  assert.equal(cookies.length, 1);
  assert.equal(cookies[0].name, "_vercel_jwt");
});

test("refuses multiple Set-Cookie values and domain attributes", async () => {
  for (const values of [
    ["_vercel_jwt=opaque; Path=/", "other=value; Path=/"],
    ["_vercel_jwt=opaque; Expires=Wed, 21 Oct 2027 07:28:00 GMT; Domain=vercel.app; Path=/"],
  ]) {
    await assert.rejects(
      authorizePreview({
        url,
        secret,
        fetch: async () => ({ status: 302, headers: { getSetCookie: () => values } }),
        browser: { setCookie: async () => assert.fail("must not install cookie") },
      }),
      /bypass cookie unavailable/,
    );
  }
});

test("accepts an alternate single host-only cookie name", async () => {
  const cookies = [];
  await authorizePreview({
    url,
    secret,
    fetch: async () => ({
      status: 302,
      headers: { get: () => "vercel_auth=opaque; Path=/; Secure" },
    }),
    browser: { setCookie: async (cookie) => cookies.push(cookie) },
  });
  assert.equal(cookies.length, 1);
  assert.equal(cookies[0].name, "vercel_auth");
  assert.equal(cookies[0].url, url);
  assert.equal(cookies[0].domain, undefined);
});

test("CI probe uses stdin for bypass header and does not request a cookie redirect", () => {
  const ci = readFileSync(new URL("../.github/workflows/ci.yml", `file://${__filename}`), "utf8");
  const probe = ci.slice(ci.indexOf("      - name: Lighthouse budget\n"));
  assert.match(probe, /curl[^\n]*--header @-/);
  assert.doesNotMatch(probe, /curl[^\n]*x-vercel-set-bypass-cookie/);
  assert.doesNotMatch(probe, /curl[^\n]*--header "x-vercel-protection-bypass:/);
});

test("CI resolves executable Chrome only after a 200 preview and before authenticated collection", () => {
  const ci = readFileSync(new URL("../.github/workflows/ci.yml", `file://${__filename}`), "utf8");
  const step = ci.slice(ci.indexOf("      - name: Lighthouse budget\n"));
  const success = step.indexOf('if [ "$status" != "200" ]; then');
  const resolve = step.search(/if \[ -n "\$\{CHROME_PATH:-\}" \]/);
  const collect = step.indexOf("pnpm run budget:lighthouse --collect.puppeteerScript=");
  assert.ok(success >= 0 && resolve > success && collect > resolve);
  assert.match(step, /\[ -x "\$CHROME_PATH" \]/);
  assert.match(step, /command -v "\$candidate"/);
  assert.match(step, /google-chrome google-chrome-stable chromium/);
  assert.match(step, /::error[^\n]*Chrome/);
  assert.match(step, /export CHROME_PATH/);
  assert.doesNotMatch(step.slice(success, collect), /::warning[^\n]*Chrome/);
});

test("refuses unexpected exchange response without following redirect", async () => {
  await assert.rejects(
    authorizePreview({
      url,
      secret,
      fetch: async () => ({ status: 200, headers: { get: () => null } }),
      browser: { setCookie: async () => assert.fail("must not install cookie") },
    }),
    /bypass cookie unavailable/,
  );
});
