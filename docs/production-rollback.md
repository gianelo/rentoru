# Production runbook: releasing, detecting a bad release and rolling it back

CI/CD plan tasks 12 and 14. Releasing is described first, then how to tell that something is wrong, how to roll back, what a rollback cannot undo, and a drill to rehearse it all.

## Releasing

Every change reaches production through `dev → staging → main`, and only that way. The founder performs every merge, always as a normal merge (no squash, no rebase).

1. **Into `dev`.** Feature PRs target `dev`. The PR runs the basic jobs (lint, types, tokens, unit/coverage, integration, build). The push to `dev` runs the critical e2e profile, and Vercel deploys the Dev preview, which applies migrations to the Dev database.
2. **`dev → staging`.** Open a PR with head `dev` and base `staging`. A promotion carries everything merged since the last one, so it usually exceeds the 400-line review budget and needs the founder's explicit exception, written in the PR body. After the merge, the push to `staging` runs the full validation: e2e and crawlability, measure, budgets, and Lighthouse on the Staging preview. Vercel applies the migrations to the Staging database **before production sees them**.
3. **Wait for staging green.** A red staging run is reported, not re-run. The cause is understood first, then fixed through a new PR into `dev`.
4. **`staging → main`.** Open a PR with head `staging` and base `main`. The required `release-gate` check passes only when the head is the current `staging` HEAD, that SHA's staging CI run succeeded, and the merge tree equals the validated tree.
5. **After the merge,** Vercel builds Production (`vercel-build` runs `deploy-migrate`, then `next build`), and `Production smoke` checks the real domain. A green smoke run closes the release.

If a release includes a migration, read it in the staging PR before merging into `main` (see [Migrations](#migrations-must-stay-backward-compatible)).

## Watching production

Three signals watch production, each answering a different question:

| Signal | Asks | Cadence | Touches the database |
|---|---|---|---|
| External monitor on `https://rentoru.com/api/live` | Is the app serving? | every 5 minutes | **no** |
| `Production smoke` workflow | Did this release come up whole? | after every Production deployment | yes, once |
| `Heartbeat` workflow on `/api/health` | Does the database answer? | GitHub's cron, every few hours in practice | yes |

The five-minute check must never touch the database. Neon Free suspends the compute after five idle minutes; a database query at that cadence keeps it awake around the clock and spends the monthly 100 CU-hours on monitoring alone. That is how production went down on 2026-10-26.

## Setting up the external monitor (once)

Create an HTTP monitor in any free uptime service (UptimeRobot, Better Stack): URL `https://rentoru.com/api/live`, interval 5 minutes, expected status 200, alert by email. It answers `{"status":"alive"}` without loading the database client (`app/api/live/route.ts`).

## When something is red

1. **Read which signal is red.**
   - `/api/live` failing means the app itself is down.
   - `/api/health` failing alone means the database is not answering. Check the Neon console (compute suspended, quota exhausted) **before** rolling back: a rollback does not touch the database and will not fix it.
2. **Roll back the application.** In Vercel: Project → Production Deployment → **Instant Rollback** → Continue → Confirm Rollback.
   - On the Hobby plan only the immediately previous production deployment is eligible.
   - The previous build is reused as it was. It is not rebuilt, `deploy-migrate` does not run again, and it keeps the environment variables it was built with.
   - Vercel then stops promoting new pushes to `main` until the rollback is undone.
3. **Verify.** A rollback creates no new deployment, so `Production smoke` does not run on its own. Re-run the last `Production smoke` run in GitHub Actions; it checks the real domain, whichever deployment it serves.
4. **Fix forward through the normal path.** The fix goes `dev → staging → main`. The release gate refuses any pull request into `main` that is not the validated `staging` head, so there is no direct hotfix.
5. **Undo the rollback** once the fixed deployment exists: Vercel → **Undo Rollback**, choose the new deployment → Confirm (CLI: `vercel promote <deployment-url>`). This restores automatic promotion. The new deployment's `Production smoke` run must be green.

## Migrations must stay backward compatible

A rollback cannot undo **database migrations**. They run forward during the build and stay applied after a rollback, so the previous build runs against the newer schema. A release is only safely reversible when the previous build still works against that schema.

`deploy-migrate` refuses destructive statements unless a migration is marked `deploy-migrate: allow-destructive` with a reason (or `ALLOW_DESTRUCTIVE_MIGRATION` is set), so migrations are normally additive. Keep them that way:

- **Additive is safe.** A new table, a new nullable column, or a new column with a default: the older build ignores it.
- **Removing or renaming takes two releases.** First, a release whose code stops using the column. Then, a later release that drops it, with the `allow-destructive` marker and its reason. Never do both in one release.
- **A new `NOT NULL` without a default,** or a tightened constraint, breaks the older build's inserts. Add it as nullable or with a default, backfill, and tighten in a later release.

Before rolling back past a release, check whether it shipped a migration. If that migration is not backward compatible, a rollback is unsafe and the answer is to fix forward.

## Incident drill

Rehearse once, and again after any change to this runbook, so the first real incident is not the first time anyone reads it. None of these steps changes production.

1. **Alerting.** Run the `Heartbeat` workflow by hand (Actions → Heartbeat → Run workflow) and confirm it is green. To check that its alert mail arrives, point the external monitor at a URL that does not exist for one interval, confirm the email, then restore `/api/live`.
2. **Smoke.** Re-run the last `Production smoke` run and confirm the three `ok` lines.
3. **Rollback, read-only.** In Vercel, open Production Deployment → Instant Rollback and confirm which deployment is eligible, then **cancel**. Note how long it took to find.
4. **Migrations.** Pick the latest migration in `drizzle/` and decide, using the rules above, whether a rollback past it would be safe.
5. **Record** the date, what was slow or unclear, and any fix to this document.

Performing a real Instant Rollback is a separate, explicit founder decision. It stops automatic promotion until it is undone.
