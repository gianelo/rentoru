import path from "node:path";
import { defineConfig } from "@playwright/test";
import { ownedConfig } from "./owned-contact-playwright.config";

const config = ownedConfig(process.env);
const repoRoot = path.resolve(import.meta.dirname, "../..");
export default defineConfig({
  ...config,
  testDir: path.join(repoRoot, "tests/measure"),
  testMatch: "photo-menu.spec.ts",
  use: { ...config.use, javaScriptEnabled: true },
  webServer: {
    ...config.webServer,
    cwd: repoRoot,
    command: config.webServer.command.replace(/^env -i /, "env -i MEASURE_HARNESS_ENABLED=true "),
  },
});
