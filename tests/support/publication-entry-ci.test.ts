import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

// Reuse Lighthouse CI's installed YAML parser; no new dependency for this gate.
const require = createRequire(import.meta.url);
const cliRequire = createRequire(require.resolve("@lhci/cli/package.json"));
const utilsRequire = createRequire(cliRequire.resolve("@lhci/utils/package.json"));
const yaml = utilsRequire("js-yaml") as { safeLoad: (source: string) => Workflow };
type Step = { name?: string; env?: Record<string, string>; run?: string };
type Workflow = { jobs: { e2e: { env: Record<string, string>; steps: Step[] } } };
const workflow = yaml.safeLoad(readFileSync(".github/workflows/ci.yml", "utf8"));
const steps = workflow.jobs.e2e.steps;
const ownName = "36.3: publication entry (local production build)";
const own = steps.find((step) => step.name === ownName);
const general = steps.find((step) => step.name === "E2E + crawlability");
const build =
  "DATABASE_URL=postgresql://ci:ci@ep-ci-build-0000-pooler.invalid.neon.tech/ci?sslmode=require pnpm build";
const runner = "env -u DATABASE_URL pnpm exec playwright test tests/e2e/publicar-entrada.spec.ts";
const exclusions = "29\\.2:|30\\.2:|30\\.3|30\\.4b2:|30\\.5b2c:|30\\.6c:|30\\.7:|36\\.3:";

function dedicated(): Step {
  expect(own, "publication entry must have its own local CI step").toBeDefined();
  return own as Step;
}

describe("publication entry CI isolation", () => {
  it("runs after the deterministic seed and before the general suites", () => {
    const seedIndex = steps.findIndex(
      (step) => step.name === "Seed the deterministic e2e catalogue",
    );
    const ownIndex = steps.indexOf(dedicated());
    expect(seedIndex).toBeGreaterThan(-1);
    expect(ownIndex).toBe(seedIndex + 1);
    expect(ownIndex).toBeLessThan(steps.indexOf(general as Step));
    expect(workflow.jobs.e2e.env).toEqual({
      TEST_DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/rentas_test",
    });
  });

  it("clears preview access and uses only the owned local app and proxy", () => {
    expect(dedicated().env).toEqual({
      PLAYWRIGHT_BASE_URL: "",
      VERCEL_AUTOMATION_BYPASS_SECRET: "",
      AUTH_URL: "http://localhost:3001",
      AUTH_TRUST_HOST: "true",
      AUTH_SECRET: "build-time-placeholder-not-a-real-secret",
      SITE_URL: "http://localhost:3001",
      R2_BUCKET_PUBLIC_URL: "http://localhost:3001",
      PLAYWRIGHT_PORT: "3001",
      NEON_PROXY_PORT: "55436",
      PLAYWRIGHT_WEB_COMMAND: "pnpm start --port 3001",
    });
    expect(dedicated().env).not.toHaveProperty("DATABASE_URL");
  });

  it("builds separately once and runs both exact projects sequentially without ambient DB", () => {
    const commands = dedicated().run?.trim().split("\n");
    expect(commands).toEqual([
      build,
      `${runner} --project=chromium --workers=1 --retries=0`,
      `${runner} --project=crawlability --workers=1 --retries=0`,
    ]);
  });

  it("tags every entry case and excludes that tag only from the general suites", () => {
    dedicated();
    const source = readFileSync("tests/e2e/publicar-entrada.spec.ts", "utf8");
    const titles = [...source.matchAll(/\btest\(([`"])(.*?)\1/g)].map((match) => match[2]);
    expect(titles).toHaveLength(2);
    for (const title of titles) expect(title).toMatch(/^36\.3: /);
    expect(general?.run).toContain(`--grep-invert='${exclusions}'`);
    const taggedExclusions = steps.filter(
      (step) => step.run?.includes("--grep-invert") && step.run.includes("36\\.3:"),
    );
    expect(taggedExclusions).toEqual([general]);
    expect(dedicated().run).not.toMatch(/grep|skip|\|\|\s*true/);
  });
});
