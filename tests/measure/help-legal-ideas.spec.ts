import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";

const url = pathToFileURL(resolve("design/alternativas/28-12-ayuda-legales.html")).href;
const sizes = [
  { width: 390, height: 840 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
];
const roles = ["faq", "contacto", "legal"] as const;
const roleTitles = {
  faq: "Preguntas frecuentes",
  contacto: "Escribinos",
  legal: "Términos y condiciones",
} as const;

test("chooser previews every role at each real viewport without scripts", async ({ browser }) => {
  test.setTimeout(90000);
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    javaScriptEnabled: false,
  });
  try {
    const page = await context.newPage();
    await page.goto(
      pathToFileURL(resolve("design/alternativas/28-12-ayuda-legales-vistas.html")).href,
    );
    const preview = page.frameLocator('iframe[name="preview"]');
    await expect(page.getByRole("radio", { name: "390×840" })).toBeChecked();
    for (const role of roles) {
      await expect(page.getByRole("link", { name: roleTitles[role], exact: true })).toBeVisible();
    }
    await expect(preview.locator('[data-role="faq"]')).toBeVisible();
    await page.screenshot({ path: "/tmp/rentoru-28-12-selector.png", fullPage: true });
    for (const size of sizes) {
      await page
        .locator(
          `label[for="${size.width === 390 ? "mobile" : size.width === 768 ? "tablet" : "desktop"}"]`,
        )
        .click();
      await expect(page.getByRole("radio", { name: `${size.width}×${size.height}` })).toBeChecked();
      for (const role of roles) {
        await page.getByRole("link", { name: roleTitles[role], exact: true }).click();
        await expect(preview.locator(`[data-role="${role}"]`)).toBeVisible();
        await expect(preview.locator(".article:not(:visible)")).toHaveCount(2);
        await expect(preview.locator(".controls")).toBeHidden();
        const box = await page.locator('iframe[name="preview"]').boundingBox();
        expect(box?.width).toBe(size.width);
        expect(box?.height).toBe(size.height);
        await expect(preview.locator(".pillCol.mobileOnly")).toBeVisible({
          visible: size.width < 768,
        });
        await expect(preview.locator(".dock")).toBeVisible({ visible: size.width < 768 });
        if (size.width >= 768) {
          const alignment = await preview.locator(".actions").evaluate((el) => ({
            right: el.getBoundingClientRect().right,
            parentRight: el.parentElement?.getBoundingClientRect().right ?? 0,
            paddingRight: el.parentElement
              ? Number.parseFloat(getComputedStyle(el.parentElement).paddingRight)
              : 0,
          }));
          expect(
            Math.abs(alignment.parentRight - alignment.paddingRight - alignment.right),
          ).toBeLessThanOrEqual(1);
        }
        await page.locator('iframe[name="preview"]').screenshot({
          path: `/tmp/rentoru-28-12-preview-${role}-${size.width}.png`,
        });
      }
    }
  } finally {
    await context.close();
  }
});

