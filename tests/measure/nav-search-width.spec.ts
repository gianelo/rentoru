import { writeFileSync } from "node:fs";
import { type ConsoleMessage, expect, test } from "@playwright/test";

function measureDiagnosticPath(url: URL): string {
  const allowed = [
    "/",
    "/measure/nav",
    "/__nextjs_original-stack-frames",
    "/__nextjs_error_feedback",
  ];
  if (allowed.includes(url.pathname)) return url.pathname;
  return url.pathname.startsWith("/_next/") ? "/_next/*" : "other";
}

function measureDiagnosticError(message: string): string {
  if (/hydration|hydrating|did not match/i.test(message)) return "hydration";
  if (/chunkload|loading chunk/i.test(message)) return "chunk";
  return /failed to fetch|network|net::/i.test(message) ? "network" : "other";
}

test("Nav diagnóstico: clasifica rutas y errores sin datos sensibles", () => {
  expect(
    [
      "http://127.0.0.1:3100/measure/nav?token=private",
      "http://user:private@127.0.0.1:3100/__nextjs_original-stack-frames?token=private",
      "http://127.0.0.1:3100/_next/private.js?token=private",
      "http://127.0.0.1:3100/private/token",
    ].map((url) => measureDiagnosticPath(new URL(url))),
  ).toEqual(["/measure/nav", "/__nextjs_original-stack-frames", "/_next/*", "other"]);
  expect(
    [
      "Hydration failed: private cookie",
      "ChunkLoadError: private URL",
      "Failed to fetch https://user:private@example.invalid",
      "Private body and cookie",
    ].map(measureDiagnosticError),
  ).toEqual(["hydration", "chunk", "network", "other"]);
});

function measureHydrationSummary(message: string): {
  kind: "attribute" | "tree" | "text" | "nesting" | "unknown";
  diffPresent: boolean;
  ancestry: string[];
  differingHost: string;
  differingAttribute: string;
} {
  const result: ReturnType<typeof measureHydrationSummary> = {
    kind: "unknown",
    diffPresent: false,
    ancestry: [],
    differingHost: "unknown",
    differingAttribute: "unknown",
  };
  const bounded = message.slice(0, 16000);
  const link = "https://react.dev/link/hydration-mismatch";
  const linkIndex = bounded.indexOf(link);
  const nesting = linkIndex < 0 && /In HTML,[\s\S]*This will cause a hydration error/.test(bounded);
  const separator = nesting ? bounded.indexOf("\n\n") : -1;
  const suffix =
    linkIndex >= 0
      ? bounded.slice(linkIndex + link.length)
      : separator >= 0
        ? bounded.slice(separator + 2)
        : "";
  const components =
    "Nav SearchPill AppLink AccountMenu NavDockScrollBehavior NavigationEntryBoundary SearchSuggestions SearchFilterModal".split(
      " ",
    );
  const hosts =
    "html body header nav div search form input button a span p label ul li dialog svg path main section".split(
      " ",
    );
  const attributes =
    "className id inert aria-expanded href aria-controls aria-describedby role style aria-hidden aria-label tabIndex type name value hidden disabled method action".split(
      " ",
    );
  let host = "unknown";
  for (const line of suffix.split("\n", 160)) {
    const tag = line.match(/^\s*(?:[+\->]\s*)?<([\w-]+)(?=[\s/>]|$)/)?.[1];
    if (tag && /^[a-z]/.test(tag)) host = hosts.includes(tag) ? tag : "unknown";
    if (tag && !/^\s*[+-]/.test(line) && components.includes(tag) && result.ancestry.length < 12)
      result.ancestry.push(tag);
    const change = line.match(/^\s*([+-])\s*(\S.*)$/);
    const nestingHost = nesting && /^\s*>\s*</.test(line);
    if ((!change && !nestingHost) || result.diffPresent) continue;
    result.diffPresent = true;
    result.differingHost = host;
    const attribute = change?.[2]?.match(/^([\w-]+)\s*=/)?.[1];
    result.kind = nesting ? "nesting" : attribute ? "attribute" : tag ? "tree" : "text";
    if (attribute) result.differingAttribute = attributes.includes(attribute) ? attribute : "other";
  }
  if (!result.diffPresent) result.ancestry = [];
  return result;
}

