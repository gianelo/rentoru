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
}
