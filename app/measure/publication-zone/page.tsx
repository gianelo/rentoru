import { notFound } from "next/navigation";
import { searchPublicationZones } from "../../../src/modules/listing-publication/domain/zone-search";
import { PublicationZoneReference } from "../../publicar/PublicationZoneControls";
import {
  PublicationZoneEnhancement,
  PublicationZoneResults,
  PublicationZoneSearch,
} from "../../publicar/PublicationZoneEnhancement";

const selected = { zoneId: "saved", label: "Zona guardada" };

/** Sólo vocabulario sintético; no sesión, acciones, infraestructura ni POST. */
export default async function PublicationZoneMeasure({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  if (process.env.F365_ZONE_MEASURE !== "true") notFound();
  const { q = "" } = await searchParams;
  const results = searchPublicationZones(q, {
    cities: [
      { id: "dc", name: "Distrito Capital" },
      { id: "mc", name: "Maracaibo" },
    ],
    zones: [
      { id: "fresh", name: "Alta Florida", cityId: "dc", parentName: "Libertador" },
      { id: "other", name: "Alta Florida", cityId: "mc", parentName: null },
    ],
    aliases: [],
  });
  return (
    <main>
      <h1>¿En qué zona queda?</h1>
      <PublicationZoneEnhancement enabled results={results} selected={selected}>
        <PublicationZoneSearch query={q} action="/measure/publication-zone" />
        <form method="post">
          <PublicationZoneResults results={results} selected={selected} />
          <PublicationZoneReference reference="Original" />
          <button type="submit">Seguir</button>
        </form>
      </PublicationZoneEnhancement>
    </main>
  );
}
