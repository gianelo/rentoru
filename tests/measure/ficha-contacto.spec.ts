import { expect, test } from "@playwright/test";

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
