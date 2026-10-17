import { type BrowserContext, expect, type Page, type Route, test } from "@playwright/test";

const forbiddenByContext = new WeakMap<BrowserContext, string[]>();
const zoneHandlers = new WeakMap<BrowserContext, (route: Route) => void | Promise<void>>();
function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("missing intercepted query/response");
  return value;
}

const fresh = {
  zoneId: "fresh",
  cityId: "dc",
  label: "Alta Florida",
  scope: "Libertador · Distrito Capital",
};
const homonym = { zoneId: "other", cityId: "mc", label: "Alta Florida", scope: "Maracaibo" };
const long = {
  zoneId: "long",
  cityId: "dc",
  label: "Zona de nombre extraordinariamente largo sin avisos",
  scope: "Distrito Capital",
};
const post = (page: Page) => page.locator('form[method="post"]');
const search = (page: Page) => page.getByRole("searchbox", { name: "Buscá tu zona" });
async function values(page: Page) {
  return post(page).evaluate((form) => {
    const data = new FormData(form as HTMLFormElement);
    return { zones: data.getAll("zoneId"), reference: data.get("reference") };
  });
}
async function ready(page: Page, query = "") {
  await page.goto(`/measure/publication-zone${query}`);
  await expect(page.getByRole("heading", { name: "¿En qué zona queda?" })).toBeVisible();
  await page.waitForLoadState("networkidle");
}
async function json(route: Route, options: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(options) });
}

test.beforeEach(async ({ context, baseURL }) => {
  if (!baseURL) throw new Error("explicit isolated baseURL required");
  const origin = new URL(baseURL).origin;
  const forbidden: string[] = [];
  forbiddenByContext.set(context, forbidden);
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (
      url.origin !== origin ||
      request.method() !== "GET" ||
      !(
        url.pathname === "/measure/publication-zone" ||
        url.pathname === "/publicar/zonas" ||
        url.pathname.startsWith("/_next/") ||
        url.pathname === "/favicon.ico"
      )
    ) {
      forbidden.push(`${request.method()} ${url.origin}${url.pathname}`);
      await route.abort();
      return;
    }
    // Never reach the authenticated real endpoint or its providers.
    if (url.pathname === "/publicar/zonas") {
      const handler = zoneHandlers.get(context);
      if (handler) await handler(route);
      else await json(route, []);
    } else await route.continue();
  });
});
test.afterEach(async ({ context }) => {
  expect(forbiddenByContext.get(context)).toEqual([]);
});

test.describe("native", () => {
  test.use({ javaScriptEnabled: false });

  test("GET/Buscar nativo sirve los mismos radios y referencia sin JavaScript", async ({
    page,
  }) => {
    await ready(page);
    await search(page).fill("alta");
    await page.getByRole("button", { name: "Buscar", exact: true }).click();
    await expect(page).toHaveURL(/\/measure\/publication-zone\?q=alta$/);
    await expect(post(page).getByRole("radio")).toHaveCount(3);
    await expect(post(page)).toContainText("Libertador · Distrito Capital");
    await expect(post(page)).toContainText("Maracaibo");
    await post(page).locator('input[value="fresh"]').check();
    await page.getByLabel("Referencia", { exact: true }).fill("Referencia nativa editada");
    expect(await values(page)).toEqual({
      zones: ["fresh"],
      reference: "Referencia nativa editada",
    });
  });
});

