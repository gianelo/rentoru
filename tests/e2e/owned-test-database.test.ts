import { afterEach, describe, expect, it, vi } from "vitest";
import { ownedDatabase } from "./owned-test-database";

const local = "postgresql://postgres:postgres@127.0.0.1:55431/rentas_test";
const ci = "postgresql://postgres:postgres@localhost:5432/rentas_test";

function check(dsn: string | undefined, actions?: string) {
  vi.stubEnv("TEST_DATABASE_URL", dsn);
  vi.stubEnv("DATABASE_URL", undefined);
  vi.stubEnv("PLAYWRIGHT_BASE_URL", undefined);
  vi.stubEnv("GITHUB_ACTIONS", actions);
  return ownedDatabase();
}

afterEach(() => vi.unstubAllEnvs());

describe("ownedDatabase", () => {
  it("accepts only the owned local DSN and the Actions DSN in Actions", () => {
    expect(check(local)).toBe(local);
    expect(check(local, "true")).toBe(local);
    expect(check(ci, "true")).toBe(ci);
    expect(() => check(ci)).toThrow();
    expect(() => check(ci, "false")).toThrow();
  });

  it("rejects missing DSN, ambient database, and preview", () => {
    expect(() => check(undefined)).toThrow();
    check(local);
    vi.stubEnv("DATABASE_URL", "postgresql://other");
    expect(() => ownedDatabase()).toThrow();
    vi.stubEnv("DATABASE_URL", "");
    expect(() => ownedDatabase()).toThrow();
    check(local);
    vi.stubEnv("PLAYWRIGHT_BASE_URL", "https://preview.invalid");
    expect(() => ownedDatabase()).toThrow();
  });

  it.each([
    "not a url",
    "postgres://postgres:postgres@127.0.0.1:55431/rentas_test",
    "postgresql://wrong:postgres@127.0.0.1:55431/rentas_test",
    "postgresql://postgres:wrong@127.0.0.1:55431/rentas_test",
    "postgresql://postgres:postgres@localhost:55431/rentas_test",
    "postgresql://postgres:postgres@127.0.0.2:55431/rentas_test",
    "postgresql://postgres:postgres@127.0.0.1:5432/rentas_test",
    "postgresql://postgres:postgres@127.0.0.1:55431/other",
    `${local}?sslmode=disable`,
    `${local}#fragment`,
  ])("rejects altered DSN %s", (dsn) => {
    expect(() => check(dsn)).toThrow();
  });
});
