import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { config, middleware } from "./middleware";

/**
 * D30: only the immersive viewer gets the hide header. The listing detail
 * renders both its own footer and the site footer. Matcher still scopes both
 * routes because malformed listing slugs need the rewrite.
 */
describe("middleware", () => {
  it("scopes itself to exactly the listing detail and photo viewer routes", () => {
    expect(config.matcher).toEqual([
      "/alquiler/:ciudad/:zona/:slug",
      "/alquiler/:ciudad/:zona/:slug/foto/:n",
    ]);
  });

  // tasks.md 22.16 — el slug ahora tiene que terminar en un id con forma de
  // UUID: desde esa tarea, uno que no la tiene es "malformado" y toma el
  // camino del rewrite de más abajo en vez de éste. `av_1` bastaba antes de
  // que esa distinción existiera.
  const ID_DE_PRUEBA = "a1b2c3d4-0000-4000-8000-0123456789ab";

  it("leaves the site footer visible on a valid listing detail request", () => {
    const request = new NextRequest(
      `https://rentoru.test/alquiler/caracas/altamira/av-${ID_DE_PRUEBA}`,
    );

    const response = middleware(request);

    expect(response.headers.get("x-middleware-request-x-hide-site-footer")).toBeNull();
  });

  it("stamps a photo viewer request with x-hide-site-footer", () => {
    const request = new NextRequest(
      `https://rentoru.test/alquiler/caracas/altamira/av-${ID_DE_PRUEBA}/foto/2`,
    );

    const response = middleware(request);

    expect(response.headers.get("x-middleware-request-x-hide-site-footer")).toBe("1");
  });

  /**
   * tasks.md 22.16 — a fast unit check of the rewrite DECISION, not proof of
   * what a browser receives. The body served through the actual routing
   * layer (status, `<h1>`, exit link, no `<script>`) is asserted against the
   * real production build in `tests/e2e/aviso-malformado-sin-javascript.spec.ts`
   * — this file cannot see any of that, because `NextRequest`/`NextResponse`
   * here never touch Next's router.
   */
  it("rewrites a malformed listing slug to the pre-rendered 404, keeping the 404 status", () => {
    const request = new NextRequest(
      "https://rentoru.test/alquiler/maracaibo/tierra-negra/apartamento-que-nunca-existio",
    );

    const response = middleware(request);

    expect(response.status).toBe(404);
    const rewriteTarget = response.headers.get("x-middleware-rewrite");
    expect(rewriteTarget).not.toBeNull();
    expect(new URL(rewriteTarget ?? "").pathname).not.toBe(
      "/alquiler/maracaibo/tierra-negra/apartamento-que-nunca-existio",
    );
  });

  it("does not rewrite a listing slug that carries a syntactically valid id", () => {
    const id = "a1b2c3d4-0000-4000-8000-0123456789ab";
    const request = new NextRequest(`https://rentoru.test/alquiler/caracas/altamira/av-1-${id}`);

    const response = middleware(request);

    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
    expect(response.headers.get("x-middleware-request-x-hide-site-footer")).toBeNull();
  });
});
