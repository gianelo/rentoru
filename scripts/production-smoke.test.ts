import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, expect, it } from "vitest";

const base = "https://rentoru.test";
const html = "200 text/html; charset=utf-8";
const json = "200 application/json";
const temporary: string[] = [];

afterEach(() => {
  for (const directory of temporary.splice(0)) rmSync(directory, { recursive: true });
});

// Each path answers its listed responses in order, repeating the last one.
type Answers = Record<string, string[]>;

function run(answers: Answers = {}, env: Record<string, string> = { SMOKE_BASE_URL: base }) {
  const dir = mkdtempSync(join(tmpdir(), "production-smoke-"));
  temporary.push(dir);
  const all = { "/api/live": [json], "/api/health": [json], "/": [html], ...answers };
  for (const [path, list] of Object.entries(all)) {
    writeFileSync(join(dir, `answers${path.replaceAll("/", "_")}`), `${list.join("\n")}\n`);
  }
  writeFileSync(
    join(dir, "curl"),
    `#!/bin/sh
url=""; for arg in "$@"; do url="$arg"; done
printf '%s\\n' "$*" >> "$FIXTURES/curl-calls"
path="\${url#${base}}"; [ -z "$path" ] && path=/
key=$(printf '%s' "$path" | tr / _)
printf '\\n' >> "$FIXTURES/count$key"
n=$(wc -l < "$FIXTURES/count$key"); total=$(wc -l < "$FIXTURES/answers$key")
[ "$n" -gt "$total" ] && n=$total
answer=$(sed -n "\${n}p" "$FIXTURES/answers$key")
[ "$answer" = refused ] && { printf '000 '; exit 7; }
printf '%s' "$answer"
`,
    { mode: 0o755 },
  );
  writeFileSync(join(dir, "sleep"), '#!/bin/sh\nprintf "%s\\n" "$1" >> "$FIXTURES/sleeps"\n', {
    mode: 0o755,
  });
  const result = spawnSync("bash", [resolve(".github/scripts/production-smoke.sh")], {
    encoding: "utf8",
    env: { NODE_ENV: "test", PATH: `${dir}:${process.env.PATH}`, FIXTURES: dir, ...env },
  });
  const read = (name: string) =>
    existsSync(join(dir, name)) ? readFileSync(join(dir, name), "utf8") : "";
  return { ...result, curlCalls: read("curl-calls"), sleeps: read("sleeps") };
}

it("passes when liveness, database health and the home page answer, using only GETs", () => {
  const result = run();
  expect(result.status).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.stdout).toBe(
    "ok /api/live 200\nok /api/health 200\nok / 200\nProduction smoke passed: 3 checks against https://rentoru.test.\n",
  );
  const calls = result.curlCalls.trim().split("\n");
  expect(calls.map((call) => call.split(" ").at(-1))).toEqual([
    `${base}/api/live`,
    `${base}/api/health`,
    `${base}/`,
  ]);
  for (const call of calls) expect(call).not.toMatch(/-X|--request|-d |--data|-F |-I|--head/);
  expect(result.sleeps).toBe("");
});

it("retries a check that is not ready yet and passes once it answers", () => {
  const result = run({ "/api/health": ["503 application/json", json] });
  expect(result.status).toBe(0);
  expect(result.stdout).toContain("ok /api/health 200\n");
  expect(result.sleeps).toBe("15\n");
});

it("fails closed after five attempts and never checks what follows", () => {
  const result = run({ "/api/health": ["503 application/json"] });
  expect(result.status).toBe(1);
  expect(result.stdout).toBe("ok /api/live 200\n");
  expect(result.stderr).toBe(
    "::error::Production smoke failed: /api/health answered 503 after 5 attempts.\n",
  );
  expect(result.sleeps).toBe("15\n15\n15\n15\n");
  expect(result.curlCalls).not.toContain(`${base}/\n`);
});

it("rejects a home page that is not HTML", () => {
  const result = run({ "/": [json] });
  expect(result.status).toBe(1);
  expect(result.stderr).toBe(
    "::error::Production smoke failed: / answered 200 application/json, expected text/html after 5 attempts.\n",
  );
});

it("treats a transport failure as a failed check", () => {
  const result = run({ "/api/live": ["refused"] });
  expect(result.status).toBe(1);
  expect(result.stderr).toBe(
    "::error::Production smoke failed: /api/live answered 000 after 5 attempts.\n",
  );
});

it("refuses to run without an https origin to check", () => {
  const invalid: Record<string, string>[] = [
    {},
    { SMOKE_BASE_URL: "http://rentoru.test" },
    { SMOKE_BASE_URL: `${base}/x` },
  ];
  for (const env of invalid) {
    const result = run({}, env);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe(
      "::error::Production smoke needs SMOKE_BASE_URL as an https origin without a path.\n",
    );
    expect(result.curlCalls).toBe("");
  }
});

it("runs only after a successful Production deployment, against the real domain", async () => {
  const { createRequire } = await import("node:module");
  const { runInNewContext } = await import("node:vm");
  const require = createRequire(import.meta.url);
  const cliRequire = createRequire(require.resolve("@lhci/cli/package.json"));
  const yaml = createRequire(cliRequire.resolve("@lhci/utils/package.json"))("js-yaml");
  const workflow = yaml.safeLoad(readFileSync(".github/workflows/production-smoke.yml", "utf8"));
  expect(workflow.on).toBe("deployment_status");
  expect(workflow.permissions).toEqual({});
  expect(Object.keys(workflow.jobs)).toEqual(["production-smoke"]);
  const job = workflow.jobs["production-smoke"];
  for (const [state, environment, runs] of [
    ["success", "Production", true],
    ["failure", "Production", false],
    ["success", "Preview", false],
    ["pending", "Production", false],
  ] as const) {
    const github = { event: { deployment_status: { state }, deployment: { environment } } };
    expect(runInNewContext(job.if, { github })).toBe(runs);
  }
  expect(job.permissions).toEqual({ contents: "read" });
  const step = job.steps.find((candidate: { run?: string }) => candidate.run);
  expect(step.run).toBe("bash .github/scripts/production-smoke.sh");
  expect(step.env).toEqual({ SMOKE_BASE_URL: "https://rentoru.com" });
});
