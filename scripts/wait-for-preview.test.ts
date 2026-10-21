import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
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
  const fixture = join(dir, "fixtures");
  writeFileSync(fixture, JSON.stringify({ deployments, statuses, apiError }));
  // Cache JSON once: a simulated poll must not pay for another Node process.
  writeFileSync(`${fixture}.deployments`, `${JSON.stringify([deployments])}\n`);
  for (let index = 0; index < Math.max(statuses.length, 1); index++) {
    writeFileSync(
      `${fixture}.status-${index}`,
      `${JSON.stringify(statuses[index]) ?? "undefined"}\n`,
    );
  }
  writeFileSync(
    join(dir, "gh"),
    `#!/bin/sh
request=""
api_failure=${apiError === "deployments" ? "true" : "false"}
for arg do
  case "$arg" in
    "repos/owner/repo/deployments?sha=${sha}&per_page=100") request=deployments ;;
    "repos/owner/repo/deployments/7/statuses?per_page=1")
      if [ "$request" != deployments ]; then request=statuses; fi ;;
  esac
  case "$arg" in
    *statuses*) if ${apiError === "statuses" ? "true" : "false"}; then api_failure=true; fi ;;
  esac
done
if "$api_failure"; then
  printf '%s\\n' 'private provider diagnostic' >&2
  exit 1
fi
case "$request" in
  deployments) response_file="$FIXTURES.deployments" ;;
  statuses)
    n=0
    if [ -f "$FIXTURES.count" ]; then IFS= read -r n < "$FIXTURES.count"; fi
    printf '%s' "$((n + 1))" > "$FIXTURES.count"
    if [ "$n" -ge ${statuses.length} ]; then n=${Math.max(statuses.length - 1, 0)}; fi
    response_file="$FIXTURES.status-$n"
    ;;
  *) printf '%s\\n' 'Unexpected GitHub request' >&2; exit 2 ;;
esac
IFS= read -r response < "$response_file"
printf '%s\\n' "$response"
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

it("serves fake deployment responses without starting Node for each poll", () => {
  const result = run();
  writeFileSync(
    join(result.dir, "node"),
    '#!/bin/sh\nprintf forbidden >> "$FIXTURES.node-calls"\nexit 77\n',
    { mode: 0o755 },
  );
  const provider = spawnSync(
    join(result.dir, "gh"),
    ["api", "--paginate", "--slurp", `repos/owner/repo/deployments?sha=${sha}&per_page=100`],
    {
      encoding: "utf8",
      env: {
        NODE_ENV: "test",
        PATH: `${result.dir}:${process.env.PATH}`,
        FIXTURES: join(result.dir, "fixtures"),
      },
    },
  );
  expect(provider.status).toBe(0);
  expect(provider.stdout).toBe(`${JSON.stringify([[deployment]])}\n`);
  expect(provider.stderr).toBe("");
  expect(existsSync(join(result.dir, "fixtures.node-calls"))).toBe(false);
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
