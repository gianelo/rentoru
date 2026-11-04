import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { assertPooledConnectionString } from "./pooled-connection";
import * as schema from "./schema";

function getPooledDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL environment variable is not set.");
  }

  return assertPooledConnectionString(url);
}

// Standard node-postgres, so the same build runs against any Postgres —
// Neon, another provider, the local container, CI's service — by changing
// DATABASE_URL alone (design.md D2). No HTTP translation and no proxy: the
// e2e harness and the deployment speak the same wire protocol to the same
// driver, and `transaction()` works everywhere.
//
// ONE pool per process, built at module load, shared by reads and by
// `transactional-client.ts`. Small on purpose: every warm serverless instance
// holds its own, and the provider's pooler (Neon's `-pooler.` endpoint) is
// what absorbs the concurrency, not this number. Idle sockets close quickly
// so a frozen instance does not sit on connections it is not using.
const pool = new pg.Pool({
  connectionString: getPooledDatabaseUrl(),
  max: 5,
  idleTimeoutMillis: 10_000,
});

// An idle client the server drops emits `error` on the pool. Unhandled, Node
// kills the process — the deploy smoke scripts would die mid-build. The pool
// already discards that client; logging is all that is left to do.
pool.on("error", (error) => {
  console.error("db pool: idle client error", error.message);
});

export const db = drizzle(pool, { schema });
