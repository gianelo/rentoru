import { expect, test } from "@playwright/test";

const missing =
  "/alquiler/maracaibo/coquivacoa/aviso-inexistente-00000000-0000-4000-8000-000000000001";
const harness = !process.env.PLAYWRIGHT_BASE_URL && Boolean(process.env.TEST_DATABASE_URL);

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
