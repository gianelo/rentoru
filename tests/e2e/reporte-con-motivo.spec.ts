import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { ID, LISTING_ROWS, MARACAIBO, ZONE_ROWS } from "../../scripts/seed-e2e";
import { buildListingPath } from "../../src/modules/listing-discovery/domain/listing-url";
import { ownedDatabase } from "./owned-test-database";

test("30.6c: authenticated native report persists reason without hiding listing", async ({
  page,
  context,
}, testInfo) => {
  test.skip(Boolean(process.env.PLAYWRIGHT_BASE_URL), "Owned local database only, never preview");
  const database = ownedDatabase();
  const listing = LISTING_ROWS.find((row) => row.id === ID.mcboTierraNegra1);
  const zone = ZONE_ROWS.find((row) => row.id === listing?.zoneId);
  if (!listing || !zone || listing.status !== "active")
    throw new Error("Seeded active Maracaibo listing missing");
  const reportPath = `${buildListingPath({
    id: listing.id,
    title: listing.title,
    cityName: MARACAIBO.name,
    zoneName: zone.name,
  })}/reportar`;
  const { Client } = await import("pg");
  const client = new Client({ connectionString: database });
  const reporter = randomUUID();
  const token = randomUUID();
  const email = `${reporter}@example.invalid`;
  const explanation = "  El anuncio pide un adelanto por fuera  ";
  let connected = false;
  const reports = () =>
    client.query<{ listing_id: string; reporter_id: string; reason: string; explanation: string }>(
      "select listing_id, reporter_id, reason, explanation from listing_report where listing_id = $1 and reporter_id = $2",
      [listing.id, reporter],
    );
  const totalReports = () =>
    client.query<{ count: number }>(
      "select count(*)::int as count from listing_report where listing_id = $1",
      [listing.id],
    );
  try {
    await client.connect();
    connected = true;
    await client.query('insert into "user" (id, name, email) values ($1, $2, $3)', [
      reporter,
      "E2E reporter",
      email,
    ]);
    await client.query(
      'insert into "session" ("sessionToken", "userId", "expires") values ($1, $2, now() + interval \'1 day\')',
      [token, reporter],
    );
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
    const authBody = await auth?.json();
    expect(authBody?.user.email).toBe(email);
    const session = await client.query<{ active: boolean }>(
      'select "expires" > now() as active from "session" where "sessionToken" = $1 and "userId" = $2',
      [token, reporter],
    );
    expect(session.rows).toEqual([{ active: true }]);
    expect((await reports()).rowCount).toBe(0);
    expect((await totalReports()).rows[0]?.count).toBe(0);

    const get = await page.goto(reportPath);
    expect(get?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Reportar este aviso" })).toBeVisible();
    expect(await page.content()).toMatch(/<form[^>]*method=["']?post/i);
    expect((await reports()).rowCount).toBe(0);
    await page.getByRole("combobox", { name: "Motivo" }).selectOption("possible_fraud");
    await page.getByRole("textbox", { name: "Explicación (opcional)" }).fill(explanation);
    const post = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" && new URL(response.url()).pathname === reportPath,
    );
    await page.getByRole("button", { name: "Enviar el reporte" }).click();
    const submitted = await post;
    expect(new URL(submitted.url()).origin).toBe(new URL(page.url()).origin);
    expect(submitted.status()).toBe(303);
    await expect(page).toHaveURL(new RegExp(`${reportPath}\\?enviado$`));
    await expect(page.getByRole("heading", { name: "Recibimos tu reporte" })).toBeVisible();
    // The account nav may contain the signed-in email; the report acknowledgement must not.
    const acknowledgement = await page.locator("main").innerText();
    expect(acknowledgement).not.toContain(email);
    expect(acknowledgement).not.toContain(reporter);
    expect(page.url()).not.toContain(reporter);
    const saved = await reports();
    expect(saved.rowCount).toBe(1);
    expect((await totalReports()).rows[0]?.count).toBe(1);
    expect(saved.rows).toEqual([
      {
        listing_id: listing.id,
        reporter_id: reporter,
        reason: "possible_fraud",
        explanation: explanation.trim(),
      },
    ]);
    const status = await client.query<{ status: string }>(
      "select status from listing where id = $1",
      [listing.id],
    );
    expect(status.rows).toEqual([{ status: "active" }]);
    console.log(
      JSON.stringify({
        project: testInfo.project.name,
        get: get?.status(),
        post: submitted.status(),
        reports: saved.rowCount,
        listing: status.rows[0]?.status,
      }),
    );
  } finally {
    try {
      if (connected) {
        await client.query(
          "delete from listing_report where listing_id = $1 and reporter_id = $2",
          [listing.id, reporter],
        );
        await client.query('delete from "session" where "sessionToken" = $1 and "userId" = $2', [
          token,
          reporter,
        ]);
        await client.query('delete from "user" where id = $1', [reporter]);
        expect((await reports()).rowCount).toBe(0);
      }
    } finally {
      await client.end();
    }
  }
});
