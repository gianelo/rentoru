import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, it } from "vitest";

const script = resolve("scripts/lighthouse-summary.mjs");
const secret = "DO_NOT_PUBLISH_SENTINEL";
// Source-derived Lighthouse 12.6.1 shape; these are not measurements of Dev.
function report() {
  return {
    finalUrl: `https://example.test/final?token=${secret}`,
    requestedUrl: `https://example.test/?token=${secret}`,
    screenshots: secret,
    headers: { authorization: secret },
    audits: {
      "largest-contentful-paint": { numericValue: 2707.167 },
      "total-byte-weight": { numericValue: 200000 },
      metrics: {
        details: { items: [{ timeToFirstByte: 700, observedLargestContentfulPaint: 900 }] },
      },
      "largest-contentful-paint-element": {
        details: {
          type: "list",
          items: [
            {
              type: "table",
              items: [
                {
                  node: {
                    type: "node",
                    lhId: `${secret}-IMG`,
                    selector: secret,
                    snippet: secret,
                    nodeLabel: secret,
                    boundingRect: {
                      top: -1,
                      bottom: 199,
                      left: 0,
                      right: 300,
                      width: 300,
                      height: 200,
                      extra: secret,
                    },
                  },
                },
              ],
            },
            {
              type: "table",
              items: [700, 500, 600, 907.167].map((timing) => ({
                phase: secret,
                timing,
                percent: secret,
              })),
            },
          ],
        },
      },
    },
  };
}
function run(files: Record<string, string>) {
  const cwd = mkdtempSync(join(tmpdir(), "lighthouse-summary-"));
  // The fixture is the runner report directory; the CLI never receives credentials.
  const input = join(cwd, ".lighthouseci");
  mkdirSync(input);
  for (const [name, value] of Object.entries(files)) writeFileSync(join(input, name), value);
  const result = spawnSync(process.execPath, [script], { cwd, encoding: "utf8" });
  let output: string | null = null;
  try {
    output = readFileSync(join(input, "diagnostic.json"), "utf8");
  } catch {}
  return { ...result, output };
}

it("exports only allowlisted numeric diagnostics and safe element identity through the CLI", () => {
  const result = run({
    "lhr-1.json": JSON.stringify(report()),
    "flags-1.json": secret,
    "lhr-1.html": secret,
  });
  expect(result.status).toBe(0);
  expect(result.stdout).toBe(`${JSON.stringify(budgetLog())}\n`);
  expect(result.stderr).toBe("");
  expect(result.output).not.toContain(secret);
  expect(JSON.parse(result.output as string)).toEqual({
    schema: "lighthouse-diagnostic/v1",
    runs: [
      {
        lcpMs: 2707.167,
        totalByteWeight: 200000,
        timings: {
          timeToFirstByte: 700,
          lcpLoadStart: null,
          lcpLoadEnd: null,
          observedLargestContentfulPaint: 900,
          observedLoad: null,
          observedDomContentLoaded: null,
        },
        lcpPhasesMs: { ttfb: 700, loadDelay: 500, loadDuration: 600, renderDelay: 907.167 },
        element: {
          tag: "IMG",
          boundingRect: { top: -1, bottom: 199, left: 0, right: 300, width: 300, height: 200 },
        },
      },
    ],
  });
});

it("keeps unavailable phases null instead of inventing zeros or mixing observed timings", () => {
  const data = report();
  data.audits["largest-contentful-paint-element"].details.items.pop();
  const result = run({ "lhr-1.json": JSON.stringify(data) });
  expect(result.status).toBe(0);
  expect(JSON.parse(result.output as string).runs[0].lcpPhasesMs).toBeNull();
});

it("rejects numeric strings and never copies unrecognized element identifiers", () => {
  const data = report();
  const raw = JSON.stringify(data)
    .replace('"numericValue":2707.167', `"numericValue":"${secret}"`)
    .replace(`${secret}-IMG`, secret);
  const result = run({ "lhr-1.json": raw });
  expect(result.status).toBe(0);
  expect(result.output).not.toContain(secret);
  expect(JSON.parse(result.output as string).runs[0]).toMatchObject({
    lcpMs: null,
    element: { tag: "UNKNOWN" },
  });
});

it.each([
  { "flags-1.json": secret },
  { "lhr-1.json": secret },
  { "lhr-1.json": JSON.stringify(report()), "lhr-2.json": secret },
] as Record<string, string>[])("fails without publishing raw or incomplete input: %j", (files) => {
  const result = run(files);
  expect(result.status).toBe(1);
  expect(result.stdout).toBe("");
  expect(result.stderr).toBe("Lighthouse diagnostic unavailable; no valid saved report.\n");
  expect(result.output).toBeNull();
});

