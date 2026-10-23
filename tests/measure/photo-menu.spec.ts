import { expect, test } from "@playwright/test";

const sizes = [
  [390, 844],
  [440, 956],
  [768, 1024],
  [1440, 900],
] as const;

for (const [width, height] of sizes) {
  test(`photo menu geometry ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/measure");
    const step = page.getByTestId("publish-step-photos");
    const trigger = step.locator('summary[aria-label="Acciones de Sala"]');
    await trigger.scrollIntoViewIfNeeded();
    const paint = await trigger.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const circle = getComputedStyle(element, "::before");
      return {
        target: [box.width, box.height],
        background: style.backgroundColor,
        border: style.borderTopWidth,
        glyph: element.textContent?.trim(),
        circle: {
          width: circle.width,
          height: circle.height,
          left: circle.left,
          top: circle.top,
          radius: circle.borderRadius,
          background: circle.backgroundColor,
          border: circle.borderTopWidth,
          pointerEvents: circle.pointerEvents,
        },
      };
    });
    const overflow = () =>
      page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
    const closedOverflow = await overflow();
    const phase = await trigger.evaluate((element) =>
      getComputedStyle(element).getPropertyValue("--photo-menu-visible-size") ? "after" : "before",
    );
    const screenshot = (state: string) =>
      `.tmp/rentoru-f367-browser/screenshots/${phase}-${state}-${width}.png`;
    await step.screenshot({ path: screenshot("closed") });
    await trigger.click({ position: { x: 2, y: 22 } });
    const menu = trigger.locator("..");
    await expect(menu).toHaveAttribute("open", "");
    const sheet = menu.locator("div").first();
    const bounds = await sheet.boundingBox();
    const target = await trigger.boundingBox();
    const actions = await sheet.locator("button").evaluateAll((buttons) =>
      buttons.map((button) => ({
        label: button.getAttribute("aria-label"),
        height: button.getBoundingClientRect().height,
      })),
    );
    console.log(
      JSON.stringify({
        width,
        paint,
        bounds,
        target,
        actions,
        closedOverflow,
        openOverflow: await overflow(),
      }),
    );
    await step.screenshot({ path: screenshot("open") });
    expect(paint.target).toEqual([44, 44]);
    expect(paint.glyph).toBe("⋯");
    expect(bounds?.width).toBe(232);
    expect(bounds?.y).toBeCloseTo((target?.y ?? 0) + 44);
    expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeCloseTo((target?.x ?? 0) + 44);
    expect(actions.every((action) => action.height >= 60)).toBe(true);
    expect(closedOverflow).toEqual({ scroll: width, client: width });
    expect(await overflow()).toEqual(closedOverflow);
    if (width >= 768) {
      expect(paint.circle.width, "desktop visible circle is 30px").toBe("30px");
      expect(paint.circle.height).toBe("30px");
      expect(paint.circle.left).toBe("7px");
      expect(paint.circle.top).toBe("7px");
      expect(paint.circle.radius).toBe("999px");
      expect(paint.circle.background).toBe("rgb(255, 255, 255)");
      expect(paint.circle.border).toBe("1px");
      expect(paint.circle.pointerEvents).toBe("none");
      expect(paint.background).toBe("rgba(0, 0, 0, 0)");
      expect(paint.border).toBe("0px");
    } else {
      expect(paint.background).toBe("rgba(0, 0, 0, 0)");
      expect(paint.border).toBe("0px");
      expect(paint.circle.width).toBe("auto");
    }
  });

  test(`photo menu interactions ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/measure");
    const step = page.getByTestId("publish-step-photos");
    const trigger = (name: string) => step.locator(`summary[aria-label="Acciones de ${name}"]`);
    const keys = () =>
      step
        .locator('input[name="photoKey"]')
        .evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value));
    const cover = () =>
      step.locator("li").filter({ has: page.getByText("Portada", { exact: true }) });
    expect(await keys()).toEqual(["k1", "k2", "k3"]);
    await expect(cover()).toContainText("Sala");
    for (const name of ["Sala", "Cocina", "Balcón"]) {
      const summary = trigger(name);
      await expect(summary).toHaveText("⋯");
      await summary.click();
      const menu = summary.locator("..");
      const sheet = menu.locator("div").first();
      const box = await sheet.boundingBox();
      expect(box?.x).toBeGreaterThanOrEqual(0);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width);
      const buttons = sheet.locator("button");
      for (const button of await buttons.all()) {
        await expect(button).toBeInViewport();
        expect((await button.boundingBox())?.height).toBeGreaterThanOrEqual(60);
        await button.click({ trial: true });
      }
      await page.keyboard.press("Escape");
      await expect(menu).not.toHaveAttribute("open", "");
      await expect(summary).toBeFocused();
    }
    const summary = trigger("Cocina");
    await trigger("Sala").focus();
    await page.keyboard.press("Tab");
    await expect(summary).toBeFocused();
    expect(await summary.evaluate((element) => element.matches(":focus-visible"))).toBe(true);
    expect(await summary.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe(
      "none",
    );
    await page.keyboard.press("Enter");
    await expect(summary.locator("..")).toHaveAttribute("open", "");
    await step.getByRole("heading").first().click();
    await expect(summary.locator("..")).not.toHaveAttribute("open", "");
    const run = async (name: string, action: string) => {
      if ((await trigger(name).locator("..").getAttribute("open")) === null) {
        await trigger(name).click();
      }
      await step.getByRole("button", { name: `${action}: ${name}`, exact: true }).click();
      await page.keyboard.press("Escape");
      await expect(step.locator('details[open] summary[aria-label^="Acciones de "]')).toHaveCount(
        0,
      );
    };
    await run("Cocina", "Hacer portada");
    expect(await keys()).toEqual(["k2", "k1", "k3"]);
    await expect(cover()).toContainText("Cocina");
    await run("Cocina", "Mover abajo");
    expect(await keys()).toEqual(["k1", "k2", "k3"]);
    await run("Balcón", "Mover arriba");
    expect(await keys()).toEqual(["k1", "k3", "k2"]);
    await run("Balcón", "Quitar del aviso");
    expect(await keys()).toEqual(["k1", "k2"]);
    await expect(trigger("Balcón")).toHaveCount(0);
    expect(
      await step
        .locator('input[name="photoName"]')
        .evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value)),
    ).toEqual(["Sala", "Cocina"]);
    expect(
      await step
        .locator('input[name="photoBytes"]')
        .evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value)),
    ).toEqual(["40000", "41000"]);
  });
}
