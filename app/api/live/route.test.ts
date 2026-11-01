import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Liveness for the external five-minute monitor (CI/CD plan task 12).
 *
 * The whole point is that it never reaches the database: on Neon Free a check
 * every five minutes that queried it would keep the compute awake around the
 * clock and spend the monthly quota on monitoring alone. The database client
 * is replaced by a module that throws on import, so any path to it turns this
 * test red.
 */

const DB_CLIENT_MODULE = "../../../src/shared/db/client";

afterEach(() => {
  vi.doUnmock(DB_CLIENT_MODULE);
  vi.resetModules();
});

describe("GET /api/live", () => {
  it("answers 200 without loading the database client", async () => {
    vi.resetModules();
    vi.doMock(DB_CLIENT_MODULE, () => {
      throw new Error("liveness must not load the database client");
    });

    const { GET, dynamic } = await import("./route");
    const response = GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "alive" });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(dynamic).toBe("force-dynamic");
  });
});
