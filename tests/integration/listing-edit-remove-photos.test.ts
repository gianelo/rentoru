import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type {
  AuthenticatedSession,
  SessionPort,
} from "../../src/modules/identity/application/ports/session.port";
import { editListing } from "../../src/modules/listing-publication/application/edit-listing";
import type { ListingEditWrite } from "../../src/modules/listing-publication/domain/listing-edit";
import {
  DrizzleListingEdit,
  DrizzleListingPhotoSet,
  DrizzleZoneCatalogue,
  type PublicationDatabase,
} from "../../src/modules/listing-publication/infrastructure/drizzle-listing-repository";
import * as schema from "../../src/shared/db/schema";

/**
 * Fase 44 (44.4, G3/D1) — **quitar las fotos marcadas al guardar, contra
 * Postgres de verdad.**
 *
 * Lo que ningún doble puede dar es la reversión: que un `UPDATE` refusado o
 * una marcada ajena deshagan los borrados que ya se hicieron en la MISMA
 * transacción. Por eso los casos de reversión llaman al adaptador directo, con
 * la foto propia primero: si sólo se probara el rechazo del caso de uso, el
 * dominio refusaría antes de escribir y la transacción nunca se pondría a
 * prueba.
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

const pool = new Pool({ connectionString: getTestDatabaseUrl() });
const db = drizzle(pool, { schema }) as unknown as PublicationDatabase;

const listings = new DrizzleListingEdit(db);
const photoSet = new DrizzleListingPhotoSet(db);
const zones = new DrizzleZoneCatalogue(db);

const CITY = randomUUID();
const ZONE = randomUUID();
const TITLE = "Apartamento amoblado en La Castellana";
const VALID_DESCRIPTION =
  "Apartamento en piso alto con vista abierta, cocina equipada con linea blanca, " +
  "planta electrica del edificio, vigilancia 24 horas y agua regular por tanque propio.";

const USER_IDS: string[] = [];

function sessionFor(userId: string): SessionPort {
  const session: AuthenticatedSession = { userId, email: null, name: null };
  return { getSession: async () => session };
}

async function insertUser(): Promise<string> {
  const id = randomUUID();
  USER_IDS.push(id);
  await pool.query(
    `INSERT INTO "user" (id, name, email, contact_method, contact_value)
     VALUES ($1,$2,$3,'whatsapp','04121234567')`,
    [id, "Dueño", `duenio-${id}@example.com`],
  );
  return id;
}

/** Un aviso con `photos` fotos en 0..n-1, cada una con sus cinco derivadas. */
async function insertListing(publisherId: string, photos: number, status = "active") {
  const listingId = randomUUID();
  await pool.query(
    `INSERT INTO "listing" (
       id, publisher_id, publisher_type, property_type, city_id, zone_id, title, description,
       price_usd, rooms, area_m2, bathrooms, parking_spots, status,
       contact_method, contact_value, published_at, expires_at)
     VALUES ($1,$2,'owner','apartamento',$3,$4,$5,$6,610,3,128,2,1,$7,'whatsapp',
       '04121234567', now(), now() + interval '30 days')`,
    [listingId, publisherId, CITY, ZONE, TITLE, VALID_DESCRIPTION, status],
  );
  const photoIds: string[] = [];
  for (let position = 0; position < photos; position++) {
    const photoId = randomUUID();
    photoIds.push(photoId);
    await pool.query(
      `INSERT INTO "listing_photo" (id, listing_id, position, created_at) VALUES ($1,$2,$3, now())`,
      [photoId, listingId, position],
    );
    for (const name of ["thumb", "card", "strip", "detail", "full"]) {
      await pool.query(
        `INSERT INTO "listing_photo_derivative" (photo_id, name, key, bytes) VALUES ($1,$2,$3,1)`,
        [photoId, name, `promoted/${photoId}/${name}.webp`],
      );
    }
  }
  return { listingId, photoIds };
}

