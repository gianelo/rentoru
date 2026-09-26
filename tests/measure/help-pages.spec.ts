import { expect, test } from "@playwright/test";

const routes = [
  ["preguntas-frecuentes", "Preguntas frecuentes", "Entre 1 y 6 fotos por aviso."],
  ["como-contactar-al-dueno", "Cómo contactar al dueño", "antes de entregar dinero."],
  ["como-publicar-un-aviso", "Cómo publicar un aviso", "«Mis avisos»."],
  ["como-reportar-un-aviso", "Cómo reportar un aviso", "Escribinos"],
] as const;
const viewports = [
  { width: 390, height: 840 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
];

for (const viewport of viewports) {
  for (const [route, title, finalText] of routes) {
    test(`${route} at ${viewport.width}x${viewport.height} without JavaScript`, async ({
      browser,
    }) => {
      const context = await browser.newContext({ viewport, javaScriptEnabled: false });
      try {
        const page = await context.newPage();
        await page.goto(`/ayuda/${route}`);
        const article = page.locator("main article");
        if (route === "preguntas-frecuentes") {
          const link = article.getByRole("link", { name: "Cómo contactar al dueño" });
          await expect(link).toBeVisible();
          const colors = await link.evaluate((element) => ({
            actual: getComputedStyle(element).color,
            accent: (() => {
              const sample = document.createElement("span");
              sample.style.color = "var(--accent)";
              element.append(sample);
              const color = getComputedStyle(sample).color;
              sample.remove();
              return color;
            })(),
          }));
          expect(colors.actual).toBe(colors.accent);
          await expect(link).toHaveCSS("text-decoration-line", "underline");
          await expect(link).toHaveCSS("text-underline-offset", "3px");
        }
        const final = article.locator(":scope > :last-child");
        await expect(final).toContainText(finalText);
        const geometry = await article.evaluate((el) => {
          const category = el.querySelector("p");
          const title = el.querySelector("h1");
          const sections = [...el.querySelectorAll("h2")];
          const sample = document.createElement("span");
          sample.style.color = "var(--soft)";
          el.append(sample);
          const soft = getComputedStyle(sample).color;
          sample.remove();
          return {
            width: getComputedStyle(el).width,
            categoryText: category?.textContent,
            categoryBeforeTitle: Boolean(
              category &&
                title &&
                category.getBoundingClientRect().bottom <= title.getBoundingClientRect().top,
            ),
            categoryColor: category ? getComputedStyle(category).color : "",
            soft,
            categoryWeight: category ? getComputedStyle(category).fontWeight : "",
            categoryGap: category ? getComputedStyle(category).marginBottom : "",
            titleSize: title ? getComputedStyle(title).fontSize : "",
            titleWeight: title ? getComputedStyle(title).fontWeight : "",
            titleLineHeight: title ? getComputedStyle(title).lineHeight : "",
            titleGap: title ? getComputedStyle(title).marginBottom : "",
            tokenSize: getComputedStyle(document.documentElement)
              .getPropertyValue("--title-fs")
              .trim(),
            tokenWeight: getComputedStyle(document.documentElement)
              .getPropertyValue("--title-fw")
              .trim(),
            tokenLineHeight: getComputedStyle(document.documentElement)
              .getPropertyValue("--title-lh")
              .trim(),
            dividers:
              sections.length > 0 &&
              sections.every(
                (s) =>
                  getComputedStyle(s).borderTopStyle === "solid" &&
                  Number.parseFloat(getComputedStyle(s).borderTopWidth) > 0 &&
                  getComputedStyle(s).paddingTop === "20px" &&
                  getComputedStyle(s).marginTop === "24px",
              ),
            top: getComputedStyle(el.closest("main") ?? el).paddingTop,
            bottom: getComputedStyle(el.closest("main") ?? el).paddingBottom,
            overflow: document.documentElement.scrollWidth > innerWidth,
          };
        });
        expect(geometry).toMatchObject({
          width: viewport.width === 390 ? "358px" : "600px",
          categoryText: `Ayuda / ${title}`,
          categoryBeforeTitle: true,
          categoryColor: geometry.soft,
          categoryWeight: "600",
          categoryGap: "12px",
          titleSize: geometry.tokenSize,
          titleWeight: geometry.tokenWeight,
          titleLineHeight: `${Number.parseFloat(geometry.titleSize) * Number.parseFloat(geometry.tokenLineHeight)}px`,
          titleGap: "24px",
          dividers: true,
          top: viewport.width === 390 ? "32px" : "48px",
          bottom: viewport.width === 390 ? "120px" : "80px",
          overflow: false,
        });
        if (viewport.width === 390) {
          await final.evaluate((element) => {
            const dock = document.querySelector('nav[aria-label="Navegación principal"]');
            if (!dock) throw new Error("Missing mobile dock");
            window.scrollTo(
              0,
              window.scrollY +
                element.getBoundingClientRect().bottom -
                dock.getBoundingClientRect().top +
                8,
            );
          });
          const visible = await final.evaluate((element) => {
            const box = element.getBoundingClientRect();
            const dock = document
              .querySelector('nav[aria-label="Navegación principal"]')
              ?.getBoundingClientRect();
            const hit = document.elementFromPoint(
              box.left + box.width / 2,
              box.top + box.height / 2,
            );
            return {
              above: Boolean(dock && box.bottom <= dock.top && box.top >= 0),
              hit: hit === element || element.contains(hit),
            };
          });
          expect(visible).toEqual({ above: true, hit: true });
        }
      } finally {
        await context.close();
      }
    });
  }
}
