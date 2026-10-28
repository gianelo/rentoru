import type { CataloguePort } from "../../listing-catalogue/application/ports/catalogue.port";
import type { ZoneCataloguePort } from "../../listing-publication/application/ports/zone-catalogue.port";
import { publicationContactSchema } from "../../listing-publication/application/publication-contact-schema";
import {
  type ResolvedImportContact,
  resolveImportAccountContact,
} from "../domain/import-account-contact";
import {
  type ImportRowValidationOutcome,
  validateImportRows,
} from "../domain/import-row-validation";
import {
  applyResolvedLocations,
  mergeLocationResolutionErrors,
  resolveImportRowLocations,
} from "../domain/resolve-import-locations";
import { collectCuratedZonesForRows } from "./collect-curated-zones";
import { parseImportFile } from "./parse-import-file";
import type { ImportAccountContactPort } from "./ports/import-account-contact.port";
import type { ImportFileSourcePort } from "./ports/import-file-source.port";

/**
 * design.md's contact rule, made executable at the import boundary:
 * `listing.contact_method`/`contact_value` are NOT NULL, `user.contact_
 * method`/`contact_value` are nullable, and the CSV never carries contact
 * at all. An account with no default cannot produce a single valid draft —
 * refusing fifty rows that could never be activated, silently, is worse
 * than refusing the whole import up front with an actionable message.
 * Since tasks.md 45.2 the import screen asks for the contact, so the message
 * points there instead of at an account screen that does not exist.
 */
export class ImportMissingAccountContactError extends Error {
  constructor() {
    super(
      "Indica cómo te contactan antes de revisar el archivo: " +
        "un borrador importado sin un contacto que mostrar no se puede activar.",
    );
    this.name = "ImportMissingAccountContactError";
  }
}

/** What the import screen sends next to the file (tasks.md 45.2, G1). Raw form text. */
export interface SubmittedImportContact {
  readonly contactMethod?: string;
  readonly contactValue?: string;
}

export type ImportContactViolation =
  | "contactMethod.required"
  | "contactValue.required"
  | "contactValue.invalid";

/**
 * The submitted contact failed the same schema publish uses (36.14). Thrown
 * before the file is parsed: every row would carry the same bad contact, and
 * fifty identical row errors are one fact, not fifty.
 */
export class ImportInvalidContactError extends Error {
  readonly field: "contactMethod" | "contactValue";

  constructor(
    readonly violation: ImportContactViolation,
    readonly submitted: SubmittedImportContact,
  ) {
    super(violation);
    this.name = "ImportInvalidContactError";
    this.field = violation === "contactMethod.required" ? "contactMethod" : "contactValue";
  }
}

export interface ImportValidationOutcome extends ImportRowValidationOutcome {
  readonly totalRows: number;
  /** The contact every valid row carries; `confirmImport` saves it as the account default. */
  readonly contact: ResolvedImportContact;
}

function isBlank(value: string | undefined): boolean {
  return value === undefined || value.trim() === "";
}

/**
 * `null` means nothing was submitted, so the account default decides. Anything
 * typed at all is validated and either wins or refuses — never silently
 * replaced by the stored default.
 */
function resolveSubmittedContact(
  submitted: SubmittedImportContact | undefined,
): ResolvedImportContact | null {
  if (!submitted || (isBlank(submitted.contactMethod) && isBlank(submitted.contactValue))) {
    return null;
  }
  const result = publicationContactSchema.safeParse(submitted);
  if (!result.success) {
    throw new ImportInvalidContactError(
      result.error.issues[0]?.message as ImportContactViolation,
      submitted,
    );
  }
  return {
    contactMethod: result.data.contactMethod,
    contactValue: result.data.contactValue as string,
  };
}

export interface RunImportValidationDependencies {
  readonly contact: ImportAccountContactPort;
  readonly zones: ZoneCataloguePort;
  /**
   * Read access to the FULL city/zone taxonomy — names included — for
   * `resolve-import-locations.ts`'s ciudad/zona-by-name resolution.
   * `ZoneCataloguePort` above stays scoped to ids per city (what the
   * curated-zone rule needs); `CataloguePort` is reused UNCHANGED from
   * `listing-catalogue` (same decision `generate-import-template.ts`
   * already made) rather than widened into a second "list everything"
   * port.
   */
  readonly catalogue: CataloguePort;
}

/**
 * broker-bulk-import spec, "Whole-File Validation Before Any Write" +
 * "Preview and Confirmation with Per-Row Errors" (tasks.md 9.12-9.17).
 *
 * **The one place both `ValidateImportUseCase` (preview) and
 * `ConfirmImportUseCase` (confirm) run validation.** Calling this function
 * twice against the same file produces the same verdict — which is what
 * makes "confirm creates exactly the rows the preview reported as valid"
 * true by construction, rather than by two independent implementations
 * happening to agree. Order, and why: the account-contact guard runs before
 * a single byte of the file is parsed, because a broker whose account is
 * missing a default contact learns that immediately rather than after
 * waiting on a 2 MB upload to parse.
 */
export async function runImportValidation(
  userId: string,
  source: ImportFileSourcePort,
  dependencies: RunImportValidationDependencies,
  submitted?: SubmittedImportContact,
): Promise<ImportValidationOutcome> {
  const { contact, zones, catalogue } = dependencies;

  const resolvedContact =
    resolveSubmittedContact(submitted) ??
    resolveImportAccountContact(await contact.findAccountContact(userId));
  if (!resolvedContact) {
    throw new ImportMissingAccountContactError();
  }

  const { rows } = await parseImportFile(source);

  // Name -> id resolution runs BEFORE the curated-zone rule and before
  // validateImportRows — everything past this point keeps working in ids,
  // unchanged (mvp-rental-listings unplanned work unit: "bulk import:
  // resolve ciudad and zona by name").
  const [cities, catalogueZones] = await Promise.all([
    catalogue.listCities(),
    catalogue.listZones(),
  ]);
  const locationOutcomes = resolveImportRowLocations(rows, cities, catalogueZones);
  const preparedRows = applyResolvedLocations(rows, locationOutcomes);

  const curatedZones = await collectCuratedZonesForRows(preparedRows, zones);

  // `rows` — las del ARCHIVO — viaja como cuarto/tercer argumento a las dos
  // (tasks.md 9.29). Las reglas siguen corriendo sobre `preparedRows`, que
  // trabajan en ids; lo único que sale de `rows` son las celdas que 14g
  // dibuja, y salen de ahí porque `applyResolvedLocations` ya reemplazó
  // `ciudad`/`zona` por sus ids justo arriba.
  const validationOutcome = validateImportRows(preparedRows, curatedZones, resolvedContact, rows);
  const outcome = mergeLocationResolutionErrors(validationOutcome, locationOutcomes, rows);

  return { totalRows: rows.length, contact: resolvedContact, ...outcome };
}
