import { expect, test } from "@playwright/test";
import { ID, LISTING_ROWS, MARACAIBO, ZONE_ROWS } from "../../scripts/seed-e2e";
import { buildListingPath } from "../../src/modules/listing-discovery/domain/listing-url";
import { serveSeededListingImages } from "./ficha-imagenes-fixture";

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
  test(`30.2: served listing diagnostic ${viewport.width}x${viewport.height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    const images = await serveSeededListingImages(page, listing.id);
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe(path);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(listing.title);
    // A real served listing must have its own identity and native viewer destination.
    await expect(page.locator("main")).toContainText(`ID ${listing.id.slice(0, 8)}`);
    const viewer = page.locator(`main a[href="${path}/foto/1"]`);
    await expect(viewer).toHaveCount(1);
    await page
      .locator('[data-testid="photo-strip"] img')
      .first()
      .evaluate(async (image: HTMLImageElement) => {
        if (!image.complete)
          await new Promise<void>((resolve) => {
            image.addEventListener("load", () => resolve(), { once: true });
            image.addEventListener("error", () => resolve(), { once: true });
          });
      });
    const evidence = await page.evaluate(
      ({ listingPath }) => {
        const box = (element: Element | Range | null) => {
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
        const textBox = (element: Element | null) => {
          if (!element) return null;
          const range = document.createRange();
          range.selectNodeContents(element);
          return box(range);
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
            labelBox: textBox(label),
            valueBox: textBox(label.parentElement?.querySelector("dd") ?? null),
          })),
          gallery: box(gallery ?? null),
          galleryTrack: box(gallery?.querySelector("ul") ?? null),
          content: [...(main?.querySelectorAll("section, article") ?? [])].map((element) => ({
            text: element.textContent?.trim().slice(0, 180),
            box: box(element),
          })),
          ownFooterWidth: ownFooter?.scrollWidth,
          globalFooterWidths: globalFooters.map((footer) => footer.scrollWidth),
          photos: [...(gallery?.querySelectorAll("img") ?? [])].map((image) => ({
            alt: image.alt,
            box: box(image),
            frame: box(image.closest("a")),
            naturalWidth: image.naturalWidth,
            naturalHeight: image.naturalHeight,
            currentSrc: image.currentSrc,
            objectFit: getComputedStyle(image).objectFit,
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
    expect(evidence.documentWidth).toBeLessThanOrEqual(viewport.width);
    expect(evidence.bodyWidth).toBeLessThanOrEqual(viewport.width);
    expect(evidence.ownFooterWidth).toBeLessThanOrEqual(viewport.width);
    expect(evidence.globalFooterWidths.every((width) => width <= viewport.width)).toBe(true);
    expect(evidence.stats).toHaveLength(4);
    expect(evidence.stats.map((stat) => stat.label?.toLowerCase()).join(" ")).toMatch(/puestos?/);
    expect(
      evidence.stats.every((stat) => stat.box && stat.box.width > 0 && stat.box.height > 0),
    ).toBe(true);
    const contains = (outer: typeof evidence.gallery, inner: typeof evidence.gallery) =>
      outer !== null &&
      inner !== null &&
      inner.x >= outer.x - 1 &&
      inner.y >= outer.y - 1 &&
      inner.right <= outer.right + 1 &&
      inner.bottom <= outer.bottom + 1;
    for (const stat of evidence.stats) {
      expect(contains(stat.box, stat.labelBox), `${stat.label} label at ${viewport.width}`).toBe(
        true,
      );
      expect(contains(stat.box, stat.valueBox), `${stat.label} value at ${viewport.width}`).toBe(
        true,
      );
    }
    await expect(page.locator("main")).toContainText("La propiedad tiene");
    await expect(page.locator("main")).toContainText("Puesto de estacionamiento");
    await expect(page.locator("main")).toContainText("Descripción");
    await expect(page.locator("main")).toContainText("Planta eléctrica");
    await expect(page.locator("main")).toContainText("Ver WhatsApp del dueño");
    const lead = evidence.photos[0];
    if (!lead) throw new Error("Seeded listing has no rendered photo");
    expect(lead.naturalWidth).toBeGreaterThan(0);
    expect(lead.naturalHeight).toBeGreaterThan(0);
    const source = viewport.width >= 768 ? images.dimensions.detail : images.dimensions.strip;
    expect(lead.naturalWidth / lead.naturalHeight).toBe(source.width / source.height);
    expect(lead.objectFit).toBe("cover");
    expect(lead.box?.width).toBeGreaterThan(0);
    expect(lead.box?.height).toBeGreaterThan(0);
    // The loaded image fills its frame; object-fit: cover deliberately crops the source.
    console.log(
      `IMAGE_FRAME ${testInfo.project.name} ${viewport.width} ${JSON.stringify({ image: lead.box, frame: lead.frame })}`,
    );
    expect(contains(lead.box, lead.frame), `image covers frame at ${viewport.width}`).toBe(true);
    expect(images.requested).toContain(viewport.width >= 768 ? "detail" : "strip");
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

test("30.2: served photo viewer remains immersive without site footer", async ({ page }) => {
  const response = await page.goto(`${path}/foto/1`);
  expect(response?.status()).toBe(200);
  await expect(page.locator("body > footer")).toHaveCount(0);
  await expect(page.locator("main footer")).toHaveCount(1);
});
