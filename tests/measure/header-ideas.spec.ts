import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";

const url = pathToFileURL(resolve("design/alternativas/28-6-header-movil.html")).href;

test("three distinct, usable 390×840 results previews", async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 1100 });
  await page.goto(url);
  for (const id of ["a", "b", "c"]) {
    const phone = page.locator(`#phone-${id}`);
    const box = await phone.boundingBox();
    expect(box?.width).toBe(390);
    expect(box?.height).toBe(840);
    expect(await phone.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    const pill = phone.locator(".top search form.pill");
    await expect(pill.locator(".textCol input.input[value='Chacao']")).toHaveCount(1);
    await expect(pill.locator(".count")).toContainText("6 avisos");
    expect(await pill.locator(".count").evaluate((el) => getComputedStyle(el).fontSize)).toBe(
      "10.5px",
    );
    await expect(pill.locator("a.filter svg[aria-hidden='true']")).toHaveCount(1);
    await expect(pill.locator("button.submit svg[aria-hidden='true']")).toHaveCount(1);
    expect(await pill.evaluate((el) => getComputedStyle(el).minHeight)).toBe("48px");
    expect(await pill.locator("button.submit").evaluate((el) => getComputedStyle(el).width)).toBe(
      "44px",
    );
    const listings = await phone.locator(".listing").count();
    expect(listings).toBe(6);
    await expect(phone.locator(".scroll .count")).toContainText(`${listings} avisos`);
    for (const target of await phone
      .locator("a:visible, button:visible, summary:visible, input.input:visible")
      .all()) {
      const bounds = await target.boundingBox();
      expect(bounds?.height).toBeGreaterThanOrEqual(44);
      expect(bounds?.width).toBeGreaterThanOrEqual(44);
    }
    await phone.screenshot({ path: `/tmp/rentoru-header-${id.toUpperCase()}-initial.png` });
  }
  await expect(page.locator("#phone-a .top .srOnly")).toHaveCount(1);
  expect(await page.locator("#phone-a .tabs").count()).toBe(1);
  expect(await page.locator("#phone-b .tabs").count()).toBe(1);
  expect(await page.locator("#phone-c details.menu").count()).toBe(1);
  await expect(page.locator("#phone-c summary")).toHaveAccessibleName("Menú");
  await expect(page.locator("#phone-c summary svg[aria-hidden='true']")).toHaveCount(1);
  const scroller = page.locator("#phone-a .scroll");
  await scroller.evaluate((el) => {
    el.scrollTop = 500;
    el.dispatchEvent(new Event("scroll"));
  });
  await expect(page.locator("#phone-a .tabs")).toHaveClass(/hidden/);
  await expect(page.locator("#phone-a .tabs")).toHaveAttribute("inert", "");
  await expect
    .poll(async () => {
      const nav = await page.locator("#phone-a .tabs").boundingBox();
      const phone = await page.locator("#phone-a").boundingBox();
      return Boolean(nav && phone && nav.y >= phone.y + phone.height - 1);
    })
    .toBe(true);
  await page.locator("#phone-a").screenshot({ path: "/tmp/rentoru-header-A-scrolled.png" });
  await page.locator("#phone-b .scroll").evaluate((el) => {
    el.scrollTop = 500;
  });
  await page.locator("#phone-b").screenshot({ path: "/tmp/rentoru-header-B-scrolled.png" });
  await scroller.evaluate((el) => {
    el.scrollTop = 100;
    el.dispatchEvent(new Event("scroll"));
  });
  await expect(page.locator("#phone-a .tabs")).not.toHaveClass(/hidden/);
  await expect(page.locator("#phone-a .tabs")).not.toHaveAttribute("inert", "");
  await page.locator("#phone-c summary").click();
  await expect(page.locator("#phone-c details.menu")).toHaveAttribute("open", "");
  await expect(page.locator("#phone-c details.menu a:visible")).toHaveCount(3);
  await page.locator("#phone-c").screenshot({ path: "/tmp/rentoru-header-C-open.png" });
});

test("CSS-only session switch changes every bottom destination without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(url);
    await page.locator("#phone-c summary").click();
    for (const id of ["a", "b", "c"]) {
      const nav = page.locator(`#phone-${id} ${id === "c" ? ".menu" : ".tabs"}`);
      await expect(nav.locator(".anonymous")).toBeVisible();
      await expect(nav.locator(".authenticated")).toBeHidden();
      await expect(nav.locator(".anonymous svg[aria-hidden='true']")).toHaveCount(1);
      await expect(nav.locator("a[href='#publicar'] svg[aria-hidden='true']")).toHaveCount(1);
    }
    await page.getByLabel("Con sesión").check();
    for (const id of ["a", "b", "c"]) {
      const nav = page.locator(`#phone-${id} ${id === "c" ? ".menu" : ".tabs"}`);
      await expect(nav.locator(".anonymous")).toBeHidden();
      await expect(nav.locator(".authenticated")).toBeVisible();
      await expect(nav.locator(".authenticated")).toContainText("Mi cuenta");
      await expect(nav.locator(".authenticated svg[aria-hidden='true']")).toHaveCount(1);
      await page
        .locator(`#phone-${id}`)
        .screenshot({ path: `/tmp/rentoru-header-${id.toUpperCase()}-auth.png` });
    }
  } finally {
    await context.close();
  }
});

test("reduced motion keeps A navigation visible while scrolling", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url);
  await page.locator("#phone-a .scroll").evaluate((el) => {
    el.scrollTop = 500;
    el.dispatchEvent(new Event("scroll"));
  });
  await expect(page.locator("#phone-a .tabs")).not.toHaveClass(/hidden/);
  await expect(page.locator("#phone-a .tabs")).not.toHaveAttribute("inert", "");
});

test("without JavaScript all results and native navigation remain visible", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(url);
    for (const id of ["a", "b", "c"]) {
      await expect(page.locator(`#phone-${id} .listing`)).toHaveCount(6);
      await expect(page.locator(`#phone-${id} form[method="get"]`)).toBeVisible();
      await expect(page.locator(`#phone-${id} .top .brand`)).toHaveCount(0);
      expect(
        await page.locator(`#phone-${id} .top`).evaluate((el) => el.getBoundingClientRect().height),
      ).toBe(60);
    }
    await expect(page.locator("#phone-a .tabs")).toBeVisible();
    await expect(page.locator("#phone-a .tabs")).not.toHaveAttribute("inert", "");
    await expect(page.locator("#phone-b .tabs")).toBeVisible();
    await page.locator("#phone-c summary").click();
    await expect(page.locator("#phone-c details.menu a:visible")).toHaveCount(3);
    await expect(page.locator("#phone-c details.menu a").first()).toBeVisible();
  } finally {
    await context.close();
  }
});
