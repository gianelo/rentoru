import { test as base, expect } from "@playwright/test";
import { ID } from "../../scripts/seed-e2e";
import { withPublicationEntry } from "../fixtures/publication-entry";

/**
 * Fase 44 (44.2, S4) — «el campo que falló fue el descripción… le di a guardar
 * aviso y ahí se reinició todo». Corre en `chromium` y en `crawlability`: con
 * el script apagado el POST nativo vuelve con lo escrito, y con él encendido
 * lo devuelve `useActionState` sin navegar. En los dos, la negativa no escribe
 * nada: `verify` compara la huella de cada tabla pública, el aviso incluido.
 */
const test = base.extend<{ edicion: { origin: string; verify: () => Promise<void> } }>({
  edicion: async ({ context, baseURL }, use) => {
    if (!baseURL) throw new Error("Editar requiere una baseURL local explícita");
    await withPublicationEntry({ origin: baseURL }, async (lease) => {
      await context.addCookies([
        {
          name: "authjs.session-token",
          value: lease.token,
          url: lease.origin,
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
        },
      ]);
      await use({ origin: lease.origin, verify: lease.verify });
    });
  },
});

// La huella de tablas completas pide una ventana exclusiva de la base.
test.describe.configure({ mode: "serial" });

// El prefijo «44.2:» la saca de la pierna de lecturas del CI (que sirve en
// :3000 sin base propia) y la pierna de publicar la corre a propósito.
test("44.2: una negativa al guardar vuelve con lo escrito y no toca el aviso", async ({
  page,
  edicion,
}) => {
  const ruta = `/mis-avisos/${ID.dcChacao}/editar`;
  const respuesta = await page.goto(ruta);
  expect(respuesta?.status()).toBe(200);

  await page.locator("#description").fill("corto");
  await page.locator("#priceUsd").fill("725");
  await page.locator("#rooms").fill("4");
  await page.getByRole("button", { name: "Guardar cambios" }).click();

  // La negativa de la descripción, al lado de su campo y con la medida enviada.
  await expect(page.locator("#description-error")).toHaveText("✱ Mínimo 120 caracteres. Vas 5.");
  await expect(page).toHaveURL(`${edicion.origin}${ruta}`);
  // Lo escrito, y no lo guardado: es lo que antes «se reiniciaba».
  await expect(page.locator("#description")).toHaveValue("corto");
  await expect(page.locator("#priceUsd")).toHaveValue("725");
  await expect(page.locator("#rooms")).toHaveValue("4");

  await edicion.verify();
});
