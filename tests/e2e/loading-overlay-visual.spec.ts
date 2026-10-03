import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createViteServer } from "vitest/node";

let server: Awaited<ReturnType<typeof createViteServer>>;
let document: string;

test.beforeAll(async () => {
  server = await createViteServer({
    configFile: false,
    envDir: false,
    cacheDir: resolve("test-results/f363-overlay-css-output/vite-cache"),
    server: { middlewareMode: true, hmr: false },
    resolve: { alias: { "@": resolve("src") } },
    oxc: { jsx: { runtime: "automatic" } },
  });
  const { LoadingOverlay } = await server.ssrLoadModule("/components/molecules/LoadingOverlay.tsx");
  const sheets = await Promise.all(
    ["LoadingOverlay", "../atoms/Button"].map((name) =>
      server.ssrLoadModule(`/components/molecules/${name}.module.css?inline`),
    ),
  );
  const html = renderToStaticMarkup(
    createElement(LoadingOverlay, {
      label: "Cargando publicación…",
      href: "/",
      exitLabel: "Inicio",
    }),
  );
  document = `<html data-theme="menta" data-layout="compacto"><style>${readFileSync(
    resolve("src/styles/tokens.css"),
    "utf8",
  )}${sheets.map((sheet) => sheet.default).join("\n")}</style><body>${html}</body></html>`;
});

test.afterAll(async () => {
  await server?.close();
});

for (const [width, height] of [
  [390, 844],
  [768, 1024],
  [1440, 900],
] as const) {
  test(`approved overlay geometry at ${width}×${height}`, async ({ page }) => {
    await page.route("**/*", (route) => route.abort());
    await page.setViewportSize({ width, height });
    await page.setContent(document);
    const actual = await page.getByRole("status").evaluate((label) => {
      const card = label.parentElement;
      const overlay = card?.parentElement;
      const mark = card?.firstElementChild;
      const letter = mark?.lastElementChild;
      if (!card || !overlay || !mark || !letter) throw new Error("Overlay anatomy missing");
      const probe = window.document.createElement("span");
      probe.style.background = "var(--tint)";
      probe.style.fontFamily = "var(--mono)";
      card.append(probe);
      const box = card.getBoundingClientRect();
      const result = {
        radius: getComputedStyle(card).borderRadius,
        surface: getComputedStyle(card).backgroundColor,
        gap: getComputedStyle(card).gap,
        tint: getComputedStyle(mark).backgroundColor,
        expectedTint: getComputedStyle(probe).backgroundColor,
        font: getComputedStyle(letter).fontFamily,
        expectedFont: getComputedStyle(probe).fontFamily,
        labelSize: getComputedStyle(label).fontSize,
        labelLine: getComputedStyle(label).lineHeight,
        position: getComputedStyle(overlay).position,
        center: [box.x + box.width / 2, box.y + box.height / 2] as const,
        overflow: window.document.documentElement.scrollWidth > window.innerWidth,
      };
      probe.remove();
      return result;
    });
    expect.soft(actual.radius).toBe("12px");
    expect.soft(actual.surface).toBe("rgb(255, 255, 255)");
    expect.soft(actual.gap).toBe("16px");
    expect.soft(actual.tint).toBe(actual.expectedTint);
    expect.soft(actual.font).toBe(actual.expectedFont);
    expect.soft(actual.labelSize).toBe(width < 768 ? "15px" : "16px");
    expect.soft(actual.labelLine).toBe(width < 768 ? "24px" : "26.4px");
    expect(actual.position).toBe("fixed");
    expect(Math.abs(actual.center[0] - width / 2)).toBeLessThanOrEqual(2);
    expect(Math.abs(actual.center[1] - height / 2)).toBeLessThanOrEqual(2);
    expect(actual.overflow).toBe(false);
    await expect(page.getByRole("link", { name: "Inicio" })).toHaveAttribute("href", "/");
  });
}
