import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, it, vi } from "vitest";

const args = "exec playwright install --with-deps chromium\n";
const dpkg = "-n true\n-n dpkg --configure -a\n";
const failed = "::error::Browser install failed after 2 attempts\n";
const warning = (attempt: number, reason: string) =>
  `::warning::Browser install attempt ${attempt} of 2 did not finish (${reason})\n`;

// PLAN drives one attempt per comma-separated outcome: ok, hang or an exit code.
function run(plan: string, sudoReady = true) {
  const dir = mkdtempSync(join(tmpdir(), "browser-install-"));
  writeFileSync(
    join(dir, "pnpm"),
    `#!/bin/sh
printf '%s\\n' "$*" >> "$STATE/args.log"
outcome=$(printf '%s' "$PLAN" | cut -d, -f"$(grep -c . "$STATE/args.log")")
case "$outcome" in
  ok) exit 0 ;;
  hang)
    # A child off the output pipe: surviving the cut fails an assertion, not spawnSync.
    sleep 1000 >/dev/null 2>&1 &
    printf '%s\\n%s\\n' "$$" "$!" >> "$STATE/hung.log"
    wait ;;
  *) exit "$outcome" ;;
esac
`,
    { mode: 0o755 },
  );
  // The repair is best-effort: a failing dpkg must never fail the install.
  writeFileSync(
    join(dir, "sudo"),
    `#!/bin/sh\nprintf '%s\\n' "$*" >> "$STATE/sudo.log"\n[ "$*" = "-n true" ] && exit ${sudoReady ? 0 : 1}\nexit 1\n`,
    { mode: 0o755 },
  );
  const result = spawnSync("bash", [resolve(".github/scripts/install-playwright-browser.sh")], {
    encoding: "utf8",
    env: {
      NODE_ENV: "test",
      PATH: `${dir}:${process.env.PATH}`,
      STATE: dir,
      PLAN: plan,
      BROWSER_INSTALL_TIMEOUT_SECONDS: "1",
    },
  });
  const read = (name: string) =>
    existsSync(join(dir, name)) ? readFileSync(join(dir, name), "utf8") : "";
  return { ...result, read };
}

async function expectStopped(pids: string) {
  const alive = (pid: string) => {
    try {
      return process.kill(Number(pid), 0);
    } catch {
      return false;
    }
  };
  const all = pids.trim().split("\n");
  expect(all.length).toBeGreaterThanOrEqual(2);
  await vi.waitFor(() => expect(all.filter(alive)).toEqual([]));
}

it("installs once with the exact Playwright arguments when the first attempt succeeds", () => {
  const result = run("ok");
  expect(result.status).toBe(0);
  expect(result.stdout).toBe("");
  expect(result.stderr).toBe("");
  expect(result.read("args.log")).toBe(args);
  expect(result.read("sudo.log")).toBe("");
});

it("cuts a hung attempt with its children and retries once", async () => {
  const result = run("hang,ok");
  expect(result.status).toBe(0);
  expect(result.stdout).toBe(warning(1, "timed out after 1s"));
  expect(result.stderr).toBe("");
  expect(result.read("args.log")).toBe(args.repeat(2));
  expect(result.read("sudo.log")).toBe(dpkg);
  await expectStopped(result.read("hung.log"));
}, 15_000);

it("retries a failed attempt even when the dpkg repair fails", () => {
  const result = run("7,ok");
  expect(result.status).toBe(0);
  expect(result.stdout).toBe(warning(1, "exit code 7"));
  expect(result.stderr).toBe("");
  expect(result.read("args.log")).toBe(args.repeat(2));
  expect(result.read("sudo.log")).toBe(dpkg);
});

it("skips the dpkg repair when sudo would prompt", () => {
  const result = run("7,ok", false);
  expect(result.status).toBe(0);
  expect(result.stdout).toBe(warning(1, "exit code 7"));
  expect(result.read("sudo.log")).toBe("-n true\n");
});

it.each([
  ["hang,3", [warning(1, "timed out after 1s"), warning(2, "exit code 3")]],
  ["5,hang", [warning(1, "exit code 5"), warning(2, "timed out after 1s")]],
])(
  "fails closed after two failed attempts: %s",
  async (plan, warnings) => {
    const result = run(plan);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe(`${warnings.join("")}${failed}`);
    expect(result.stderr).toBe("");
    expect(result.read("args.log")).toBe(args.repeat(2));
    expect(result.read("sudo.log")).toBe(dpkg);
    await expectStopped(result.read("hung.log"));
  },
  15_000,
);
