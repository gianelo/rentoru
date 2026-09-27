import { expect, test } from "@playwright/test";

const viewports = [
  { width: 390, height: 840 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
];

test("sign-in door covers the mobile dock when both occupy the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 840 });
  await page.goto("/measure?entrar=si");
  const door = page.getByTestId("puerta");
  const dock = page.getByRole("navigation", { name: "Navegación principal" }).first();
  await expect(door).toBeVisible();
  await expect(dock).toBeVisible();
  const overlap = await dock.evaluate(
    (nav, overlay) => {
      const link = nav.querySelector("a");
      if (!link) throw new Error("Missing dock link");
      const box = link.getBoundingClientRect();
      const x = box.left + box.width / 2;
      const y = box.top + box.height / 2;
      const top = document
        .elementsFromPoint(x, y)
        .find((element) => element.tagName !== "NEXTJS-PORTAL");
      return {
        intersects: box.bottom > 0 && box.top < innerHeight,
        covered: overlay.contains(top ?? null),
      };
    },
    await door.elementHandle(),
  );
  expect(overlap.intersects).toBe(true);
  expect(overlap.covered).toBe(true);
});

test("open search panel covers dock and keeps its CTA reachable without JS", async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 840 },
  });
  try {
    const page = await context.newPage();
    await page.goto("/measure?panel=abierto");
    const panel = page.getByTestId("search-panel-harness").getByTestId("search-panel");
    const dock = page.getByRole("navigation", { name: "Navegación principal" }).first();
    await expect(panel).toBeVisible();
    await expect(dock).toBeVisible();
    const covered = await dock.evaluate(
      (nav, overlay) => {
        const link = nav.querySelector("a");
        if (!link) throw new Error("Missing dock link");
        const box = link.getBoundingClientRect();
        const x = box.left + box.width / 2;
        const y = box.top + box.height / 2;
        const top = document.elementFromPoint(x, y);
        return {
          overlaps: overlay.getBoundingClientRect().bottom > y,
          covered: overlay.contains(top),
        };
      },
      await panel.elementHandle(),
    );
    expect(covered.overlaps).toBe(true);
    expect(covered.covered).toBe(true);
    const cta = panel.getByTestId("search-confirm");
    await expect(cta).toBeVisible();
    const hit = await cta.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return element === top || element.contains(top);
    });
    expect(hit).toBe(true);
  } finally {
    await context.close();
  }
});

test("closed results panel does not intercept the mobile dock", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 840 });
  await page.goto("/measure/lista");
  const dock = page.getByRole("navigation", { name: "Navegación principal" });
  await expect(dock).toBeVisible();
  const link = dock.getByRole("link", { name: "Publicar" });
  const hit = await link.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const top = document
      .elementsFromPoint(box.left + box.width / 2, box.top + box.height / 2)
      .find((candidate) => candidate.tagName !== "NEXTJS-PORTAL");
    return element === top || element.contains(top ?? null);
  });
  expect(hit).toBe(true);
});

for (const route of ["/measure", "/ayuda/preguntas-frecuentes"]) {
  for (const viewport of viewports) {
    test(`${route} at ${viewport.width}: navigation and footer remain usable at the end`, async ({
      browser,
    }) => {
      const context = await browser.newContext({
        javaScriptEnabled: false,
        viewport,
        reducedMotion: "reduce",
      });
      try {
        const page = await context.newPage();
        await page.goto(route);
        const navs = page.getByRole("navigation", { name: "Navegación principal" });
        const footer =
          route === "/measure"
            ? page.getByTestId("site-footer-harness").locator("footer")
            : page.locator("footer").last();
        const lastLink = footer.locator("a").last();
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        const docks = navs.locator('[class*="dock"]');
        if (viewport.width === 390) {
          await expect(docks.first()).toBeVisible();
          await expect(docks.first()).not.toHaveAttribute("inert", "");
        } else {
          for (const dock of await docks.all()) await expect(dock).toBeHidden();
          await expect(page.locator("header").first()).toBeVisible();
        }
        await expect(footer).toBeVisible();
        await expect(lastLink).toBeVisible();
        await lastLink.focus();
        await expect(lastLink).toBeFocused();
        // A focused footer link must be hit-testable at its readable center,
        // even while the fixed dock remains visible with reduced motion.
        const hit = await lastLink.evaluate((link) => {
          const r = link.getBoundingClientRect();
          const x = r.left + r.width / 2;
          const y = r.top + r.height / 2;
          return (
            document.elementFromPoint(x, y) === link ||
            link.contains(document.elementFromPoint(x, y))
          );
        });
        expect(hit).toBe(true);
        const legal = footer.locator('[class*="legal"]').last();
        if (await legal.count()) {
          const box = await legal.boundingBox();
          if (!box) throw new Error("footer legal text did not draw");
          expect(box.y).toBeGreaterThanOrEqual(0);
          expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
        }
      } finally {
        await context.close();
      }
    });
  }
}
