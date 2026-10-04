import { writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const viewports = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
];
const variants = ["anonymous", "authenticated", "zone", "filters", "mobile-only", "no-pill"];
const artifactPrefix = process.env.F364_ARTIFACT_PREFIX ?? "f364";
if (!/^f364(?:-[a-zA-Z0-9_-]+)?$/.test(artifactPrefix))
  throw new Error("F364_ARTIFACT_PREFIX debe ser un prefijo f364 sin rutas");

for (const viewport of viewports) {
  for (const javaScriptEnabled of [true, false]) {
    test(`Nav ${viewport.width} ${javaScriptEnabled ? "JS" : "sin JS"}: ancho, centro y contratos`, async ({
      browser,
    }, testInfo) => {
      const baseURL = testInfo.project.use.baseURL;
      if (!baseURL) throw new Error("El runner debe configurar baseURL loopback");
      const destination = new URL(baseURL);
      if (
        !["http:", "https:"].includes(destination.protocol) ||
        !["127.0.0.1", "localhost", "[::1]"].includes(destination.hostname) ||
        destination.username ||
        destination.password
      )
        throw new Error("baseURL debe ser HTTP(S) loopback sin credenciales");
      const origin = destination.origin;
      const fixtureURL = new URL("/measure/nav", origin).href;
      const context = await browser.newContext({
        viewport,
        javaScriptEnabled,
        serviceWorkers: "block",
      });
      const refused: string[] = [];
      await context.route("**/*", (route) => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.origin !== origin || request.method() !== "GET") {
          refused.push(`${request.method()} ${url.origin}`);
          return route.abort();
        }
        // AppLink puede precargar destinos reales: sólo la fixture y sus
        // assets llegan al servidor, nunca inicio, sesión ni publicación.
        if (url.pathname !== "/measure/nav" && !url.pathname.startsWith("/_next/"))
          return route.abort();
        return route.continue();
      });
      try {
        const page = await context.newPage();
        const response = await page.goto(fixtureURL);
        expect(response?.status()).toBe(200);
        await expect(page.getByTestId("nav-anonymous").locator("form")).toBeVisible();
        const boxes = await page.evaluate(
          (names) =>
            Object.fromEntries(
              names.map((name) => {
                const root = document.querySelector(`[data-testid="nav-${name}"]`);
                if (!root) throw new Error(`Missing ${name}`);
                const box = (element: Element | null) => {
                  if (!element?.getClientRects().length) return null;
                  const { x, y, width, height } = element.getBoundingClientRect();
                  return { x, y, width, height };
                };
                const header = root.querySelector("header");
                return [
                  name,
                  {
                    header: box(header),
                    search: box(root.querySelector("search")),
                    form: box(root.querySelector("search form")),
                    brand: box(header?.querySelector("a") ?? null),
                    actions: Array.from(
                      header?.querySelectorAll(":scope > div > div:last-child a") ?? [],
                    )
                      .map(box)
                      .filter((value) => value !== null),
                  },
                ];
              }),
            ),
          variants,
        );
        const artifact = `test-results/${artifactPrefix}-boxes-after-${viewport.width}-${javaScriptEnabled ? "js" : "nojs"}.json`;
        writeFileSync(artifact, JSON.stringify(boxes, null, 2));
        await testInfo.attach("geometría", { path: artifact, contentType: "application/json" });
        if (javaScriptEnabled)
          await page.screenshot({
            path: `test-results/${artifactPrefix}-nav-after-${viewport.width}.png`,
          });

        for (const variant of variants) {
          const root = page.getByTestId(`nav-${variant}`);
          const data = boxes[variant];
          if (!data) throw new Error(`Missing geometry for ${variant}`);
          if (variant === "no-pill" || (variant === "mobile-only" && viewport.width >= 768)) {
            expect(data.form).toBeNull();
            if (viewport.width >= 768) {
              expect(data.brand?.width).toBe(250);
              expect(data.header?.height).toBe(69);
              for (const action of data.actions) expect(action.height).toBe(40);
            }
          } else {
            await expect(root.locator("form")).toHaveAttribute("method", "get");
            await expect(root.locator("form")).toHaveAttribute("action", "/measure/nav");
            await expect(root.locator("input")).toHaveAttribute("name", "q");
            await expect(root.getByRole("button", { name: "Buscar", exact: true })).toHaveAttribute(
              "type",
              "submit",
            );
            expect(data.form).not.toBeNull();
            expect(data.search?.width).toBeCloseTo(data.form?.width ?? 0, 0);
            const form = data.form;
            if (!form) throw new Error(`Missing visible form for ${variant}`);
            expect
              .soft(form.x + form.width / 2, `${variant}: centro`)
              .toBeCloseTo(viewport.width / 2, 0);
            if (viewport.width === 390)
              expect.soft(form.width, `${variant}: móvil fluido`).toBeCloseTo(358, 0);
            if (viewport.width === 768)
              expect
                .soft(form.width, `${variant}: tablet 768, centro exacto aprobado`)
                .toBeCloseTo(232, 0);
            if (viewport.width === 1440)
              expect.soft(form.width, `${variant}: desktop 420`).toBeCloseTo(420, 0);
            expect(form.height).toBeGreaterThanOrEqual(44);
            if (viewport.width >= 768) {
              expect(data.brand).not.toBeNull();
              if (!data.brand) throw new Error(`Missing brand for ${variant}`);
              expect(data.brand.x + data.brand.width).toBeLessThanOrEqual(form.x);
              for (const action of data.actions)
                expect(action.x).toBeGreaterThanOrEqual(form.x + form.width);
            }
          }
          if (viewport.width >= 768) {
            expect(data.actions.length).toBe(2);
            for (const action of data.actions) {
              expect
                .soft(action.height, `${variant}: target de acción`)
                .toBeGreaterThanOrEqual(
                  variant === "no-pill" || variant === "mobile-only" ? 40 : 44,
                );
              expect(action.width).toBeGreaterThanOrEqual(44);
              expect(action.x + action.width).toBeLessThanOrEqual(viewport.width);
            }
          }
          if (variant === "zone" || variant === "filters") {
            await expect(root.locator("input")).toHaveValue("Chacao");
            await expect(root.locator("search")).toContainText("12 avisos");
            await expect(root.locator("[data-search-filter-trigger]")).toHaveAttribute(
              "href",
              "/measure/nav?panel=filtros",
            );
            await expect(root.locator("[data-search-filter-trigger]")).toHaveAccessibleName(
              variant === "zone" ? "Filtros" : "3 filtros",
            );
          }
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
          viewport.width,
        );
        if (javaScriptEnabled) {
          const input = page.getByTestId("nav-anonymous").locator("input");
          await input.focus();
          await expect(input).toBeFocused();
          await page.keyboard.press("Tab");
          await expect(
            page.getByTestId("nav-anonymous").getByRole("button", { name: "Buscar", exact: true }),
          ).toBeFocused();
          await page.keyboard.press("Shift+Tab");
          await expect(input).toBeFocused();
          await input.fill("Chacao");
          await expect(
            page.getByTestId("nav-anonymous").locator("[data-search-suggestions] ul"),
          ).toBeVisible();
        }
        expect(refused).toEqual([]);
      } finally {
        await context.close();
      }
    });
  }
}
