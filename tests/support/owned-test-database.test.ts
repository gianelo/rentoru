import { afterEach, describe, expect, it, vi } from "vitest";
import { ownedDatabase, selectedOwnedDatabase } from "../e2e/owned-test-database";

const local = "postgresql://postgres:postgres@127.0.0.1:55431/rentas_test";
const ci = "postgresql://postgres:postgres@localhost:5432/rentas_test";
const f31 = "postgresql://postgres:postgres@127.0.0.1:55433/rentas_test";

function check(dsn: string | undefined, actions?: string, port?: "55433") {
  vi.stubEnv("TEST_DATABASE_URL", dsn);
  vi.stubEnv("DATABASE_URL", undefined);
  vi.stubEnv("PLAYWRIGHT_BASE_URL", undefined);
  vi.stubEnv("GITHUB_ACTIONS", actions);
  return ownedDatabase(port);
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

  it("selects F31 only with its exact explicit environment value", () => {
    check(local);
    expect(selectedOwnedDatabase()).toBe(local);
    vi.stubEnv("F31_TEST_DB_PORT", "55433");
    expect(() => selectedOwnedDatabase()).toThrow();
    vi.stubEnv("TEST_DATABASE_URL", f31);
    expect(selectedOwnedDatabase()).toBe(f31);
    for (const invalid of ["55432", "55431", "", " 55433 "]) {
      vi.stubEnv("F31_TEST_DB_PORT", invalid);
      expect(() => selectedOwnedDatabase()).toThrow();
    }
    vi.stubEnv("F31_TEST_DB_PORT", undefined);
    expect(() => selectedOwnedDatabase()).toThrow();
  });

  it("accepts F31 only by explicit port without changing the default", () => {
    expect(() => check(f31)).toThrow();
    expect(check(f31, undefined, "55433")).toBe(f31);
    check(local);
    expect(ownedDatabase()).toBe(local);
    expect(() => ownedDatabase("55433")).toThrow();
  });

  it("rejects F31 with ambient database, preview, or wrong credentials", () => {
    check(f31, undefined, "55433");
    vi.stubEnv("DATABASE_URL", "ambient");
    expect(() => ownedDatabase("55433")).toThrow();
    check(f31, undefined, "55433");
    vi.stubEnv("PLAYWRIGHT_BASE_URL", "https://preview.example.invalid");
    expect(() => ownedDatabase("55433")).toThrow();
    expect(() =>
      check(f31.replace("postgres:postgres", "postgres:wrong"), undefined, "55433"),
    ).toThrow();
    expect(() => ownedDatabase("55433")).toThrow();
  });

  it("keeps the CI path and rejects F31 at localhost", () => {
    expect(check(ci, "true")).toBe(ci);
    expect(ownedDatabase("55433")).toBe(ci);
    expect(() => check(f31.replace("127.0.0.1", "localhost"), "true", "55433")).toThrow();
    expect(() => ownedDatabase("55433")).toThrow();
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
