import path from "node:path";
import { defineConfig } from "@playwright/test";

const appPath = "./owned-contact-app.mjs";
const { appEnv, appOrigin, repoRoot, validateEnv } = await import(appPath);
const workspace = path.join(repoRoot, ".tmp/rentoru-f367-browser");
const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;

export function ownedConfig(env: Record<string, string | undefined>) {
  validateEnv(env);
  const executablePath = env.OWNED_CONTACT_BROWSER;
  const cache = env.OWNED_CONTACT_BROWSER_CACHE;
  if (
    !executablePath ||
    !path.isAbsolute(executablePath) ||
    !/chromium(?:_headless_shell)?-1234\//.test(executablePath) ||
    !cache ||
    !path.isAbsolute(cache)
  ) {
    throw new Error("DENIED missing approved browser/cache");
  }
  const cleanEnv = {
    ...appEnv,
    HOME: path.join(workspace, "home"),
    TMPDIR: workspace,
    PLAYWRIGHT_BROWSERS_PATH: cache,
  } as Record<string, string>;
  return {
    testDir: path.join(repoRoot, "tests/e2e"),
    // The next cut adds this spec and explicit CI/default-suite separation.
    testMatch: "escribinos-zona-sin-javascript.spec.ts",
    workers: 1,
    retries: 0,
    forbidOnly: true,
    outputDir: path.join(workspace, "results"),
    reporter: "line" as const,
    use: {
      browserName: "chromium" as const,
      baseURL: appOrigin,
      javaScriptEnabled: false,
      proxy: { server: "http://127.0.0.1:31468", bypass: "<-loopback>" },
      launchOptions: {
        executablePath,
        env: cleanEnv,
        args: [
          "--proxy-bypass-list=<-loopback>",
          "--disable-background-networking",
          "--disable-component-update",
          "--disable-sync",
          "--disable-quic",
          "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
        ],
      },
    },
    webServer: {
      command: [
        "env -i",
        ...Object.entries(cleanEnv).map(([key, value]) => `${key}=${quote(value)}`),
        quote(process.execPath),
        quote(path.join(repoRoot, "tests/fixtures/owned-contact-app.mjs")),
      ].join(" "),
      port: 31467,
      reuseExistingServer: false,
      timeout: 180_000,
    },
  };
}
export default defineConfig(ownedConfig(process.env));
