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

  test("tablet and desktop: active filter chips leave measured air before the grid", async ({
    page,
  }) => {
    for (const viewport of [CANONICAL_VIEWPORTS[1], CANONICAL_VIEWPORTS[2]]) {
      await openResultsAt(page, viewport);

      const chipsBox = await page.getByTestId("filter-chips").boundingBox();
      const gridBox = await page.getByTestId("lista-grid").locator("ol").boundingBox();
      if (!chipsBox || !gridBox) throw new Error(`${viewport.label} chips/grid did not render`);

      const gap = Math.round(gridBox.y - (chipsBox.y + chipsBox.height));
      console.log(
        `[28.13] ${viewport.label} ${viewport.width}×${viewport.height}: ` +
          `filterChipsBottom=${Math.round(chipsBox.y + chipsBox.height)} gridTop=${Math.round(
            gridBox.y,
          )} gap=${gap}px`,
      );

      expect(gap).toBeGreaterThanOrEqual(12);
    }
  });

  test("desktop 1440×900: listing card image follows the founder-approved 240px width", async ({
    page,
  }) => {
    const desktop = CANONICAL_VIEWPORTS[2];
    await openResultsAt(page, desktop);

    const cardBox = await page
      .getByTestId("lista-grid")
      .locator('[data-testid="listing-card"]')
      .first()
      .boundingBox();
    const imageBox = await page
      .getByTestId("lista-grid")
      .locator('[data-testid="listing-card"] img')
      .first()
      .boundingBox();
    if (!cardBox || !imageBox) throw new Error("desktop listing card image did not render");

    console.log(
      `[28.14] desktop ${desktop.width}×${desktop.height}: ` +
        `cardWidth=${Math.round(cardBox.width)} imageWidth=${Math.round(imageBox.width)}`,
    );

    expect(Math.round(cardBox.width)).toBe(240);
    expect(Math.round(imageBox.width)).toBeLessThanOrEqual(240);
  });
});
