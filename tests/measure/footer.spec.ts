import { expect, test } from "@playwright/test";

/**
 * The site footer's two geometry claims (tasks.md 23.8, 23.10), read from a
 * real rendered page and not from a stylesheet declaration — the same
 * discipline `layout.spec.ts` already established: declared is not drawn.
 *
 * The arnés (`app/measure/page.tsx`) injects the ten real labels the design
 * names, with placeholder destinations. Production's own registry
 * (`app/layout.tsx`) resolves to zero groups today (tasks.md 23.2), which
 * would leave nothing to measure — the harness is what makes these two
 * design claims checkable before a single real destination exists.
 */
test.describe("site footer geometry (23.8, 23.10)", () => {
  for (const viewport of [
    { name: "mobile", width: 390, height: 840 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "desktop", width: 1440, height: 900 },
  ]) {
    test(`28.5/28.17: ${viewport.name} footer stays contained without horizontal overflow`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/measure");

      const footer = page.getByTestId("site-footer-harness").locator("footer");
      const top = await footer.locator('[class*="top"]').boundingBox();
      const strip = await footer.locator('[class*="strip"]').boundingBox();
      const brand = await footer.getByText("Rentoru", { exact: true }).boundingBox();
      const columns = await footer.locator('[class*="top"] > [class*="column"]').all();
      if (!top || !strip || !brand || columns.length !== 2) {
        throw new Error("served footer did not draw its sections");
      }
      const columnBoxes = await Promise.all(columns.map((column) => column.boundingBox()));
      if (columnBoxes.some((box) => !box)) throw new Error("footer column did not draw");
      const [help, legal] = columnBoxes as [
        NonNullable<(typeof columnBoxes)[number]>,
        NonNullable<(typeof columnBoxes)[number]>,
      ];
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      console.log(
        `[28.5/28.17] ${viewport.name}: top=${top.x}..${top.x + top.width}, strip=${strip.x}..${strip.x + strip.width}, overflow=${overflow.scrollWidth}/${overflow.clientWidth}`,
      );
      if (overflow.scrollWidth > overflow.clientWidth) {
        const offenders = await page.evaluate(() =>
          [...document.querySelectorAll("body *")]
            .map((node) => ({
              tag: node.tagName,
              className: typeof node.className === "string" ? node.className : "",
              testId: node.getAttribute("data-testid"),
              rect: node.getBoundingClientRect().toJSON(),
            }))
            .filter(({ rect }) => rect.right > document.documentElement.clientWidth + 1)
            .slice(0, 12),
        );
        console.log(
          `[28.5/28.17] ${viewport.name} overflow offenders: ${JSON.stringify(offenders)}`,
        );
      }
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
      for (const box of [top, strip, brand, help, legal]) {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      }
      expect(Math.abs(top.x - strip.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(top.width - strip.width)).toBeLessThanOrEqual(1);
      // The 1100px detail split (not the footer) previously caused the tablet's
      // document overflow; keep the page-wide check to guard that collision.
      if (viewport.name !== "desktop") {
        expect(help.y).toBeGreaterThan(brand.y);
        expect(legal.y).toBeGreaterThan(help.y);
      } else {
        expect(help.x).toBeGreaterThan(brand.x);
        expect(legal.x).toBeGreaterThan(help.x);
        expect(Math.abs(help.y - legal.y)).toBeLessThanOrEqual(1);
      }
      if (viewport.name === "tablet") {
        const media = await page.getByTestId("ficha-media").boundingBox();
        const price = await page.getByTestId("ficha-price").boundingBox();
        const description = await page.getByTestId("ficha-description").boundingBox();
        const contact = await page.getByTestId("contact-block").boundingBox();
        if (!media || !price || !description || !contact)
          throw new Error("tablet detail did not draw");
        expect(media.y).toBeLessThan(price.y);
        expect(price.y).toBeLessThan(description.y);
        expect(description.y).toBeLessThan(contact.y);
        for (const box of [media, price, description, contact]) {
          expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
        }
      }
      const links = footer.locator("ul li a");
      expect(await links.count()).toBe(10);
      if (viewport.name !== "desktop") {
        for (const link of await links.all()) {
          const box = await link.boundingBox();
          if (!box) throw new Error("footer link did not draw");
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    });
  }
  test("23.8: at 1280 the footer stays close to the artboard's 210px and does not balloon past it", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 1400 });
    await page.goto("/measure");

    const box = await page.getByTestId("site-footer-harness").locator("footer").boundingBox();
    if (!box) throw new Error("the footer did not render a measurable box");

    console.log(`[23.8] measured desktop footer height: ${box.height}px (artboard: 210px)`);
    // A generous ceiling and not an exact match: the artboard is drawn with
    // the design tool's own font metrics, and this reads the real system
    // font stack (design.md D13 — no webfont). What the claim needs proven
    // is "does not compete with the content", not a pixel-identical number.
    expect(box.height).toBeGreaterThan(100);
    expect(box.height).toBeLessThanOrEqual(260);
  });

  /**
   * **`toBe(44)` and not a lower bound, for the same reason 16.24's own
   * comment in `layout.spec.ts` gives**: 44px is a decided value
   * (`--target-min`), and a lower bound would pass any answer that happened
   * to clear it — this fixes the number so moving the token puts this red
   * with the value it measured.
   */
  test("23.10: at 360 every footer link row measures exactly 44px, and all ten draw at once — no accordion", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 1600 });
    await page.goto("/measure");

    const footer = page.getByTestId("site-footer-harness").locator("footer");
    const rows = footer.locator("ul li a");
    const count = await rows.count();

    console.log(`[23.10] mobile footer link rows drawn: ${count} (bound: === 10)`);
    // "sin acordeón: diez enlaces se leen de una" — the ten links are in the
    // DOM and visible together, not behind a toggle that only reveals some.
    expect(count).toBe(10);

    for (let index = 0; index < count; index += 1) {
      const box = await rows.nth(index).boundingBox();
      if (!box) throw new Error(`footer link row ${index} did not render a measurable box`);
      console.log(`[23.10] mobile row ${index}: height ${box.height}px (bound: === 44px)`);
      expect(box.height).toBe(44);
    }

    // Structural, not visual: no accordion primitive anywhere in the footer.
    const accordions = await footer.locator("details").count();
    expect(accordions).toBe(0);
  });
});
