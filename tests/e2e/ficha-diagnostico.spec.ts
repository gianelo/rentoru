import { expect, test } from "@playwright/test";
import { ID, LISTING_ROWS, MARACAIBO, ZONE_ROWS } from "../../scripts/seed-e2e";
import { buildListingPath } from "../../src/modules/listing-discovery/domain/listing-url";

const listing = LISTING_ROWS.find((row) => row.id === ID.mcboTierraNegra1);
const zone = ZONE_ROWS.find((row) => row.id === listing?.zoneId);
if (!listing || !zone || listing.status !== "active") throw new Error("Active E2E listing missing");
const path = buildListingPath({
  id: listing.id,
  title: listing.title,
  cityName: MARACAIBO.name,
  zoneName: zone.name,
});
const sizes = [
  { width: 390, height: 844 },
  { width: 440, height: 956 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
];

test.beforeAll(() => {
  if (!process.env.TEST_DATABASE_URL || process.env.PLAYWRIGHT_BASE_URL) {
    throw new Error(
      "Diagnostic requires local seeded TEST_DATABASE_URL, not a preview or measure fixture",
    );
  }
});

for (const viewport of sizes) {
  test(`served listing diagnostic ${viewport.width}x${viewport.height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe(path);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(listing.title);
    // A real served listing must have its own identity and native viewer destination.
    await expect(page.locator("main")).toContainText(`ID ${listing.id.slice(0, 8)}`);
    const viewer = page.locator(`main a[href="${path}/foto/1"]`);
    await expect(viewer).toHaveCount(1);
    const evidence = await page.evaluate(
      ({ listingPath }) => {
        const box = (element: Element | null) => {
          if (!element) return null;
          const rect = element.getBoundingClientRect();
          return {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            right: rect.right,
            bottom: rect.bottom,
          };
        };
        const main = document.querySelector("main");
        const strip = main?.querySelector('[data-testid="stat-strip"]');
        const gallery = main?.querySelector('[data-testid="photo-strip"]');
        const ownFooter = main?.querySelector("footer");
        const globalFooters = [...document.querySelectorAll("footer")].filter(
          (item) => !main?.contains(item),
        );
        const targets = [...(main?.querySelectorAll("a, button, input, textarea") ?? [])].map(
          (element) => ({
            text: element.textContent?.trim().slice(0, 80) ?? "",
            href: element.getAttribute("href"),
            box: box(element),
          }),
        );
        return {
          url: location.pathname,
          viewport: { width: innerWidth, height: innerHeight },
          documentWidth: document.documentElement.scrollWidth,
          bodyWidth: document.body.scrollWidth,
          main: box(main ?? null),
          stats: [...(strip?.querySelectorAll("dt") ?? [])].map((label) => ({
            label: label.textContent?.trim(),
            box: box(label.parentElement),
          })),
          gallery: box(gallery ?? null),
          photos: [...(gallery?.querySelectorAll("img") ?? [])].map((image) => ({
            alt: image.alt,
            box: box(image),
            naturalWidth: image.naturalWidth,
            complete: image.complete,
            viewerHref: image.closest("a")?.getAttribute("href"),
          })),
          ownFooter: {
            box: box(ownFooter ?? null),
            text: ownFooter?.textContent?.trim() ?? null,
            reportHref:
              ownFooter?.querySelector(`a[href="${listingPath}/reportar"]`)?.getAttribute("href") ??
              null,
          },
          globalFooters: globalFooters.map((footer) => ({
            box: box(footer),
            text: footer.textContent?.trim().slice(0, 250),
          })),
          targets,
          smallTargets: targets.filter(
            ({ box: rect }) => rect && (rect.width < 44 || rect.height < 44),
          ),
        };
      },
      { listingPath: path },
    );
    expect(evidence.url).toBe(path);
    // D30: two distinct, ordered sections on the served listing, even without JS.
    const ownFooter = page.locator("main footer");
    const siteFooter = page.locator("body > footer");
    await expect(ownFooter).toHaveCount(1);
    await expect(siteFooter).toHaveCount(1);
    await expect(ownFooter).toContainText(`ID ${listing.id.slice(0, 8)}`);
    await expect(ownFooter.locator(`a[href="${path}/reportar"]`)).toHaveCount(1);
    await expect(siteFooter).toContainText("rentoru.com no interviene en el contrato");
    await expect(siteFooter.locator('a[href="/"]')).toHaveCount(1);
    await expect(siteFooter).not.toContainText(`ID ${listing.id.slice(0, 8)}`);
    await expect(siteFooter.locator(`a[href="${path}/reportar"]`)).toHaveCount(0);
    expect(
      await ownFooter.evaluate(
        (own, global) =>
          Boolean(global && own.compareDocumentPosition(global) & Node.DOCUMENT_POSITION_FOLLOWING),
        await siteFooter.elementHandle(),
      ),
    ).toBe(true);
    expect(evidence.photos.some((photo) => photo.viewerHref === `${path}/foto/1`)).toBe(true);
    await testInfo.attach("served-geometry.json", {
      body: JSON.stringify(evidence, null, 2),
      contentType: "application/json",
    });
    await testInfo.attach("served-listing.png", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
    console.log(
      `FICHA_DIAGNOSTIC ${testInfo.project.name} ${viewport.width}x${viewport.height} ${JSON.stringify(evidence)}`,
    );
  });
}

test("served photo viewer remains immersive without site footer", async ({ page }) => {
  const response = await page.goto(`${path}/foto/1`);
  expect(response?.status()).toBe(200);
  await expect(page.locator("body > footer")).toHaveCount(0);
  await expect(page.locator("main footer")).toHaveCount(1);
});
