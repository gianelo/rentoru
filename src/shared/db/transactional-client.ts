import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { db } from "./client";
import type * as schema from "./schema";

/**
 * The handle for writes that must be atomic.
 *
 * Publishing a listing writes one `listing` row and up to six `listing_photo`
 * rows, and a listing with no photos violates a publish rule — so the two
 * writes must succeed or fail together through `db.transaction()`.
 *
 * Since reads moved to node-postgres this is the SAME drizzle instance over
 * the SAME pool as `client.ts`: one driver, one pool per process. It stays a
 * function so every caller keeps naming the write intent, and so a later
 * change of driver for writes alone has one place to happen.
 *
 * The integration suite runs node-postgres too, so the transaction it proves
 * is the one the deployment runs — not a different path that only resembles
 * it.
 */

export type TransactionalDatabase = NodePgDatabase<typeof schema>;

export function getTransactionalDatabase(): TransactionalDatabase {
  return db;
}
