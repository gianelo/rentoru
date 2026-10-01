import { expect, test } from "@playwright/test";

for (const width of [390, 440, 768]) {
  test(`31.6: revealed contact actions at ${width}px`, async ({ browser }) => {
    for (const javaScriptEnabled of [true, false]) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        javaScriptEnabled,
      });
      try {
        if (javaScriptEnabled) {
          await context.grantPermissions(["clipboard-read", "clipboard-write"]);
        }
        const page = await context.newPage();
        await page.goto("/measure");
        for (const method of ["email", "whatsapp", "telefono"] as const) {
          const block = page.getByTestId(`revealed-${method}`);
          const action = block.getByRole("link", {
            name:
              method === "email"
                ? "Escribir un correo"
                : method === "telefono"
                  ? "Llamar"
                  : "Escribir por WhatsApp",
          });
          await expect(action).toHaveAttribute(
            "href",
            new RegExp(
              method === "email" ? "^mailto:" : method === "telefono" ? "^tel:" : "^https://wa.me/",
            ),
          );
          await expect(block.getByTestId("contact-value")).toHaveCSS("user-select", "all");
          const copy = block.getByRole("button", {
            name:
              method === "email"
                ? "Copiar el email"
                : method === "telefono"
                  ? "Copiar el teléfono"
                  : "Copiar el WhatsApp",
          });
          if (!javaScriptEnabled) {
            await expect(copy).toHaveCount(0);
            continue;
          }
          await expect(copy).toBeVisible();
          const boxes = await Promise.all([
            action.boundingBox(),
            copy.boundingBox(),
            block.boundingBox(),
          ]);
          const [primary, secondary, container] = boxes;
          expect(primary?.height).toBeGreaterThanOrEqual(44);
          expect(secondary?.height).toBeGreaterThanOrEqual(44);
          if (method === "email") {
            expect(Math.abs((primary?.width ?? 0) - (secondary?.width ?? 1))).toBeLessThan(2);
            expect((secondary?.width ?? 0) / (container?.width ?? 1)).toBeGreaterThan(0.8);
          } else {
            expect((secondary?.width ?? 0) / (primary?.width ?? 1)).toBeLessThan(0.8);
          }
          await copy.focus();
          await expect(copy).toBeFocused();
          expect(await copy.evaluate((node) => getComputedStyle(node).outlineStyle)).not.toBe(
            "none",
          );
          if (method === "email") {
            await copy.click();
            await expect(block.getByRole("button", { name: "Copiado" })).toBeVisible();
            expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
              "publisher@example.invalid",
            );
          }
        }
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
          ),
        ).toBe(true);
      } finally {
        await context.close();
      }
    }
  });
}

for (const { width, height } of [
  { width: 390, height: 844 },
  { width: 440, height: 956 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
]) {
  test(`contact message and reveal action are separate at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/measure");

    const block = page
      .getByTestId("contact-block")
      .filter({ has: page.locator('textarea[name="message"]') });
    const field = block.locator('textarea[name="message"]').locator("xpath=..");
    const button = block.getByRole("button", { name: "Ver WhatsApp del dueño" });
    await expect(field.getByText("Tu mensaje para quien publica")).toBeVisible();
    await expect(button).toBeVisible();

    const geometry = await page.evaluate(() => {
      const form = [...document.querySelectorAll('[data-testid="contact-block"] form')].find(
        (node) => node.querySelector('textarea[name="message"]'),
      );
      const text = form?.querySelector('textarea[name="message"]');
      const field = text?.parentElement;
      const action = [...(form?.querySelectorAll("button") ?? [])].find((node) =>
        node.textContent?.includes("Ver WhatsApp del dueño"),
      );
      if (!field || !text || !action) return null;
      const wrapperBox = field.getBoundingClientRect();
      const textBox = text.getBoundingClientRect();
      const buttonBox = action.getBoundingClientRect();
      return {
        gap: Number.parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue("--gap"),
        ),
        wrapperSeparation: buttonBox.top - wrapperBox.bottom,
        textareaSeparation: buttonBox.top - textBox.bottom,
        buttonHeight: buttonBox.height,
        distinctRegions: field !== action.parentElement && buttonBox.top >= wrapperBox.bottom,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });
    expect(geometry).not.toBeNull();
    expect(geometry?.gap).toBeGreaterThan(0);
    expect(geometry?.wrapperSeparation).toBeGreaterThanOrEqual(geometry?.gap ?? 0);
    expect(geometry?.textareaSeparation).toBeGreaterThanOrEqual(geometry?.gap ?? 0);
    expect(geometry?.buttonHeight).toBeGreaterThanOrEqual(44);
    expect(geometry?.distinctRegions).toBe(true);
    expect(geometry?.overflow).toBe(false);
  });

  if (width === 1440) continue;

  test(`contact placeholder and typed message at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/measure");
    const textarea = page.getByTestId("contact-block").locator('textarea[name="message"]');
    await expect(textarea).toHaveValue("");
    const baseline = await textarea.evaluate((element: HTMLTextAreaElement) => ({
      placeholder: element.placeholder,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
    }));
    console.log(`CONTACT ${width} baseline ${JSON.stringify(baseline)}`);

    const typed =
      "Hola, me interesa el aviso. Quisiera conocer las condiciones y coordinar una visita. ".repeat(
        8,
      );
    await textarea.fill(typed);
    const afterTyping = await textarea.evaluate((element: HTMLTextAreaElement) => ({
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      value: element.value,
    }));
    console.log(
      `CONTACT ${width} typed ${JSON.stringify({ ...afterTyping, valueLength: afterTyping.value.length, value: undefined })}`,
    );
    expect(afterTyping.value).toBe(typed);
    expect(afterTyping.scrollHeight).toBeGreaterThan(afterTyping.clientHeight);
    expect(afterTyping.documentWidth).toBeLessThanOrEqual(afterTyping.viewportWidth);
    expect(baseline.documentWidth).toBeLessThanOrEqual(baseline.viewportWidth);
    expect(baseline.scrollHeight).toBeLessThanOrEqual(baseline.clientHeight + 1);
  });
}
