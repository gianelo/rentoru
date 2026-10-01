import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { ID, LISTING_ROWS, MARACAIBO, ZONE_ROWS } from "../../scripts/seed-e2e";
import { buildListingPath } from "../../src/modules/listing-discovery/domain/listing-url";
import { ownedDatabase } from "./owned-test-database";

test("30.4b2: real authenticated logout revokes session and serves locked listing", async ({
  page,
  context,
  request,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "crawlability" || Boolean(process.env.PLAYWRIGHT_BASE_URL),
    "Account menu requires JavaScript and a local harness",
  );
  const database = ownedDatabase();
  const listing = LISTING_ROWS.find((row) => row.id === ID.mcboTierraNegra1);
  const zone = ZONE_ROWS.find((row) => row.id === listing?.zoneId);
  if (!listing || !zone || listing.status !== "active")
    throw new Error("Seeded active listing missing");
  const canonical = buildListingPath({
    id: listing.id,
    title: listing.title,
    cityName: MARACAIBO.name,
    zoneName: zone.name,
  });
  const { Client } = await import("pg");
  const client = new Client({ connectionString: database });
  await client.connect();
  const token = randomUUID();
  try {
    await client.query(
      'insert into "session" ("sessionToken", "userId", "expires") values ($1, $2, now() + interval \'1 day\')',
      [token, "e2e-publicante"],
    );
    const beforeGet = await client.query<{ dbFuture: boolean }>(
      'select "expires" > now() as "dbFuture" from "session" where "sessionToken" = $1',
      [token],
    );
    const dbFuture = beforeGet.rows[0]?.dbFuture;
    expect(beforeGet.rowCount).toBe(1);
    console.log(JSON.stringify({ dbFuture }));
    expect(dbFuture).toBe(true);
    await context.addCookies([
      {
        name: "authjs.session-token",
        value: token,
        url: "http://localhost:3000",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    const session = await page.goto("/api/auth/session");
    expect(session?.status()).toBe(200);
    const sessionBody = await session?.json();
    const afterSession = await client.query('select 1 from "session" where "sessionToken" = $1', [
      token,
    ]);
    console.log(
      JSON.stringify({
        authUser: Boolean(sessionBody?.user),
        rowStillPresent: afterSession.rowCount === 1,
      }),
    );
    expect(sessionBody?.user).toBeTruthy();
    const response = await page.goto(canonical);
    expect(response?.status()).toBe(200);
    await page.getByRole("link", { name: "Mis avisos" }).click();
    const signoutPost = page.waitForRequest((outgoing) => {
      if (outgoing.method() !== "POST") return false;
      const destination = new URL(outgoing.url());
      return (
        destination.origin === new URL(page.url()).origin &&
        (destination.pathname === canonical || destination.pathname === "/api/auth/signout")
      );
    });
    await page.getByRole("menuitem", { name: "Cerrar sesión" }).click();
    const submitted = await signoutPost;
    expect(submitted.method()).toBe("POST");
    console.log(
      JSON.stringify({
        signoutMethod: submitted.method(),
        signoutPath: new URL(submitted.url()).pathname,
      }),
    );
    await expect(page).toHaveURL(new RegExp(`${canonical}$`));
    const fresh = await request.get(canonical);
    expect(fresh.status()).toBe(200);
    const body = await fresh.text();
    expect(body).toContain(listing.title);
    expect(body).toContain("Ver WhatsApp del dueño");
    expect(body).not.toContain("sin-contacto");
    expect(body).not.toMatch(/\+58\s*\d{3}\s*\d{3}\s*\d{4}/);
    const result = await client.query('select 1 from "session" where "sessionToken" = $1', [token]);
    expect(result.rowCount).toBe(0);
  } finally {
    await client.query('delete from "session" where "sessionToken" = $1', [token]);
    await client.end();
  }
});
