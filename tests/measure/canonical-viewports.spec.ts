import { expect, test } from "@playwright/test";

const CANONICAL_VIEWPORTS = [
  { label: "mobile", width: 390, height: 844 },
  { label: "tablet", width: 768, height: 1024 },
  { label: "desktop", width: 1440, height: 900 },
] as const;

type CanonicalViewport = (typeof CANONICAL_VIEWPORTS)[number];

async function openResultsAt(page: import("@playwright/test").Page, viewport: CanonicalViewport) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto("/measure/lista");
}

test.describe("28.4: canonical delivery viewports", () => {
  for (const viewport of CANONICAL_VIEWPORTS) {
    test(`${viewport.label} ${viewport.width}×${viewport.height}: the results screen has no horizontal overflow`, async ({
      page,
    }) => {
      await openResultsAt(page, viewport);

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));

      console.log(
        `[28.4] ${viewport.label} ${viewport.width}×${viewport.height}: ` +
          `scrollWidth=${overflow.scrollWidth} clientWidth=${overflow.clientWidth}`,
      );
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
    });

    test(`${viewport.label} ${viewport.width}×${viewport.height}: the results grid renders measurable cards`, async ({
      page,
    }) => {
      await openResultsAt(page, viewport);

      const grid = page.getByTestId("lista-grid");
      const cards = grid.locator('[data-testid="listing-card"]');
      const firstCard = await cards.first().boundingBox();
      if (!firstCard) throw new Error("the first listing card did not render a measurable box");

      const cardCount = await cards.count();
      console.log(
        `[28.4] ${viewport.label} ${viewport.width}×${viewport.height}: ` +
          `${cardCount} cards, first=${Math.round(firstCard.width)}×${Math.round(firstCard.height)}`,
      );

      expect(cardCount).toBeGreaterThan(0);
      expect(firstCard.width).toBeGreaterThan(0);
      expect(firstCard.height).toBeGreaterThan(0);
    });
  }

  test("tablet 768×1024: the breakpoint is covered by the contract", async ({ page }) => {
    const tablet = CANONICAL_VIEWPORTS[1];
    await openResultsAt(page, tablet);

    const gridBox = await page.getByTestId("lista-grid").locator("ol").boundingBox();
    const firstCard = await page
      .getByTestId("lista-grid")
      .locator('[data-testid="listing-card"]')
      .first()
      .boundingBox();
    if (!gridBox || !firstCard) throw new Error("tablet grid did not render measurable boxes");

    console.log(
      `[28.4] tablet ${tablet.width}×${tablet.height}: ` +
        `gridWidth=${Math.round(gridBox.width)} firstCardWidth=${Math.round(firstCard.width)}`,
    );

    expect(gridBox.width).toBeLessThanOrEqual(tablet.width);
  });

  test("desktop 1440×900: the results grid remains within the 1100px content container", async ({
    page,
  }) => {
    const desktop = CANONICAL_VIEWPORTS[2];
    await openResultsAt(page, desktop);

    const gridBox = await page.getByTestId("lista-grid").locator("ol").boundingBox();
    if (!gridBox) throw new Error("desktop grid did not render a measurable box");

    console.log(
      `[28.4] desktop ${desktop.width}×${desktop.height}: gridWidth=${Math.round(
        gridBox.width,
      )} (bound <= 1100)`,
    );
    expect(gridBox.width).toBeLessThanOrEqual(1100);
  });
});
