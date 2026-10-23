import {
  type PublicationZoneOption,
  searchPublicationZones as searchVocabulary,
} from "../domain/zone-search";
import type { ZoneVocabularyPort } from "./ports/zone-vocabulary.port";

/** Mismas decisiones para el GET nativo y el transporte JSON de publicación. */
export async function searchPublicationZones(
  text: string,
  vocabulary: ZoneVocabularyPort,
): Promise<readonly PublicationZoneOption[]> {
  if (!text) return [];
  return searchVocabulary(text, await vocabulary.lookup(text));
}
