import { describe, expect, it } from "vitest";
import { paginationRows, requireDisposablePaginationTarget } from "./seed-pagination-e2e";

describe("29.2 isolated pagination fixture", () => {
  it("refuses unknown, remote and unowned databases before connecting", () => {
    expect(() => requireDisposablePaginationTarget(undefined, {})).toThrow();
    expect(() =>
      requireDisposablePaginationTarget(
        "postgresql://postgres:postgres@localhost:5432/rentas_test",
        {},
      ),
    ).toThrow();
    expect(() =>
      requireDisposablePaginationTarget("postgresql://postgres:postgres@remote:5432/rentas_test", {
        GITHUB_ACTIONS: "true",
      }),
    ).toThrow();
  });

  it("allows only the canonical CI service or an explicitly owned local ephemeral target", () => {
    expect(
      requireDisposablePaginationTarget(
        "postgresql://postgres:postgres@localhost:5432/rentas_test",
        {
          GITHUB_ACTIONS: "true",
        },
      ),
    ).toBeDefined();
    expect(
      requireDisposablePaginationTarget(
        "postgresql://postgres:postgres@127.0.0.1:5432/rentas_pagination_ephemeral",
        {
          PAGINATION_E2E_DB_OWNER: "I_OWN_THIS_DISPOSABLE_DB",
        },
      ),
    ).toBeDefined();
    expect(() =>
      requireDisposablePaginationTarget(
        "postgresql://postgres:postgres@localhost:5432/rentas_test",
        {
          PAGINATION_E2E_DB_OWNER: "I_OWN_THIS_DISPOSABLE_DB",
        },
      ),
    ).toThrow();
  });

  it("generates 24 distinct active current Altamira listings with deterministic photos", () => {
    const rows = paginationRows(new Date("2026-09-28T00:00:00Z"));
    expect(rows).toHaveLength(24);
    expect(new Set(rows.map((row) => row.id)).size).toBe(24);
    expect(rows.every((row) => row.zoneId === "e2e-zona-altamira" && row.status === "active")).toBe(
      true,
    );
    expect(rows.every((row) => row.expiresAt > new Date("2026-09-28T00:00:00Z"))).toBe(true);
    expect(rows.map((row) => row.title)).toContain("Apartamento paginación 24 en Altamira");
  });
});
