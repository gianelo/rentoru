import type { Page } from "@playwright/test";
import sharp from "sharp";

/** Real image requests only: seeded R2 keys do not exist outside the database. */
export async function serveSeededListingImages(page: Page, listingId: string) {
  const dimensions = {
    strip: { width: 960, height: 540 },
    detail: { width: 720, height: 960 },
    thumb: { width: 320, height: 240 },
  } as const;
  const bytes = await Promise.all(
    Object.values(dimensions).map(({ width, height }) =>
      sharp({ create: { width, height, channels: 3, background: "#80a599" } })
        .webp()
        .toBuffer(),
    ),
  );
  const images = Object.fromEntries(Object.keys(dimensions).map((name, i) => [name, bytes[i]]));
  const requested: string[] = [];
  await page.route(`https://fotos-de-prueba.rentas.invalid/e2e/${listingId}/*`, async (route) => {
    const url = new URL(route.request().url());
    const name = url.pathname.split("/").at(-1)?.replace(".webp", "");
    const body = name && images[name];
    if (!body) return route.continue();
    requested.push(name);
    await route.fulfill({ status: 200, contentType: "image/webp", body });
  });
  return { dimensions, requested };
}
