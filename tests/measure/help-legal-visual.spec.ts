import { expect, test } from "@playwright/test";

const pages = [
  { path: "/ayuda/preguntas-frecuentes", slug: "faq", title: "Preguntas frecuentes" },
  { path: "/ayuda/escribinos", slug: "contacto", title: "Escribinos" },
  { path: "/legal/terminos", slug: "legal", title: "Términos y condiciones" },
] as const;
const viewports = [
  { width: 390, height: 840 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
] as const;

for (const viewport of viewports) {
  for (const entry of pages) {
    test(`${entry.slug} served initial viewport at ${viewport.width}×${viewport.height} without JS`, async ({
      browser,
    }) => {
      const context = await browser.newContext({ viewport, javaScriptEnabled: false });
      try {
        const page = await context.newPage();
        const response = await page.goto(entry.path);
        expect(response?.status()).toBe(200);
        await expect(page.locator("main article").getByRole("heading", { level: 1 })).toHaveText(
          entry.title,
        );
        const screenshot = `/tmp/rentoru-served-28-12-${entry.slug}-${viewport.width}.png`;
        await page.screenshot({ path: screenshot });
        const dimensions = await page.evaluate(() => ({
          width: innerWidth,
          height: innerHeight,
          overflow: document.documentElement.scrollWidth > innerWidth,
        }));
        expect(dimensions).toEqual({ ...viewport, overflow: false });
        console.log(`${entry.path} ${viewport.width}×${viewport.height}: ${screenshot}`);
      } finally {
        await context.close();
      }
    });
  }
}