function budgetLog(method = "unknown", constraints: unknown[] | null = null, ordinal = 1) {
  return {
    schema: "lighthouse-budget-log/v1",
    ordinal,
    configuredThrottlingMethod: method,
    scoredLcpMs: 2707.167,
    observedLargestContentfulPaintMs: 900,
    pageBytes: 200000,
    scoredLcpPhasesMs: { ttfb: 700, loadDelay: 500, loadDuration: 600, renderDelay: 907.167 },
    assertionScope: "url-aggregate",
    constraints,
  };
}
const assertion = {
  url: report().finalUrl,
  auditId: "largest-contentful-paint",
  name: "maxNumericValue",
  operator: "<=",
  expected: 2500,
  actual: 2600,
  passed: false,
  level: "error",
  extra: secret,
};
const constraint = {
  metric: "largest-contentful-paint",
  unit: "ms",
  limit: 2500,
  actual: 2600,
  delta: 100,
  producerPassed: false,
  level: "error",
};
function expectLog(records: unknown, expected: unknown, data = report()) {
  const baseline = run({ "lhr-1.json": JSON.stringify(data) });
  const result = run({
    "lhr-1.json": JSON.stringify(data),
    "assertion-results.json": typeof records === "string" ? records : JSON.stringify(records),
  });
  expect(result.status).toBe(0);
  expect(result.stdout).toBe(`${JSON.stringify(expected)}\n`);
  expect(result.stderr).toBe("");
  expect(result.output).toBe(baseline.output);
  expect(`${result.stdout}${result.stderr}${result.output}`).not.toContain(secret);
}

it("logs every distinct producer constraint, pass/fail and signed delta, not per-report guesses", () => {
  const byte = {
    ...assertion,
    auditId: "total-byte-weight",
    expected: 512000,
    actual: 210000,
    passed: true,
    level: "warn",
  };
  expectLog(
    [assertion, byte, { ...byte, expected: 235520 }, assertion],
    budgetLog("unknown", [
      constraint,
      {
        metric: "total-byte-weight",
        unit: "bytes",
        limit: 512000,
        actual: 210000,
        delta: -302000,
        producerPassed: true,
        level: "warn",
      },
      {
        metric: "total-byte-weight",
        unit: "bytes",
        limit: 235520,
        actual: 210000,
        delta: -25520,
        producerPassed: true,
        level: "warn",
      },
    ]),
  );
});

it.each([
  "broken",
  "{}",
  "[]",
  '[null,1,"hostile"]',
  JSON.stringify([{ ...assertion, url: report().requestedUrl }]),
  JSON.stringify([{ ...assertion, url: `${report().finalUrl}/wrong` }]),
])("keeps missing, malformed or unmatched assertions unavailable: %s", (records) => {
  expectLog(records, budgetLog());
});

it.each([
  { auditId: secret },
  { name: secret },
  { operator: ">" },
  { actual: "2600" },
  { actual: -1 },
  { actual: null },
  { expected: -1 },
  { expected: "2500" },
  { expected: null },
  { passed: "false" },
  { level: secret },
  { url: "" },
])("rejects invalid assertion fields without leaking or inventing constraints: %j", (patch) => {
  expectLog([{ ...assertion, ...patch }], budgetLog());
});

it("rejects nonfinite JSON numbers and requires a nonempty private final URL", () => {
  expectLog(JSON.stringify([assertion]).replace('"actual":2600', '"actual":1e400'), budgetLog());
  expectLog([{ ...assertion, url: "" }], budgetLog(), { ...report(), finalUrl: "" });
});

it.each(["simulate", "devtools", "provided", secret])(
  "labels only the configured method and separates observed from scored LCP: %s",
  (method) => {
    const data = { ...report(), configSettings: { throttlingMethod: method, extra: secret } };
    expectLog([], budgetLog(method === secret ? "unknown" : method), data);
  },
);

it("emits one ordinal log per sorted report with unchanged artifact ordering", () => {
  const result = run({
    "lhr-2.json": JSON.stringify(report()),
    "lhr-1.json": JSON.stringify(report()),
  });
  expect(result.status).toBe(0);
  expect(result.stdout).toBe(
    `${JSON.stringify(budgetLog())}\n${JSON.stringify(budgetLog("unknown", null, 2))}\n`,
  );
  expect(result.stderr).toBe("");
  const baseline = run({ "lhr-1.json": JSON.stringify(report()) });
  const artifact = JSON.parse(baseline.output as string);
  artifact.runs.push(artifact.runs[0]);
  expect(result.output).toBe(`${JSON.stringify(artifact, null, 2)}\n`);
});

