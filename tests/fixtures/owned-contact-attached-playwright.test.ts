import { describe, expect, it, vi } from "vitest";

vi.mock("node:fs", () => ({ readFileSync: vi.fn(() => "3459\n") }));
vi.mock("./owned-contact-playwright.config", () => ({
  ownedConfig: vi.fn(() => ({ webServer: { reuseExistingServer: false }, use: {} })),
}));
const appPath = "./owned-contact-app.mjs";
const { appEnv, repoRoot } = await import(appPath);
const isolationPath = "./owned-contact-isolation.cjs";
const { default: isolation } = await import(isolationPath);
const env = {
  ...appEnv,
  HOME: `${repoRoot}.tmp/rentoru-f367-browser/home`,
  TMPDIR: `${repoRoot}.tmp/rentoru-f367-browser`,
  OWNED_CONTACT_ATTACH: "rentoru-f367",
  OWNED_CONTACT_BROWSER_CACHE: "/Users/gianelo/Library/Caches/ms-playwright",
  OWNED_CONTACT_BROWSER:
    "/Users/gianelo/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
};
for (const [key, value] of Object.entries(env)) vi.stubEnv(key, String(value));
const kill = vi.spyOn(process, "kill").mockReturnValue(true);
const preload = vi.spyOn(isolation, "isPreloaded").mockReturnValue(true);
const { attachedConfig } = await import("./owned-contact-attached-playwright.config");
kill.mockRestore();
preload.mockRestore();
vi.unstubAllEnvs();

function guards() {
  return { readPid: vi.fn(() => "3459\n"), alive: vi.fn(), preloaded: vi.fn(() => true) };
}
describe("explicit owned attach", () => {
  it("attaches only the approved profile and checks its owner with signal zero", () => {
    const guard = guards();
    expect(attachedConfig(env, guard).webServer).toBeUndefined();
    expect(guard.readPid).toHaveBeenCalledWith(
      `${repoRoot}.tmp/rentoru-f367-browser/owned-app.pid`,
      "utf8",
    );
    expect(guard.alive).toHaveBeenCalledWith(3459, 0);
  });
  it("denies unauthorized attach before any callbacks", () => {
    for (const key of Object.keys(env)) {
      const guard = guards();
      expect(() => attachedConfig({ ...env, [key]: "foreign" }, guard)).toThrow(/DENIED/);
      expect(guard.readPid).not.toHaveBeenCalled();
      expect(guard.alive).not.toHaveBeenCalled();
      expect(guard.preloaded).not.toHaveBeenCalled();
    }
  });
  it("rejects missing preload before reading process metadata", () => {
    const guard = guards();
    guard.preloaded.mockReturnValue(false);
    expect(() => attachedConfig(env, guard)).toThrow(/preload/);
    expect(guard.readPid).not.toHaveBeenCalled();
    expect(guard.alive).not.toHaveBeenCalled();
  });
  it.each(["", "0", "-1", "3459junk", "1.5", "9007199254740992"])(
    "rejects malformed owner %s without signalling",
    (pid) => {
      const guard = guards();
      guard.readPid.mockReturnValue(pid);
      expect(() => attachedConfig(env, guard)).toThrow(/owner/);
      expect(guard.alive).not.toHaveBeenCalled();
    },
  );
  it("fails closed on absent owner file or dead owner", () => {
    for (const callback of ["readPid", "alive"] as const) {
      const guard = guards();
      guard[callback].mockImplementation(() => {
        throw new Error("owned metadata unavailable");
      });
      expect(() => attachedConfig(env, guard)).toThrow("owned metadata unavailable");
    }
  });
});
