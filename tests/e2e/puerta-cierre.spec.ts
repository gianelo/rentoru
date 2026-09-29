import { expect, test } from "@playwright/test";
import { ID, LISTING_ROWS, MARACAIBO } from "../../scripts/seed-e2e";
import { buildListingPath } from "../../src/modules/listing-discovery/domain/listing-url";
import { ownedDatabase } from "./owned-test-database";

const listing = LISTING_ROWS.find((row) => row.id === ID.mcboTierraNegra1);
if (listing?.status !== "active") throw new Error("Seeded active Maracaibo listing missing");
const path = buildListingPath({
  id: listing.id,
  cityName: MARACAIBO.name,
  zoneName: "Tierra Negra",
  title: listing.title,
});

test.describe("30.7: dismiss the SSR contact door", () => {
  test.skip(Boolean(process.env.PLAYWRIGHT_BASE_URL), "Owned local database only, never preview");

  for (const [width, height] of [
    [390, 844],
    [440, 956],
    [768, 1024],
    [1440, 900],
  ] as const) {
    test(`30.7: outside pointerdown closes at ${width}x${height} and reload stays closed`, async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name === "crawlability", "Dismissal requires JavaScript");
      ownedDatabase();
      await page.setViewportSize({ width, height });
      expect((await page.goto(`${path}?entrar=si`))?.status()).toBe(200);
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.locator("body").click({ position: { x: 1, y: 1 } });
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await page.reload();
      await expect(page.getByRole("dialog")).toHaveCount(0);
    });
  }

  test("30.7: inside click retains door; Escape closes and restores native contact-link focus", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === "crawlability", "Dismissal requires JavaScript");
    ownedDatabase();
    expect((await page.goto(`${path}?entrar=si`))?.status()).toBe(200);
    await page.getByTestId("puerta-panel").getByRole("heading").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator("[data-contact-door-trigger]")).toBeFocused();
    await expect(page.locator("[data-contact-door-trigger]")).toHaveAttribute(
      "href",
      `${path}?entrar=si`,
    );
    await expect(page).toHaveURL(new RegExp(`${path}$`));
  });
});
