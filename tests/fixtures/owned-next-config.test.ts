import { fileURLToPath } from "node:url";
import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from "next/constants.js";
import { describe, expect, it, vi } from "vitest";

const configPath = fileURLToPath(new URL("../../next.config.mjs", import.meta.url));
const { default: configuration, buildConfig } = await import(configPath);
const synthetic = {
  OWNED_CONTACT_ISOLATION: "rentoru-f367",
  RESEND_API_KEY: "re_owned_contact_synthetic",
  AUTH_MAIL_FROM: "Rentoru Test <sender@owned.invalid>",
  CONTACT_MAIL_TO: "recipient@owned.invalid",
};
const env = { ...synthetic, OWNED_CONTACT_APP_MODE: "dev-webpack" };
const isolation = { synthetic, isPreloaded: () => true };
const root = fileURLToPath(new URL("../../", import.meta.url));

describe("public owned Next config", () => {
  it("preserves ordinary defaults in every phase without loading test isolation", async () => {
    const loadIsolation = vi.fn();
    for (const phase of [PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD, "other"]) {
      expect(buildConfig(phase, {}, undefined)).toEqual({});
      expect(await configuration(phase, { env: {}, loadIsolation })).toEqual({});
    }
    expect(loadIsolation).not.toHaveBeenCalled();
  });
  it("denies marked wrong modes, phases, absent preload and nonexact synthetic guards", () => {
    for (const mode of ["", "production", "other"])
      expect(() =>
        buildConfig(PHASE_DEVELOPMENT_SERVER, { ...env, OWNED_CONTACT_APP_MODE: mode }, isolation),
      ).toThrow(/DENIED/);
    expect(() => buildConfig(PHASE_PRODUCTION_BUILD, env, isolation)).toThrow(/DENIED/);
    expect(() => buildConfig(PHASE_DEVELOPMENT_SERVER, env, undefined)).toThrow(/DENIED/);
    expect(() =>
      buildConfig(PHASE_DEVELOPMENT_SERVER, env, { ...isolation, isPreloaded: () => false }),
    ).toThrow(/DENIED/);
    for (const key of Object.keys(synthetic)) {
      for (const value of [undefined, "wrong"])
        expect(() =>
          buildConfig(PHASE_DEVELOPMENT_SERVER, { ...env, [key]: value }, isolation),
        ).toThrow(/DENIED/);
    }
  });
  it("supplies owned public paths through the actual root module default", async () => {
    const expected = {
      distDir: ".tmp/rentoru-f367-browser/next",
      outputFileTracingRoot: root,
      typescript: { tsconfigPath: ".tmp/rentoru-f367-browser/tsconfig.json" },
    };
    const loadIsolation = vi.fn(async () => ({ default: isolation }));
    expect(buildConfig(PHASE_DEVELOPMENT_SERVER, env, isolation)).toEqual(expected);
    expect(await configuration(PHASE_DEVELOPMENT_SERVER, { env, loadIsolation })).toEqual(expected);
    expect(loadIsolation).toHaveBeenCalledOnce();
  });
});
