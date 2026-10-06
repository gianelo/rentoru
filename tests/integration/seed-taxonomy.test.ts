import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { searchPublicationZones } from "../../src/modules/listing-publication/application/search-publication-zones";
import type { PublicationDatabase } from "../../src/modules/listing-publication/infrastructure/drizzle-listing-repository";
import { DrizzleZoneVocabulary } from "../../src/modules/listing-publication/infrastructure/drizzle-zone-vocabulary";
import { type SeedDatabase, seed, seedTaxonomy } from "../../src/shared/db/seed";
import { withPoolCleanup } from "./support/pool-cleanup";

/**
 * **La taxonomía sin la demostración (17.15).**
 *
 * `seed()` era una sola función sin bandera: sembrar las 5.796 zonas del
 * territorio real obligaba a insertar además dos publicantes inventados y
 * diez avisos de mentira. Por eso nadie corrió nunca `pnpm db:seed` contra
 * el despliegue, y por eso producción llegó sin taxonomía.
 *
 * Lo que ninguna afirmación miraba —y es lo único que hace que esto se pueda
 * cablear al despliegue— es la MITAD QUE NO PASA: que `seedTaxonomy` no cree
 * ni un usuario ni un aviso. Un seed de taxonomía que dejara caer un aviso
 * de demostración en producción sería peor que no correrlo.
 */
function getTestDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL is not set. Start the disposable database with " +
        "`pnpm db:test:up && pnpm db:test:migrate`.",
    );
  }
  return url;
}

const client = new Client({ connectionString: getTestDatabaseUrl() });
const database = drizzle(client) as unknown as SeedDatabase;

async function countRows(table: string): Promise<number> {
  const result = await client.query(`SELECT count(*)::int AS n FROM "${table}"`);
  return result.rows[0].n as number;
}

describe("seedTaxonomy", () => {
  beforeAll(async () => {
    await client.connect();
    // A clean slate, and the same order as `seed.test.ts` for the same
    // reason: listing references user, zone and city. The user DELETE is
    // scoped to the seed publishers so the wipe cannot reach rows another
    // suite owns.
    await client.query('DELETE FROM "listing"');
    await client.query('DELETE FROM "zone"');
    await client.query('DELETE FROM "city"');
    await client.query(`DELETE FROM "user" WHERE email LIKE '%@rentas.invalid'`);
    await seedTaxonomy(database);
  }, 120_000);

  afterAll(async () => {
    await withPoolCleanup(client, async () => {
      // Deja la base como la encontró cualquier otra suite: este archivo
      // comparte el contenedor con las demás, y `fileParallelism: false`
      // sólo garantiza el orden, no que la última en correr limpie.
      await seed(database);
    });
  }, 120_000);

  it("populates the full taxonomy", async () => {
    // Los mismos números que `seed.test.ts` afirma para el seed completo:
    // partir la función no puede cambiar ni una fila del territorio.
    expect(await countRows("city")).toBe(5);
    expect(await countRows("zone")).toBe(5796);
    expect(await countRows("zone_alias")).toBe(4203);
  });

  it("inserts no user and no listing, so it can run against the real deployment", async () => {
    // La afirmación que autoriza el cableado al despliegue. Si esto sube de
    // cero, `pnpm db:seed:taxonomy` mete datos de mentira en producción.
    const publishers = await client.query(
      `SELECT count(*)::int AS n FROM "user" WHERE email LIKE '%@rentas.invalid'`,
    );
    expect(publishers.rows[0].n).toBe(0);
    expect(await countRows("listing")).toBe(0);
  });
});

