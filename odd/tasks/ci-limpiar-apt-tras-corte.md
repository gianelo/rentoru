# Clean up the orphaned apt after a cut install attempt
Worktree `rentoru-ci-apt-limpieza`, branch `fix/limpiar-apt-tras-corte`, base origin/dev `39fb0ee3496fbd8f8a6efdf0eab8c6e26919f4e1`. No app served.

## Specs
1. S1 — User: «si corrigelo», answering «¿Corrijo la mitigación o la revierto?».
2. S2 — Accepted proposal: «después del corte, cerrar con `sudo` el `apt-get`/`dpkg` que queda colgado,
   esperar con límite a que se libere el bloqueo y recién entonces reintentar».
3. S3 — Behavior added to `.github/scripts/install-playwright-browser.sh`, between a failed/cut attempt 1 and attempt 2,
   only when `sudo -n true` succeeds:
   a. `sudo -n pkill -TERM -x` for `apt-get`, `apt` and `dpkg`; then poll `pgrep -x` for those names, up to 15 s.
   b. If any remain: `sudo -n pkill -KILL -x` the same names; poll again up to 15 s.
   c. If any still remain: print `::error::apt/dpkg still running after cleanup; browser install not retried` and exit 1
      without a second attempt.
   d. Otherwise run the existing `sudo -n dpkg --configure -a || true` and retry as today.
   Without non-interactive sudo, behavior is unchanged (retry directly). Existing warnings, exit codes and the
   final error line stay identical.

## Tasks
- T1 [done: local] — S1–S3; worker mvpmbuzs-8-kgtm: script change + tests RED→GREEN with mutations, docs line.
- T2 [pending] — parent: review, verification, commit, PR→dev, promote, observe a real stall.

## Log
- L1 — User request verbatim: «si corrigelo».
- L2 — Evidence: staging run 40375561147 (fb69cc2), job e2e (publication): attempt 1 cut at 180 s during apt download;
  attempt 2 failed with `dpkg frontend lock was locked by another process with pid 3389` / `Could not get lock
  /var/lib/dpkg/lock-frontend. It is held by process 3389 (apt-get)`. Playwright runs `sudo apt-get`; sudo starts it in
  its own session, outside the process group the watchdog signals. This was the L6 risk of the original task.
- L3 — Separate, not in scope: flaky e2e `36.3 … at 768×1024` (URL stayed /publicar for 5 s) on dev 39fb0ee, with no
  app/test diff from the green 22d7a4d.
- L4 — Dependencies: task-owned node_modules of symlinks into the main checkout (lock identical) plus zod →
  .pnpm/zod@3.25.76. Risk: item 5 (CI).
- L5 — T1: RED 7 failed/2 passed → GREEN 9/9 (17/17 with routing contracts). Mutations caught and restored by
  hash: no KILL escalation (2 failed), retry although apt survives (1 failed). bash -n, typecheck, Biome, diff
  check ok; parent read the diff, spot-checked 17/17, no orphan processes. 105 changed lines. Unproven until a
  real stall: real pkill name/session reach, 15+15 s sufficiency, dpkg repair after KILL.
- L6 — Independent verifier mvpmj4xo-9-j90k: S1–S3 PASS with own fakes (7 cases: TERM enough, KILL needed,
  survives both, no sudo, first-try success, hang→ok, double failure); success path, warnings and final error
  byte-identical to base; pkill -x matches across sessions, so it reaches the staging orphan (reasoned). Minor:
  a pgrep error is treated as "stopped" (fail-open to the old retry). Native review review-7e7ea3d866af198d
  (resilience+reliability) approved, authority burned; advisories: pgrep names unproven, cleanup prints nothing.
