# Production: detecting a bad release and rolling it back

CI/CD plan task 12. Three signals watch production, each answering a different question:

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

## What a rollback cannot undo

**Database migrations.** They run forward during the build and stay applied after a rollback, so the previous build runs against the newer schema. `deploy-migrate` refuses destructive statements unless a migration is marked `deploy-migrate: allow-destructive` with a reason (or `ALLOW_DESTRUCTIVE_MIGRATION` is set), so migrations are normally additive and an older build keeps working against them. Before rolling back past a release, check whether it shipped such a migration: one that is not backward compatible makes rollback unsafe, and the answer is to fix forward.
