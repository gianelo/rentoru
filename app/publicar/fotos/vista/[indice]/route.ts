import {
  requireAuthenticatedSession,
  UnauthenticatedError,
} from "@/modules/identity/application/require-authenticated-session";
import { nextAuthSessionPort } from "@/modules/identity/infrastructure/session-port";
import { readDraftPhotoPreview } from "@/modules/listing-publication/application/draft-photo-preview";
import { createR2PhotoStorage } from "@/modules/listing-publication/infrastructure/r2-photo-storage";
import { publicationDraftDependencies } from "../../../draft";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ indice: string }> },
): Promise<Response> {
  const headers = {
    "cache-control": "private, no-store",
    "x-content-type-options": "nosniff",
  };
  try {
    const session = await requireAuthenticatedSession(nextAuthSessionPort);
    const { indice } = await context.params;
    const result = await readDraftPhotoPreview(
      session.userId,
      indice,
      new URL(request.url).searchParams.get("foto"),
      new Date(),
      { ...publicationDraftDependencies(), storage: createR2PhotoStorage() },
    );
    if (!result.ok) {
      return new Response(null, { status: result.reason === "notFound" ? 404 : 503, headers });
    }
    return new Response(new Uint8Array(result.bytes), {
      headers: { ...headers, "content-type": result.contentType },
    });
  } catch (error) {
    return new Response(null, {
      status: error instanceof UnauthenticatedError ? 401 : 503,
      headers,
    });
  }
}
