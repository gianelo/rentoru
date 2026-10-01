import { expect, test } from "@playwright/test";
import sharp from "sharp";
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
    const viewer = page.locator(`[data-testid="photo-strip"] ul a[href="${path}/foto/1"]`);
    await expect(viewer).toHaveCount(1);
    await page
      .locator('[data-testid="photo-strip"] ul img')
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
        const grid = gallery?.parentElement;
        const track = gallery?.querySelector("ul");
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
          galleryGrid: box(grid ?? null),
          galleryTrack: box(track ?? null),
          trackWidths: track ? { client: track.clientWidth, scroll: track.scrollWidth } : null,
          content: [...(main?.querySelectorAll("section, article") ?? [])].map((element) => ({
            text: element.textContent?.trim().slice(0, 180),
            box: box(element),
          })),
          ownFooterWidth: ownFooter?.scrollWidth,
          globalFooterWidths: globalFooters.map((footer) => footer.scrollWidth),
          photos: [...(gallery?.querySelectorAll<HTMLImageElement>("ul img") ?? [])].map(
            (image) => ({
              alt: image.alt,
              box: box(image),
              frame: box(image.closest("a")),
              naturalWidth: image.naturalWidth,
              naturalHeight: image.naturalHeight,
              currentSrc: image.currentSrc,
              objectFit: getComputedStyle(image).objectFit,
              complete: image.complete,
              viewerHref: image.closest("a")?.getAttribute("href"),
            }),
          ),
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
    expect(evidence.gallery?.right, `gallery right at ${viewport.width}`).toBeLessThanOrEqual(
      viewport.width + 1,
    );
    expect(evidence.galleryGrid?.right, `grid right at ${viewport.width}`).toBeLessThanOrEqual(
      viewport.width + 1,
    );
    if (viewport.width < 768) {
      expect(evidence.trackWidths?.scroll, `native scroll at ${viewport.width}`).toBeGreaterThan(
        evidence.trackWidths?.client ?? 0,
      );
    }
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

test("30.3: served listing has three ordered native photo links and distinct loaded WebP ratios", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const images = await serveSeededListingImages(page, listing.id);
  const response = await page.goto(path);
  expect(response?.status()).toBe(200);
  const photos = page.locator('[data-testid="photo-strip"] ul a:has(img)');
  await expect(photos).toHaveCount(3);
  expect(
    await photos.evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
  ).toEqual([1, 2, 3].map((number) => `${path}/foto/${number}`));
  const observed = await photos.locator("img").evaluateAll(async (elements) => {
    const images = elements as HTMLImageElement[];
    await Promise.all(
      images.map(async (image) => {
        if (!image.complete)
          await new Promise<void>((resolve) => {
            image.addEventListener("load", () => resolve(), { once: true });
            image.addEventListener("error", () => resolve(), { once: true });
          });
      }),
    );
    return images.map((image) => ({
      width: image.naturalWidth,
      height: image.naturalHeight,
      src: new URL(image.currentSrc).pathname,
    }));
  });
  expect(observed.map(({ width, height }) => width / height)).toEqual([16 / 9, 4 / 3, 3 / 4]);
  expect(observed.every(({ width, height }) => width > 0 && height > 0)).toBe(true);
  expect(new Set(observed.map(({ src }) => src)).size).toBe(3);
  expect(images.requested).toContain("strip");
});

