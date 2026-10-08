import { ContactSavedDraft, type QueryPort } from "./contact-saved-draft";

/** Fresh title cases compose the retained contact fixture; mutated cases are never cleaned. */
export class TitleSavedDraft {
  private readonly contact: ContactSavedDraft;

  constructor(
    dsn: string,
    private readonly port: QueryPort,
    identity: string,
  ) {
    if (!/^case-title-[a-z0-9][a-z0-9-]*$/.test(identity)) {
      throw new Error("title case identity required");
    }
    this.contact = new ContactSavedDraft(dsn, port, identity);
  }

  get publisherId() {
    return this.contact.publisherId;
  }

  get sessionToken() {
    return this.contact.sessionToken;
  }

  async ensure(now: Date) {
    // Endpoint confinement is not row authority: all three identities must be fresh.
    for (const [statement, key] of [
      ['SELECT id, name, email FROM "user" WHERE id = $1', this.publisherId],
      [
        'SELECT "sessionToken", "userId", expires FROM "session" WHERE "sessionToken" = $1',
        this.sessionToken,
      ],
      [
        "SELECT answers, photos, expires_at FROM publish_draft WHERE publisher_id = $1",
        this.publisherId,
      ],
    ] as const) {
      if ((await this.port.query(statement, [key])).rows.length) {
        throw new Error("fresh title case required");
      }
    }
    const { rows: zones } = await this.port.query(
      'SELECT id, city_id AS "cityId" FROM zone ORDER BY id LIMIT 1',
    );
    const zone = zones[0];
    if (
      zones.length !== 1 ||
      !zone ||
      typeof zone.id !== "string" ||
      !zone.id ||
      typeof zone.cityId !== "string" ||
      !zone.cityId
    ) {
      throw new Error("existing curated zone required");
    }
    const owned = await this.contact.ensure(now);
    const previous = owned.snapshot;
    const answers: typeof previous.answers = {
      ...previous.answers,
      listing: {
        ...previous.answers.listing,
        cityId: zone.cityId,
        zoneId: zone.id,
        priceUsd: 500,
        rooms: 2,
        bathrooms: 1,
        parkingSpots: 0,
        areaM2: 70,
      },
      featuresDeclared: true,
    };
    // Compare the complete seed; only answers change, never photos or expiry.
    const initialized = await this.port.query(
      "UPDATE publish_draft SET answers = $2::jsonb WHERE publisher_id = $1 AND answers = $3::jsonb AND photos = $4::jsonb AND expires_at = $5::timestamptz RETURNING publisher_id",
      [
        this.publisherId,
        JSON.stringify(answers),
        JSON.stringify(previous.answers),
        JSON.stringify(previous.photos),
        previous.expiresAt,
      ],
    );
    if (initialized.rows.length !== 1) throw new Error("title initialization conflict");
    return { ...owned, snapshot: await this.contact.snapshot() };
  }

  snapshot() {
    return this.contact.snapshot();
  }
}
