import {
  requireAuthenticatedSession,
  UnauthenticatedError,
} from "@/modules/identity/application/require-authenticated-session";
import { nextAuthSessionPort } from "@/modules/identity/infrastructure/session-port";
import { searchPublicationZones } from "@/modules/listing-publication/application/search-publication-zones";
import { DrizzleZoneVocabulary } from "@/modules/listing-publication/infrastructure/drizzle-zone-vocabulary";
import { db } from "@/shared/db/client";

// Transporte preparado para la mejora progresiva; no activa la UI dinámica.
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const headers = { "cache-control": "no-store" };
  try {
    await requireAuthenticatedSession(nextAuthSessionPort);
    const query = new URL(request.url).searchParams.get("q") ?? "";
    const results = await searchPublicationZones(query, new DrizzleZoneVocabulary(db));
    return Response.json(results, { headers });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return Response.json({ error: "unauthorized" }, { status: 401, headers });
    }
    return Response.json({ error: "internal_error" }, { status: 500, headers });
  }
}