test("30.3b: arrows and keyboard change the hero and viewer destination without wrapping", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await serveSeededListingImages(page, listing.id);
  await page.goto(path);
  const hero = page.getByTestId("photo-hero");
  const next = page.getByRole("button", { name: "Foto siguiente" });
  const previous = page.getByRole("button", { name: "Foto anterior" });
  if (testInfo.project.name === "crawlability") {
    // The crawlability project disables scripts: native links remain the only controls.
    await expect(next).toHaveCount(0);
    await expect(previous).toHaveCount(0);
    await expect(page.locator('[data-testid="photo-strip"] ul a[href*="/foto/"]')).toHaveCount(3);
    return;
  }
  for (const button of [next, previous]) {
    const box = await button.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  await expect(previous).toBeDisabled();
  await next.click();
  await expect(hero).toHaveAttribute("href", `${path}/foto/2`);
  await expect(hero.locator("img")).toHaveAttribute("src", /\/2\/strip\.webp/);
  await expect(hero.locator("img")).toHaveAttribute("alt", /^Foto 2 de 3/);
  const links = page.locator('[data-testid="photo-strip"] ul a:has(img)');
  await expect
    .poll(() => links.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href"))))
    .toEqual([1, 2, 3].map((number) => `${path}/foto/${number}`));
  await expect(
    page.locator('nav[aria-label="Miniaturas de fotos de la ficha"] a').nth(1),
  ).toHaveAttribute("aria-current", "true");
  await next.focus();
  await page.keyboard.press("Enter");
  await expect(hero).toHaveAttribute("href", `${path}/foto/3`);
  await expect(hero.locator("img")).toHaveAttribute("alt", /^Foto 3 de 3/);
  await expect(next).toBeDisabled();
  await previous.focus();
  await page.keyboard.press("Space");
  await expect(hero).toHaveAttribute("href", `${path}/foto/2`);
  await previous.click();
  await expect(hero).toHaveAttribute("href", `${path}/foto/1`);
  await expect(previous).toBeDisabled();
  await next.click();
  await expect(hero).toHaveAttribute("href", `${path}/foto/2`);
  await hero.click();
  await expect(page).toHaveURL(new RegExp(`${path}/foto/2$`));
});

for (const width of [390, 440, 768]) {
  test(`30.3b: native horizontal scroll selects photo at ${width}, vertical scroll does not`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: width === 768 ? 1024 : 844 });
    await serveSeededListingImages(page, listing.id);
    await page.goto(path);
    const gallery = page.getByTestId("photo-strip");
    const track = gallery.locator("ul");
    const links = track.locator("a:has(img)");
    await expect(
      gallery.getByRole("button", { name: /Foto (anterior|siguiente)/ }).first(),
    ).toBeHidden();
    await expect(links).toHaveCount(3);
    expect(await track.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
    if (width === 768) {
      const thumbs = gallery
        .getByRole("navigation", { name: "Miniaturas de fotos de la ficha" })
        .locator("a");
      await expect(thumbs).toHaveCount(3);
      for (let index = 0; index < 3; index++) {
        await expect(thumbs.nth(index)).toBeVisible();
        await expect(thumbs.nth(index)).toHaveAttribute("href", `${path}/foto/${index + 1}`);
        const box = await thumbs.nth(index).boundingBox();
        expect(box?.width).toBeGreaterThanOrEqual(44);
        expect(box?.height).toBeGreaterThanOrEqual(44);
      }
    }
    if (testInfo.project.name === "crawlability") {
      await expect(gallery.locator('[role="status"]')).toBeHidden();
      await expect(gallery.locator("nav a[aria-current]")).toHaveCount(0);
      await links.nth(1).click();
      await expect(page).toHaveURL(new RegExp(`${path}/foto/2$`));
      return;
    }
    await track.hover();
    await page.mouse.wheel(2000, 0);
    await expect.poll(() => track.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
    await expect(gallery.getByRole("status")).toHaveAttribute("aria-label", "Foto 3 de 3");
    const hero = gallery.getByTestId("photo-hero");
    await expect(hero).toHaveAttribute("href", `${path}/foto/3`);
    await expect(hero.locator("img")).toHaveAttribute("src", /\/3\/strip\.webp/);
    await expect(hero.locator("img")).toHaveAttribute("alt", /^Foto 3 de 3/);
    await expect(gallery.getByTestId("photo-dot").nth(2)).toHaveAttribute("data-selected", "true");
    await page.mouse.wheel(0, 120);
    await expect(gallery.getByRole("status")).toHaveAttribute("aria-label", "Foto 3 de 3");
    if (width === 768) {
      await gallery.locator('nav[aria-label="Miniaturas de fotos de la ficha"] a').nth(1).click();
      await expect(page).toHaveURL(new RegExp(`${path}/foto/2$`));
    }
  });
}

test("30.3b: touch swipe suppresses synthetic clicks but keyboard opens the selected link", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await serveSeededListingImages(page, listing.id);
  await page.goto(path);
  const gallery = page.getByTestId("photo-strip");
  const track = gallery.locator("ul");
  if (testInfo.project.name === "crawlability") {
    await expect(track.locator("a:has(img)")).toHaveCount(3);
    return;
  }
  await track.hover();
  await page.mouse.wheel(2000, 0);
  await expect(gallery.getByRole("status")).toHaveAttribute("aria-label", "Foto 3 de 3");
  const hero = gallery.getByTestId("photo-hero");
  await expect(hero).toHaveAttribute("href", `${path}/foto/3`);
  const box = await hero.boundingBox();
  if (!box) throw new Error("Missing selected photo");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const swipe = async () => {
    await track.dispatchEvent("touchstart", {
      touches: [{ identifier: 1, clientX: x, clientY: y }],
    });
    await track.dispatchEvent("touchend", {
      changedTouches: [{ identifier: 1, clientX: x - 100, clientY: y }],
    });
  };
  await swipe();
  const touchClick = await hero.evaluate((link) =>
    link.dispatchEvent(
      new PointerEvent("click", { pointerType: "touch", bubbles: true, cancelable: true }),
    ),
  );
  expect(touchClick).toBe(false);
  await expect(page).toHaveURL(new RegExp(`${path}$`));
  await swipe();
  const ambiguousClick = await hero.evaluate((link) => {
    const pointerEvent = window.PointerEvent;
    try {
      Object.defineProperty(window, "PointerEvent", { configurable: true, value: undefined });
      return link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    } finally {
      Object.defineProperty(window, "PointerEvent", { configurable: true, value: pointerEvent });
    }
  });
  expect(ambiguousClick).toBe(false);
  await expect(page).toHaveURL(new RegExp(`${path}$`));
  await track.dispatchEvent("touchstart", {
    touches: [{ identifier: 1, clientX: x, clientY: y }],
  });
  await hero.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`${path}/foto/3$`));
});

