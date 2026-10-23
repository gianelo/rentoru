import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { afterEach, expect, it, vi } from "vitest";

afterEach(() => vi.unstubAllEnvs());

it.each(["1", undefined])(
  "records only unexpected failures in CI=%s without changing measure behavior",
  async (ci) => {
    vi.stubEnv("CI", ci);
    vi.resetModules();
    const { default: config } = await import("../playwright.measure.config");
    expect(config.use?.trace).toEqual(
      ci
        ? {
            mode: "retain-on-failure",
            screenshots: false,
            snapshots: true,
            sources: false,
            attachments: false,
          }
        : "off",
    );
    expect(config.retries).toBe(0);
    expect(config.timeout).toBeUndefined();
    expect(config.workers).toBeUndefined();
    expect(config.fullyParallel).toBe(false);
    expect(config.testDir).toBe("./tests/measure");
    expect(config.use?.baseURL).toBe("http://127.0.0.1:3100");
    expect(config.use).not.toHaveProperty("storageState");
    expect(config.use).not.toHaveProperty("httpCredentials");
    expect(config.use).not.toHaveProperty("extraHTTPHeaders");
    expect(config.webServer).toMatchObject({
      timeout: 60000,
      env: {
        MEASURE_HARNESS_ENABLED: "true",
        DATABASE_URL:
          "postgresql://harness:harness@ep-measure-harness-pooler.us-east-2.aws.neon.tech/rentas?sslmode=require",
        SITE_URL: "https://measure-harness-no-es-el-dominio-real.invalid",
      },
    });
  },
);

it("pins every child temp/cache path to the probe-owned directory before spawning", () => {
  const source = readFileSync("scripts/measure-trace.test.cjs", "utf8");
  for (const assignment of [
    "TMPDIR: dir",
    "TMP: dir",
    "TEMP: dir",
    'NODE_COMPILE_CACHE: join(dir, "node-compile-cache")',
  ]) {
    expect(source).toContain(assignment);
  }
  expect(source).toContain(
    'assert.equal(tmpdir(), ownedTemp, "runner temp must remain child-owned")',
  );
});

it("uploads only local measure failure ZIPs with short retention and preserves the original command", () => {
  const require = createRequire(import.meta.url);
  const cli = createRequire(require.resolve("@lhci/cli/package.json"));
  const utils = createRequire(cli.resolve("@lhci/utils/package.json"));
  const workflow = utils("js-yaml").safeLoad(readFileSync(".github/workflows/ci.yml", "utf8"));
  const job = workflow.jobs.measure;
  const index = job.steps.findIndex((step: { id?: string }) => step.id === "measure");
  expect(index).toBeGreaterThan(0);
  expect(job.if).toBe(
    "github.event_name == 'push' && (github.ref != 'refs/heads/dev' || vars.CI_DEV_PROFILE != 'critical')",
  );
  expect(job.env).toBeUndefined();
  expect(job.steps[index - 1].run).toBe("node --test scripts/measure-trace.test.cjs");
  expect(job.steps[index]).toEqual({ id: "measure", run: "pnpm test:measure" });
  expect(job.steps[index + 1]).toEqual({
    name: "Preserve failed local measure traces",
    if: `\${{ !cancelled() && steps.measure.outcome == 'failure' }}`,
    uses: "actions/upload-artifact@v4",
    with: {
      name: `measure-traces-\${{ github.sha }}-\${{ github.run_attempt }}`,
      path: "test-results/**/trace.zip",
      "if-no-files-found": "warn",
      "retention-days": 3,
    },
  });
});
