import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { listingIdFromSlug } from "@/modules/listing-discovery/domain/listing-url";

// D30 restores the site footer below the listing's own ID/report footer.
// Only the immersive photo viewer hides it. The root layout uses this header
// because it cannot inspect the route directly; absence renders the footer.

// tasks.md 22.16 — DECIDIDO POR EL FUNDADOR el 2026-09-07: se arregla acá y
// NO en la ficha. Medido al cerrar la 11b.3: un slug MALFORMADO —uno donde
// `listingIdFromSlug` no encuentra un id al final— hace que la ficha llame
// `notFound()` dentro de una ruta dinámica, y Next envuelve esa ruta en un
// límite de Suspense que dibuja del lado del CLIENTE; con el script apagado
// el cuerpo servido es sólo el marcador de Flight, sin `<h1>` y sin salida.
// Las otras tres causas del mismo `notFound()` —id con forma válida pero sin
// fila, ciudad inexistente, zona inexistente— necesitan una consulta contra
// Postgres y quedan fuera A PROPÓSITO (alcance decidido, no ampliado de
// paso): ese trabajo no puede vivir en el Edge, y el `matcher` de este
// archivo ya no las alcanza.
//
// `listingIdFromSlug` es segura para el runtime Edge: es una función pura
// sobre `string` —una expresión regular y `.toLowerCase()`— sin I/O, sin
// ninguna API de Node y sin ningún otro import transitivo (ver
// src/modules/listing-discovery/domain/listing-url.ts).
//
// El destino del rewrite NO es una página nueva: ningún directorio de `app/`
// se llama así, así que Next lo resuelve exactamente por el mismo camino que
// ya sirve `app/not-found.tsx` completo cuando una dirección no coincide con
// ninguna ruta —el caso que la 11b.3 midió sirviéndose entero en el HTML—:
// prerenderizado en el build, sin límite de Suspense, con su propio
// `<meta name="robots" content="noindex, follow">`. No es una superficie
// indexable nueva: nada la enlaza, no tiene `page.tsx` propio y por eso
// jamás entra a `app/sitemap.ts`, que sólo enumera avisos reales. El
// `status: 404` se fija explícito porque un rewrite no hereda por descuento
// el código de estado de su destino.
const MALFORMED_SLUG_DESTINATION = "/slug-de-aviso-malformado";

function malformedSlugRewrite(request: NextRequest): NextResponse | null {
  // /alquiler/:ciudad/:zona/:slug[/foto/:n] — el slug es siempre el cuarto
  // segmento en las dos formas que cubre `matcher`.
  const slug = request.nextUrl.pathname.split("/").filter(Boolean)[3];
  if (slug === undefined || listingIdFromSlug(slug) !== null) return null;

  return NextResponse.rewrite(new URL(MALFORMED_SLUG_DESTINATION, request.url), {
    status: 404,
  });
}

export function middleware(request: NextRequest): NextResponse {
  const malformed = malformedSlugRewrite(request);
  if (malformed) return malformed;

  if (!request.nextUrl.pathname.match(/\/foto\/[^/]+\/?$/)) return NextResponse.next();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-hide-site-footer", "1");
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/alquiler/:ciudad/:zona/:slug", "/alquiler/:ciudad/:zona/:slug/foto/:n"],
};
