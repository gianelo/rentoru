import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { ID, LISTING_ROWS, MARACAIBO, PUBLISHER, ZONE_ROWS } from "../../scripts/seed-e2e";
import { buildListingPath } from "../../src/modules/listing-discovery/domain/listing-url";
import { ownedDatabase } from "./owned-test-database";

test("30.5b2c: authenticated native reveal rejects whitespace and serves saved WhatsApp", async ({
  page,
  context,
}, testInfo) => {
  test.skip(Boolean(process.env.PLAYWRIGHT_BASE_URL), "Owned local database only, never preview");
  const database = ownedDatabase();
  const listing = LISTING_ROWS.find((row) => row.id === ID.mcboTierraNegra1);
  const zone = ZONE_ROWS.find((row) => row.id === listing?.zoneId);
  if (!listing || !zone || listing.status !== "active")
    throw new Error("Seeded active Maracaibo listing missing");
  const canonical = buildListingPath({
    id: listing.id,
    title: listing.title,
    cityName: MARACAIBO.name,
    zoneName: zone.name,
  });
  const { Client } = await import("pg");
  const client = new Client({ connectionString: database });
  let connected = false;
  const tenant = randomUUID();
  const token = randomUUID();
  const message = `Hola, quisiera visitar este aviso ${tenant}`;
  const events = async () =>
    client.query<{
      tenant_user_id: string;
      listing_id: string;
      publisher_id: string;
      message: string;
    }>(
      "select tenant_user_id, listing_id, publisher_id, message from contact_reveal_event where tenant_user_id = $1 and listing_id = $2",
      [tenant, listing.id],
    );
  try {
    await client.connect();
    connected = true;
    const contact = await client.query<{ contact_method: string; contact_value: string }>(
      "select contact_method, contact_value from listing where id = $1",
      [listing.id],
    );
    expect(contact.rows).toEqual([{ contact_method: "whatsapp", contact_value: "sin-contacto" }]);
    await client.query('insert into "user" (id, name, email) values ($1, $2, $3)', [
      tenant,
      "E2E tenant",
      `${tenant}@example.invalid`,
    ]);
    await client.query(
      'insert into "session" ("sessionToken", "userId", "expires") values ($1, $2, now() + interval \'1 day\')',
      [token, tenant],
    );
    const anonymous = await page.goto(canonical);
    expect(anonymous?.status()).toBe(200);
    expect(await anonymous?.text()).not.toContain("sin-contacto");
    expect(await anonymous?.text()).not.toContain("wa.me/");
    await context.addCookies([
      {
        name: "authjs.session-token",
        value: token,
        url: "http://localhost:3000",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    const auth = await page.goto("/api/auth/session");
    expect(auth?.status()).toBe(200);
    const sessionBody = await auth?.json();
    expect(sessionBody.user).toBeTruthy();
    expect(sessionBody.user.email).toBe(`${tenant}@example.invalid`);
    const persistedSession = await client.query<{ active: boolean; userId: string }>(
      'select "expires" > now() as active, "userId" from "session" where "sessionToken" = $1 and "userId" = $2',
      [token, tenant],
    );
    expect(persistedSession.rows).toEqual([{ active: true, userId: tenant }]);
    await page.goto(canonical);
    const field = page.getByRole("textbox", { name: "Tu mensaje para quien publica" });
    await expect(field).toBeVisible();
    await field.fill("   ");
    expect(await field.evaluate((element: HTMLTextAreaElement) => element.checkValidity())).toBe(
      true,
    );
    const whitespacePost = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" && new URL(response.url()).pathname === canonical,
    );
    await page.getByRole("button", { name: /Ver WhatsApp/ }).click();
    const rejected = await whitespacePost;
    expect(new URL(rejected.url()).origin).toBe(new URL(page.url()).origin);
    await expect(page).toHaveURL(new RegExp(`${canonical}\\?revelar=mensaje-requerido$`));
    await expect(page.locator("#message-error")).toContainText(/mensaje/i);
    expect((await events()).rowCount).toBe(0);

    await field.fill(message);
    const validPost = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" && new URL(response.url()).pathname === canonical,
    );
    await page.getByRole("button", { name: /Ver WhatsApp/ }).click();
    expect(new URL((await validPost).url()).origin).toBe(new URL(page.url()).origin);
    await page.goto(canonical);
    const saved = await events();
    expect(saved.rowCount).toBe(1);
    expect(saved.rows[0]).toEqual({
      tenant_user_id: tenant,
      listing_id: listing.id,
      publisher_id: PUBLISHER.id,
      message,
    });
    const html = await page.content();
    const link = page.locator('a[href^="https://wa.me/"]');
    await expect(link).toHaveAttribute(
      "href",
      `https://wa.me/58?text=${encodeURIComponent(message)}`,
    );
    expect(html).toContain("sin-contacto");
    await expect(page.getByTestId("contact-value")).toHaveText("sin-contacto");
    console.log(
      JSON.stringify({
        project: testInfo.project.name,
        rejectedEvents: 0,
        savedEvents: saved.rowCount,
        servedPlaceholder: true,
      }),
    );
  } finally {
    try {
      if (connected) {
        await client.query(
          "delete from contact_reveal_event where tenant_user_id = $1 and listing_id = $2",
          [tenant, listing.id],
        );
        await client.query('delete from "session" where "sessionToken" = $1 and "userId" = $2', [
          token,
          tenant,
        ]);
        await client.query('delete from "user" where id = $1', [tenant]);
      }
    } finally {
      await client.end();
    }
  }
});
