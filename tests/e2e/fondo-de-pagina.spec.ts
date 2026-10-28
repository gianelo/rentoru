import { expect, type Page, test } from "@playwright/test";

// Fase 41 (G1/G2): la página es blanca lisa en todas las pantallas y sólo el
// pie conserva su azulado, con un rol propio. Se mide el color que de verdad
// queda pintado detrás del contenido, como en la 41.1, y no el texto de una
// hoja: una pantalla que vuelva a pintar su fondo a pantalla completa con otro
// valor sólo se ve en el navegador.

const PUBLIC_ROUTES = [
  "/",
  "/alquiler/distrito-capital",
  "/ayuda/preguntas-frecuentes",
  "/legal/terminos",
  "/signin",
  "/no-existe-esta-pagina",
];

async function paintedBackgrounds(page: Page) {
  return page.evaluate(() => {
    const resolve = (token: string) => {
      const probe = document.createElement("div");
      probe.style.backgroundColor = `var(${token})`;
      document.body.append(probe);
      const color = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return color;
    };
    const painterAt = (x: number, y: number) => {
      let element = document.elementFromPoint(x, y);
      while (element) {
        const color = getComputedStyle(element).backgroundColor;
        if (color !== "rgba(0, 0, 0, 0)") return color;
        element = element.parentElement;
      }
      return getComputedStyle(document.documentElement).backgroundColor;
    };
    // El pie del sitio es el landmark de contenido: un `footer` fuera de
    // `main`, `article` y `section`. La ficha tiene el suyo dentro del aviso.
    const footer =
      [...document.querySelectorAll("footer")].find(
        (candidate) => !candidate.closest("main, article, section"),
      ) ?? null;
    // En una página corta (el 404) el 40 % del alto cae dentro del pie, que
    // es la excepción: se mide justo encima de él.
    const footerTop = footer ? footer.getBoundingClientRect().top : Number.POSITIVE_INFINITY;
    return {
      page: resolve("--page"),
      footerRole: resolve("--footer-bg"),
      gutter: painterAt(4, Math.min(window.innerHeight * 0.4, footerTop - 4)),
      footer: footer ? getComputedStyle(footer).backgroundColor : null,
    };
  });
}

async function firstListingPath(page: Page) {
  await page.goto("/alquiler/distrito-capital");
  const href = await page
    .locator('a[href^="/alquiler/distrito-capital/"][href*="-"]')
    .first()
    .getAttribute("href");
  if (!href) throw new Error("Seeded listing missing from Distrito Capital");
  return href.split("?")[0] ?? href;
}

for (const width of [390, 1440]) {
  test(`41.3: el fondo pintado es --page y el pie es --footer-bg a ${width} px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const routes = [...PUBLIC_ROUTES, await firstListingPath(page)];
    for (const route of routes) {
      await page.goto(route);
      const painted = await paintedBackgrounds(page);
      expect(painted.page, `${route}: --page sin declarar`).not.toBe("rgba(0, 0, 0, 0)");
      expect(painted.gutter, `${route}: fondo detrás del contenido`).toBe(painted.page);
      if (painted.footer !== null) {
        expect(painted.footer, `${route}: fondo del pie`).toBe(painted.footerRole);
      }
    }
  });
}
