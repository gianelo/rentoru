# Bound the Playwright browser install step
Worktree `rentoru-ci-apt-acotado`, branch `ci/acotar-instalacion-navegador`, base origin/dev `ab6c23659c85a1071c45cd32b133b84820910a55`. No app served.

## Specs
1. S1 — User: «dale mitigacion del apt».
2. S2 — Accepted proposal: «acotar ese paso con un límite de pocos minutos y un único reintento», «No debilita ninguna prueba; sólo corta el cuelgue.»
3. S3 — Behavior: each attempt of `pnpm exec playwright install --with-deps chromium` is cut at 180 s
   (overridable for tests), at most 2 attempts; success on any attempt exits 0; both failing exits non-zero
   so the job stays red; each cut or failed attempt emits a GitHub `::warning::` line naming the attempt.
   Applies to the e2e matrix legs and the measure job.

## Tasks
- T1 [done: local] — S1–S3; worker mvlf7693-3-cdes: shared script, both workflow call sites, tests RED→GREEN, docs.
- T2 [in_progress: published, real runs pending] — parent: review, risk-gated verification, commit, PR→dev, measure real runs.

## Log
- L1 — User request verbatim: «dale mitigacion del apt».
- L2 — Evidence: "Install the browser" stalled in 4 of 6 runs after the e2e split (409 s, 621 s, 701 s, 827 s);
  normal 11–28 s. Logs show apt fetching ~25 MB at ~30 kB/s; Playwright browser cache hit. Clean runs: ~3 min dev push.
- L3 — Unknown: whether a second attempt avoids the slow mirror. Worst case bounded to ~2×180 s; measure after merge.
- L4 — Dependencies: task-owned node_modules of symlinks into the main checkout (lock identical) plus
  zod → .pnpm/zod@3.25.76 (main lacks the top-level zod link). Risk: item 5 (CI).
- L5 — T1: RED 7 failed (6 script tests exit 127 + contract); GREEN 6/6 script, 36/36 with contracts.
  Mutations caught and restored: exit 0 after two failures (2 failed), single attempt (5 failed),
  TERM/KILL only to the leader (3 failed, child survived). bash -n, typecheck, Biome, diff check ok.
  Parent spot check 36/36, no orphan processes. 190 changed lines.
- L6 — Review limit: Ubuntu sudo may run apt in its own session (use_pty); TERM reaches sudo,
  which relays it. If apt ignored TERM, the later KILL would not reach it and the retry would hit
  the dpkg lock and fail the job visibly (red), never silently. Unproven until a real runner.
- L7 — Independent verifier mvlfovbq-4-gb8z: S1–S3 PASS with own fakes (fast success, hang with child,
  exit 7, double failure; no survivors; TERM-ignoring child killed by KILL). Minor: dpkg repair has no
  own bound; leader exiting with live children leaves them unreaped. Native review review-1acb34d38b1b3002
  (resilience+reliability) approved on its single retry after a relay abort; authority burned. Advisory:
  a slow-but-progressing mirror now fails red after 2×180 s instead of finishing late (accepted by the
  user before publication). User authorized push and PR to dev.
