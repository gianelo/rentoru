import { readFileSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "@playwright/test";
import { ownedConfig } from "./owned-contact-playwright.config";

const appPath = "./owned-contact-app.mjs";
const { repoRoot, validateEnv } = await import(appPath);
const isolationPath = "./owned-contact-isolation.cjs";
const { default: isolation } = await import(isolationPath);
const workspace = path.join(repoRoot, ".tmp/rentoru-f367-browser");
const cache = "/Users/gianelo/Library/Caches/ms-playwright";
export const approvedBrowser = `${cache}/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
interface Guard {
  readPid(file: string, encoding: "utf8"): string;
  alive(pid: number, signal: 0): unknown;
  preloaded(): boolean;
}
/** Attach is explicit and local; the ordinary owned config still starts exclusively. */
export function attachedConfig(
  env: Record<string, string | undefined>,
  guard: Guard = {
    readPid: readFileSync,
    alive: (pid, signal) => process.kill(pid, signal),
    preloaded: isolation.isPreloaded,
  },
) {
  validateEnv(env);
  const required = {
    OWNED_CONTACT_ATTACH: "rentoru-f367",
    OWNED_CONTACT_BROWSER: approvedBrowser,
    OWNED_CONTACT_BROWSER_CACHE: cache,
    HOME: path.join(workspace, "home"),
    TMPDIR: workspace,
  };
  for (const [key, value] of Object.entries(required)) {
    if (env[key] !== value) throw new Error(`DENIED owned attach: ${key}`);
  }
  if (!guard.preloaded()) throw new Error("DENIED missing preload");
  const owner = guard.readPid(path.join(workspace, "owned-app.pid"), "utf8").trim();
  const pid = Number(owner);
  if (!/^[1-9]\d*$/.test(owner) || !Number.isSafeInteger(pid)) {
    throw new Error("DENIED invalid owned app owner");
  }
  guard.alive(pid, 0);
  return { ...ownedConfig(env), webServer: undefined };
}
export default defineConfig(attachedConfig(process.env));
