import type { Page } from "@playwright/test";
import sharp from "sharp";

/** Real image requests only: seeded R2 keys do not exist outside the database. */
export async function serveSeededListingImages(page: Page, listingId: string) {
  const dimensions = {
    strip: { width: 960, height: 540 },
    detail: { width: 720, height: 960 },
    thumb: { width: 320, height: 240 },
  } as const;
  const photoDimensions = [
    dimensions,
    {
      strip: { width: 800, height: 600 },
      detail: { width: 800, height: 600 },
      thumb: { width: 320, height: 240 },
    },
    {
      strip: { width: 600, height: 800 },
      detail: { width: 600, height: 800 },
      thumb: { width: 240, height: 320 },
    },
  ];
  const images = new Map<string, Buffer>();
  for (const [index, variants] of photoDimensions.entries()) {
    for (const [name, { width, height }] of Object.entries(variants)) {
      images.set(
        `${index + 1}/${name}`,
        await sharp({
          create: {
            width,
            height,
            channels: 3,
            background: index === 0 ? "#80a599" : index === 1 ? "#a58099" : "#9980a5",
          },
        })
          .webp()
          .toBuffer(),
      );
    }
  }
  const requested: string[] = [];
  await page.route(`https://fotos-de-prueba.rentas.invalid/e2e/${listingId}/**`, async (route) => {
    const url = new URL(route.request().url());
    const match = url.pathname.match(
      new RegExp(`^/e2e/${listingId}/(?:(2|3)/)?(strip|detail|thumb)\\.webp$`),
    );
    if (!match?.[2]) return route.continue();
    const name = match[2];
    const body = images.get(`${match[1] ?? "1"}/${name}`);
    if (!body) return route.continue();
    requested.push(name);
    await route.fulfill({ status: 200, contentType: "image/webp", body });
  });
  return { dimensions, requested };
}
