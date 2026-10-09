import { characterCount, MIN_DESCRIPTION_CHARACTERS } from "./publishable-listing";

export interface DescriptionGuidance {
  readonly written: number;
  readonly minimum: number;
  readonly remaining: number;
  readonly progress: number;
  readonly sufficient: boolean;
}

export function descriptionGuidance(description?: string | null): DescriptionGuidance {
  const written = characterCount(description ?? "");
  const minimum = MIN_DESCRIPTION_CHARACTERS;

  return {
    written,
    minimum,
    remaining: Math.max(0, minimum - written),
    progress: Math.max(0, Math.min(100, Math.round((written / minimum) * 100))),
    sufficient: written >= minimum,
  };
}
