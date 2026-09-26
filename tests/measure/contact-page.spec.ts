import { expect, test } from "@playwright/test";

const states = [
  { suffix: "", kind: "normal" },
  { suffix: "?enviado", kind: "sent" },
  { suffix: "?error", kind: "error" },
] as const;
const viewports = [
  { width: 390, height: 840 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
];

for (const viewport of viewports) {
  for (const state of states) {
    test(`Escribinos ${state.kind} at ${viewport.width}x${viewport.height} without JS`, async ({
      browser,
    }) => {
      const context = await browser.newContext({ viewport, javaScriptEnabled: false });
      try {
        const page = await context.newPage();
        await page.goto(`/ayuda/escribinos${state.suffix}`);
        const article = page.locator("main article");
        await expect(article.getByRole("heading", { level: 1, name: "Escribinos" })).toBeVisible();
        const form = article.locator("form");
        const receipt = article.getByText("Recibimos tu mensaje", { exact: false });
        const error = article.getByRole("alert");
        if (state.kind === "sent") {
          await expect(receipt).toBeVisible();
          await expect(form).toHaveCount(0);
          await expect(error).toHaveCount(0);
        } else {
          await expect(form).toBeVisible();
          await expect(receipt).toHaveCount(0);
          if (state.kind === "error") await expect(error).toBeVisible();
          else await expect(error).toHaveCount(0);
          for (const name of ["name", "email", "message"]) {
            const field = form.locator(`[name="${name}"]`);
            await expect(field).toHaveAttribute("required", "");
            expect((await field.boundingBox())?.height).toBeGreaterThanOrEqual(44);
          }
          expect(
            (await form.getByRole("button", { name: "Enviar mensaje" }).boundingBox())?.height,
          ).toBeGreaterThanOrEqual(44);
        }
        const geometry = await article.evaluate((el) => {
          const category = el.querySelector("p");
          const heading = el.querySelector("h1");
          const intro = heading?.nextElementSibling;
          const sample = document.createElement("span");
          sample.style.color = "var(--soft)";
          el.append(sample);
          const soft = getComputedStyle(sample).color;
          sample.remove();
          return {
            category: category?.textContent,
            color: category ? getComputedStyle(category).color : "",
            soft,
            weight: category ? getComputedStyle(category).fontWeight : "",
            titleSize: heading ? getComputedStyle(heading).fontSize : "",
            tokenSize: getComputedStyle(document.documentElement)
              .getPropertyValue("--title-fs")
              .trim(),
            width: getComputedStyle(el).width,
            order: Boolean(
              category &&
                heading &&
                intro &&
                category.getBoundingClientRect().bottom <= heading.getBoundingClientRect().top &&
                heading.getBoundingClientRect().bottom <= intro.getBoundingClientRect().top,
            ),
            overflow: document.documentElement.scrollWidth > innerWidth,
          };
        });
        expect(geometry).toMatchObject({
          category: "Ayuda / Escribinos",
          color: geometry.soft,
          weight: "600",
          titleSize: geometry.tokenSize,
          width: viewport.width === 390 ? "358px" : "600px",
          order: true,
          overflow: false,
        });
        if (viewport.width === 390) {
          const final =
            state.kind === "sent" ? receipt : form.getByRole("button", { name: "Enviar mensaje" });
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
          const reachable = await final.evaluate((element) => {
            const box = element.getBoundingClientRect();
            const dock = document
              .querySelector('nav[aria-label="Navegación principal"]')
              ?.getBoundingClientRect();
            const hit = document.elementFromPoint(
              box.left + box.width / 2,
              box.top + box.height / 2,
            );
            return Boolean(
              dock &&
                box.top >= 0 &&
                box.bottom <= dock.top &&
                (hit === element || element.contains(hit)),
            );
          });
          expect(reachable).toBe(true);
        }
      } finally {
        await context.close();
      }
    });
  }
}
