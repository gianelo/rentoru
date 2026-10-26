# Notion11 — release gate for main
Worktree `rentoru-ci-release-gate`, branch `ci/release-gate`, base origin/dev `22d7a4d4161638c5f29da93a8ce0ff92e31b0263`. No app served.

## Specs
1. S1 — User: «vamos con la 11 ahora.»
2. S2 — Notion11 objective: «Verificar que la versión a producción es la validada en staging.»
   Acceptance: «No se permite publicar SHA/artefacto no aprobado; fallo de gate bloquea merge.»
3. S3 — Gate behavior (pull_request into main only):
   a. PR head branch must be `staging` in this repository; anything else fails.
   b. PR head SHA must equal the current `staging` branch HEAD.
   c. The workflow "CI" push run on branch staging for exactly that SHA must have concluded `success`.
      While it is queued/in progress (or not yet created) the gate waits, bounded; completed with any
      other conclusion (failure, cancelled, skipped…) fails immediately.
   d. The PR merge result tree must equal the tree of that staging SHA (the deployed artifact is
      exactly what staging validated).
   e. API errors and missing configuration fail closed with fixed messages; nothing prints secrets.
4. S4 — «fallo de gate bloquea merge»: requires making `release-gate` a required status check on main
   (repository setting; separate explicit user consent).

## Tasks
- T1 [done: local] — S1–S3; worker mvo2y82g-6-oegh: script, workflow job, tests RED→GREEN with mutations, docs.
- T2 [in_progress: verified locally, publication pending authorization] — parent: review, verification, commit, PR→dev, promote, then S4 setting with consent.

## Log
- L1 — User request verbatim: «vamos con la 11 ahora.»
- L2 — Evidence: main protection requires PR (0 approvals), enforce_admins true, no force push,
  required_status_checks null. Staging same shape. Last promotion PR451 head=staging 8a83c4a;
  main fd52fa9 tree 0a093060… equals staging 8a83c4a tree, so tree identity is achievable.
- L3 — Consequence accepted by design (fail closed): no direct hotfix PR to main; all changes go
  dev → staging → main. Emergency procedure belongs to Notion14 runbook.
- L4 — Reuse `.github/scripts/wait-for-preview.sh` pattern (bash, gh api, jq, fake gh/sleep on PATH in
  Vitest). Dependencies: task-owned node_modules of symlinks into main checkout (lock identical) plus
  zod → .pnpm/zod@3.25.76. Risk: item 5 (delivery gate) and item 3 (new required check).
- L5 — T1: RED 24 failed (23 script exit 127 + contract); GREEN 31/31 (gate + routing), 60/60 with CI
  contracts. Mutations caught and restored by hash: accept any conclusion (4 failed), skip staging-HEAD
  check (1), skip tree check (1). bash -n, typecheck, Biome, diff check ok. Parent read the script and
  spot-checked 31/31. Deviation: fixed message for unreadable trees (fail closed). 286 changed lines.
- L6 — Independent verifier mvo36mf6-7-np1w: S1/S3 PASS, S2 PASS locally (enforcement is S4). Own fakes
  covered 15 cases incl. 40 polls/39 sleeps timeout and no body/token leak. Read-only against real GitHub:
  current staging 7f70195 passed with run 40214159720; stale 8a83c4a refused; API shape matches. Native
  review review-2cef52825bf75984 (risk/resilience/reliability) approved, authority burned. Advisories: no
  retry on a transient API error and no re-evaluation after timeout (both fail closed; re-run the job);
  gate code comes from the PR head itself; real merge-ref checkout and bash 5 not yet exercised.
