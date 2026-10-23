import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

import Page from "./page";

afterEach(() => vi.unstubAllEnvs());
it("fixture cerrada salvo habilitación exacta", async () => {
  for (const value of [undefined, "false", "1", "TRUE"]) {
    vi.stubEnv("F365_ZONE_MEASURE", value);
    await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow("NOT_FOUND");
  }
});
it("GET sintético sirve radios dentro del POST con referencia", async () => {
  vi.stubEnv("F365_ZONE_MEASURE", "true");
  const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ q: "alta" }) }));
  expect(html).toContain('action="/measure/publication-zone"');
  const post = html.slice(html.indexOf('method="post"'));
  expect(post).toContain('value="fresh"');
  expect(post).toContain('value="other"');
  expect(post).toContain('value="saved"');
  expect(post).toContain('name="reference"');
});
