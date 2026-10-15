const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { mkdtempSync, writeFileSync } = require("node:fs");
const { createRequire } = require("node:module");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");

// Exercise the installed runner and actual measure configuration, not a tracing mock.
// Synthetic about:blank content only: no Next server, navigation, DB or app credentials.
test("manual contexts retain browser trace on unexpected failure but not success", async () => {
  const dir = mkdtempSync(join(tmpdir(), "rentoru-measure-trace-"));
  const library = require.resolve("@playwright/test");
  const config = join(dir, "probe.config.ts");
  writeFileSync(
    config,
    `
import base from ${JSON.stringify(resolve("playwright.measure.config.ts"))};
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
const ownedTemp = ${JSON.stringify(dir)};
assert.equal(tmpdir(), ownedTemp, "runner temp must remain child-owned");
for (const key of ["TMPDIR", "TMP", "TEMP"]) {
  assert.equal(process.env[key], ownedTemp, key + " must remain child-owned");
}
assert.equal(process.env.NODE_COMPILE_CACHE, ${JSON.stringify(join(dir, "node-compile-cache"))}, "runner compile cache must remain child-owned");
export default { ...base, webServer: undefined, testDir: ${JSON.stringify(dir)},
  testMatch: "probe.spec.cjs", outputDir: ${JSON.stringify(join(dir, "results"))},
  reporter: "json", workers: 1 };
`,
  );
  writeFileSync(
    join(dir, "probe.spec.cjs"),
    `
const { test } = require(${JSON.stringify(library)});
for (const fail of [true, false]) {
  test(fail ? "manual context failure" : "manual context success", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    try {
      const page = await context.newPage();
      await page.setContent("<p>trace probe</p>");
      if (fail) throw new Error("CONTROLLED_MEASURE_TRACE_FAILURE");
    } finally { await context.close(); }
  });
}
`,
  );
  const env = Object.fromEntries(
    ["PATH", "HOME", "PLAYWRIGHT_BROWSERS_PATH"]
      .filter((key) => process.env[key] !== undefined)
      .map((key) => [key, process.env[key]]),
  );
  const result = spawnSync(
    process.execPath,
    [require.resolve("@playwright/test/cli"), "test", "--config", config],
    {
      encoding: "utf8",
      env: {
        ...env,
        CI: "1",
        NODE_ENV: "test",
        COREPACK_ENABLE_NETWORK: "0",
        TMPDIR: dir,
        TMP: dir,
        TEMP: dir,
        NODE_COMPILE_CACHE: join(dir, "node-compile-cache"),
      },
    },
  );
  assert.equal(result.status, 1, "only the deliberate probe failure is expected");
  const report = JSON.parse(result.stdout);
  const specs = report.suites.flatMap((suite) => suite.specs);
  const failed = specs.find((spec) => spec.title === "manual context failure")?.tests[0]
    ?.results[0];
  const passed = specs.find((spec) => spec.title === "manual context success")?.tests[0]
    ?.results[0];
  assert.match(JSON.stringify(failed), /CONTROLLED_MEASURE_TRACE_FAILURE/);
  assert.equal(passed?.status, "passed");
  const attachment = failed.attachments.find((item) => item.name === "trace");
  assert.ok(attachment, "manual context failure must retain a trace ZIP");
  assert.equal(passed.attachments.filter((item) => item.name === "trace").length, 0);

  // Reuse the ZIP reader already bundled/exported by the pinned Playwright version.
  const testRequire = createRequire(require.resolve("@playwright/test/package.json"));
  const runnerRequire = createRequire(testRequire.resolve("playwright/package.json"));
  const {
    utils: { ZipFile },
  } = runnerRequire("playwright-core/lib/coreBundle");
  const zip = new ZipFile(attachment.path);
  try {
    const entries = await zip.entries();
    assert.ok(entries.includes("test.trace"), "runner events must be present");
    const browserTraces = entries.filter(
      (entry) => entry.endsWith(".trace") && entry !== "test.trace",
    );
    assert.ok(browserTraces.length > 0, "a runner-only trace cannot diagnose the manual context");
    const data = (await Promise.all(browserTraces.map((entry) => zip.read(entry)))).join("\n");
    assert.match(data, /"type":"context-options"/);
    assert.match(data, /setContent/);
  } finally {
    zip.close();
  }
});