it("only enables passed assertion retention without changing the source budgets", () => {
  const config = JSON.parse(readFileSync("lighthouserc.json", "utf8"));
  expect(config).toEqual({
    ci: {
      collect: {
        numberOfRuns: 3,
        settings: {
          formFactor: "mobile",
          screenEmulation: {
            mobile: true,
            width: 360,
            height: 640,
            deviceScaleFactor: 2,
            disabled: false,
          },
          throttlingMethod: "simulate",
          throttling: {
            rttMs: 150,
            throughputKbps: 1638.4,
            requestLatencyMs: 562.5,
            downloadThroughputKbps: 1474.56,
            uploadThroughputKbps: 675,
            cpuSlowdownMultiplier: 4,
          },
        },
      },
      assert: {
        includePassedAssertions: true,
        assertMatrix: [
          ["^https?://[^/]+/alquiler/[^/]+/[^/]+/[^/?#]*-[0-9]+/?([?#].*)?$", 512000],
          ["^https?://[^/]+/alquiler(/[^/]+){0,2}/?([?#].*)?$", 235520],
          [".*", 235520],
        ].map(([matchingUrlPattern, bytes]) => ({
          matchingUrlPattern,
          aggregationMethod: "median",
          assertions: {
            "largest-contentful-paint": ["error", { maxNumericValue: 2500 }],
            "total-byte-weight": ["error", { maxNumericValue: bytes }],
          },
        })),
      },
      upload: { target: "filesystem", outputDir: "./.lighthouseci" },
    },
  });
});

it("uploads only the sanitized summary after Lighthouse, including assertion failures", () => {
  const require = createRequire(import.meta.url);
  const cli = createRequire(require.resolve("@lhci/cli/package.json"));
  const utils = createRequire(cli.resolve("@lhci/utils/package.json"));
  const workflow = utils("js-yaml").safeLoad(readFileSync(".github/workflows/ci.yml", "utf8"));
  const steps = workflow.jobs.budget.steps;
  const lighthouse = steps.findIndex(
    (step: { name?: string }) => step.name === "Lighthouse budget",
  );
  expect(steps[lighthouse].id).toBe("lighthouse");
  expect(steps[lighthouse + 1]).toMatchObject({
    id: "lighthouse_diagnostic",
    if: `\${{ !cancelled() && (steps.lighthouse.outcome == 'success' || steps.lighthouse.outcome == 'failure') }}`,
    run: "node scripts/lighthouse-summary.mjs",
  });
  expect(steps[lighthouse + 2]).toMatchObject({
    uses: "actions/upload-artifact@v4",
    if: `\${{ !cancelled() && steps.lighthouse_diagnostic.outcome == 'success' }}`,
    with: {
      path: ".lighthouseci/diagnostic.json",
      "if-no-files-found": "error",
      "include-hidden-files": true,
      "retention-days": 7,
    },
  });
  expect(steps[lighthouse].run).not.toContain("exit 0");
});

/**
 * One Lighthouse run decided the gate, and the same home page measured 2336,
 * 2512, 2603 and 2707 ms with no change on its path. Three runs reduce that to
 * the median. LHCI's default aggregation is "optimistic" — for a maximum, the
 * fastest run — which would quietly loosen the 2500 ms budget, so the median is
 * proved through LHCI's own evaluator rather than by reading the config.
 */
it("decides the LCP budget on the median of three runs, never the fastest one", () => {
  const require = createRequire(import.meta.url);
  const cli = createRequire(require.resolve("@lhci/cli/package.json"));
  const { getAllAssertionResults } = cli("@lhci/utils/src/assertions.js");
  const config = JSON.parse(readFileSync("lighthouserc.json", "utf8"));
  const lhr = (lcp: number) => ({
    requestedUrl: "https://preview.example/",
    finalUrl: "https://preview.example/",
    audits: {
      "largest-contentful-paint": { id: "largest-contentful-paint", score: 0.9, numericValue: lcp },
      "total-byte-weight": { id: "total-byte-weight", score: 1, numericValue: 152_000 },
    },
  });
  const lcpFailures = (values: number[]) =>
    getAllAssertionResults(config.ci.assert, values.map(lhr)).filter(
      (result: { auditId: string; passed: boolean }) =>
        result.auditId === "largest-contentful-paint" && !result.passed,
    );

  expect(config.ci.collect.numberOfRuns).toBe(3);
  // Fastest run under budget, median over it: the gate must fail.
  expect(lcpFailures([2400, 2600, 2700])).toHaveLength(1);
  expect(lcpFailures([2400, 2600, 2700])[0].actual).toBe(2600);
  // One slow outlier with a median under budget: the gate passes.
  expect(lcpFailures([2900, 2400, 2450])).toHaveLength(0);
});
