import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const cliRequire = createRequire(require.resolve("@lhci/cli/package.json"));
const utilsRequire = createRequire(cliRequire.resolve("@lhci/utils/package.json"));
type Step = {
  name?: string;
  if?: string;
  uses?: string;
  id?: string;
  run?: string;
  env?: Record<string, string>;
};
type Job = {
  if: string;
  needs?: string;
  strategy?: unknown;
  env?: Record<string, string>;
  outputs?: Record<string, string>;
  services?: { postgres: { image: string } };
  steps: Step[];
};
const yaml = utilsRequire("js-yaml");
const workflow = yaml.safeLoad(readFileSync(".github/workflows/ci.yml", "utf8"));
const basicJobs = ["lint", "types", "lint-tokens", "test", "build", "integration"] as const;
const heavyJobs = ["measure", "preview", "e2e", "budget"] as const;
type JobName = (typeof basicJobs)[number] | (typeof heavyJobs)[number];
const jobs: Record<JobName, Job> = workflow.jobs;
const vercel = JSON.parse(readFileSync("vercel.json", "utf8"));
const commands = (job: Job) => job.steps.map((step) => step.run ?? "").join("\n");
const expression = (value: string) => `\${{ ${value} }}`;

describe("CI branch routing", () => {
  it("limits pushes to dev/staging and checks PRs into all three branches", () => {
    expect(workflow.on).toEqual({
      push: { branches: ["dev", "staging"] },
      pull_request: { branches: ["dev", "staging", "main"] },
    });
    for (const name of basicJobs) {
      expect(jobs[name].if, name).toBe("github.event_name == 'pull_request'");
    }
    for (const name of heavyJobs) {
      expect(jobs[name].if, name).toBe(
        name === "e2e"
          ? "github.event_name == 'push'"
          : "github.event_name == 'push' && (github.ref != 'refs/heads/dev' || vars.CI_DEV_PROFILE != 'critical')",
      );
    }
    expect(commands(jobs.lint)).toContain("pnpm exec biome ci .");
    expect(commands(jobs.types)).toContain("pnpm typecheck");
    expect(commands(jobs["lint-tokens"])).toContain("pnpm lint:tokens");
    expect(commands(jobs.test)).toContain("pnpm test:coverage");
    expect(commands(jobs.test)).not.toContain("pnpm test:unit");
    expect(jobs.build.env?.DATABASE_URL).toContain("-pooler.invalid.neon.tech");
    expect(commands(jobs.build)).toContain("pnpm build");
    expect(commands(jobs.integration)).toContain("pnpm test:integration");
  });

  it("resolves the pushed SHA through the checked-out resolver for Lighthouse only", () => {
    expect(jobs.preview.steps[0]?.uses).toBe("actions/checkout@v4");
    const resolve = jobs.preview.steps.find((step) => step.id === "resolve");
    expect(resolve?.env).toEqual({
      GH_TOKEN: expression("secrets.GITHUB_TOKEN"),
      HEAD_SHA: expression("github.sha"),
    });
    expect(resolve?.run).toBe("bash .github/scripts/wait-for-preview.sh");
    expect(jobs.preview.outputs?.url).toBe(expression("steps.resolve.outputs.url"));
    expect(jobs.e2e.needs).toBeUndefined();
    expect(jobs.budget.needs).toBe("preview");
    expect(jobs.budget.env?.PREVIEW_BASE_URL).toBe(expression("needs.preview.outputs.url"));
  });

  it("keeps all browser suites and database budgets on job-owned Postgres 18", () => {
    for (const name of ["integration", "e2e", "budget"] as const) {
      expect(jobs[name].services?.postgres.image).toBe("postgres:18");
      expect(jobs[name].env?.TEST_DATABASE_URL).toBe(
        "postgresql://postgres:postgres@localhost:5432/rentas_test",
      );
      expect(commands(jobs[name])).toContain("pnpm db:migrate");
    }
    for (const step of jobs.e2e.steps.filter((step) => step.run?.includes("playwright test"))) {
      expect(step.env?.PLAYWRIGHT_BASE_URL).toBe("");
      expect(step.env?.VERCEL_AUTOMATION_BYPASS_SECRET).toBe("");
      expect(step.env?.PLAYWRIGHT_WEB_COMMAND).toMatch(/^pnpm start/);
    }
    expect(commands(jobs.e2e)).toContain("pnpm db:test:seed:e2e");
    for (const suite of [
      "publicar-entrada",
      "ficha-diagnostico",
      "ficha-rutas",
      "ficha-logout",
      "ficha-contacto-revelacion",
      "reporte-con-motivo",
      "puerta-cierre",
      "puerta-de-whatsapp-sin-javascript",
      "paginacion-catalogo",
    ]) {
      expect(commands(jobs.e2e)).toContain(`tests/e2e/${suite}.spec.ts`);
    }
    expect(commands(jobs.budget)).toContain("pnpm run budget:bundle");
    expect(commands(jobs.budget)).toContain("pnpm run budget:rows");
  });

  it("splits push e2e into three fail-open legs, each with its own seeded Postgres", () => {
    const { steps } = jobs.e2e;
    expect(jobs.e2e.strategy).toEqual({
      "fail-fast": false,
      matrix: { leg: ["publication", "reads", "auth"] },
    });
    const leg = (name: string) =>
      steps.filter((step) => step.if === `matrix.leg == '${name}'`).map((step) => step.name);
    expect(leg("publication")).toEqual(["36.3: publication entry (local production build)"]);
    expect(leg("reads")).toEqual([
      "E2E + crawlability",
      "30.2–30.4 served listing and route diagnostics (local production build)",
    ]);
    expect(leg("auth")).toEqual([
      "30.4b2–30.7 authenticated contact and door (local production build)",
      "29.2 isolated pagination (local production build)",
    ]);
    // Every other step is shared setup that each leg runs on its own container.
    const shared = steps.filter((step) => step.if === undefined);
    expect(shared).toHaveLength(steps.length - 5);
    expect(commands({ ...jobs.e2e, steps: shared })).not.toContain("playwright test");
    const migrate = steps.findIndex((step) => step.run === "pnpm db:migrate");
    const seed = steps.findIndex((step) => step.run === "pnpm db:test:seed:e2e");
    expect(shared).toContain(steps[migrate]);
    expect(shared).toContain(steps[seed]);
    expect(migrate).toBeLessThan(seed);
    expect(steps.findIndex((step) => step.if !== undefined)).toBe(seed + 1);
  });

  it("fails Lighthouse closed for missing access, transport errors and non-200 pages", () => {
    const lighthouse = jobs.budget.steps.find((step) => step.run?.includes("budget:lighthouse"));
    expect(lighthouse?.run).toContain(
      '[ -z "$PREVIEW_BASE_URL" ] || [ -z "$VERCEL_AUTOMATION_BYPASS_SECRET" ]',
    );
    expect(lighthouse?.run).toContain('if [ "$status" != "200" ]; then');
    expect(lighthouse?.run?.match(/exit 1/g)).toHaveLength(4);
    expect(lighthouse?.run).not.toMatch(/exit 0|::warning|--location|--header ["']/);
    expect(lighthouse?.run).toContain("--header @-");
    expect(lighthouse?.run).toContain(
      "--collect.puppeteerScript=scripts/lighthouse-preview-auth.cjs",
    );
  });

  it("allows only main/dev/staging Git deployments and preserves every cron", () => {
    const rules = vercel.git.deploymentEnabled;
    expect(rules).toEqual({ "**": false, main: true, dev: true, staging: true });
    for (const branch of ["main", "dev", "staging", "feature", "feat/login", "fix/a/b"]) {
      expect(rules[branch] ?? rules["**"]).toBe(["main", "dev", "staging"].includes(branch));
    }
    expect(vercel.crons).toEqual([
      { path: "/api/jobs/expiry-reminders", schedule: "0 13 * * *" },
      { path: "/api/jobs/draft-sweep", schedule: "0 5 * * *" },
      { path: "/api/jobs/photo-purge", schedule: "0 17 * * *" },
    ]);
  });
});
