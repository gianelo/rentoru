import { expect, test } from "@playwright/test";
import { ID, LISTING_ROWS, MARACAIBO, ZONE_ROWS } from "../../scripts/seed-e2e";
import { safeSignOutDestination } from "../../src/modules/identity/domain/sign-out-destination";
import { buildListingPath } from "../../src/modules/listing-discovery/domain/listing-url";

const missing =
  "/alquiler/maracaibo/coquivacoa/aviso-inexistente-00000000-0000-4000-8000-000000000001";
const harness = !process.env.PLAYWRIGHT_BASE_URL && Boolean(process.env.TEST_DATABASE_URL);

test("30.4b: anonymous sign-out destination serves the locked listing", async ({ page }) => {
  test.skip(!harness, "Requires local disposable seeded database and production server");
  const listing = LISTING_ROWS.find((row) => row.id === ID.mcboTierraNegra1);
  const zone = ZONE_ROWS.find((row) => row.id === listing?.zoneId);
  if (!listing || !zone || listing.status !== "active")
    throw new Error("Active E2E listing missing");
  const canonical = buildListingPath({
    id: listing.id,
    title: listing.title,
    cityName: MARACAIBO.name,
    zoneName: zone.name,
  });
  const destination = safeSignOutDestination(canonical);
  const response = await page.goto(destination);
  expect(response?.status()).toBe(200);
  expect(new URL(page.url()).pathname).toBe(canonical);
  const body = await page.locator("body").innerText();
  expect(body).toContain(listing.title);
  expect(body).toContain("Ver WhatsApp del dueño");
  expect(body).not.toContain("sin-contacto");
  expect(body).not.toMatch(/\+58\s*\d{3}\s*\d{3}\s*\d{4}/);
  expect(page.url()).not.toContain("/signin");
});

test.describe("30.4a: unknown valid listing", () => {
  test.skip(!harness, "Requires local disposable database and test-only navigation route");

  test("direct document responds 404 without redirecting", async ({ page }) => {
    const response = await page.goto(missing);
    expect(response?.status()).toBe(404);
    expect(new URL(page.url()).pathname).toBe(missing);
  });

  test("Next Link transition keeps the unknown URL and shows not found", async ({ page }) => {
    test.skip(
      test.info().project.name === "crawlability",
      "Client transition requires JavaScript; direct document is checked separately",
    );
    const flightStatuses: number[] = [];
    page.on("response", (response) => {
      if (response.url().includes("_rsc=") && response.url().includes("aviso-inexistente")) {
        flightStatuses.push(response.status());
      }
    });
    await page.goto("/measure/ficha-ruta");
    await page.getByRole("link", { name: "Abrir ficha inexistente" }).click();
    await expect(page).toHaveURL(new RegExp(`${missing}$`));
    await expect(page.getByRole("heading", { name: "No encontramos esa página" })).toBeVisible();
    await expect(page.getByText("Apartamento 3 habitaciones en Tierra Negra")).toHaveCount(0);
    test.info().annotations.push({
      type: "flight-status",
      description: flightStatuses.join(",") || "not observed",
    });
  });
});
