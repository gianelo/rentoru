import { expect, test } from "@playwright/test";
import {
  ContactSavedDraft,
  connectOwnedDatabase,
  OWNED_DSN,
  type QueryPort,
} from "../fixtures/contact-saved-draft";

const origin = "http://127.0.0.1:31467";
for (const scenario of ["normal", "review", "provider-negative"] as const) {
  test(`owned native contact: ${scenario}`, async ({ browser }) => {
    const db = await connectOwnedDatabase(OWNED_DSN);
    const readOnly: QueryPort = {
      query(sql, values) {
        if (!sql.startsWith("SELECT")) throw new Error("baseline is read-only");
        return db.query(sql, values);
      },
    };
    const fixture = new ContactSavedDraft(OWNED_DSN, readOnly);
    try {
      // Read existing baseline only: never create, refresh, renew or clean it here.
      const before = await fixture.snapshot();
      expect(before.photos.length).toBeGreaterThan(0);
      expect(Date.parse(before.expiresAt)).toBeGreaterThan(Date.now());
      const { rows } = await readOnly.query(
        'SELECT "userId", expires FROM "session" WHERE "sessionToken" = $1',
        [fixture.sessionToken],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]?.userId).toBe(fixture.publisherId);
      expect(new Date(String(rows[0]?.expires)).getTime()).toBeGreaterThan(Date.now());
      const context = await browser.newContext({ javaScriptEnabled: false });
      try {
        await context.route("**/*", (route) => {
          const url = new URL(route.request().url());
          return url.origin === origin &&
            !url.username &&
            !url.password &&
            route.request().resourceType() !== "image"
            ? route.continue()
            : route.abort();
        });
        await context.addCookies([
          { name: "authjs.session-token", value: fixture.sessionToken, url: origin },
        ]);
        const page = await context.newPage();
        const auth = await page.goto(`${origin}/api/auth/session`);
        expect(auth?.status()).toBe(200);
        const session = JSON.parse((await page.locator("body").textContent()) ?? "null");
        expect(session.user.name).toBe("owned-f367-baseline");
        expect(session.user.email).toBe("owned-f367-baseline@example.invalid");
        expect(Date.parse(session.expires)).toBeGreaterThan(Date.now());
        const review = scenario === "review";
        const mode = review ? "&volver=revisar" : "";
        const returnPath = `/publicar/paso/zona${review ? "?volver=revisar" : ""}`;
        const zone = await page.goto(`${origin}/publicar/paso/zona?q=No-inferir-ciudad${mode}`);
        expect(zone?.status()).toBe(200);
        await expect(page.locator('[name="reference"]')).toHaveValue(
          before.answers.listing.reference ?? "",
        );
        await expect(page.locator('input[type="hidden"][name="volver"]')).toHaveCount(
          review ? 1 : 0,
        );
        if (review) await expect(page.locator('input[name="volver"]')).toHaveValue("revisar");
        await page.locator('[name="reference"]').fill("Edición no enviada owned");
        const avisanos = page.getByRole("link", { name: "Avisanos", exact: true });
        await expect(avisanos).toHaveAttribute(
          "href",
          `/ayuda/escribinos?motivo=zona-faltante${mode}`,
        );
        await avisanos.click();
        expect(page.url()).toBe(`${origin}/ayuda/escribinos?motivo=zona-faltante${mode}`);
        await expect(page.locator('[name="message"]')).toHaveValue("");
        await expect(page.locator("body")).toContainText(
          "Contanos la ciudad, el nombre de la zona que falta y por qué debería estar en el catálogo.",
        );
        await expect(page.locator("body")).toContainText("Avisarnos no crea ni habilita una zona.");
        await expect(page.locator("body")).not.toContainText("No-inferir-ciudad");
        await page.getByLabel(/^Tu nombre\s+✱\s+obligatorio$/).fill("Persona owned");
        await page
          .getByLabel(/^Tu correo\s+✱\s+obligatorio$/)
          .fill("owned-browser@example.invalid");
        const failed = scenario === "provider-negative";
        await page
          .getByLabel(/^Tu mensaje\s+✱\s+obligatorio$/)
          .fill(
            "Ciudad: Maracaibo. Zona: Sector sintético owned. Falta en el catálogo y debería aparecer porque tiene viviendas de alquiler permanente." +
              (failed ? "\n\n[owned-provider-error]" : ""),
          );
        await expect(page.locator('[name="sitioWeb"]')).toHaveValue("");
        const [post, served] = await Promise.all([
          page.waitForResponse(
            (response) =>
              response.request().method() === "POST" &&
              response.url() === `${origin}/ayuda/escribinos?motivo=zona-faltante${mode}`,
          ),
          page.waitForNavigation(),
          page.getByRole("button", { name: "Enviar mensaje", exact: true }).click(),
        ]);
        expect(post.status()).toBe(303);
        const outcome = `/ayuda/escribinos?${failed ? "fallo-envio" : "enviado"}&motivo=zona-faltante${mode}`;
        expect(page.url()).toBe(`${origin}${outcome}`);
        expect(served?.status()).toBe(200);
        const html = await served?.text();
        if (failed) {
          expect(html).toContain("No pudimos enviar tu mensaje. Intentá de nuevo.");
          expect(html).not.toContain("Recibimos tu mensaje.");
          await expect(page.getByRole("alert")).toHaveText(
            "No pudimos enviar tu mensaje. Intentá de nuevo.",
          );
          await expect(page.getByRole("button", { name: "Enviar mensaje" })).toBeVisible();
        } else {
          expect(html).toContain("Recibimos tu mensaje.");
          await expect(page.getByRole("button", { name: "Enviar mensaje" })).toHaveCount(0);
        }
        const back = page.getByRole("link", { name: "Volver al borrador guardado", exact: true });
        await expect(back).toHaveAttribute("href", returnPath);
        const [resumed] = await Promise.all([page.waitForNavigation(), back.click()]);
        expect(resumed?.status()).toBe(200);
        expect(page.url()).toBe(`${origin}${returnPath}`);
        await expect(page.locator('[name="reference"]')).toHaveValue(
          before.answers.listing.reference ?? "",
        );
        await expect(page.locator('input[type="hidden"][name="volver"]')).toHaveCount(
          review ? 1 : 0,
        );
      } finally {
        await context.close();
      }
      expect(await fixture.snapshot()).toEqual(before);
    } finally {
      await db.close();
    }
  });
}
