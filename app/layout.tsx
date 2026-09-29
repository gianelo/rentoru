import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { SOCIAL_CARD } from "@/modules/listing-discovery/domain/social-card";
import { readSiteBaseUrl } from "@/modules/listing-discovery/infrastructure/site-base-url";
import {
  FOOTER_LINK_CATALOGUE,
  groupResolvedFooterLinks,
  resolveFooterLinks,
} from "@/modules/site-footer/domain/footer-links";
import { SiteFooter } from "../components/organisms/SiteFooter";
import "@/styles/tokens.css";
import "@/styles/base.css";

// The read path works without client-side JavaScript and ships no webfonts
// (design.md D13/D14). The root layout uses the system font stack —
// no <link> to a webfont, no font-loading component, no client component.
// `SiteFooter` (tasks.md 23.1) is not the first thing to break that: it
// carries no "use client" and no state, and its own file says so.
//
// data-theme / data-layout (design.md D16, tasks.md 1b.2) are set here,
// once, on the root element. No component reads either attribute directly —
// every component resolves colour, radius, and geometry through the CSS
// custom properties these two attributes select in src/styles/tokens.css.

// tasks.md 26.12 — `metadataBase`, and why the host is written exactly once.
//
// Every `alternates.canonical` in `app/` is a RELATIVE path. This is the
// single place that turns them into absolute URLs, so a deploy on a preview
// domain canonicalises against its own origin without a line of code
// changing. Writing the host in each page instead would put it in 27 files,
// which is 26 correct renames and one that is not.
//
// **It reads `readSiteBaseUrl()` and never a literal**, so it fails closed
// exactly as `robots.ts` and `sitemap.ts` do (task 26.10, AGENTS.md §7):
// without `SITE_URL` the build stops here rather than publishing canonicals
// and social cards that point somewhere else. That is deliberate — a wrong
// canonical is not reported by anything, it is simply obeyed.
//
// `app/opengraph-image.tsx` is attached to every route by file convention,
// and it fills BOTH `og:image` and `twitter:image` — measured on the built
// output, not assumed — so no image is named here. `twitter.card` is, because
// nothing else says a 1200×630 image should be shown at full width.
export const metadata: Metadata = {
  metadataBase: new URL(readSiteBaseUrl()),
  title: "Rentoru",
  description: "Free long-stay residential rental marketplace for Venezuela.",
  openGraph: {
    type: "website",
    siteName: "Rentoru",
    locale: "es_VE",
    title: "Rentoru",
    description: SOCIAL_CARD.tagline,
  },
  twitter: {
    card: "summary_large_image",
    title: "Rentoru",
    description: SOCIAL_CARD.tagline,
  },
};

// tasks.md 23.1/23.2 — the site footer. `linkGroups` is resolved once, here,
// from the product-rule registry in `src/modules/site-footer/domain`
// (AGENTS.md §7 — fail closed): today it resolves to zero groups, because
// none of the ten destinations the design names exists yet, and an empty
// footer link section is the correct, complete state tasks.md 23.2
// describes, not a placeholder.
const FOOTER_LINK_GROUPS = groupResolvedFooterLinks(resolveFooterLinks(FOOTER_LINK_CATALOGUE));

export default async function RootLayout({ children }: { children: ReactNode }) {
  // D30 reverses the detail-page exception in tasks.md 23.3: its own
  // ID/report footer is followed by the distinct site footer. Only the
  // immersive photo viewer hides the site footer. This layout has no route
  // context, so middleware stamps the hide header for the viewer alone;
  // absence means "render the site footer".
  //
  // Known cost, measured 2026-09-04: calling `headers()` here opts every
  // route into dynamic rendering. `/_not-found`, `/measure`, and
  // `/measure/lista` flipped from static (○) to dynamic (ƒ) in the build
  // output the day this landed; `budget:bundle` is unchanged (110.67 KB
  // gzip) because dynamic vs. static does not change the client bundle it
  // measures. The founder accepted this cost. It matters for tasks.md 23.9:
  // the ten upcoming Ayuda/Legales pages are declared "contenido estático y
  // público … no tienen por qué costar una consulta", and as long as this
  // layout reads `headers()`, none of them can prerender either — a known
  // follow-up, not solved here.
  const hideSiteFooter = (await headers()).get("x-hide-site-footer") === "1";
  return (
    <html lang="es" data-theme="menta" data-layout="compacto">
      <body>
        {children}
        {!hideSiteFooter && <SiteFooter linkGroups={FOOTER_LINK_GROUPS} />}
      </body>
    </html>
  );
}
