import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { listingPhotoDerivatives, listingPhotos, listings } from "../src/shared/db/schema";
import { DISTRITO, PUBLISHER } from "./seed-e2e";

const CI_URL = "postgresql://postgres:postgres@localhost:5432/rentas_test";
const OWNER = "I_OWN_THIS_DISPOSABLE_DB";

/** Refuse uncertain targets before constructing a Pool. Never accept URL decorations or remote hosts. */
export function requireDisposablePaginationTarget(
  connectionString: string | undefined,
  env: Record<string, string | undefined>,
): string {
  if (!connectionString) throw new Error("pagination seed: TEST_DATABASE_URL required");
  const url = new URL(connectionString);
  const canonical = url.toString() === connectionString;
  const loopback = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  const local =
    loopback &&
    url.protocol === "postgresql:" &&
    url.port === "5432" &&
    url.username === "postgres" &&
    url.password === "postgres" &&
    url.search === "" &&
    url.hash === "" &&
    canonical;
  if (
    !local ||
    !(
      (env.GITHUB_ACTIONS === "true" && connectionString === CI_URL) ||
      (env.PAGINATION_E2E_DB_OWNER === OWNER && url.pathname === "/rentas_pagination_ephemeral")
    )
  ) {
    throw new Error("pagination seed: requires owned disposable loopback database");
  }
  return connectionString;
}

export function paginationRows(now: Date) {
  return Array.from({ length: 24 }, (_, index) => {
    const number = index + 1;
    return {
      id: `e2e00029-0000-4000-8000-${String(number).padStart(12, "0")}`,
      title: `Apartamento paginación ${number} en Altamira`,
      cityId: DISTRITO.id,
      zoneId: "e2e-zona-altamira",
      status: "active" as const,
      publishedAt: new Date(now.getTime() - 60_000),
      expiresAt: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000),
    };
  });
}

/** Append only, after the original six-row suite completes successfully. */
export async function seedPaginationE2e(): Promise<void> {
  const connectionString = requireDisposablePaginationTarget(
    process.env.TEST_DATABASE_URL,
    process.env,
  );
  const pool = new Pool({ connectionString });
  try {
    const db = drizzle(pool);
    const now = new Date();
    const rows = paginationRows(now);
    await db.transaction(async (tx) => {
      await tx.insert(listings).values(
        rows.map((row) => ({
          ...row,
          publisherId: PUBLISHER.id,
          publisherType: "owner" as const,
          propertyType: "apartamento" as const,
          description: "Aviso de paginación para el catálogo de pruebas.",
          priceUsd: 320,
          rooms: 2,
          areaM2: 80,
          bathrooms: 2,
          parkingSpots: 1,
          contactMethod: "whatsapp" as const,
          contactValue: "sin-contacto",
        })),
      );
      await tx.insert(listingPhotos).values(
        rows.map((row) => ({
          id: `${row.id}-foto`,
          listingId: row.id,
          position: 0,
          createdAt: now,
        })),
      );
      await tx.insert(listingPhotoDerivatives).values(
        rows.flatMap((row) =>
          ["thumb", "card", "strip", "detail", "full"].map((name) => ({
            photoId: `${row.id}-foto`,
            name: name as "thumb" | "card" | "strip" | "detail" | "full",
            key: `e2e/${row.id}/${name}.webp`,
            bytes: 8192,
          })),
        ),
      );
    });
  } finally {
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await seedPaginationE2e();
}
