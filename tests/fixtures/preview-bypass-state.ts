import { randomUUID } from "node:crypto";
import { open, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type APIRequestContext, request } from "@playwright/test";

type PreviewContext = {
  get: (
    url: string,
    options: { maxRedirects: number; headers: Record<string, string> },
  ) => Promise<Pick<Awaited<ReturnType<APIRequestContext["get"]>>, "status" | "headersArray">>;
  storageState: () => Promise<Awaited<ReturnType<APIRequestContext["storageState"]>>>;
  dispose: () => Promise<void>;
};
type CreateContext = () => Promise<PreviewContext>;

// The path is chosen during config evaluation so both projects receive the same state.
export function privateStatePath(): string {
  return join(tmpdir(), `rentoru-preview-${randomUUID()}.json`);
}

export async function createPreviewBypassState(
  preview: string,
  secret: string,
  create: CreateContext = () => request.newContext(),
  path = privateStatePath(),
  openState: typeof open = open,
): Promise<{ path: string; cleanup: () => Promise<void> }> {
  const url = new URL(preview);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  ) {
    throw new Error("Protected preview requires an HTTPS origin root");
  }
  const context = await create();
  let serializedState: string;
  try {
    const response = await context.get(url.href, {
      maxRedirects: 0,
      headers: { "x-vercel-protection-bypass": secret, "x-vercel-set-bypass-cookie": "true" },
    });
    if (![302, 303, 307, 308].includes(response.status()))
      throw new Error("Preview bypass refused");
    const headers = response
      .headersArray()
      .filter((header) => header.name.toLowerCase() === "set-cookie");
    const setCookie = headers[0]?.value;
    const match = setCookie?.match(/^([^=;\s]+)=([^;]+)(?:;|$)/);
    if (headers.length !== 1 || !match || /(?:^|;)\s*domain\s*=/i.test(setCookie ?? "")) {
      throw new Error("Expected exactly one host-only preview bypass cookie");
    }
    const state = await context.storageState();
    const cookie = state.cookies[0];
    if (
      state.cookies.length !== 1 ||
      !cookie ||
      cookie.name !== match[1] ||
      cookie.value !== match[2] ||
      cookie.domain !== url.hostname ||
      cookie.path !== "/" ||
      !cookie.secure ||
      state.origins.length !== 0
    ) {
      throw new Error("Preview bypass cookie scope invalid");
    }
    serializedState = JSON.stringify({ cookies: [cookie], origins: [] });
  } finally {
    await context.dispose();
  }
  // Finish disposal before creating a file whose cleanup setup must return.
  const handle = await openState(path, "wx", 0o600);
  try {
    await handle.writeFile(serializedState);
    await handle.close();
  } catch (error) {
    try {
      await handle.close();
    } finally {
      await unlink(path);
    }
    throw error;
  }
  return { path, cleanup: () => unlink(path) };
}

export default async function globalSetup(): Promise<() => Promise<void>> {
  const preview = process.env.PLAYWRIGHT_BASE_URL;
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const path = process.env.PREVIEW_BYPASS_STATE_PATH;
  if (!preview || !secret || !path) throw new Error("Protected preview configuration missing");
  const state = await createPreviewBypassState(preview, secret, undefined, path);
  return state.cleanup;
}
