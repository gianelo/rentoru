import { expect, test } from "@playwright/test";
import pg from "pg";

// Use a parent-owned synthetic session; never a production account or destructive seed.
test("native save preserves later answers; discard makes no request or write", async ({
  page,
}, info) => {
  const connectionString = process.env.TEST_DATABASE_URL;
  test.skip(
    info.project.name !== "crawlability" || !connectionString,
    "Requires JS-off and the owned fixture DB",
  );
  const target = new URL(connectionString ?? "");
  expect([target.hostname, target.port, target.pathname]).toEqual([
    "127.0.0.1",
    "55443",
    "/f3617_review",
  ]);
  const pool = new pg.Pool({ connectionString });
  try {
    await page.goto("/publicar/revisar");
    const session = await (await page.request.get("/api/auth/session")).json();
    expect(session.user.email).toMatch(/^f3617-[0-9a-f-]+@example\.invalid$/);
    const snapshot = async () =>
      (
        await pool.query(
          'select d.answers, d.photos, d.expires_at from publish_draft d join "user" u on u.id=d.publisher_id where u.email=$1',
          [session.user.email],
        )
      ).rows[0];
    const before = await snapshot();
    const rooms = before.answers.listing.rooms;
    await page.getByRole("link", { name: "Cambiar Tamaño", exact: true }).click();
    await page.locator('[name="rooms"]').fill(String(rooms + 1));
    const [saved] = await Promise.all([
      page.waitForResponse((response) => response.request().method() === "POST"),
      page.getByRole("button", { name: "Guardar y volver a revisar", exact: true }).click(),
    ]);
    expect(saved.status()).toBe(303);
    await expect(page).toHaveURL(/\/publicar\/revisar\?/);
    await expect(page.getByRole("status")).toContainText(
      `Cambiaste habitaciones de ${rooms} a ${rooms + 1}.`,
    );
    const after = await snapshot();
    expect({ ...after.answers.listing, rooms }).toEqual(before.answers.listing);
    expect(after.photos).toEqual(before.photos);
    expect(after.answers.featuresDeclared).toBe(before.answers.featuresDeclared);
    let posts = 0;
    page.on("request", (request) => {
      if (request.method() === "POST") posts++;
    });
    await page.getByRole("link", { name: "Cambiar Tamaño", exact: true }).click();
    await page.locator('[name="rooms"]').fill(String(rooms + 2));
    await page.getByRole("link", { name: /Descartar/ }).click();
    await expect(page).toHaveURL(/\/publicar\/revisar$/);
    expect(posts).toBe(0);
    expect(await snapshot()).toEqual(after);
  } finally {
    await pool.end();
  }
});

const state = process.env.REVIEW_STORAGE_STATE;
test.use({ storageState: state });
test.skip(!state, "Requires REVIEW_STORAGE_STATE and the task-served synthetic draft");

for (const [width, height] of [
  [390, 844],
  [440, 956],
  [768, 1024],
  [1440, 900],
] as const) {
  test(`approved review composition at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const response = await page.goto("/publicar/revisar?campo=rooms&antes=1&ahora=2");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Revisa tu aviso" })).toBeVisible();
    const geometry = await page.locator("main").evaluate((main) => {
      const box = (element: Element | null) => {
        if (!element) throw new Error("Missing review row markup");
        return element.getBoundingClientRect().toJSON();
      };
      return {
        main: box(main),
        overflow: document.documentElement.scrollWidth - innerWidth,
        rows: [...main.querySelectorAll("dl > div")].map((row) => ({
          row: box(row),
          term: box(row.querySelector("dt")),
          value: box(row.querySelector("dd")),
          change: box(row.querySelector("a")),
        })),
      };
    });
    expect(geometry.overflow).toBe(0);
    expect(geometry.main.width).toBe(Math.min(width, 1100) - (width < 768 ? 32 : 48));
    expect(Math.abs(geometry.main.x + geometry.main.width / 2 - width / 2)).toBeLessThanOrEqual(1);
    expect(geometry.rows).toHaveLength(7);
    for (const { row, term, value, change } of geometry.rows) {
      expect(change.width).toBeGreaterThanOrEqual(44);
      expect(change.height).toBeGreaterThanOrEqual(44);
      expect(value.x).toBeGreaterThanOrEqual(row.x);
      expect(value.right).toBeLessThanOrEqual(row.right + 1);
      if (width < 768) {
        expect(
          Math.abs(term.y + term.height / 2 - change.y - change.height / 2),
        ).toBeLessThanOrEqual(1);
        expect(change.x - term.right).toBe(16);
        expect(value.y).toBeGreaterThanOrEqual(change.bottom);
      } else {
        expect(change.right).toBe(row.right);
        if (width < 1100) expect(value.x).toBe(row.x);
        else expect(value.x).toBe(term.x + 184);
      }
    }
    await expect(page.getByRole("status")).toContainText("Cambiaste habitaciones de 1 a 2.");
    expect(await page.locator("main form").evaluate((form: HTMLFormElement) => form.method)).toBe(
      "post",
    );
    const photos = page.locator("main ol img");
    await expect(photos).toHaveCount(3);
    expect(
      await photos.evaluateAll((images) =>
        images.every(
          (image) =>
            (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0,
        ),
      ),
    ).toBe(true);
    for (const step of ["tipo", "precio", "tamano", "atributos", "descripcion", "fotos", "quien"]) {
      await expect(page.locator(`a[href="/publicar/paso/${step}?volver=revisar"]`)).toBeVisible();
    }
    for (let index = 0; index < 11; index++) {
      await page.keyboard.press("Tab");
      expect(
        await page.evaluate(() => {
          const active = document.activeElement;
          return (
            active?.matches("a, button") &&
            Number.parseFloat(getComputedStyle(active).outlineWidth) >= 2
          );
        }),
      ).toBe(true);
    }
  });
}
