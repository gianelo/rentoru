import { expect, type Page, test } from "@playwright/test";

// Fase 41.4: el pie va pegado al fondo. Siempre cierra la página —nada queda
// pintado debajo— y, cuando el contenido es más corto que la pantalla, baja
// hasta el borde inferior en vez de flotar a media altura o de quedar fuera de
// vista empujado por una pantalla que se estira sola.

const ROUTES = [
  "/",
  "/alquiler/distrito-capital",
  "/ayuda/preguntas-frecuentes",
  "/legal/cookies",
  "/signin",
  "/no-existe-esta-pagina",
];

// Contenido corto a 1440 × 900: con el pie al fondo no hay nada que desplazar.
const SHORT_AT_DESKTOP = ["/signin", "/no-existe-esta-pagina"];

async function footerGeometry(page: Page) {
  return page.evaluate(() => {
    // El pie del sitio es el landmark de contenido: la ficha tiene el suyo
    // dentro del aviso.
    const footer = [...document.querySelectorAll("footer")].find(
      (candidate) => !candidate.closest("main, article, section"),
    );
    if (!footer) return null;
    const box = footer.getBoundingClientRect();
    return {
      bottom: Math.round(box.bottom + window.scrollY),
      documentHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
    };
  });
}

for (const width of [390, 1440]) {
  test(`41.4: el pie cierra la página, sin nada debajo, a ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ROUTES) {
      await page.goto(route);
      const footer = await footerGeometry(page);
      expect(footer, `${route}: sin pie del sitio`).not.toBeNull();
      expect(footer?.bottom, `${route}: espacio debajo del pie`).toBe(footer?.documentHeight);
    }
  });
}

test("41.4: con contenido corto el pie queda en el borde inferior de la pantalla", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const route of SHORT_AT_DESKTOP) {
    await page.goto(route);
    const footer = await footerGeometry(page);
    expect(footer?.documentHeight, `${route}: la página se estira de más`).toBe(
      footer?.viewportHeight,
    );
    expect(footer?.bottom, `${route}: el pie no llega al borde`).toBe(footer?.viewportHeight);
  }
});
