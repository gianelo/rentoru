import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppLink } from "@/../components/atoms/AppLink";
import { Price } from "@/../components/atoms/Price";
import { PublisherBadge } from "@/../components/atoms/PublisherBadge";
import { DrizzleListingPhotos } from "@/modules/listing-discovery/infrastructure/drizzle-listing-photos";
import { readPhotoPublicBaseUrl } from "@/modules/listing-discovery/infrastructure/photo-public-base-url";
import { LISTING_ACTIVE_DAYS } from "@/modules/listing-publication/application/publish-listing";
import { readPublishedListing } from "@/modules/listing-publication/application/read-published-listing";
import { publishedListingView } from "@/modules/listing-publication/domain/published-listing-view";
import { DrizzlePublishedListing } from "@/modules/listing-publication/infrastructure/drizzle-published-listing";
import { db } from "@/shared/db/client";
import { requireSession } from "../../_lib/require-session";
import styles from "../publish-page.module.css";
import { PROPERTY_TYPE_LABEL } from "../step-copy";

export const metadata: Metadata = {
  title: "Aviso publicado — Rentoru",
  // 26.12 — relativa: `metadataBase` le pone la base una sola vez.
  alternates: { canonical: "/publicar/listo" },
};

interface DonePageProps {
  searchParams: Promise<{ id?: string | string[] }>;
}

/**
 * The end of the publish flow (fase 37, lámina `Rentoru - Publicar - Listo-v2`).
 *
 * The id arrives in the URL, so anyone can type another one. The read only
 * returns the signed-in publisher's own active listing; anything else —
 * missing, someone else's, expired — lands on Mis avisos the same way (G3),
 * so the response never tells which ids exist.
 */
export default async function PublishDonePage({ searchParams }: DonePageProps) {
  const session = await requireSession("/publicar");
  const { id } = await searchParams;

  const reading = await readPublishedListing(session.userId, id, new Date(), {
    listing: new DrizzlePublishedListing(db),
    covers: new DrizzleListingPhotos(db),
  });
  if (!reading) redirect("/mis-avisos");

  const { listing } = reading;
  const view = publishedListingView(reading, readPhotoPublicBaseUrl());

  return (
    <>
      <header className={styles.bar}>
        <div className={styles.barInner}>
          <p className={styles.brand}>Rentoru</p>
          <span className={styles.step}>
            <span aria-hidden="true">✓</span> Publicado
          </span>
        </div>
      </header>

      <main className={styles.column}>
        <span aria-hidden="true">✓</span>
        <h1 className={styles.title}>Tu aviso está publicado</h1>
        <p>Ya aparece en las búsquedas y cualquiera puede verlo.</p>

        <article aria-label="Aviso publicado">
          {view.cover ? (
            <picture>
              <source media="(min-width: 768px)" srcSet={view.cover.cardUrl} />
              <img src={view.cover.thumbUrl} alt={view.cover.alt} />
            </picture>
          ) : null}
          <p>
            <Price usd={listing.priceUsd} /> al mes
          </p>
          <p>
            {PROPERTY_TYPE_LABEL[listing.propertyType]} · {listing.zoneName}
          </p>
          <p>
            {view.sizeLine} <PublisherBadge publisherType={listing.publisherType} />
          </p>
        </article>

        <section aria-labelledby="vigencia">
          <h2 id="vigencia">Activo hasta</h2>
          <p>
            <time dateTime={view.expiresOnIso}>{view.expiresOn}</time>
          </p>
          <p>
            Dura {LISTING_ACTIVE_DAYS} días. Te avisamos por correo antes de que venza para que
            puedas renovarlo.
          </p>
        </section>

        <nav aria-label="Qué puedes hacer ahora">
          <AppLink href={view.listingHref}>Ver mi aviso</AppLink>
          <AppLink href={view.myListingsHref}>Ir a Mis avisos</AppLink>
          <AppLink href={view.publishAgainHref}>Publicar otro aviso</AppLink>
        </nav>
      </main>
    </>
  );
}