// El afterAll anterior restaura la demo. Esta suite la aparta dentro de una
// transacción y la devuelve al terminar, sin borrar fixtures ajenas.
describe("36.6 catálogo real contra publicación", () => {
  const connection = new Client({ connectionString: getTestDatabaseUrl() });
  const handle = drizzle(connection);
  const vocabulary = new DrizzleZoneVocabulary(handle as unknown as PublicationDatabase);

  beforeAll(async () => {
    await connection.connect();
    await connection.query("BEGIN");
    const publishers = ["seed-owner@rentas.invalid", "seed-broker@rentas.invalid"];
    await connection.query(
      `DELETE FROM "listing" WHERE publisher_id IN
        (SELECT id FROM "user" WHERE email = ANY($1::text[]))`,
      [publishers],
    );
    await connection.query('DELETE FROM "user" WHERE email = ANY($1::text[])', [publishers]);
    await seedTaxonomy(handle as unknown as SeedDatabase);
  }, 120_000);
  afterAll(async () => {
    await withPoolCleanup(connection, async () => {
      await connection.query("ROLLBACK");
    });
  });

  it("conserva las cinco áreas y sus alias sin crear avisos ni usuarios", async () => {
    const counts = await connection.query(`SELECT c.name, count(DISTINCT z.id)::int AS zones,
      count(a.alias)::int AS aliases FROM city c JOIN zone z ON z.city_id = c.id
      LEFT JOIN zone_alias a ON a.zone_id = z.id GROUP BY c.name ORDER BY c.name`);
    expect(Object.fromEntries(counts.rows.map((row) => [row.name, row.aliases]))).toEqual({
      Caracas: 2141,
      "La Guaira": 430,
      Maracaibo: 1382,
      Cabimas: 116,
      "Santa Rita": 134,
    });
    expect(counts.rows.reduce((total, row) => total + row.zones, 0)).toBe(5796);
    const kinds = await connection.query("SELECT kind, count(*)::int AS n FROM zone GROUP BY kind");
    expect(Object.fromEntries(kinds.rows.map((row) => [row.kind, row.n]))).toEqual({
      municipio: 10,
      parroquia: 81,
      elemento: 5705,
    });
    for (const table of ["user", "listing"]) {
      const count = await connection.query(`SELECT count(*)::int AS n FROM "${table}"`);
      expect(count.rows[0].n).toBe(0);
    }
  });

  it.each([
    ["San Miguel", "dbcbaa62-9b6b-54ad-4fd8-8c13d27811f1"],
    ["San Rafael", "39a50c8d-c245-90e9-7f6e-cbda846ee04e"],
  ])("recupera Urbanización %s después de más de 60 candidatos", async (name, id) => {
    const query = `Urbanización ${name}`;
    const start = performance.now();
    const found = await vocabulary.lookup(query);
    console.info(
      `36.6 lookup ${query}: ${(performance.now() - start).toFixed(2)} ms; ` +
        `${found.zones.length} zonas, ${found.aliases.length} alias`,
    );
    expect(found.zones.length).toBeGreaterThan(60);
    expect(found.zones.some((zone) => zone.id === id)).toBe(true);
    expect(found.aliases).toContainEqual({ zoneId: id, alias: name });
    const results = await searchPublicationZones(query, vocabulary);
    expect(results.length).toBeLessThanOrEqual(8);
    expect(results).toContainEqual({
      zoneId: id,
      cityId: "05c26a6a-f2cb-1b98-e532-d2feaaad2de5",
      label: query,
      scope: "Francisco Eugenio Bustamante · Maracaibo",
    });
  });

  it("no trunca El Centro ni sus zonas encontradas por alias", async () => {
    const start = performance.now();
    const found = await vocabulary.lookup("El Centro");
    console.info(
      `36.6 lookup El Centro: ${(performance.now() - start).toFixed(2)} ms; ` +
        `${found.zones.length} zonas, ${found.aliases.length} alias`,
    );
    const matching = await connection.query(`SELECT zone_id FROM zone_alias WHERE alias ILIKE '%El%'
      OR alias ILIKE '%Centro%'`);
    expect(matching.rowCount).toBeGreaterThan(60);
    expect(found.aliases).toHaveLength(matching.rowCount ?? 0);
    const ids = new Set(found.zones.map((zone) => zone.id));
    for (const row of matching.rows) expect(ids.has(row.zone_id)).toBe(true);
    expect((await searchPublicationZones("El Centro", vocabulary)).length).toBeLessThanOrEqual(8);
  });

  it("conserva frase, substring, normalización, id y comodines literales", async () => {
    const phrase = await searchPublicationZones("apartamento en altamira", vocabulary);
    expect(phrase.some((option) => option.label.includes("Altamira"))).toBe(true);
    expect(phrase.length).toBeLessThanOrEqual(8);
    const substring = await searchPublicationZones("alta", vocabulary);
    expect(substring.length).toBeGreaterThan(0);
    expect(await searchPublicationZones("ALTA", vocabulary)).toEqual(substring);
    const id = "dbcbaa62-9b6b-54ad-4fd8-8c13d27811f1";
    expect((await vocabulary.lookup(id)).zones.map((zone) => zone.id)).toEqual([id]);
    for (const query of ["%", "__", "\\\\"])
      expect((await vocabulary.lookup(query)).zones).toEqual([]);
    expect(await vocabulary.lookup("")).toEqual({ cities: [], zones: [], aliases: [] });
  });
});