async function positionsOf(listingId: string) {
  const { rows } = await pool.query(
    `SELECT id, position FROM "listing_photo" WHERE listing_id = $1 ORDER BY position`,
    [listingId],
  );
  return rows as { id: string; position: number }[];
}

async function derivativeCountOf(photoIds: readonly string[]): Promise<number> {
  const { rows } = await pool.query(
    `SELECT count(*)::int AS n FROM "listing_photo_derivative" WHERE photo_id = ANY($1)`,
    [photoIds],
  );
  return (rows[0] as { n: number }).n;
}

async function priceOf(listingId: string): Promise<number> {
  const { rows } = await pool.query(`SELECT price_usd FROM "listing" WHERE id = $1`, [listingId]);
  return (rows[0] as { price_usd: number }).price_usd;
}

/** Lo que el aviso de `insertListing` tiene, con el precio cambiado. */
const WRITE: ListingEditWrite = {
  title: TITLE,
  description: VALID_DESCRIPTION,
  priceUsd: 700,
  rooms: 3,
  bathrooms: 2,
  areaM2: 128,
  parkingSpots: 1,
  propertyType: "apartamento",
  reference: undefined,
  contactMethod: "whatsapp",
  contactValue: "04121234567",
  publisherType: "owner",
  hasPowerPlant: false,
  hasRegularWater: false,
  isFurnished: false,
  hasSecurity: false,
  hasAppliances: false,
};

beforeAll(async () => {
  await pool.query(`INSERT INTO "city" (id, name) VALUES ($1,$2)`, [CITY, `Ciudad ${CITY}`]);
  await pool.query(
    `INSERT INTO "zone" (id, city_id, name, kind, source) VALUES ($1,$2,$3,'parroquia','INE')`,
    [ZONE, CITY, `Zona ${ZONE}`],
  );
});

afterAll(async () => {
  if (USER_IDS.length > 0) {
    await pool.query(`DELETE FROM "user" WHERE id = ANY($1)`, [USER_IDS]);
  }
  await pool.query(`DELETE FROM "zone" WHERE id = $1`, [ZONE]);
  await pool.query(`DELETE FROM "city" WHERE id = $1`, [CITY]);
  await pool.end();
});

