import pg from "pg";
import { afterEach, describe, expect, it, vi } from "vitest";

// Building a `pg.Pool` opens no connection, so these run without a database.
// What they pin is the shape a deployment depends on: ONE pool per process,
// sized for serverless, shared by reads and transactional writes.
async function load(url: string | undefined) {
  vi.resetModules();
  vi.stubEnv("DATABASE_URL", url);
  const { db } = await import("./client");
  const { getTransactionalDatabase } = await import("./transactional-client");
  return { db, getTransactionalDatabase };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("db client (node-postgres)", () => {
  it("fails closed at module load when DATABASE_URL is missing", async () => {
    await expect(load(undefined)).rejects.toThrow("DATABASE_URL environment variable is not set.");
  });

  it("refuses Neon's direct endpoint at module load", async () => {
    await expect(load("postgresql://u:p@ep-x.us-east-1.aws.neon.tech/rentas")).rejects.toThrow(
      /pooled endpoint/i,
    );
  });

  it("runs on a standard Postgres pool sized for serverless", async () => {
    const url = "postgresql://postgres:postgres@127.0.0.1:55433/rentas_test";
    const { db } = await load(url);
    expect(db.$client).toBeInstanceOf(pg.Pool);
    expect(db.$client.options.connectionString).toBe(url);
    expect(db.$client.options.max).toBeLessThanOrEqual(5);
    expect(db.$client.options.idleTimeoutMillis).toBeGreaterThan(0);
  });

  it("gives transactional writes the same pool as reads, every call", async () => {
    const { db, getTransactionalDatabase } = await load("postgresql://u:p@localhost:5432/rentas");
    const poolOf = () => (getTransactionalDatabase() as typeof db).$client;
    expect(poolOf()).toBe(db.$client);
    expect(poolOf()).toBe(poolOf());
  });

  // An idle client dropped by the server (pooler restart, backend killed)
  // emits `error` on the pool; with no listener Node throws and the process
  // dies — fatal for the deploy smoke scripts that import this client.
  it("handles idle-client errors instead of crashing the process", async () => {
    const { db } = await load("postgresql://u:p@localhost:5432/rentas");
    expect(db.$client.listenerCount("error")).toBeGreaterThan(0);
  });
});
