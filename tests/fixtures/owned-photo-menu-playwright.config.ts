import path from "node:path";
import { defineConfig } from "@playwright/test";
import { ownedConfig } from "./owned-contact-playwright.config";

const attach = process.env.OWNED_CONTACT_ATTACH;
if (attach && attach !== "rentoru-f367") {
  throw new Error("DENIED owned attach: OWNED_CONTACT_ATTACH");
}
const config =
  attach === "rentoru-f367"
    ? (await import("./owned-contact-attached-playwright.config")).attachedConfig(process.env)
    : ownedConfig(process.env);
const repoRoot = path.resolve(import.meta.dirname, "../..");
export default defineConfig({
  ...config,
  testDir: path.join(repoRoot, "tests/measure"),
  testMatch: ["photo-menu.spec.ts", "layout.spec.ts"],
  use: { ...config.use, javaScriptEnabled: true },
  webServer: config.webServer
    ? {
        ...config.webServer,
        cwd: repoRoot,
        command: config.webServer.command.replace(
          /^env -i /,
          "env -i MEASURE_HARNESS_ENABLED=true ",
        ),
      }
    : undefined,
});
