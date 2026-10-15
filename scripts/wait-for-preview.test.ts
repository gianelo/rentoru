import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, it } from "vitest";

const sha = "a".repeat(40);
const url = "https://rentoru-abc123-team.vercel.app";
const deployment = { id: 7, sha, ref: "dev", environment: "Preview", created_at: "2026-01-01" };
const ready = { state: "success", environment_url: url };

function run(deployments = [deployment], statuses = [[ready]], apiError = "") {
  const dir = mkdtempSync(join(tmpdir(), "preview-resolver-"));
  const output = join(dir, "output");
  writeFileSync(output, "existing=value\n");
  writeFileSync(join(dir, "fixtures"), JSON.stringify({ deployments, statuses, apiError }));
  writeFileSync(
    join(dir, "gh"),
    `#!/usr/bin/env node
const fs = require("node:fs");
const f = JSON.parse(fs.readFileSync(process.env.FIXTURES, "utf8"));
const args = process.argv.slice(2);
if (f.apiError === "deployments" || (f.apiError === "statuses" && args.some(a => a.includes("statuses")))) {
  console.error("private provider diagnostic"); process.exit(1);
}
if (args.includes("repos/owner/repo/deployments?sha=${sha}&per_page=100")) {
  console.log(JSON.stringify([f.deployments]));
} else if (args.includes("repos/owner/repo/deployments/7/statuses?per_page=1")) {
  const path = process.env.FIXTURES + ".count";
  const n = fs.existsSync(path) ? Number(fs.readFileSync(path)) : 0;
  fs.writeFileSync(path, String(n + 1));
  console.log(JSON.stringify(f.statuses[Math.min(n, f.statuses.length - 1)]));
} else { console.error("Unexpected GitHub request"); process.exit(2); }
`,
    { mode: 0o755 },
  );
  writeFileSync(join(dir, "sleep"), '#!/bin/sh\nprintf "%s\\n" "$1" >> "$FIXTURES.sleeps"\n', {
    mode: 0o755,
  });
  const result = spawnSync("bash", [resolve(".github/scripts/wait-for-preview.sh")], {
    encoding: "utf8",
    env: {
      NODE_ENV: "test",
      PATH: `${dir}:${process.env.PATH}`,
      HEAD_SHA: sha,
      GITHUB_REF_NAME: "dev",
      GITHUB_REPOSITORY: "owner/repo",
      GH_TOKEN: "fake-not-a-credential",
      GITHUB_OUTPUT: output,
      FIXTURES: join(dir, "fixtures"),
    },
  });
  return { ...result, output: readFileSync(output, "utf8"), dir };
}

function rejected(result: ReturnType<typeof run>, message: string) {
  expect(result.status).toBe(1);
  expect(result.stdout).toBe("");
  expect(result.stderr).toBe(`${message}\n`);
  expect(result.output).toBe("existing=value\n");
}

it("selects the newest exact SHA/ref Preview and appends its provider URL", () => {
  const result = run([
    { ...deployment, id: 6, created_at: "2025-01-01" },
    deployment,
    { ...deployment, id: 8, sha: "wrong", created_at: "2027-01-01" },
    { ...deployment, id: 9, ref: "staging", created_at: "2027-01-01" },
    { ...deployment, id: 10, environment: "Production", created_at: "2027-01-01" },
  ]);
  expect(result.status).toBe(0);
  expect(result.stdout).toBe(`Preview ready: ${url} (${sha})\n`);
  expect(result.stderr).toBe("");
  expect(result.output).toBe(`existing=value\nurl=${url}\n`);
});

it("accepts the exact SHA-valued ref returned by Vercel", () => {
  const result = run([{ ...deployment, ref: sha }]);
  expect(result.status).toBe(0);
  expect(result.stdout).toBe(`Preview ready: ${url} (${sha})\n`);
  expect(result.stderr).toBe("");
  expect(result.output).toBe(`existing=value\nurl=${url}\n`);
});

it("polls pending until ready without real sleeps", () => {
  const result = run([deployment], [[{ ...ready, state: "pending" }], [ready]]);
  expect(result.status).toBe(0);
  expect(result.output).toBe(`existing=value\nurl=${url}\n`);
  expect(result.stdout).toBe(`Preview ready: ${url} (${sha})\n`);
  expect(result.stderr).toBe("");
  expect(readFileSync(join(result.dir, "fixtures.sleeps"), "utf8")).toBe("15\n");
});

it.each(["failure", "error", "inactive"])(
  "rejects latest %s despite historical success",
  (state) => {
    rejected(
      run([deployment], [[{ ...ready, state }, ready]]),
      `Preview deployment ${state}; inspect GitHub deployment statuses.`,
    );
  },
);

it.each([
  { deployments: [] },
  { deployments: [{ ...deployment, sha: "wrong" }] },
  { deployments: [{ ...deployment, ref: "staging" }] },
  { deployments: [{ ...deployment, ref: "b".repeat(40) }] },
  { deployments: [{ ...deployment, environment: "Production" }] },
])("times out without an exact matching deployment: %j", ({ deployments }) => {
  const result = run(deployments);
  rejected(
    result,
    "Preview timeout after 40 attempts; inspect provider deployment for this SHA/ref.",
  );
  expect(readFileSync(join(result.dir, "fixtures.sleeps"), "utf8").trim().split("\n")).toEqual(
    Array(39).fill("15"),
  );
});

it.each(["deployments", "statuses"])("fails closed on %s API error", (apiError) => {
  rejected(
    run([deployment], [[ready]], apiError),
    "GitHub API failed; check token permissions and deployment integration.",
  );
});

it.each([
  "https://dev.rentoru.com",
  "https://staging.rentoru.com",
  "https://rentoru-git-dev-team.vercel.app",
  "http://rentoru-abc123.vercel.app",
  "https://user:password@rentoru-abc123.vercel.app",
  "https://rentoru.vercel.app.evil.test",
  "not a URL",
  `${url}\n`,
  "",
])("rejects stable or invalid provider URL %s", (environment_url) => {
  rejected(
    run([deployment], [[{ ...ready, environment_url }]]),
    "Invalid preview URL; require a deployment-specific HTTPS vercel.app URL.",
  );
});
