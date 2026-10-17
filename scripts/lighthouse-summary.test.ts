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
  expect(result.stdout).toBe("");
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

it.each([{ "flags-1.json": secret }, { "lhr-1.json": secret }] as Record<string, string>[])(
  "fails without publishing raw or incomplete input: %j",
  (files) => {
    const result = run(files);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("Lighthouse diagnostic unavailable; no valid saved report.\n");
    expect(result.output).toBeNull();
  },
);

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