test.describe("spinner native slot", () => {
  test.use({ javaScriptEnabled: true });

  for (const width of [390, 1440]) {
    test(`native clear stays in its historical slot at ${width}px`, async ({ page }, info) => {
      await page.setViewportSize({ width, height: 900 });
      const errors: string[] = [];
      const pageErrors: string[] = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      const held = new Map<string, Route>();
      zoneHandlers.set(page.context(), (route) => {
        held.set(required(new URL(route.request().url()).searchParams.get("q")), route);
      });
      await ready(page, "?q=alta");
      // 3d2b55a: native type=search, .control padding 0 14px, no spinner class.
      // Probe its actual clickable UA slot rather than guessing a pixel offset.
      await search(page).evaluate((input) => {
        const baseline = input.cloneNode() as HTMLInputElement;
        baseline.id = "native-baseline";
        baseline.removeAttribute("name");
        baseline.className = baseline.className
          .split(" ")
          .filter((name) => !name.includes("searchInput"))
          .join(" ");
        baseline.style.cssText = "position:absolute;inset:0;padding:0 14px";
        input.parentElement?.append(baseline);
      });
      const baseline = page.locator("#native-baseline");
      const box = required(await baseline.boundingBox());
      const y = box.y + box.height / 2;
      const hits: number[] = [];
      for (let offset = 10; offset <= 40; offset++) {
        await baseline.fill("alta");
        const x = box.x + box.width - offset;
        await page.mouse.click(x, y);
        if ((await baseline.inputValue()) === "") hits.push(x);
      }
      expect(hits.length).toBeGreaterThan(4);
      const x = (Math.min(...hits) + Math.max(...hits)) / 2;
      await baseline.evaluate((input) => input.remove());
      await search(page).focus();
      await page.screenshot({ path: info.outputPath("idle.png"), caret: "initial" });
      await page.mouse.click(x, y);
      await expect(search(page)).toHaveValue("");
      for (const status of [200, 500]) {
        await page.emulateMedia({ reducedMotion: status === 200 ? "no-preference" : "reduce" });
        const query = `held-${status}`;
        await search(page).fill(query);
        await expect.poll(() => held.has(query)).toBe(true);
        const spinner = search(page).locator("..").locator('[aria-hidden="true"]');
        const center = await spinner.evaluate((node) => {
          const rect = node.getBoundingClientRect();
          return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
        });
        console.log("native-slot", { width, hits, x, y, center });
        expect(Math.abs(center.x - x)).toBeLessThanOrEqual(1);
        expect(Math.abs(center.y - y)).toBeLessThanOrEqual(1);
        await page.mouse.click(x, y);
        await expect(search(page)).toHaveValue(query);
        await page.screenshot({ path: info.outputPath(`busy-${status}.png`), caret: "initial" });
        await json(
          required(held.get(query)),
          status === 200 ? [fresh] : { error: "synthetic" },
          status,
        );
        await expect(search(page)).not.toHaveAttribute("aria-busy", "true");
        await page.mouse.click(x, y);
        await expect(search(page)).toHaveValue("");
      }
      expect(pageErrors).toEqual([]);
      // The deliberately fulfilled HTTP 500 must be the ONLY console error.
      expect(errors).toEqual([
        "Failed to load resource: the server responded with a status of 500 (Internal Server Error)",
      ]);
    });

    for (const reducedMotion of ["no-preference", "reduce"] as const) {
      test(`real temporal rotation ${reducedMotion} at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        let held: Route | undefined;
        zoneHandlers.set(page.context(), (route) => {
          held = route;
        });
        await ready(page);
        const initialReduced = await page.evaluate(
          () => matchMedia("(prefers-reduced-motion: reduce)").matches,
        );
        await page.emulateMedia({ reducedMotion });
        await search(page).fill("motion");
        await expect.poll(() => !!held).toBe(true);
        const spinner = required(
          await search(page).locator("..").locator('[aria-hidden="true"]').elementHandle(),
        );
        // Keep the SAME node and real browser timeline. 250ms is a measurement
        // interval, not a readiness sleep or a multiple of the 1.2s rotation.
        const samples = await spinner.evaluate(async (node) => {
          const sample = () => {
            const matrix = new DOMMatrix(getComputedStyle(node).transform);
            const animation = node.getAnimations()[0];
            const rect = node.getBoundingClientRect();
            return {
              timestamp: performance.now(),
              angle: (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI,
              time: Number(animation?.currentTime ?? 0),
              state: animation?.playState,
              duration: animation?.effect?.getTiming().duration,
              centerX: rect.x + rect.width / 2,
              connected: node.isConnected,
            };
          };
          const first = sample();
          await new Promise<void>((resolve) => {
            const tick = () =>
              performance.now() - first.timestamp >= 250 ? resolve() : requestAnimationFrame(tick);
            requestAnimationFrame(tick);
          });
          return [first, sample()] as const;
        });
        console.log("temporal-motion", { width, reducedMotion, initialReduced, samples });
        const [first, second] = samples;
        expect(second.timestamp - first.timestamp).toBeGreaterThanOrEqual(200);
        expect(second.timestamp - first.timestamp).toBeLessThan(300);
        expect(second.connected).toBe(true);
        expect(second.centerX).toBeCloseTo(first.centerX, 1);
        const angleAdvance = (second.angle - first.angle + 360) % 360;
        if (reducedMotion === "no-preference") {
          expect(first.state).toBe("running");
          expect(first.duration).toBe(1200);
          expect(second.time - first.time).toBeGreaterThan(150);
          expect(angleAdvance).toBeGreaterThan(45);
          expect(angleAdvance).toBeLessThan(100);
        } else {
          expect(first.state).toBeUndefined();
          expect(second.time).toBe(0);
          expect(angleAdvance).toBe(0);
        }
        await expect(search(page)).toHaveAttribute("aria-busy", "true");
        await json(required(held), [fresh]);
        await expect(search(page)).not.toHaveAttribute("aria-busy", "true");
      });
    }
  }
});

test.describe("client", () => {
  test.use({ javaScriptEnabled: true });

  test("teclear sin Buscar conserva presentación, foco, elección y referencia", async ({
    page,
  }) => {
    const requests: string[] = [];
    let results: unknown = [fresh, homonym, long];
    let status = 200;
    zoneHandlers.set(page.context(), async (route) => {
      requests.push(required(new URL(route.request().url()).searchParams.get("q")));
      await json(route, results, status);
    });
    await ready(page);
    expect(requests).toEqual([]);
    await page.getByLabel("Referencia", { exact: true }).fill("Referencia editada");
    await search(page).fill("alta");
    await expect(post(page).locator("ul li")).toHaveCount(3);
    await expect(search(page)).toBeFocused();
    await expect(post(page)).toContainText(long.label);
    await expect(post(page)).toContainText(fresh.scope);
    await expect(post(page)).toContainText(homonym.scope);
    expect(await values(page)).toEqual({ zones: ["saved"], reference: "Referencia editada" });
    await post(page).locator('input[value="fresh"]').check();
    for (const [query, options, responseStatus] of [
      ["otra", [homonym], 200],
      ["vacía", [], 200],
      ["error", { error: "synthetic" }, 500],
    ] as const) {
      results = options;
      status = responseStatus;
      await search(page).fill(query);
      await expect.poll(() => requests.at(-1)).toBe(query);
      // Wait for the response, not merely the intercepted request.
      if (responseStatus === 200 && options.length)
        await expect(post(page).locator("ul li")).toHaveCount(1);
      else await expect(post(page).locator("ul li")).toHaveCount(0);
      expect(await values(page)).toEqual({ zones: ["fresh"], reference: "Referencia editada" });
      await expect(post(page)).toContainText(fresh.label);
      await expect(search(page)).toBeFocused();
    }
    expect(requests).toEqual(["alta", "otra", "vacía", "error"]);
  });

  test("Tab, flechas y espacio usan radios nativos dentro del POST", async ({ page }) => {
    await ready(page, "?q=alta");
    await search(page).focus();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Buscar", exact: true })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(post(page).locator('input[value="saved"]')).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(post(page).locator('input[value="fresh"]')).toBeFocused();
    await page.keyboard.press("Space");
    expect((await values(page)).zones).toEqual(["fresh"]);
    await page.keyboard.press("ArrowDown");
    await expect(post(page).locator('input[value="other"]')).toBeFocused();
    expect((await values(page)).zones).toEqual(["other"]);
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Referencia", { exact: true })).toBeFocused();
  });

  test("respuestas tardías no reaparecen antes del debounce, después de B ni al vaciar", async ({
    page,
  }) => {
    // Simulate a transport ignoring cancellation: causal version protection still applies.
    await page.addInitScript(() => {
      const original = window.fetch;
      window.fetch = (input, init) =>
        typeof input === "string" && input.startsWith("/publicar/zonas?")
          ? original(input, { ...init, signal: undefined })
          : original(input, init);
    });
    const held = new Map<string, Route>();
    zoneHandlers.set(page.context(), (route) => {
      held.set(required(new URL(route.request().url()).searchParams.get("q")), route);
    });
    await ready(page);
    await page.clock.install();
    await search(page).fill("A");
    await expect(page.getByRole("status")).toHaveText("Buscando zonas…");
    await expect(search(page)).toHaveAttribute("aria-busy", "true");
    await page.clock.runFor(250);
    await expect.poll(() => held.has("A")).toBe(true);
    await search(page).fill("B");
    const aReceived = page.waitForResponse(
      (response) => new URL(response.url()).searchParams.get("q") === "A",
    );
    await json(required(held.get("A")), [{ ...fresh, label: "Respuesta A" }]);
    await aReceived;
    await page.clock.runFor(20);
    await expect(post(page)).not.toContainText("Respuesta A");
    await expect(page.getByRole("status")).toHaveText("Buscando zonas…");
    await page.clock.runFor(250);
    await expect.poll(() => held.has("B")).toBe(true);
    await json(required(held.get("B")), [{ ...homonym, label: "Respuesta B" }]);
    await expect(post(page)).toContainText("Respuesta B");
    await expect(page.getByRole("status")).toBeEmpty();
    await expect(search(page)).not.toHaveAttribute("aria-busy", "true");
    await search(page).fill("C");
    await page.clock.runFor(250);
    await expect.poll(() => held.has("C")).toBe(true);
    await search(page).fill("D");
    await page.clock.runFor(250);
    await expect.poll(() => held.has("D")).toBe(true);
    await json(required(held.get("D")), [{ ...homonym, label: "Respuesta D" }]);
    await expect(post(page)).toContainText("Respuesta D");
    const cReceived = page.waitForResponse(
      (response) => new URL(response.url()).searchParams.get("q") === "C",
    );
    await json(required(held.get("C")), [{ ...fresh, label: "Respuesta C" }]);
    await cReceived;
    await page.clock.runFor(20);
    await expect(post(page)).not.toContainText("Respuesta C");
    await search(page).fill("E");
    await page.clock.runFor(250);
    await expect.poll(() => held.has("E")).toBe(true);
    await search(page).fill("");
    await expect(page.getByRole("status")).toBeEmpty();
    await expect(search(page)).not.toHaveAttribute("aria-busy", "true");
    const eReceived = page.waitForResponse(
      (response) => new URL(response.url()).searchParams.get("q") === "E",
    );
    await json(required(held.get("E")), [fresh]);
    await eReceived;
    await page.clock.runFor(20);
    await expect(post(page).locator("ul li")).toHaveCount(0);
    expect((await values(page)).zones).toEqual(["saved"]);
    expect([...held.keys()]).toEqual(["A", "B", "C", "D", "E"]);
  });
});
