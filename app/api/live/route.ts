/**
 * Liveness for the external five-minute monitor (CI/CD plan task 12).
 *
 * **It never touches the database, on purpose.** `/api/health` queries it, and
 * that is the right question for the hourly GitHub heartbeat and the
 * post-deploy smoke. Asked every five minutes it would be the wrong one: Neon
 * Free suspends the compute after five idle minutes, so a database check at
 * that cadence keeps it awake around the clock and spends the monthly
 * CU-hours on monitoring alone — the quota outage of 2026-10-26, caused by the
 * watcher. This route answers only "is the app serving?".
 */

// Never cached: a cached 200 would keep saying "alive" after the app died.
export const dynamic = "force-dynamic";

export function GET(): Response {
  return Response.json({ status: "alive" }, { headers: { "cache-control": "no-store" } });
}
