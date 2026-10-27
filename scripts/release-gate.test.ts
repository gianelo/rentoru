import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, expect, it } from "vitest";

const sha = "a".repeat(40);
const tree = "c".repeat(40);
const runsPath = `repos/owner/repo/actions/workflows/ci.yml/runs?branch=staging&event=push&head_sha=${sha}&per_page=20`;
const success = {
  id: 11,
  head_sha: sha,
  status: "completed",
  conclusion: "success",
  created_at: "2026-10-01T00:00:00Z",
};
const pending = { ...success, status: "in_progress", conclusion: null };
const temporary: string[] = [];

afterEach(() => {
  for (const directory of temporary.splice(0)) rmSync(directory, { recursive: true });
});

type Options = {
  env?: Record<string, string>;
  stagingSha?: string;
  polls?: unknown[];
  apiError?: "ref" | "runs";
  stagingTree?: string;
};

function run({
  env = {},
  stagingSha = sha,
  polls = [[success]],
  apiError,
  stagingTree = tree,
}: Options = {}) {
  const dir = mkdtempSync(join(tmpdir(), "release-gate-"));
  temporary.push(dir);
  writeFileSync(join(dir, "ref"), `${JSON.stringify({ object: { sha: stagingSha } })}\n`);
  polls.forEach((runs, index) => {
    const body = Array.isArray(runs) ? { workflow_runs: runs } : runs;
    writeFileSync(join(dir, `runs-${index}`), `${JSON.stringify(body)}\n`);
  });
  writeFileSync(
    join(dir, "gh"),
    `#!/bin/sh
printf '%s\\n' "$*" >> "$FIXTURES/gh-calls"
case "$*" in
  "api repos/owner/repo/git/ref/heads/staging") endpoint=ref ;;
  "api ${runsPath}") endpoint=runs ;;
  *) printf '%s\\n' 'Unexpected GitHub request' >&2; exit 2 ;;
esac
if [ "$endpoint" = "${apiError ?? ""}" ]; then printf '%s\\n' 'private diagnostic' >&2; exit 1; fi
if [ "$endpoint" = ref ]; then cat "$FIXTURES/ref"; exit 0; fi
printf '\\n' >> "$FIXTURES/polls"
n=$(($(wc -l < "$FIXTURES/polls") - 1))
if [ "$n" -ge ${polls.length} ]; then n=${polls.length - 1}; fi
cat "$FIXTURES/runs-$n"
`,
    { mode: 0o755 },
  );
  writeFileSync(join(dir, "sleep"), '#!/bin/sh\nprintf "%s\\n" "$1" >> "$FIXTURES/sleeps"\n', {
    mode: 0o755,
  });
  writeFileSync(
    join(dir, "git"),
    `#!/bin/sh
case "$*" in
  "rev-parse HEAD^{tree}") echo ${tree} ;;
  "rev-parse ${sha}^{tree}") echo ${stagingTree} ;;
  *) exit 2 ;;
esac
`,
    { mode: 0o755 },
  );
  const result = spawnSync("bash", [resolve(".github/scripts/release-gate.sh")], {
    encoding: "utf8",
    env: {
      NODE_ENV: "test",
      PATH: `${dir}:${process.env.PATH}`,
      GITHUB_REPOSITORY: "owner/repo",
      GH_TOKEN: "fake-not-a-credential",
      PR_HEAD_REF: "staging",
      PR_HEAD_REPO: "owner/repo",
      PR_HEAD_SHA: sha,
      FIXTURES: dir,
      ...env,
    },
  });
  const read = (name: string) =>
    existsSync(join(dir, name)) ? readFileSync(join(dir, name), "utf8") : "";
  return {
    ...result,
    ghCalls: read("gh-calls"),
    polls: read("polls").length,
    sleeps: read("sleeps"),
  };
}

function rejected(result: ReturnType<typeof run>, message: string) {
  expect(result.status).toBe(1);
  expect(result.stdout).toBe("");
  expect(result.stderr).toBe(`${message}\n`);
}

