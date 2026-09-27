import { expect, test } from "@playwright/test";

const routes = [
  ["terminos", "Términos y condiciones"],
  ["privacidad", "Política de privacidad"],
  ["cookies", "Uso de cookies"],
  ["datos", "Tratamiento de datos"],
  ["normas", "Normas de publicación"],
] as const;
const viewports = [
  { width: 390, height: 840 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
];

for (const viewport of viewports) {
  for (const [route, title] of routes) {
    test(`${route} at ${viewport.width}x${viewport.height} without JavaScript`, async ({
      browser,
    }) => {
      const context = await browser.newContext({ viewport, javaScriptEnabled: false });
      try {
        const page = await context.newPage();
        await page.goto(`/legal/${route}`);
        const article = page.locator("main article");
        await expect(article.getByText(`Legal / ${title}`, { exact: true })).toBeVisible();
        await expect(article.getByRole("heading", { level: 1, name: title })).toBeVisible();
        expect(await article.evaluate((el) => getComputedStyle(el).width)).toBe(
          viewport.width === 390 ? "358px" : "600px",
        );
        const geometry = await article.evaluate((el) => {
          const category = el.querySelector("p");
          const heading = el.querySelector("h1");
          const notice = heading?.nextElementSibling;
          const sections = [...el.querySelectorAll("h2")];
          return {
            order:
              !!category &&
              !!heading &&
              !!notice &&
              category.getBoundingClientRect().bottom <= heading.getBoundingClientRect().top &&
              heading.getBoundingClientRect().bottom <= notice.getBoundingClientRect().top,
            titleSize: heading ? getComputedStyle(heading).fontSize : "",
            tokenSize: getComputedStyle(document.documentElement)
              .getPropertyValue("--title-fs")
              .trim(),
            dividers: sections.every(
              (s) =>
                getComputedStyle(s).borderTopStyle === "solid" &&
                Number.parseFloat(getComputedStyle(s).borderTopWidth) > 0,
            ),
            noticeBackground: notice ? getComputedStyle(notice).backgroundColor : "",
            pageBackground: getComputedStyle(el).backgroundColor,
            categoryColor: category ? getComputedStyle(category).color : "",
            softColor: (() => {
              const sample = document.createElement("span");
              sample.style.color = "var(--soft)";
              el.append(sample);
              const color = getComputedStyle(sample).color;
              sample.remove();
              return color;
            })(),
            categoryWeight: category ? getComputedStyle(category).fontWeight : "",
            categoryGap: category ? getComputedStyle(category).marginBottom : "",
            titleGap: heading ? getComputedStyle(heading).marginBottom : "",
            headingPadding: sections[0] ? getComputedStyle(sections[0]).paddingTop : "",
            noticePadding: notice ? getComputedStyle(notice).paddingTop : "",
            noticeGap: notice ? getComputedStyle(notice).marginBottom : "",
            pagePaddingTop: getComputedStyle(el.closest("main") ?? el).paddingTop,
            pagePaddingBottom: getComputedStyle(el.closest("main") ?? el).paddingBottom,
            overflow: document.documentElement.scrollWidth > innerWidth,
          };
        });
        expect(geometry.order).toBe(true);
        expect(geometry.titleSize).toBe(geometry.tokenSize);
        expect(geometry.dividers).toBe(true);
        expect(geometry.noticeBackground).toBe("rgba(0, 0, 0, 0)");
        expect(geometry.overflow).toBe(false);
        expect(geometry.categoryColor).toBe(geometry.softColor);
        expect(geometry.categoryWeight).toBe("600");
        expect(geometry.categoryGap).toBe("12px");
        expect(geometry.titleGap).toBe("24px");
        expect(geometry.headingPadding).toBe("20px");
        expect(geometry.noticePadding).toBe("16px");
        expect(geometry.noticeGap).toBe("24px");
        expect(geometry.pagePaddingTop).toBe(viewport.width === 390 ? "32px" : "48px");
        if (viewport.width === 390) {
          const final = article.locator(":scope > :last-child");
          await final.evaluate((element) => {
            const dock = document.querySelector('nav[aria-label="Navegación principal"]');
            if (!dock) throw new Error("Missing mobile dock");
            const item = element.getBoundingClientRect();
            const dockTop = dock.getBoundingClientRect().top;
            window.scrollTo(0, window.scrollY + item.bottom - dockTop + 8);
          });
          const visible = await final.evaluate((element) => {
            const box = element.getBoundingClientRect();
            const dock = document
              .querySelector('nav[aria-label="Navegación principal"]')
              ?.getBoundingClientRect();
            const top = document.elementFromPoint(
              box.left + box.width / 2,
              box.top + box.height / 2,
            );
            return {
              above: Boolean(dock && box.bottom <= dock.top && box.top >= 0),
              hit: top === element || element.contains(top),
            };
          });
          expect(visible.above).toBe(true);
          expect(visible.hit).toBe(true);
        }
        expect(geometry.pagePaddingBottom).toBe(viewport.width === 390 ? "120px" : "80px");
        for (const link of await page.locator("nav a:visible").all()) {
          expect((await link.boundingBox())?.height).toBeGreaterThanOrEqual(44);
        }
      } finally {
        await context.close();
      }
    });
  }
}
