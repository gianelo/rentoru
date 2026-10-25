import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_SEED_REFUSAL, demoSeedRefusal, loadDotEnvWithoutOverriding } from "./seed";

/**
 * `pnpm db:seed` failed on every developer machine with "DATABASE_URL
 * environment variable is not set" while the value sat in `.env`, because
 * `tsx` does not read `.env` — it only ever sees `process.env`. The command
 * could therefore only work where the variable already came from the
 * environment, which is to say: on a deploy. `drizzle-kit` carries its own
 * .env loading, so `pnpm db:migrate` worked and hid the asymmetry.
 *
 * The precedence rule is the dangerous half and the reason this is tested
 * rather than trusted: if `.env` won over the real environment, a deploy
 * that supplies the real connection string through its environment could be
 * silently redirected to whatever a local file happens to name. Loading
 * `.env` is a convenience; not overriding the environment is a guarantee.
 */
describe("loadDotEnvWithoutOverriding", () => {
  beforeEach(() => {
    // The real `.env` is irrelevant here — what is under test is the
    // precedence applied to whatever the loader produced.
    vi.spyOn(process, "loadEnvFile").mockImplementation(() => {
      process.env.SEED_TEST_FROM_DOTENV = "from-dotenv";
      process.env.SEED_TEST_CONTESTED = "from-dotenv";
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env.SEED_TEST_FROM_DOTENV = undefined;
    process.env.SEED_TEST_CONTESTED = undefined;
  });

  it("fills in a value the environment does not have", () => {
    const env: Record<string, string | undefined> = {};
    loadDotEnvWithoutOverriding(env);

    expect(process.env.SEED_TEST_FROM_DOTENV).toBe("from-dotenv");
  });

  it("never overrides a value the real environment already set", () => {
    const env: Record<string, string | undefined> = {
      SEED_TEST_CONTESTED: "from-real-environment",
    };
    loadDotEnvWithoutOverriding(env);

    expect(env.SEED_TEST_CONTESTED).toBe("from-real-environment");
  });

  it("is a no-op rather than a failure when no .env exists", () => {
    vi.spyOn(process, "loadEnvFile").mockImplementation(() => {
      throw new Error("ENOENT: no such file or directory, open '.env'");
    });

    const env: Record<string, string | undefined> = { DATABASE_URL: "from-real-environment" };

    // A deploy has no `.env` at all. Throwing here would break the one
    // environment where the values are already correct.
    expect(() => loadDotEnvWithoutOverriding(env)).not.toThrow();
    expect(env.DATABASE_URL).toBe("from-real-environment");
  });
});

/**
 * `pnpm db:seed` inserts two invented publishers and ten fake listings. Run
 * with production's DATABASE_URL it would put them in the real catalogue, so
 * the demo half only runs after a human names a non-production target on the
 * command itself. Read before `.env`: a stale value in a file that points at
 * production must not be able to authorize it.
 */
describe("demoSeedRefusal", () => {
  it.each(["local", "dev", "staging"])("allows the named non-production target %s", (target) => {
    expect(demoSeedRefusal(target)).toBeNull();
  });

  it.each([undefined, "", "production", "prod", "Staging", " staging"])("refuses %j", (target) => {
    expect(demoSeedRefusal(target)).toBe(DEMO_SEED_REFUSAL);
  });
});

describe("pnpm db:seed entry", () => {
  const script = resolve("src/shared/db/seed.ts");
  const tsx = resolve("node_modules/.bin/tsx");

  function run(extra: Record<string, string>) {
    const cwd = mkdtempSync(join(tmpdir(), "seed-guard-"));
    writeFileSync(join(cwd, ".env"), "SEED_DEMO_TARGET=local\n");
    return spawnSync(tsx, [script], {
      cwd,
      encoding: "utf8",
      timeout: 20_000,
      env: {
        PATH: process.env.PATH,
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://u:p@ep-guard-0000-pooler.invalid.neon.tech/db?sslmode=require",
        ...extra,
      },
    });
  }

  it("refuses before touching the database when no target is named, even if .env names one", () => {
    const result = run({});
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe(`${DEMO_SEED_REFUSAL}\n`);
  }, 30_000);

  it("refuses a production target", () => {
    const result = run({ SEED_DEMO_TARGET: "production" });
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe(`${DEMO_SEED_REFUSAL}\n`);
  }, 30_000);
});
