# Preview-dev home data timing
Worktree `rentoru-diag-ssr-inicio`, branch `test/diagnostico-ssr-inicio`.
Fresh dev base `262ce143cdac977049705c7c0c9c8dcb958b0d82`; no app served.

## Specs
1. S1 — User: «si hazlo», accepting
   «¿Autorizas esa instrumentación sólo para el preview de dev, manteniendo intactos los límites de rendimiento?».
2. S2 — Accepted scope: «medir temporalmente las fases del SSR —catálogo,
   colecciones y portadas— con logs numéricos, sin datos privados ni cambios de
   comportamiento».

## Tasks
- T1 [in_progress: owner-authorized partial Draft publication for GitHub CI] — S1–S2; inline, one dependent
  behavior including helper/caller/tests/docs. Prepare local opt-in diagnostics,
  observe served-output RED/GREEN, mutation and baseline differential, run
  focused/full applicable checks and the risk-gated verification. Closure pending.
  Publication, Vercel flag activation and merge remain human decisions.

## Log
- L1 — User request verbatim: «si hazlo», in response to S1/S2.
- L2 — The authorized private HTML capture had DNS4.544ms, connection241.631ms
  (TLS200.794 included), wait-for-headers2404.644ms, total preheaders2678.571ms.
  Its image was High priority/parser,3585bytes, requested29.313ms after HTML
  headers. This narrows the stage, not SSR/Neon causality. No more browser capture,
  CI rerun, SQL/index/cache/region/timeout change is authorized here.
- L3 — Readback: home is force-dynamic and prepares cities/active zones in parallel,
  then collections, then covers; session/account flags follow. Neon uses HTTP.
  Root layout headers/dynamic behavior is deliberately accepted and untouched.
- L4 — Technical decision: fail-closed opt-in HOME_SSR_TIMING_DIAGNOSTICS=1 AND
  VERCEL_ENV=preview AND VERCEL_GIT_COMMIT_REF=dev. Missing/other values emit nothing.
  System variables are provider metadata, not user input; no new dependency.
  Activation must be a Preview/dev override, never Production/staging.
- L5 — One JSON line on successfully completed page data preparation. Closed phase
  labels, finite/nonnegative ms or null; no URL, SQL, IDs, request fingerprints,
  cookies/session/user values, arguments/results or errors. Per-request state,
  no request identifiers/global counters. Diagnostic sink/clock failures must not
  change results/errors; actions start in the original order/concurrency.
  dataPreparationMs excludes edge/startup, root layout and React/HTML rendering;
  parallel phase times overlap, so do not sum them into a server duration.
  Redirect/error paths keep their behavior and do not claim completed data timing.
- L6 — Reuse existing app/inicio-servido.test.tsx fake-port/rendered-HTML fixture.
  New served test must prove the real caller emits only in allowed scope while
  preserving exact body, including private-value sentinels absent from logs.
  Helper tests protect gate, numeric shape and action/error identity. No DB/app
  resources needed; source tests must not read Git history. Parent differential
  probes compare baseline/new rendered output and logs in isolated local state.
- L7 — Complete normally formatted code/tests/docs/closure forecast340–395 lines,
  hard400; reserve closure room. No UI change, so browser acceptance does not apply;
  served-output tests still apply. No new fixture platform or split writers.
  Only one behavior, so inline. Named risks: privacy/scope guard (item2), later
  environment activation (item5); independent verification is risk-gated, never
  inferred merely from file count or a writer summary.
- L8 — Job11 fresh dev fetched/clean sibling at262 verified/registered. Correct
  cached dependencies reused without install. Main checkout's preexisting changes
  to package.json/pnpm-lock.yaml are untouched. Operational proof goes under the
  already ignored test-results/ssr-proof, not intended review scope; no secrets.
  Mutation evidence was moved there intact before coverage, whose runner cleans
  its own reports directory. No proof or source was deleted.
  This document/mirror are established before the first implementation write.

- L9 — Real served-caller RED:1 failed/16 passed, expected info event1 got0;
  HTML equality already passed. No-op helper RED:5 failed/27 passed. After wiring
  and implementation, focused32/32 GREEN. Gate-off returns the action's promise;
  gate-on clocks/closed phases/one completion line retain results/error identity.
- L10 — Four intended mutations each exited1: preview gate, branch gate, extra
  record field, removed real caller finish. Exact fixed source restored each time.
- L11 — Baseline262 versus candidate public served probe:9 cases, both runners
  exit0/stderr0; exact HTML, error/message, stderr and query/session call counts.
  Only requested scoped stdout differs. Redirect/error remain silent. Operational
  probes are archived as text; baseline inputs are retained in hidden scratch.
- L12 — Typecheck with incremental caching disabled, targeted Biome and diff check
  all exit0. Actual TypeScript config sees0 private differential inputs; no config
  weakened. One full unit/coverage run is active (job14); result pending.
- L13 — Job14 required full unit/coverage EXIT1:317 files passed/1 failed,
  3589 tests passed/2 failed of3591. scripts/wait-for-preview.test.ts:110 timed out
  at5000ms for the empty deployments array and the deployment with sha=wrong.
  These script paths have zero diff; causality/pre-existence is NOT established.
  No retry, timeout increase, dropped assertion or coverage success is claimed.
  Native assessment/independent privacy verification have not started because
  writer verification is partial. No commit/push/PR, activation or app served.
- L14 — Needs owner decision: authorize one isolated baseline/candidate comparison
  of those exact failed cases with the existing timeout, not a blind suite rerun.
  T1 stays blocked; no performance fix, CI success or review approval is claimed.
  Source/tests/docs total383 authored lines including this failure closure.
  Risk: item2 (fail-closed logging scope/privacy guard). All manual resources and
  artifacts retained; no new DB/app/proxy service, install or cleanup. Timing
  itself has observer overhead; local fakes do not prove deployed timing accuracy.
- L15 — User «si» authorizes only the proposed two-case baseline/candidate
  comparison. Job15 runs sequentially/single-worker with the existing5000ms
  test timeout and unchanged assertions; source scripts match byte-for-byte.
- L16 — Job15 exit0: base2/2 (5.76s), candidate2/2 (5.11s), stderr0 both,
  20 unrelated cases skipped per side; no full suite rerun. Failure not reproduced
  in this mode; coverage/causality/privacy verification remain unproven.
- L17 — User: «porque lo estas corriendo en local»; then:
  «porque lo estas corriendo en local y el fallo es en github no son los mismo
  entornos. sube esto al PR como otro commit no se para probar en el github».
  Publish partial Draft→dev for normal GitHub CI; stop local reruns. CI results,
  native assessment/privacy verification and live preview timings are pending.
