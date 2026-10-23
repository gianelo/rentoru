# Notion07 — parallel e2e jobs and concurrency
Worktree `rentoru-ci-07-jobs-concurrencia`, branch `ci/optimizar-jobs-concurrencia`.
Base origin/dev `263345843bd7c8a366dd529cd4e574eb3dc36cb1`; no app served.

## Specs
1. S1 — User: «si hazla la 07 aca».
2. S2 — Notion07 objective: «Paralelizar trabajos independientes y cancelar runs obsoletos del mismo PR.»
   Acceptance: «Menor duración medida, sin cancelar despliegues con migraciones.»
3. S3 — User: «si vamos hacerlo asi. pero el repo es publico», accepting the proposal
   «**3 jobs** (publicación · general+ficha · contacto+paginación)» and «una ejecución
   nueva cancele la anterior sólo en PRs y `dev`. En `staging`, cada validación debe terminar.»
4. S4 — The repository is public (`gh repo view`: PUBLIC). Comments claiming private,
   metered Actions minutes must be corrected, not left as a design rationale.

## Tasks
- T1 [done: local] — S2–S4; worker mvl1d5pv-1-gr2e: split the push e2e job into three isolated legs,
  each with its own Postgres/migrations/seed; preserve every step's commands/env,
  critical-profile semantics and failure propagation; staging-only no-cancel concurrency;
  contract tests RED→GREEN with mutations; docs. Commit: see L6.
- T2 [pending] — S2; parent: commit, publish PR→dev, measure the dev push wall time
  against the baseline below; update Notion07.

## Log
- L1 — User request verbatim: «si hazla la 07 aca».
- L2 — Baseline e2e job (dev runs 39960644073/39958316102/39903217889): setup ~70s;
  publication 36.3 105–110s; general E2E 53–61s; listing 30.2–30.4 60–70s;
  auth 30.4b2–30.7 65–74s; pagination 29.2 49–56s; total wall ~6m50s on dev critical.
  Old full dev 39168503576: e2e 6m43s was already the critical path.
- L3 — Builds differ in build-time env (AUTH_URL/port, SITE_URL, R2 origin,
  AUTH_SECRET): one shared build is unsafe. Step ordering constraints exist only
  because blocks share one DB; separate legs with their own seed remove them.
  CI does not deploy (Vercel migrates in vercel-build), so cancelling CI cannot
  cancel a deployment with migrations.
- L4 — User chose 3 legs; repo confirmed PUBLIC, so the metered-minutes rationale is
  false. 3 legs kept: 5 would save ~12s more for more duplicated setup.
- L5 — Dependencies: package.json/pnpm-lock.yaml identical to the existing hub
  (rentoru-ci-perfiles-entorno 3ada201); node_modules symlinked, ignored, no install.
  Estimate ≤400 changed lines incl. tests/docs/closure. Risk: item 5 (CI/delivery).
- L6 — T1 evidence: RED 4 failed/29 passed (leg split, critical-only-in-reads,
  staging no-cancel, publication isolation); GREEN 4 files/33 tests. Mutations each
  caught by only the intended test and restored: pagination moved to reads (1/32),
  cancel-in-progress always true (1/32). typecheck, Biome, diff check and YAML parse
  pass. Parent spot check 33/33. Worker's stray untracked copy of ci.yml was verified
  identical (cmp) and removed by the parent. No required status checks exist on dev
  or staging, so renamed checks e2e (publication|reads|auth) break no protection.
- L7 — Native ASSESS on ac8db10: high (native high + agent item5), reviewDue=true,
  independent verifier required. Verifier mvl1ilnp-2-8s8b PARTIAL, no correctness
  defect: all 13 steps identical minus the new if, one leg each, other jobs unchanged,
  no cross-leg data dependency (writing specs clean up; 36.3 has no POSTs), 33/33.
  Findings fixed in one correction: (A) "every staging validation finishes" was too
  strong — GitHub keeps one pending run per group, so a queued intermediate staging
  push can be superseded while a started run always finishes; (B) design.md F2 row
  still claimed private-repo minutes; now marked historical. Contract tests 33/33.
- L8 — Native review review-1a263818cb232b9e, committed range from 2633458 (6 files,
  176 lines), lenses resilience+reliability: APPROVED, exact acknowledgement burned
  authority. Advisory only: R3-001 (auth leg skips pagination after an auth failure,
  as the old serial job did) and R3-002 (more concurrency cases); follow-ups, not
  blockers. Local work verified; publication, real CI timing and Notion07 pending.
