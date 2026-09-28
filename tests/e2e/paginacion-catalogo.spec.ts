import { expect, test } from "@playwright/test";
import { ID, LISTING_ROWS } from "../../scripts/seed-e2e";
import { paginationRows } from "../../scripts/seed-pagination-e2e";

const zone = "/alquiler/distrito-capital/altamira";
const added = paginationRows(new Date("2026-09-28T00:00:00Z"));
const original = LISTING_ROWS.find((row) => row.id === ID.dcAltamira);
if (!original) throw new Error("Missing original Altamira listing");

test("29.2: 25 Altamira cards paginate through native next and previous links", async ({
  page,
}) => {
  if (process.env.PLAYWRIGHT_BASE_URL || !process.env.TEST_DATABASE_URL) {
    throw new Error("29.2 requires the isolated local database harness, never a preview");
  }
  const first = await page.goto(zone);
  expect(first?.status()).toBe(200);
  const nav = page.getByRole("navigation", { name: "Paginación" });
  await expect(nav).toContainText("Página 1 de 2");
  const next = nav.getByRole("link", { name: /Siguiente/ });
  await expect(next).toHaveAttribute("rel", "next");
  await expect(next).toHaveAttribute("href", `${zone}?pag=2`);
  const cards = page.locator(`a[href^="${zone}/"]`);
  await expect(cards).toHaveCount(24);
  const firstTitles = await cards.allTextContents();

  await next.click();
  await expect(page).toHaveURL(new RegExp(`${zone}\\?pag=2$`));
  await expect(nav).toContainText("Página 2 de 2");
  await expect(cards).toHaveCount(1);
  const remaining = [original.title, ...added.map((row) => row.title)];
  const lastTitle = remaining.find((title) => !firstTitles.some((text) => text.includes(title)));
  expect(lastTitle).toBeDefined();
  await expect(page.getByText(lastTitle as string, { exact: true })).toBeVisible();
  const previous = nav.getByRole("link", { name: /Anterior/ });
  await expect(previous).toHaveAttribute("rel", "prev");
  await expect(previous).toHaveAttribute("href", zone);
  await previous.click();
  await expect(page).toHaveURL(new RegExp(`${zone}$`));
  await expect(cards).toHaveCount(24);
});
