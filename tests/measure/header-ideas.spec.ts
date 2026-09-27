import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";

const url = pathToFileURL(resolve("design/alternativas/28-6-header-movil.html")).href;

async function wheelInside(page: import("@playwright/test").Page, delta: number) {
  const box = await page.locator("#phone-a .scroll").boundingBox();
  if (!box) throw new Error("Missing scroll area");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, delta);
}

test("two distinct usable previews and real wheel scroll", async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 1100 });
  await page.goto(url);
  await expect(page.locator(".phone")).toHaveCount(2);
  await expect(page.locator("#phone-c, .menu")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Bajar" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Subir" })).toBeEnabled();
  for (const id of ["a", "b"]) {
    const phone = page.locator(`#phone-${id}`);
    const box = await phone.boundingBox();
    expect(box?.width).toBe(390);
    expect(box?.height).toBe(840);
    expect(await phone.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    const pill = phone.locator(".top form.pill");
    await expect(pill.locator("input.input[value='Chacao']")).toHaveCount(1);
    await expect(pill.locator(".count")).toContainText("6 avisos");
    expect(await pill.locator(".count").evaluate((el) => getComputedStyle(el).fontSize)).toBe(
      "10.5px",
    );
    expect(await pill.evaluate((el) => getComputedStyle(el).minHeight)).toBe("48px");
    await expect(phone.locator(".listing")).toHaveCount(6);
    await expect(phone.locator("form[method='get']")).toBeVisible();
    for (const target of await phone
      .locator("a:visible, button:visible, input.input:visible")
      .all()) {
      const bounds = await target.boundingBox();
      expect(bounds?.height).toBeGreaterThanOrEqual(44);
      expect(bounds?.width).toBeGreaterThanOrEqual(44);
    }
    await phone.screenshot({ path: `/tmp/rentoru-header-${id.toUpperCase()}-initial.png` });
  }
  const a = page.locator("#phone-a .tabs");
  const b = page.locator("#phone-b .tabs");
  expect(await a.evaluate((el) => getComputedStyle(el).left)).not.toBe("0px");
  expect(await b.evaluate((el) => getComputedStyle(el).left)).toBe("0px");
  expect(await a.evaluate((el) => getComputedStyle(el).borderRadius)).not.toBe(
    await b.evaluate((el) => getComputedStyle(el).borderRadius),
  );
  for (const nav of [a, b]) {
    await expect(nav.locator("a")).toHaveCount(4);
    await expect(nav.locator("a.active, a[aria-current]")).toHaveCount(0);
    const action = nav.locator("a.publish .action");
    await expect(action).toHaveCount(1);
    expect(await action.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
      "rgb(39, 35, 67)",
    );
    expect(await action.evaluate((el) => getComputedStyle(el).color)).toBe("rgb(255, 255, 255)");
    const actionBox = await action.boundingBox();
    expect(actionBox?.height).toBeGreaterThanOrEqual(44);
    expect(actionBox?.width).toBeGreaterThanOrEqual(88);
    expect(actionBox?.width).toBeLessThanOrEqual(104);
    expect(
      await nav.locator("a[href='#inicio']").evaluate((el) => getComputedStyle(el).backgroundColor),
    ).toBe("rgba(0, 0, 0, 0)");
    const slots = await nav
      .locator("a.anonymous, a.publish, a[href='#inicio']")
      .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));
    expect(Math.max(...slots) - Math.min(...slots)).toBeLessThan(2);
  }
  await wheelInside(page, 620);
  await expect
    .poll(() => page.locator("#phone-a .scroll").evaluate((el) => el.scrollTop))
    .toBeGreaterThan(64);
  await expect(a).toHaveClass(/hidden/);
  await expect(a).toHaveAttribute("inert", "");
  await page.locator("#phone-a").screenshot({ path: "/tmp/rentoru-header-A-scrolled.png" });
  await wheelInside(page, -350);
  await expect(a).not.toHaveClass(/hidden/);
  await expect(a).not.toHaveAttribute("inert", "");
  await page.getByRole("button", { name: "Bajar" }).click();
  await expect(a).toHaveClass(/hidden/);
  await page.getByRole("button", { name: "Subir" }).click();
  await expect(a).not.toHaveClass(/hidden/);
  await page.locator("#phone-b .scroll").evaluate((el) => {
    el.scrollTop = 500;
  });
  await page.locator("#phone-b").screenshot({ path: "/tmp/rentoru-header-B-scrolled.png" });
});

test("CSS session switch and no-JS fallback", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(url);
    await expect(page.getByRole("button", { name: "Bajar" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Subir" })).toBeDisabled();
    for (const id of ["a", "b"]) {
      const phone = page.locator(`#phone-${id}`);
      await expect(phone.locator(".listing")).toHaveCount(6);
      await expect(phone.locator(".tabs .anonymous")).toBeVisible();
      await expect(phone.locator(".tabs .authenticated")).toBeHidden();
      await expect(phone.locator(".tabs")).toBeVisible();
    }
    await page.getByLabel("Con sesión").check();
    for (const id of ["a", "b"]) {
      const phone = page.locator(`#phone-${id}`);
      await expect(phone.locator(".tabs .anonymous")).toBeHidden();
      await expect(phone.locator(".tabs .authenticated")).toBeVisible();
      await expect(phone.locator(".tabs .authenticated")).toContainText("Mi cuenta");
      await phone.screenshot({ path: `/tmp/rentoru-header-${id.toUpperCase()}-auth.png` });
    }
  } finally {
    await context.close();
  }
});

test("reduced motion leaves A visible", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url);
  await wheelInside(page, 620);
  await expect(page.locator("#phone-a .tabs")).not.toHaveClass(/hidden/);
});
