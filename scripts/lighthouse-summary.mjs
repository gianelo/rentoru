// Internal CI command: node scripts/lighthouse-summary.mjs
// Never serialize raw LHR objects, errors, DOM text, URLs or network details.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const directory = ".lighthouseci";
const finite = (value) => (typeof value === "number" && Number.isFinite(value) ? value : null);
const tags = ["H1", "H2", "H3", "H4", "H5", "H6", "P", "DIV", "SPAN", "IMG", "VIDEO", "PICTURE"];
const timingKeys = [
  "timeToFirstByte",
  "lcpLoadStart",
  "lcpLoadEnd",
  "observedLargestContentfulPaint",
  "observedLoad",
  "observedDomContentLoaded",
];

// Optional LHCI producer output; never let missing assertions invalidate a saved LHR.
let assertions = [];
try {
  const saved = JSON.parse(readFileSync(join(directory, "assertion-results.json"), "utf8"));
  if (Array.isArray(saved)) assertions = saved;
} catch {}

try {
  const logs = [];
  const files = readdirSync(directory)
    .filter((name) => /^lhr-\d+\.json$/.test(name))
    .sort();
  if (files.length === 0) throw new Error();
  const runs = files.map((file) => {
    const report = JSON.parse(readFileSync(join(directory, file), "utf8"));
    const audits = report?.audits;
    if (!audits || typeof audits !== "object") throw new Error();
    const details = audits["largest-contentful-paint-element"]?.details;
    const items = details?.type === "list" ? details.items : undefined;
    const node = items?.[0]?.type === "table" ? items[0].items?.[0]?.node : undefined;
    const phases =
      items?.[1]?.type === "table" && items[1].items?.length === 4 ? items[1].items : null;
    const rawTag = typeof node?.lhId === "string" ? node.lhId.split("-").at(-1) : null;
    const metrics = audits.metrics?.details?.items?.[0];
    const run = {
      lcpMs: finite(audits["largest-contentful-paint"]?.numericValue),
      totalByteWeight: finite(audits["total-byte-weight"]?.numericValue),
      timings: Object.fromEntries(timingKeys.map((key) => [key, finite(metrics?.[key])])),
      // The legacy table uses fixed ordering even when labels are localized.
      lcpPhasesMs: phases
        ? {
            ttfb: finite(phases[0]?.timing),
            loadDelay: finite(phases[1]?.timing),
            loadDuration: finite(phases[2]?.timing),
            renderDelay: finite(phases[3]?.timing),
          }
        : null,
      element:
        node?.type === "node"
          ? {
              tag: tags.find((tag) => tag === rawTag) ?? "UNKNOWN",
              boundingRect: Object.fromEntries(
                ["top", "bottom", "left", "right", "width", "height"].map((key) => [
                  key,
                  finite(node.boundingRect?.[key]),
                ]),
              ),
            }
          : null,
    };
    const constraints = assertions
      .filter(
        (entry) =>
          entry &&
          typeof report.finalUrl === "string" &&
          report.finalUrl.length > 0 &&
          entry.url === report.finalUrl &&
          ["largest-contentful-paint", "total-byte-weight"].includes(entry.auditId) &&
          entry.name === "maxNumericValue" &&
          entry.operator === "<=" &&
          finite(entry.actual) !== null &&
          entry.actual >= 0 &&
          finite(entry.expected) !== null &&
          entry.expected >= 0 &&
          typeof entry.passed === "boolean" &&
          ["error", "warn", "off"].includes(entry.level),
      )
      .map((entry) =>
        JSON.stringify({
          metric: entry.auditId,
          unit: entry.auditId === "total-byte-weight" ? "bytes" : "ms",
          limit: entry.expected,
          actual: entry.actual,
          delta: finite(entry.actual - entry.expected),
          producerPassed: entry.passed,
          level: entry.level,
        }),
      );
    const method = report.configSettings?.throttlingMethod;
    logs.push({
      schema: "lighthouse-budget-log/v1",
      ordinal: logs.length + 1,
      configuredThrottlingMethod: ["simulate", "devtools", "provided"].includes(method)
        ? method
        : "unknown",
      scoredLcpMs: run.lcpMs,
      observedLargestContentfulPaintMs: run.timings.observedLargestContentfulPaint,
      pageBytes: run.totalByteWeight,
      scoredLcpPhasesMs: run.lcpPhasesMs,
      assertionScope: "url-aggregate",
      constraints: constraints.length
        ? [...new Set(constraints)].map((value) => JSON.parse(value))
        : null,
    });
    return run;
  });
  writeFileSync(
    join(directory, "diagnostic.json"),
    `${JSON.stringify({ schema: "lighthouse-diagnostic/v1", runs }, null, 2)}\n`,
  );
  for (const log of logs) console.log(JSON.stringify(log));
} catch {
  console.error("Lighthouse diagnostic unavailable; no valid saved report.");
  process.exitCode = 1;
}