for (const size of sizes) {
  test(`three readable roles at ${size.width}×${size.height} without scripts`, async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport: size, javaScriptEnabled: false });
    try {
      const page = await context.newPage();
      await page.goto(url);
      for (const role of roles) {
        await page.getByRole("radio", { name: role, exact: false }).check();
        const article = page.locator(`[data-role="${role}"]`);
        await expect(article).toBeVisible();
        await expect(page.locator(".article:not(:visible)")).toHaveCount(2);
        const titleSize = await article
          .locator("h1")
          .evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
        const pageTitleSize = await page.evaluate(() =>
          Number.parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue("--title-fs"),
          ),
        );
        const headingSize = await page
          .locator('[data-role="faq"] h2')
          .first()
          .evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
        expect(titleSize).toBe(pageTitleSize);
        expect(titleSize).toBeGreaterThan(headingSize);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        await expect(page.locator(".dock")).toBeVisible({ visible: size.width < 768 });
        await expect(page.locator(".site .brand")).toBeVisible({ visible: size.width >= 768 });
        await expect(page.locator(".site .pillCol.mobileOnly")).toBeVisible({
          visible: size.width < 768,
        });
        await expect(page.locator(".site .brand")).toHaveText("Rentoru");
        await expect(page.locator(".site form.pill")).toHaveAttribute("method", "get");
        await expect(page.locator(".site form.pill")).toHaveAttribute("action", "/");
        await expect(page.locator(".site form.pill input[name=q]")).toHaveCount(1);
        await expect(page.locator(".site form.pill button svg[aria-hidden=true]")).toHaveCount(1);
        await expect(page.locator(".site .dock svg[aria-hidden='true']")).toHaveCount(3);
        const pill = page.locator(".site form.pill");
        expect(await pill.evaluate((el) => getComputedStyle(el).minHeight)).toBe("48px");
        expect(await pill.evaluate((el) => getComputedStyle(el).borderColor)).toBe(
          "rgb(225, 228, 230)",
        );
        expect(await pill.locator("button").evaluate((el) => getComputedStyle(el).width)).toBe(
          "44px",
        );
        if (size.width < 768) expect((await pill.boundingBox())?.width).toBeGreaterThan(300);
        for (const control of await page
          .locator(
            "input:not([type=radio]):visible, textarea:visible, button:visible, nav a:visible, label.tab:visible",
          )
          .all()) {
          const box = await control.boundingBox();
          expect(box?.height).toBeGreaterThanOrEqual(44);
        }
        const frame = page.locator(".site");
        const box = await frame.boundingBox();
        expect(box?.width).toBe(size.width);
        expect(box?.height).toBe(size.height);
        expect(
          await article.evaluate((el) => getComputedStyle(el.parentElement ?? el).maxWidth),
        ).toBe("600px");
        if (size.width >= 768) expect((await article.boundingBox())?.width).toBe(600);
        if (size.width === 390) {
          const targets =
            role === "faq"
              ? [article.locator("section:last-child p")]
              : role === "contacto"
                ? [article.locator(".form button"), article.locator(".state [role=status]")]
                : [article.locator("section:last-child p")];
          for (const target of targets) {
            await target.scrollIntoViewIfNeeded();
            await page.locator(".site .scroll").evaluate((el) => {
              el.scrollTop = el.scrollHeight;
            });
            const result = await target.evaluate((element) => {
              const box = element.getBoundingClientRect();
              const dock = document.querySelector(".site .dock")?.getBoundingClientRect();
              const top = document.elementFromPoint(
                box.left + box.width / 2,
                box.top + box.height / 2,
              );
              return {
                aboveDock: Boolean(dock && box.bottom <= dock.top && box.top >= 60),
                hit: element === top || element.contains(top),
              };
            });
            expect(result.aboveDock, `${role}: final item above dock`).toBe(true);
            expect(result.hit).toBe(true);
          }
          await page.locator(".site .scroll").evaluate((el) => {
            el.scrollTop = 0;
          });
        }
        await frame.screenshot({ path: `/tmp/rentoru-28-12-${role}-${size.width}.png` });
      }
      await expect(page.locator('[data-role="contacto"] label[for="name"]')).toContainText(
        "Tu nombre",
      );
      await expect(page.locator('[data-role="contacto"] label[for="email"]')).toContainText(
        "Tu correo",
      );
      await expect(page.locator('[data-role="contacto"] label[for="message"]')).toContainText(
        "Tu mensaje",
      );
      await expect(page.locator('[data-role="faq"] .lede')).toHaveCount(0);
      await expect(page.locator('[data-role="legal"] .notice')).toContainText(
        "Borrador en revisión.",
      );
      expect(
        await page
          .locator('[data-role="legal"] .notice')
          .evaluate((el) => getComputedStyle(el).backgroundColor),
      ).toBe("rgb(255, 255, 255)");
    } finally {
      await context.close();
    }
  });
}