it("passes the current staging HEAD whose staging CI succeeded with an identical tree", () => {
  const result = run();
  expect(result.status).toBe(0);
  expect(result.stdout).toBe(`Release gate passed: ${sha} validated by staging CI run 11.\n`);
  expect(result.stderr).toBe("");
  expect(result.ghCalls).toBe(`api repos/owner/repo/git/ref/heads/staging\napi ${runsPath}\n`);
  expect(result.sleeps).toBe("");
});

it.each<Record<string, string>>([
  { PR_HEAD_REF: "dev" },
  { PR_HEAD_REPO: "fork/repo" },
  { PR_HEAD_REF: "" },
])("refuses a head other than this repository's staging without calling GitHub: %j", (env) => {
  const result = run({ env });
  rejected(result, "Release PRs into main must come from this repository's staging branch.");
  expect(result.ghCalls).toBe("");
});

it.each(["", "abc", "A".repeat(40), `${sha}0`])("refuses PR_HEAD_SHA %j before GitHub", (value) => {
  const result = run({ env: { PR_HEAD_SHA: value } });
  rejected(result, "PR_HEAD_SHA must be the full PR head SHA.");
  expect(result.ghCalls).toBe("");
});

it.each(["GH_TOKEN", "GITHUB_REPOSITORY"])("refuses missing %s before GitHub", (name) => {
  const result = run({ env: { [name]: "" } });
  rejected(result, "Missing GitHub repository or token configuration.");
  expect(result.ghCalls).toBe("");
});

it("refuses a PR head that is no longer the staging HEAD", () => {
  const result = run({ stagingSha: "b".repeat(40) });
  rejected(result, "PR head is not the current staging HEAD; update the PR from staging.");
  expect(result.polls).toBe(0);
});

it("waits for a missing or running staging CI run until it succeeds", () => {
  const result = run({ polls: [[], [pending], [success]] });
  expect(result.status).toBe(0);
  expect(result.stdout).toBe(`Release gate passed: ${sha} validated by staging CI run 11.\n`);
  expect(result.stderr).toBe("");
  expect(result.polls).toBe(3);
  expect(result.sleeps).toBe("30\n30\n");
});

it.each(["failure", "cancelled", "skipped"])("refuses %s staging CI immediately", (conclusion) => {
  const result = run({ polls: [[{ ...success, conclusion }], [success]] });
  rejected(result, `Staging CI for this SHA concluded ${conclusion}; promotion refused.`);
  expect(result.polls).toBe(1);
  expect(result.sleeps).toBe("");
});

it("judges only the newest run for the exact SHA", () => {
  const newer = { ...success, id: 12, conclusion: "failure", created_at: "2026-10-02T00:00:00Z" };
  const other = {
    ...success,
    id: 13,
    head_sha: "b".repeat(40),
    created_at: "2026-10-03T00:00:00Z",
  };
  const result = run({ polls: [[other, newer, success]] });
  rejected(result, "Staging CI for this SHA concluded failure; promotion refused.");
});

it.each([[[]], [[{ ...success, head_sha: "b".repeat(40) }]]])(
  "times out after 40 polls without a run for the exact SHA: %j",
  (runs) => {
    const result = run({ polls: [runs] });
    rejected(result, "Timed out waiting for staging CI on this SHA.");
    expect(result.polls).toBe(40);
    expect(result.sleeps).toBe("30\n".repeat(39));
  },
);

it("refuses a merge result whose tree differs from the validated staging tree", () => {
  rejected(
    run({ stagingTree: "d".repeat(40) }),
    "Merge result differs from the validated staging tree; promotion refused.",
  );
});

it.each<Options>([
  { apiError: "ref" },
  { apiError: "runs" },
  { polls: [{}] },
  { polls: [[{ ...success, conclusion: "Bad value" }]] },
])("fails closed with the fixed API message: %j", (options) => {
  rejected(run(options), "GitHub API failed; check token permissions.");
});
