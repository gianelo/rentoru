import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, it, vi } from "vitest";

const args = "exec playwright install --with-deps chromium\n";
const pkills = (signal: string) =>
  ["apt-get", "apt", "dpkg"].map((name) => `-n pkill -${signal} -x ${name}\n`).join("");
const dpkg = `-n true\n${pkills("TERM")}-n dpkg --configure -a\n`;
const failed = "::error::Browser install failed after 2 attempts\n";
const warning = (attempt: number, reason: string) =>
  `::warning::Browser install attempt ${attempt} of 2 did not finish (${reason})\n`;

// PLAN drives one attempt per comma-separated outcome: ok, hang or an exit code.
// APT is `<signal>:<polls>`: the apt-get left running after attempt 1 exits that many
// polls after that signal; any other signal leaves it running.
function run(plan: string, sudoReady = true, apt = "") {
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
  writeFileSync(
    join(dir, "sudo"),
    `#!/bin/sh\nprintf '%s\\n' "$*" >> "$STATE/sudo.log"\n[ "$*" = "-n true" ] && exit ${sudoReady ? 0 : 1}\nshift\nexec "$@"\n`,
    { mode: 0o755 },
  );
  // The repair is best-effort: a failing dpkg must never fail the install.
  writeFileSync(join(dir, "dpkg"), `#!/bin/sh\necho "$*" >> "$STATE/dpkg.log"\nexit 1\n`, {
    mode: 0o755,
  });
  // Like the real pkill when nothing matches, it always exits 1.
  writeFileSync(
    join(dir, "pkill"),
    `#!/bin/sh
printf '%s\\n' "$*" >> "$STATE/pkill.log"
if [ "$1" = "-\${APT%%:*}" ] && [ ! -f "$STATE/left" ]; then echo "\${APT#*:}" > "$STATE/left"; fi
exit 1
`,
    { mode: 0o755 },
  );
  writeFileSync(
    join(dir, "pgrep"),
    `#!/bin/sh
printf '%s\\n' "$*" >> "$STATE/pgrep.log"
[ -n "$APT" ] && [ "$2" = apt-get ] || exit 1
[ -f "$STATE/left" ] || exit 0
left=$(cat "$STATE/left")
[ "$left" -gt 0 ] || exit 1
echo $((left - 1)) > "$STATE/left"
`,
    { mode: 0o755 },
  );
  // Only the cleanup polls, between the first pkill and the repair, skip the wait.
  writeFileSync(
    join(dir, "sleep"),
    `#!/bin/sh
if [ -f "$STATE/pkill.log" ] && [ ! -f "$STATE/dpkg.log" ]; then echo "$*" >> "$STATE/sleep.log"; exit 0; fi
exec /bin/sleep "$@"
`,
    { mode: 0o755 },
  );
  const result = spawnSync("bash", [resolve(".github/scripts/install-playwright-browser.sh")], {
    encoding: "utf8",
    env: {
      NODE_ENV: "test",
      PATH: `${dir}:${process.env.PATH}`,
      STATE: dir,
      PLAN: plan,
      APT: apt,
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

it("skips the apt cleanup and dpkg repair when sudo would prompt", () => {
  const result = run("7,ok", false, "never:0");
  expect(result.status).toBe(0);
  expect(result.stdout).toBe(warning(1, "exit code 7"));
  expect(result.read("args.log")).toBe(args.repeat(2));
  expect(result.read("sudo.log")).toBe("-n true\n");
  expect(result.read("pkill.log") + result.read("pgrep.log")).toBe("");
});

it("stops the apt a cut attempt left behind before retrying", async () => {
  const result = run("hang,ok", true, "TERM:2");
  expect(result.status).toBe(0);
  expect(result.stdout).toBe(warning(1, "timed out after 1s"));
  expect(result.read("args.log")).toBe(args.repeat(2));
  expect(result.read("sudo.log")).toBe(dpkg);
  expect(result.read("sleep.log")).toBe("1\n".repeat(2));
  await expectStopped(result.read("hung.log"));
}, 15_000);

it("kills the apt that ignores TERM before retrying", () => {
  const result = run("7,ok", true, "KILL:1");
  expect(result.status).toBe(0);
  expect(result.stdout).toBe(warning(1, "exit code 7"));
  expect(result.read("args.log")).toBe(args.repeat(2));
  expect(result.read("sudo.log")).toBe(
    `-n true\n${pkills("TERM")}${pkills("KILL")}-n dpkg --configure -a\n`,
  );
  expect(result.read("sleep.log")).toBe("1\n".repeat(16));
});

it("fails closed without a retry while apt survives the cleanup", () => {
  const result = run("7,ok", true, "never:0");
  expect(result.status).toBe(1);
  expect(result.stdout).toBe(
    `${warning(1, "exit code 7")}::error::apt/dpkg still running after cleanup; browser install not retried\n`,
  );
  expect(result.read("args.log")).toBe(args);
  expect(result.read("sudo.log")).toBe(`-n true\n${pkills("TERM")}${pkills("KILL")}`);
  expect(result.read("sleep.log")).toBe("1\n".repeat(30));
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