describe("guardar quitando fotos marcadas — contra Postgres de verdad (44.4)", () => {
  it("quita las marcadas con sus derivadas, renumera, guarda los campos y devuelve las claves", async () => {
    const owner = await insertUser();
    const { listingId, photoIds } = await insertListing(owner, 4);
    const [a, b, c, d] = photoIds as [string, string, string, string];
    const removed: string[] = [];

    const result = await editListing(
      { listingId, edit: { priceUsd: 700 }, photoIdsToRemove: [c, a] },
      {
        sessionPort: sessionFor(owner),
        zones,
        listings,
        photoRemoval: {
          order: photoSet,
          listings,
          storage: { remove: async (key: string) => void removed.push(key) },
        },
      },
    );

    expect(result).toEqual({ listingId, coverChangedTo: b });
    expect(await positionsOf(listingId)).toEqual([
      { id: b, position: 0 },
      { id: d, position: 1 },
    ]);
    expect(await derivativeCountOf([a, c])).toBe(0);
    expect(await derivativeCountOf([b, d])).toBe(10);
    expect(await priceOf(listingId)).toBe(700);
    expect([...removed].sort()).toEqual(
      [a, c]
        .flatMap((id) =>
          ["card", "detail", "full", "strip", "thumb"].map((n) => `promoted/${id}/${n}.webp`),
        )
        .sort(),
    );
  });

  it("si el UPDATE guardado refusa (aviso vencido), los borrados ya hechos se revierten", async () => {
    const owner = await insertUser();
    const { listingId, photoIds } = await insertListing(owner, 3, "expired");

    const outcome = await listings.applyEditRemovingPhotos(
      listingId,
      owner,
      WRITE,
      [photoIds[0] as string],
      photoIds,
    );

    expect(outcome).toEqual({ applied: false, reason: "listing" });
    expect(await positionsOf(listingId)).toEqual(
      photoIds.map((id, position) => ({ id, position })),
    );
    expect(await derivativeCountOf(photoIds)).toBe(15);
    expect(await priceOf(listingId)).toBe(610);
  });

  it("si el UPDATE refusa porque el aviso es de otra cuenta, tampoco queda nada borrado", async () => {
    const owner = await insertUser();
    const stranger = await insertUser();
    const { listingId, photoIds } = await insertListing(owner, 2);

    const outcome = await listings.applyEditRemovingPhotos(
      listingId,
      stranger,
      WRITE,
      [photoIds[1] as string],
      photoIds,
    );

    expect(outcome).toEqual({ applied: false, reason: "listing" });
    expect(await positionsOf(listingId)).toHaveLength(2);
    expect(await derivativeCountOf(photoIds)).toBe(10);
    expect(await priceOf(listingId)).toBe(610);
  });

  it("una marcada de OTRO aviso revierte la propia que ya se había borrado, y no toca la ajena", async () => {
    const owner = await insertUser();
    const propio = await insertListing(owner, 3);
    const otro = await insertListing(owner, 2);

    const outcome = await listings.applyEditRemovingPhotos(
      propio.listingId,
      owner,
      WRITE,
      [propio.photoIds[0] as string, otro.photoIds[0] as string],
      propio.photoIds,
    );

    expect(outcome).toEqual({ applied: false, reason: "photos" });
    expect(await positionsOf(propio.listingId)).toEqual(
      propio.photoIds.map((id, position) => ({ id, position })),
    );
    expect(await positionsOf(otro.listingId)).toHaveLength(2);
    expect(await derivativeCountOf([...propio.photoIds, ...otro.photoIds])).toBe(25);
    expect(await priceOf(propio.listingId)).toBe(610);
  });

  it("una marcada propia que ya no está revierte la otra que sí se borró", async () => {
    const owner = await insertUser();
    const { listingId, photoIds } = await insertListing(owner, 3);
    const [a, b, c] = photoIds as [string, string, string];
    await pool.query(`DELETE FROM "listing_photo" WHERE id = $1`, [c]);

    const outcome = await listings.applyEditRemovingPhotos(
      listingId,
      owner,
      WRITE,
      [a, c],
      photoIds,
    );

    expect(outcome).toEqual({ applied: false, reason: "photos" });
    expect(await positionsOf(listingId)).toEqual([
      { id: a, position: 0 },
      { id: b, position: 1 },
    ]);
    expect(await priceOf(listingId)).toBe(610);
  });

  /**
   * El defecto que el piso en memoria no puede ver (verificador, punto 8): dos
   * guardados a la vez sobre un aviso de dos fotos, cada uno marcando una
   * distinta, pasan los dos el plan. El candado sobre la fila del aviso los
   * pone en fila, y el segundo encuentra un conjunto que ya no es el que
   * planificó.
   */
  it("dos guardados simultáneos que marcan fotos distintas no dejan el aviso sin fotos", async () => {
    const owner = await insertUser();
    const { listingId, photoIds } = await insertListing(owner, 2);
    const [a, b] = photoIds as [string, string];

    const outcomes = await Promise.all([
      listings.applyEditRemovingPhotos(listingId, owner, WRITE, [a], photoIds),
      listings.applyEditRemovingPhotos(listingId, owner, WRITE, [b], photoIds),
    ]);

    expect(outcomes.filter((outcome) => outcome.applied)).toHaveLength(1);
    expect(outcomes.filter((outcome) => !outcome.applied)).toEqual([
      { applied: false, reason: "photos" },
    ]);
    expect(await positionsOf(listingId)).toHaveLength(1);
  });
});