test("30.3c: swipe on the loaded large viewer image navigates native neighbours", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await serveSeededListingImages(page, listing.id);
  const fullRequests: string[] = [];
  await page.route(
    new RegExp(
      `^https://fotos-de-prueba\\.rentas\\.invalid/e2e/${listing.id}/(?:[23]/)?full\\.webp$`,
    ),
    async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      const number = pathname.includes("/2/") ? 2 : pathname.includes("/3/") ? 3 : 1;
      fullRequests.push(pathname);
      const body = await sharp({
        create: {
          width: number === 1 ? 720 : number === 2 ? 800 : 600,
          height: number === 1 ? 960 : number === 2 ? 600 : 800,
          channels: 3,
          background: "#80a599",
        },
      })
        .webp()
        .toBuffer();
      await route.fulfill({ status: 200, contentType: "image/webp", body });
    },
  );
  const response = await page.goto(`${path}/foto/1`);
  expect(response?.status()).toBe(200);
  const large = page.locator("main img[data-viewer-large]");
  const previous = page.locator('a[data-viewer-key="previous"]');
  const next = page.locator('a[data-viewer-key="next"]');
  const thumbs = page.getByRole("navigation", { name: "Fotos del aviso" }).locator("a");
  await expect(thumbs).toHaveCount(3);
  await expect(previous).toHaveCount(0);
  await expect(next).toHaveAttribute("href", `${path}/foto/2`);
  await expect(thumbs.nth(2)).toHaveAttribute("href", `${path}/foto/3`);
  const loaded = async (number: number) => {
    await expect(page).toHaveURL(new RegExp(`${path}/foto/${number}$`));
    await expect(large).toHaveAttribute("alt", new RegExp(`^Foto ${number} de 3`));
    await expect(large).toHaveAttribute(
      "src",
      new RegExp(`${number === 1 ? "" : `/${number}`}/full\\.webp`),
    );
    await expect
      .poll(() => large.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
    return large.getAttribute("src");
  };
  const first = await loaded(1);
  if (testInfo.project.name === "crawlability") {
    // GET and native anchors work without scripts; no synthetic swipe in this project.
    await next.click();
    const second = await loaded(2);
    expect(second).not.toBe(first);
    await expect(previous).toHaveAttribute("href", `${path}/foto/1`);
    await thumbs.nth(2).click();
    await loaded(3);
    await expect(next).toHaveCount(0);
    await previous.click();
    await loaded(2);
    return;
  }
  const swipe = async (dx: number, dy: number) => {
    const box = await large.boundingBox();
    if (!box) throw new Error("Missing large image");
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await large.dispatchEvent("touchstart", {
      touches: [{ identifier: 1, clientX: x, clientY: y }],
    });
    await large.dispatchEvent("touchend", {
      changedTouches: [{ identifier: 1, clientX: x + dx, clientY: y + dy }],
    });
  };
  await swipe(0, -110);
  await loaded(1);
  await swipe(-110, 0);
  const second = await loaded(2);
  expect(second).not.toBe(first);
  await swipe(-110, 0);
  const third = await loaded(3);
  expect(third).not.toBe(second);
  await expect(next).toHaveCount(0);
  await swipe(-110, 0);
  await loaded(3);
  await swipe(110, 0);
  await loaded(2);
  expect(fullRequests.some((url) => url.includes("/3/full.webp"))).toBe(true);
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
]) {
  test(`30.3: viewer native neighbour targets meet minimum size at ${viewport.width}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    const response = await page.goto(`${path}/foto/2`);
    expect(response?.status()).toBe(200);
    for (const [direction, destination] of [
      ["previous", 1],
      ["next", 3],
    ] as const) {
      const link = page.locator(`main a[data-viewer-key="${direction}"]`);
      await expect(link).toHaveAttribute("href", `${path}/foto/${destination}`);
      const box = await link.boundingBox();
      console.log(
        `VIEWER_TARGET ${testInfo.project.name} ${viewport.width} ${direction} ${JSON.stringify(box)}`,
      );
      expect(box?.width, `${direction} width at ${viewport.width}`).toBeGreaterThanOrEqual(44);
      expect(box?.height, `${direction} height at ${viewport.width}`).toBeGreaterThanOrEqual(44);
    }
  });
}

test("30.2: served photo viewer remains immersive without site footer", async ({ page }) => {
  const response = await page.goto(`${path}/foto/1`);
  expect(response?.status()).toBe(200);
  await expect(page.locator("body > footer")).toHaveCount(0);
  await expect(page.locator("main footer")).toHaveCount(1);
});
