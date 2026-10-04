import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import Page from "./page";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  usePathname: () => "/measure/nav",
}));
afterEach(() => vi.unstubAllEnvs());

describe("fixture aislada de Nav", () => {
  it.each([undefined, "false", "1"])("rechaza el flag %s", (flag) => {
    vi.stubEnv("MEASURE_HARNESS_ENABLED", flag);
    expect(() => Page()).toThrow("NOT_FOUND");
  });

  it("sirve Nav real y GET nativo en todas sus composiciones", () => {
    vi.stubEnv("MEASURE_HARNESS_ENABLED", "true");
    const html = renderToStaticMarkup(Page());
    expect(html.match(/<header/g)).toHaveLength(6);
    expect(html.match(/method="get"/g)).toHaveLength(5);
    for (const state of [
      "anonymous",
      "authenticated",
      "zone",
      "filters",
      "mobile-only",
      "no-pill",
    ]) {
      expect(html).toContain(`data-testid="nav-${state}"`);
    }
    expect(html).toContain('name="q"');
    expect(html).toContain('value="Chacao"');
    expect(html).toContain('href="/measure/nav?panel=filtros"');
    expect(html).toContain("3 filtros");
    expect(html).toContain("Mi cuenta");
  });
});
