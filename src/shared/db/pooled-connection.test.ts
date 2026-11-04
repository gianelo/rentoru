import { describe, expect, it } from "vitest";
import { assertPooledConnectionString } from "./pooled-connection";

const POOLED_URL =
  "postgresql://user:pass@ep-cool-forest-12345-pooler.us-east-2.aws.neon.tech/rentas?sslmode=require";
const DIRECT_URL =
  "postgresql://user:pass@ep-cool-forest-12345.us-east-2.aws.neon.tech/rentas?sslmode=require";

describe("assertPooledConnectionString", () => {
  it("accepts Neon's pooled endpoint and returns it unchanged", () => {
    expect(assertPooledConnectionString(POOLED_URL)).toBe(POOLED_URL);
  });

  it("rejects Neon's direct endpoint — connection exhaustion is the predictable failure under serverless concurrency (design.md D2)", () => {
    expect(() => assertPooledConnectionString(DIRECT_URL)).toThrow(/pooled endpoint/i);
  });

  it("rejects a value that is not a valid URL at all", () => {
    expect(() => assertPooledConnectionString("not-a-url")).toThrow(
      /not a valid connection string/,
    );
  });

  // The `-pooler.` rule is Neon's, not Postgres's: any other host has no such
  // endpoint, so demanding it would make the app unable to run anywhere else.
  it.each([
    "postgresql://postgres:postgres@localhost:5432/rentas_test",
    "postgresql://postgres:postgres@127.0.0.1:55433/rentas_test",
    "postgresql://u:p@db.abcdefgh.supabase.co:5432/postgres?sslmode=require",
    "postgresql://u:p@rentas.cluster-xyz.us-east-1.rds.amazonaws.com:5432/rentas",
  ])("accepts a non-Neon host unchanged: %s", (url) => {
    expect(assertPooledConnectionString(url)).toBe(url);
  });

  it("still rejects a direct Neon endpoint whatever the region", () => {
    expect(() =>
      assertPooledConnectionString("postgresql://u:p@ep-x.us-east-1.aws.neon.tech/rentas"),
    ).toThrow(/pooled endpoint/i);
  });

  it("accepts the pooled Neon endpoint in that region", () => {
    const url = "postgresql://u:p@ep-x-pooler.us-east-1.aws.neon.tech/rentas";
    expect(assertPooledConnectionString(url)).toBe(url);
  });

  // Hostnames are case-insensitive and may carry a trailing root dot, and
  // `new URL()` normalises neither for the `postgresql:` scheme.
  it.each([
    "postgresql://u:p@EP-X.US-EAST-1.AWS.NEON.TECH/rentas",
    "postgresql://u:p@ep-x.us-east-1.aws.neon.tech./rentas",
  ])("rejects a disguised direct Neon endpoint: %s", (url) => {
    expect(() => assertPooledConnectionString(url)).toThrow(/pooled endpoint/i);
  });

  it("accepts Neon's pooled endpoint written in uppercase", () => {
    const url = "postgresql://u:p@EP-X-POOLER.US-EAST-1.AWS.NEON.TECH/rentas";
    expect(assertPooledConnectionString(url)).toBe(url);
  });
});
