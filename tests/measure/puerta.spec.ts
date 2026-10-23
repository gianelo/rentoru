import { expect, test } from "@playwright/test";

/**
 * **Las dos formas de la puerta, medidas y no declaradas** (tasks.md 15.8,
 * láminas 8b y 9b). La lección del precio de la tarjeta: `lint:tokens` salió 0
 * mientras la pantalla más visitada pintaba el número equivocado, porque una
 * hoja puede declarar `var(--door-w)` y apuntar al token de al lado. Lo único
 * que distingue 460 de 420 es el ancho dibujado.
 */
async function panel(page: import("@playwright/test").Page) {
  const box = await page.getByTestId("puerta-panel").boundingBox();
  if (!box) throw new Error("la puerta no dibujó una caja medible");
  return box;
}

test.describe("la puerta de entrar (15.8)", () => {
  test("31.8: narrow door retains native legal links and a reachable no-JS close", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 390, height: 844 },
    });
    try {
      const page = await context.newPage();
      await page.goto("/measure?entrar=si");

      const door = page.getByTestId("puerta-panel");
      await expect(door).toContainText(
        "Al entrar aceptas los términos y la privacidad. Rentoru no participa en el trato: no cobramos comisión, no retenemos pagos y no redactamos contratos.",
      );
      await expect(door.getByRole("link", { name: "términos" })).toHaveAttribute(
        "href",
        "/legal/terminos",
      );
      await expect(door.getByRole("link", { name: "privacidad" })).toHaveAttribute(
        "href",
        "/legal/privacidad",
      );
      await expect(door.getByText("Seguir mirando sin entrar")).toHaveCount(0);

      const close = door.getByRole("link", { name: "Cerrar sin entrar" });
      await expect(close).toHaveAttribute(
        "href",
        "/alquiler/distrito-capital/chacao/apartamento-medida",
      );
      await expect(close).toContainText("×");
      const box = await close.boundingBox();
      expect(box).not.toBeNull();
      if (!box) throw new Error("no measurable close link");
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(390);
      expect(box.y + box.height).toBeLessThanOrEqual(844);
      const dimensions = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
    } finally {
      await context.close();
    }
  });
  test("15.8: a 1280 es un diálogo de 460 px centrado, no una hoja", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/measure?entrar=si");

    const box = await panel(page);
    console.log(`[15.8] escritorio: ancho=${box.width}px x=${box.x}px`);

    expect(box.width).toBe(460);
    // Centrado: (1280 - 460) / 2. Sin esto, un panel de 460 pegado al borde
    // pasaría la primera aserción sin ser el diálogo de la lámina.
    expect(box.x).toBe(410);
    // Y no llega al piso: la hoja de abajo es la forma del móvil.
    expect(box.y + box.height).toBeLessThan(900);
  });

  for (const { width, height } of [
    { width: 390, height: 844 },
    { width: 440, height: 956 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    test(`30.7: puerta medible a ${width}×${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/measure?entrar=si");

      const box = await panel(page);
      console.log(
        `[30.7] ${width}×${height}: x=${box.x}px y=${box.y}px ancho=${box.width}px alto=${box.height}px fondo=${box.y + box.height}px`,
      );

      if (width < 768) {
        expect(box.width).toBe(width);
        expect(box.x).toBe(0);
        expect(Math.round(box.y + box.height)).toBe(height);
        expect(box.y).toBeGreaterThan(0);
      } else {
        expect(box.width).toBe(460);
        expect(box.x).toBe((width - 460) / 2);
        expect(box.y + box.height).toBeLessThan(height);
      }
    });
  }

  test("15.8: a 360 sube desde abajo y deja el aviso a la vista", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/measure?entrar=si");

    const box = await panel(page);
    console.log(`[15.8] móvil: ancho=${box.width}px alto=${box.height}px y=${box.y}px`);

    expect(box.width).toBe(360);
    expect(Math.round(box.y + box.height)).toBe(800);
    // **Lo que la 15.8 pide, en píxeles**: queda pantalla arriba de la hoja, así
    // que el aviso que se estaba leyendo sigue detrás. Una hoja de alto completo
    // sería la pantalla propia que esta tarea existe para no ser.
    expect(box.y).toBeGreaterThan(0);
  });
});
