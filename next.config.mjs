import { fileURLToPath } from "node:url";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

const repoRoot = fileURLToPath(new URL("./", import.meta.url));
// Permanent public config: ordinary Next phases retain defaults. Only the owned
// test bootstrap may redirect generated output; its committed preload owns I/O.
function ownedMode(phase, env) {
  if (env.OWNED_CONTACT_APP_MODE === undefined) return false;
  if (env.OWNED_CONTACT_APP_MODE !== "dev-webpack" || phase !== PHASE_DEVELOPMENT_SERVER)
    throw new Error("DENIED owned Next mode or phase");
  return true;
}
export function buildConfig(phase, env, isolation) {
  if (!ownedMode(phase, env)) return {};
  if (isolation?.isPreloaded() !== true) throw new Error("DENIED missing owned preload");
  for (const [key, value] of Object.entries(isolation.synthetic)) {
    if (env[key] !== value) throw new Error(`DENIED owned Next configuration: ${key}`);
  }
  return {
    distDir: ".tmp/rentoru-f367-browser/next",
    typescript: { tsconfigPath: ".tmp/rentoru-f367-browser/tsconfig.json" },
    outputFileTracingRoot: repoRoot,
  };
}
export default async function configuration(
  phase,
  {
    env = process.env,
    loadIsolation = () => import("./tests/fixtures/owned-contact-isolation.cjs"),
  } = {},
) {
  if (!ownedMode(phase, env)) return {};
  return buildConfig(phase, env, (await loadIsolation()).default);
}
