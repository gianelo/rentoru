import { expect, test } from "@playwright/test";

const route = "/ayuda/preguntas-frecuentes";

async function scroll(page: import("@playwright/test").Page, delta: number) {
  await page.mouse.move(200, 420);
  await page.mouse.wheel(0, delta);
}

test("mobile dock hides on real downward window scroll and returns on upward scroll", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 840 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(route);
  const dock = page.getByRole("navigation", { name: "Navegación principal" });
  await expect(dock).toHaveAttribute("data-scroll-ready", "");
  await expect(dock).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight - innerHeight),
  ).toBeGreaterThan(200);
  await scroll(page, 450);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(64);
  await expect(dock).toHaveAttribute("inert", "");
  await expect(dock).toHaveClass(/dockHidden/);
  await scroll(page, -200);
  await expect(dock).not.toHaveAttribute("inert", "");
  await expect(dock).not.toHaveClass(/dockHidden/);
});

test("reduced motion keeps dock visible and preference changes reveal it", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 840 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(route);
  const dock = page.getByRole("navigation", { name: "Navegación principal" });
  await expect(dock).toHaveAttribute("data-scroll-ready", "");
  await scroll(page, 450);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(64);
  await expect(dock).toHaveAttribute("inert", "");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(dock).not.toHaveAttribute("inert", "");
  await expect(dock).not.toHaveClass(/dockHidden/);
  await scroll(page, 220);
  await expect(dock).not.toHaveAttribute("inert", "");
});

test("no-JS mobile dock stays available", async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 840 },
  });
  try {
    const page = await context.newPage();
    await page.goto(route);
    const dock = page.getByRole("navigation", { name: "Navegación principal" });
    await expect(dock).toBeVisible();
    await scroll(page, 450);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(64);
    await expect(dock).not.toHaveAttribute("inert", "");
    await expect(dock).not.toHaveClass(/dockHidden/);
  } finally {
    await context.close();
  }
});

test("tablet and desktop retain header and never display mobile dock", async ({ page }) => {
  for (const viewport of [
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(route);
    await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeHidden();
    await expect(page.locator("header").first()).toBeVisible();
    await scroll(page, 450);
    await expect(page.locator("header").first()).toBeVisible();
  }
});