test("Nav diagnóstico: reconoce diff React sin exportar valores privados", () => {
  const prefix =
    "A tree hydrated but some attributes didn't match. window Date.now Math.random invalid HTML nesting Nav className https://react.dev/link/hydration-mismatch";
  const summary = (diff: string) => measureHydrationSummary(`${prefix}\n\n${diff}`);
  expect(
    summary(
      ' %s %s\n <Nav>\n <SearchPill>\n <form\n+ className="private-token"\n- className="private-cookie"',
    ),
  ).toEqual({
    kind: "attribute",
    diffPresent: true,
    ancestry: ["Nav", "SearchPill"],
    differingHost: "form",
    differingAttribute: "className",
  });
  expect(summary(' <Nav>\n <div>\n+ <span secret="private">\n- <p>')).toEqual({
    kind: "tree",
    diffPresent: true,
    ancestry: ["Nav"],
    differingHost: "span",
    differingAttribute: "unknown",
  });
  expect(summary(" <SearchPill>\n <button>\n+ private-user\n- private-cookie")).toEqual({
    kind: "text",
    diffPresent: true,
    ancestry: ["SearchPill"],
    differingHost: "button",
    differingAttribute: "unknown",
  });
  expect(
    measureHydrationSummary(
      "In HTML, %s cannot be a descendant of <%s>.\nThis will cause a hydration error.%s p div\n\n <Nav>\n <p>\n> <div>",
    ),
  ).toEqual({
    kind: "nesting",
    diffPresent: true,
    ancestry: ["Nav"],
    differingHost: "div",
    differingAttribute: "unknown",
  });
});

test("Nav diagnóstico: ignora boilerplate y acota nombres y entrada", () => {
  const empty = {
    kind: "unknown",
    diffPresent: false,
    ancestry: [],
    differingHost: "unknown",
    differingAttribute: "unknown",
  };
  const link = "https://react.dev/link/hydration-mismatch";
  expect(
    measureHydrationSummary(
      `Nav className window Date.now Math.random invalid HTML nesting ${link}`,
    ),
  ).toEqual(empty);
  expect(measureHydrationSummary("hydration private stack <Nav> + id=private")).toEqual(empty);
  expect(measureHydrationSummary(`${link}\n <Nav>`)).toEqual(empty);
  expect(
    measureHydrationSummary(
      `${link}\n <PrivateUser>\n <private-tag>\n+ private-attribute="secret"\n${" <PrivateUser>\n".repeat(300)}`,
    ),
  ).toEqual({ ...empty, kind: "attribute", diffPresent: true, differingAttribute: "other" });
  expect(
    measureHydrationSummary(`${link}\n${" <Nav>\n".repeat(20)} <input>\n+ id="secret"`),
  ).toEqual({
    ...empty,
    kind: "attribute",
    diffPresent: true,
    ancestry: Array(12).fill("Nav"),
    differingHost: "input",
    differingAttribute: "id",
  });
  expect(measureHydrationSummary(`${link}\n${" ".repeat(16000)}\n+ id="secret"`)).toEqual(empty);
  expect(measureHydrationSummary(`${link}\n${"\n".repeat(160)}+ id="secret"`)).toEqual(empty);
});

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
      const blocked: { method: string; origin: string; path: string }[] = [];
      const errors = new Set<string>();
      const hydration: ReturnType<typeof measureHydrationSummary>[] = [];
      const recordError = (source: "page" | "console", message: string) => {
        const category = measureDiagnosticError(message);
        errors.add(`${source}:${category}`);
        if (category === "hydration" && hydration.length < 4)
          hydration.push(measureHydrationSummary(message));
      };
      let detachDiagnostics = () => {};
      await context.route("**/*", (route) => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.origin !== origin || request.method() !== "GET") {
          refused.push(`${request.method()} ${url.origin}`);
          if (blocked.length < 8)
            blocked.push({
              method: request.method() === "POST" ? "POST" : "other",
              origin: url.origin === origin ? "same-origin" : "external",
              path: measureDiagnosticPath(url),
            });
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
        const onPageError = (error: Error) => recordError("page", error.message);
        const onConsole = (message: ConsoleMessage) => {
          if (message.type() === "error") recordError("console", message.text());
        };
        page.on("pageerror", onPageError);
        page.on("console", onConsole);
        detachDiagnostics = () => {
          page.off("pageerror", onPageError);
          page.off("console", onConsole);
        };
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
            // No hay foco aún: ocultar el caret mutaría style antes de hidratar.
            caret: "initial",
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
      } catch (error) {
        try {
          console.log(
            JSON.stringify({
              F365_NAV_MEASURE_DIAGNOSTIC: { blocked, errors: [...errors], hydration },
            }),
          );
        } catch {
          // Diagnostic output must never replace the original assertion error.
        }
        throw error;
      } finally {
        detachDiagnostics();
        await context.close();
      }
    });
  }
}
