import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const cliRequire = createRequire(require.resolve("@lhci/cli/package.json"));
const utilsRequire = createRequire(cliRequire.resolve("@lhci/utils/package.json"));
type Step = { name?: string; if?: string; run?: string; env?: Record<string, string> };
type Job = { if: string; steps: Step[] };
const yaml = utilsRequire("js-yaml");
const { jobs, concurrency } = yaml.safeLoad(readFileSync(".github/workflows/ci.yml", "utf8")) as {
  jobs: Record<"measure" | "preview" | "budget" | "e2e", Job>;
  concurrency: { group: string; "cancel-in-progress": string | boolean };
};
const general = jobs.e2e.steps.find((step) => step.name === "E2E + crawlability") as Step;
const profileExpression = `\${{ github.ref == 'refs/heads/dev' && vars.CI_DEV_PROFILE == 'critical' && 'critical' || 'full' }}`;
const exclusions = "29\\.2:|30\\.2:|30\\.3|30\\.4b2:|30\\.5b2c:|30\\.6c:|30\\.7:|36\\.3:";
const fullCommands = ["chromium", "crawlability"].map(
  (project) => `pnpm exec playwright test --project=${project} --grep-invert=${exclusions}`,
);
const temporary: string[] = [];

afterEach(() => {
  for (const directory of temporary.splice(0)) rmSync(directory, { recursive: true });
});

function context(branch: string, profile: string, event = "push") {
  // GitHub string comparisons are case-insensitive; these inputs are controlled.
  return {
    github: { event_name: event, ref: `refs/heads/${branch}` },
    vars: { CI_DEV_PROFILE: profile.toLowerCase() },
  };
}

function runGeneral(profile: string, fail = "") {
  const parent = join(process.cwd(), ".tmp");
  mkdirSync(parent, { recursive: true });
  const directory = mkdtempSync(join(parent, "ci-profiles-"));
  temporary.push(directory);
  writeFileSync(
    join(directory, "pnpm"),
    '#!/bin/sh\nprintf "pnpm %s\\n" "$*"\ncase "$FAIL_STEP:$*" in\n  critical:test:e2e:critical:read|chromium:*--project=chromium*)\n    printf "fixture failure\\n" >&2; exit 7 ;;\nesac\n',
    { mode: 0o700 },
  );
  return spawnSync("bash", ["--noprofile", "--norc", "-eo", "pipefail", "-c", general.run ?? ""], {
    cwd: process.cwd(),
    env: {
      NODE_ENV: "test",
      PATH: `${directory}:${process.env.PATH}`,
      PLAYWRIGHT_BASE_URL: "",
      READ_PROFILE: profile,
      FAIL_STEP: fail,
    },
    encoding: "utf8",
  });
}

describe("CI profile routing", () => {
  it.each([
    ["dev", "", true, "full"],
    ["dev", "full", true, "full"],
    ["dev", "unknown", true, "full"],
    ["dev", "critical", false, "critical"],
    ["dev", "CRITICAL", false, "critical"],
    ["staging", "", true, "full"],
    ["staging", "critical", true, "full"],
  ] as const)("%s with profile %j preserves the intended gates", (branch, profile, full, reads) => {
    for (const name of ["measure", "preview", "budget"] as const) {
      expect(runInNewContext(jobs[name].if, context(branch, profile)), name).toBe(full);
    }
    expect(runInNewContext(jobs.e2e.if, context(branch, profile))).toBe(true);
    expect(general.env?.READ_PROFILE).toBe(profileExpression);
    expect(runInNewContext(profileExpression.slice(3, -2), context(branch, profile))).toBe(reads);
  });

  it("lets the critical profile change only the reads leg's general step", () => {
    expect(general.if).toBe("matrix.leg == 'reads'");
    const profiled = jobs.e2e.steps.filter((step) =>
      JSON.stringify(step).match(/READ_PROFILE|critical/),
    );
    expect(profiled).toEqual([general]);
  });

  it.each([
    ["dev", "pull_request", true],
    ["staging", "pull_request", true],
    ["dev", "push", true],
    ["staging", "push", false],
  ] as const)("cancels a stale %s %s run: %s", (branch, event, cancels) => {
    expect(concurrency.group).toBe(`\${{ github.workflow }}-\${{ github.ref }}`);
    const value = String(concurrency["cancel-in-progress"]).replace(/^\$\{\{|\}\}$/g, "");
    expect(runInNewContext(value, context(branch, "", event))).toBe(cancels);
  });

  it("never schedules push gates on a PR even when critical mode is requested", () => {
    for (const name of ["measure", "preview", "budget", "e2e"] as const) {
      expect(runInNewContext(jobs[name].if, context("dev", "critical", "pull_request"))).toBe(
        false,
      );
    }
  });

  it.each(["full", "", "unknown"])("keeps both complete project commands for %j", (profile) => {
    const result = runGeneral(profile);
    expect(result.status).toBe(0);
    expect(result.stdout).toBe(["pnpm build", ...fullCommands, ""].join("\n"));
    expect(result.stderr).toBe("");
  });

  it("dispatches critical reads without the exhaustive general commands", () => {
    const result = runGeneral("critical");
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("pnpm build\npnpm test:e2e:critical:read\n");
    expect(result.stderr).toBe("");
  });

  it("propagates a critical-read failure under fail-fast bash", () => {
    const result = runGeneral("critical", "critical");
    expect(result.status).toBe(7);
    expect(result.stdout).toBe("pnpm build\npnpm test:e2e:critical:read\n");
    expect(result.stderr).toBe("fixture failure\n");
  });

  it("keeps checking crawlability after a full chromium failure and fails the step", () => {
    const result = runGeneral("full", "chromium");
    expect(result.status).toBe(1);
    expect(result.stdout).toBe(
      ["pnpm build", fullCommands[0], "fixture failure", fullCommands[1], ""].join("\n"),
    );
    expect(result.stderr).toBe("");
  });
});
