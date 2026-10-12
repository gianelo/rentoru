import { open, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPreviewBypassState, privateStatePath } from "./preview-bypass-state";

const origin = "https://preview.example.com";
const secret = "private-test-secret";
const paths: string[] = [];
afterEach(async () => {
  for (const path of paths.splice(0)) {
    const { unlink } = await import("node:fs/promises");
    await unlink(path).catch(() => {});
  }
});

function fake(
  setCookie: string[],
  cookies = [
    {
      name: "_vercel_jwt",
      value: "cookie",
      domain: "preview.example.com",
      path: "/",
      expires: -1,
      httpOnly: true,
      secure: true,
      sameSite: "Lax" as const,
    },
  ],
  status = 307,
) {
  const get = vi.fn(async () => ({
    status: () => status,
    headersArray: () => setCookie.map((value) => ({ name: "set-cookie", value })),
  }));
  const dispose = vi.fn(async () => {});
  const create = vi.fn(async () => ({
    get,
    storageState: async () => ({ cookies, origins: [] }),
    dispose,
  }));
  return { create, get, dispose };
}

const valid = "_vercel_jwt=cookie; Path=/; Secure; HttpOnly";

describe("protected preview bootstrap", () => {
  it("reuses the allocated state on worker config reload only in protected mode", async () => {
    vi.stubEnv("PLAYWRIGHT_BASE_URL", origin);
    vi.stubEnv("VERCEL_AUTOMATION_BYPASS_SECRET", secret);
    vi.stubEnv("PREVIEW_BYPASS_STATE_PATH", "");
    vi.stubEnv("TEST_DATABASE_URL", "");
    try {
      vi.resetModules();
      const first = (await import("../../playwright.config")).default;
      const path = process.env.PREVIEW_BYPASS_STATE_PATH;
      expect(path).toBeTruthy();
      expect(first.use?.storageState).toBe(path);
      vi.resetModules();
      const worker = (await import("../../playwright.config")).default;
      expect(worker.use?.storageState).toBe(path);
      expect(process.env.PREVIEW_BYPASS_STATE_PATH).toBe(path);
      vi.stubEnv("VERCEL_AUTOMATION_BYPASS_SECRET", "");
      vi.resetModules();
      expect((await import("../../playwright.config")).default.use?.storageState).toBeUndefined();
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });

  it("sends credentials only to the HTTPS root without following redirects and writes private cookie-only state", async () => {
    const api = fake([valid]);
    const state = await createPreviewBypassState(`${origin}/`, secret, api.create);
    paths.push(state.path);
    expect(api.get).toHaveBeenCalledWith(`${origin}/`, {
      maxRedirects: 0,
      headers: { "x-vercel-protection-bypass": secret, "x-vercel-set-bypass-cookie": "true" },
    });
    expect(api.dispose).toHaveBeenCalledOnce();
    expect((await stat(state.path)).mode & 0o777).toBe(0o600);
    expect(JSON.parse(await readFile(state.path, "utf8"))).toEqual({
      cookies: [
        {
          name: "_vercel_jwt",
          value: "cookie",
          domain: "preview.example.com",
          path: "/",
          expires: -1,
          httpOnly: true,
          secure: true,
          sameSite: "Lax",
        },
      ],
      origins: [],
    });
    await state.cleanup();
    paths.pop();
    await expect(stat(state.path)).rejects.toThrow();
  });

  it.each([
    ["missing", [], undefined],
    ["multiple", [valid, "other=second; Path=/; Secure"], undefined],
    [
      "domain attribute",
      ["_vercel_jwt=cookie; Domain=preview.example.com; Path=/; Secure"],
      undefined,
    ],
    ["wrong scope", [valid], "evil.example.com"],
  ])("refuses %s and leaves no state", async (_case, headers, domain) => {
    const api = fake(
      headers,
      domain
        ? [
            {
              name: "_vercel_jwt",
              value: "cookie",
              domain,
              path: "/",
              expires: -1,
              httpOnly: true,
              secure: true,
              sameSite: "Lax",
            },
          ]
        : undefined,
    );
    await expect(createPreviewBypassState(origin, secret, api.create)).rejects.toThrow();
    expect(api.dispose).toHaveBeenCalledOnce();
  });

  it.each([302, 303, 307, 308])("accepts bypass redirect %i", async (status) => {
    const api = fake([valid], undefined, status);
    const state = await createPreviewBypassState(origin, secret, api.create);
    paths.push(state.path);
    await state.cleanup();
    paths.pop();
  });

  it.each([200, 201, 301, 400])("refuses non-bypass status %i", async (status) => {
    const api = fake([valid], undefined, status);
    await expect(createPreviewBypassState(origin, secret, api.create)).rejects.toThrow();
  });

  it("accepts a different host-only cookie name with an exact matching value", async () => {
    const cookie = {
      name: "preview_access",
      value: "token",
      domain: "preview.example.com",
      path: "/",
      expires: -1,
      httpOnly: true,
      secure: true,
      sameSite: "Lax" as const,
    };
    const api = fake(["preview_access=token; Path=/; Secure; HttpOnly"], [cookie]);
    const state = await createPreviewBypassState(origin, secret, api.create);
    paths.push(state.path);
    expect(JSON.parse(await readFile(state.path, "utf8")).cookies).toEqual([cookie]);
    await state.cleanup();
    paths.pop();
  });

  it("leaves no private state when disposal rejects", async () => {
    const api = fake([valid]);
    const path = privateStatePath();
    paths.push(path);
    api.dispose.mockRejectedValue(new Error("dispose failed"));
    await expect(createPreviewBypassState(origin, secret, api.create, path)).rejects.toThrow(
      "dispose failed",
    );
    await expect(stat(path)).rejects.toMatchObject({ code: "ENOENT" });
    expect(api.dispose).toHaveBeenCalledOnce();
  });

  it("removes partial private state when writing fails", async () => {
    const api = fake([valid]);
    const path = privateStatePath();
    paths.push(path);
    const openWithFailedWrite = async (...args: Parameters<typeof open>) => {
      const handle = await open(...args);
      const writeFile = handle.writeFile.bind(handle);
      vi.spyOn(handle, "writeFile").mockImplementation(async () => {
        await writeFile("partial");
        throw new Error("write failed");
      });
      return handle;
    };
    await expect(
      createPreviewBypassState(origin, secret, api.create, path, openWithFailedWrite),
    ).rejects.toThrow("write failed");
    await expect(stat(path)).rejects.toMatchObject({ code: "ENOENT" });
    expect(api.dispose).toHaveBeenCalledOnce();
  });

  it("does not overwrite or remove a preexisting path", async () => {
    const api = fake([valid]);
    const path = privateStatePath();
    const handle = await open(path, "wx", 0o600);
    paths.push(path);
    try {
      await handle.writeFile("existing state");
    } finally {
      await handle.close();
    }
    await expect(createPreviewBypassState(origin, secret, api.create, path)).rejects.toMatchObject({
      code: "EEXIST",
    });
    expect(await readFile(path, "utf8")).toBe("existing state");
    expect(api.dispose).toHaveBeenCalledOnce();
  });

  it("removes private state when close fails after writing", async () => {
    const api = fake([valid]);
    const path = privateStatePath();
    paths.push(path);
    const openWithFailedClose = async (...args: Parameters<typeof open>) => {
      const handle = await open(...args);
      const close = handle.close.bind(handle);
      vi.spyOn(handle, "close").mockImplementation(async () => {
        await close();
        throw new Error("close failed");
      });
      return handle;
    };
    await expect(
      createPreviewBypassState(origin, secret, api.create, path, openWithFailedClose),
    ).rejects.toThrow("close failed");
    await expect(stat(path)).rejects.toMatchObject({ code: "ENOENT" });
    expect(api.dispose).toHaveBeenCalledOnce();
  });

  it("keeps config free of global headers and disables protected traces for both projects", async () => {
    const config = await readFile(resolve("playwright.config.ts"), "utf8");
    expect(config).not.toContain("extraHTTPHeaders");
    expect(config).toContain('trace: protectedPreview ? "off" : "on-first-retry"');
    expect(config).toContain("storageState: bypassStatePath");
    expect(privateStatePath()).not.toBe(privateStatePath());
  });

  it("refuses non-HTTPS and cross-origin URL credentials before request", async () => {
    const api = fake([valid]);
    await expect(
      createPreviewBypassState("http://preview.example.com", secret, api.create),
    ).rejects.toThrow();
    await expect(createPreviewBypassState(`${origin}/other`, secret, api.create)).rejects.toThrow();
    expect(api.create).not.toHaveBeenCalled();
  });
});
