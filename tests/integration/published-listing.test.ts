import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PublicationDatabase } from "../../src/modules/listing-publication/infrastructure/drizzle-listing-repository";
import { DrizzlePublishedListing } from "../../src/modules/listing-publication/infrastructure/drizzle-published-listing";
import * as schema from "../../src/shared/db/schema";

/**
 * tasks.md 37.3 — the Listo screen reads back the listing it was redirected
 * with, by an id that travels in the URL. The ownership, status and expiry
 * filters live in the WHERE, so these rows prove the SQL, not a fake: each
 * rule has one row that contradicts it.
 */
const url = process.env.TEST_DATABASE_URL;
if (!url) {
  throw new Error(
    "TEST_DATABASE_URL is not set. Start the disposable database with " +
      "`pnpm db:test:up && pnpm db:test:migrate`.",
  );
}

const pool = new Pool({ connectionString: url });
const db = drizzle(pool, { schema }) as unknown as PublicationDatabase;
const published = new DrizzlePublishedListing(db);

const NOW = new Date();
const CITY = randomUUID();
const ZONE = randomUUID();
const OWNER = randomUUID();
const STRANGER = randomUUID();
const ACTIVE = randomUUID();
const EXPIRED_BY_DATE = randomUUID();
const EXPIRED = randomUUID();
const HIDDEN = randomUUID();
const DRAFT = randomUUID();

async function insertListing(id: string, status: string, expiresIn: string): Promise<void> {
  await pool.query(
    `INSERT INTO "listing"
       (id, publisher_id, publisher_type, property_type, city_id, zone_id, title, description,
        price_usd, rooms, area_m2, bathrooms, parking_spots,
        has_power_plant, has_regular_water, is_furnished, has_security, has_appliances,
        contact_method, contact_value, status, published_at, expires_at)
     VALUES ($1,$2,'owner','apartamento',$3,$4,'Apartamento con vista','Descripción larga.',
             450,2,78,2,1, false,false,false,false,false,
             'email','sin-contacto',$5, now(), now() + $6::interval)`,
    [id, OWNER, CITY, ZONE, status, expiresIn],
  );
}

beforeAll(async () => {
  await pool.query('INSERT INTO "city" (id, name) VALUES ($1,$2)', [CITY, `Ciudad ${CITY}`]);
  await pool.query(
    `INSERT INTO "zone" (id, city_id, name, kind, source) VALUES ($1,$2,$3,'parroquia','INE')`,
    [ZONE, CITY, `Zona ${ZONE}`],
  );
  for (const id of [OWNER, STRANGER]) {
    await pool.query('INSERT INTO "user" (id, name, email) VALUES ($1,$2,$3)', [
      id,
      `Cuenta ${id}`,
      `listo-${id}@example.com`,
    ]);
  }
  await insertListing(ACTIVE, "active", "30 days");
  await insertListing(EXPIRED_BY_DATE, "active", "-1 minute");
  await insertListing(EXPIRED, "expired", "-1 day");
  await insertListing(HIDDEN, "hidden", "30 days");
  await insertListing(DRAFT, "draft", "30 days");
});

afterAll(async () => {
  await pool.query('DELETE FROM "listing" WHERE publisher_id = $1', [OWNER]);
  await pool.query('DELETE FROM "user" WHERE id = ANY($1)', [[OWNER, STRANGER]]);
  await pool.query('DELETE FROM "zone" WHERE id = $1', [ZONE]);
  await pool.query('DELETE FROM "city" WHERE id = $1', [CITY]);
  await pool.end();
});

describe("el aviso recién publicado, leído de vuelta (37.3)", () => {
  it("devuelve el aviso propio y activo con lo que «Listo» dibuja", async () => {
    const listing = await published.findOwnActive(OWNER, ACTIVE, NOW);

    expect(listing).toEqual({
      id: ACTIVE,
      title: "Apartamento con vista",
      propertyType: "apartamento",
      cityName: `Ciudad ${CITY}`,
      zoneName: `Zona ${ZONE}`,
      priceUsd: 450,
      rooms: 2,
      bathrooms: 2,
      areaM2: 78,
      publisherType: "owner",
      expiresAt: expect.any(Date),
    });
    expect(listing?.expiresAt.getTime()).toBeGreaterThan(NOW.getTime());
  });

  it("el aviso de otra cuenta no existe para quien escribe su id en la URL", async () => {
    expect(await published.findOwnActive(STRANGER, ACTIVE, NOW)).toBeNull();
  });

  it("un id que no está en la base devuelve nada", async () => {
    expect(await published.findOwnActive(OWNER, randomUUID(), NOW)).toBeNull();
  });

  it("vencido por fecha aunque siga marcado activo: el barrido todavía no pasó", async () => {
    expect(await published.findOwnActive(OWNER, EXPIRED_BY_DATE, NOW)).toBeNull();
  });

  it("vencido, oculto por reportes o borrador: ninguno es un aviso publicado", async () => {
    for (const id of [EXPIRED, HIDDEN, DRAFT]) {
      expect(await published.findOwnActive(OWNER, id, NOW)).toBeNull();
    }
  });

  it("le pide a Postgres una sola fila con los tres filtros en el WHERE", async () => {
    const sent: string[] = [];
    const spied = drizzle(pool, {
      schema,
      logger: { logQuery: (query) => sent.push(query) },
    }) as unknown as PublicationDatabase;

    await new DrizzlePublishedListing(spied).findOwnActive(OWNER, ACTIVE, NOW);

    expect(sent).toHaveLength(1);
    // Only the WHERE clause: `expires_at` is also a selected column.
    const where = (sent[0] ?? "").toLowerCase().split(" where ")[1] ?? "";
    expect(where).toContain('"publisher_id"');
    expect(where).toContain('"status"');
    expect(where).toContain('"expires_at"');
    expect(where).toContain("limit");
  });
});
