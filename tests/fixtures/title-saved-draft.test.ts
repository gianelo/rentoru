import { describe, expect, it } from "vitest";
import { ContactSavedDraft, OWNED_DSN, type QueryPort } from "./contact-saved-draft";
import { TitleSavedDraft } from "./title-saved-draft";

const now = new Date("2030-01-01T00:00:00.123Z");
const zone = { id: "mock-curated-zone", cityId: "mock-curated-city" };
type Row = Record<string, unknown>;
function memory() {
  const tables = {
    users: new Map<string, Row>(),
    sessions: new Map<string, Row>(),
    drafts: new Map<string, Row>(),
  };
  const calls: string[] = [];
  let beforeTitleUpdate: (() => void) | undefined;
  const port: QueryPort = {
    async query(sql, values = []) {
      calls.push(sql);
      if (sql === 'SELECT id, city_id AS "cityId" FROM zone ORDER BY id LIMIT 1') {
        return { rows: [zone] };
      }
      const [id, a, b, c] = values;
      const key = String(id);
      const table = sql.includes('"user"')
        ? tables.users
        : sql.includes('"session"')
          ? tables.sessions
          : tables.drafts;
      if (sql.startsWith("SELECT")) {
        const row = table.get(key);
        return { rows: row ? [structuredClone(row)] : [] };
      }
      if (sql.startsWith("INSERT") && !table.has(key)) {
        table.set(
          key,
          table === tables.users
            ? { id, name: a, email: b }
            : table === tables.sessions
              ? { sessionToken: id, userId: a, expires: b }
              : {
                  answers: JSON.parse(String(a)),
                  photos: JSON.parse(String(b)),
                  expires_at: c,
                },
        );
        return { rows: [] };
      }
      if (sql.startsWith("UPDATE publish_draft")) {
        beforeTitleUpdate?.();
        // The race case must reach the real conditional UPDATE, not a SELECT-only check.
        expect(sql).toMatch(
          /WHERE[\s\S]*publisher_id[\s\S]*answers[\s\S]*photos[\s\S]*expires_at/i,
        );
        const row = table.get(key);
        expect(values).toHaveLength(5);
        if (
          !row ||
          JSON.stringify(row.answers) !== b ||
          JSON.stringify(row.photos) !== c ||
          (row.expires_at instanceof Date ? row.expires_at.toISOString() : row.expires_at) !==
            values[4]
        ) {
          return { rows: [] };
        }
        row.answers = JSON.parse(String(a));
        return { rows: [structuredClone(row)] };
      }
      throw new Error(`unexpected fixture query: ${sql}`);
    },
  };
  return {
    ...tables,
    calls,
    port,
    race(change: () => void) {
      beforeTitleUpdate = change;
    },
  };
}

describe("title-ready owned draft", () => {
  it("initializes distinct fresh title cases, preserving reference, frozen photos and expiry", async () => {
    const db = memory();
    const baseline = new ContactSavedDraft(OWNED_DSN, db.port);
    const retained = await baseline.ensure(now);
    const owners = new Set<string>();
    for (const identity of ["case-title-js-on", "case-title-js-off"]) {
      const fixture = new TitleSavedDraft(OWNED_DSN, db.port, identity);
      const result = await fixture.ensure(now);
      owners.add(result.publisherId);
      expect(result.snapshot.answers.listing).toMatchObject({
        zoneId: zone.id,
        cityId: zone.cityId,
        propertyType: "apartamento",
        reference: retained.snapshot.answers.listing.reference,
        priceUsd: 500,
        rooms: 2,
        bathrooms: 1,
        parkingSpots: 0,
        areaM2: 70,
      });
      expect(result.snapshot.answers.featuresDeclared).toBe(true);
      expect(result.snapshot.answers.violations).toEqual([]);
      expect(result.snapshot.photos).toEqual(retained.snapshot.photos);
      expect(result.snapshot.expiresAt).toBe(retained.snapshot.expiresAt);
      expect(Object.isFrozen(result.snapshot.answers.listing)).toBe(true);
      expect(Object.isFrozen(result.snapshot.photos[0])).toBe(true);
      expect(await fixture.snapshot()).toEqual(result.snapshot);
    }
    expect(owners.size).toBe(2);
    expect(owners.has(retained.publisherId)).toBe(false);
    expect(await baseline.snapshot()).toEqual(retained.snapshot);
  });

  it("rejects invalid, baseline and non-title identities before queries, and refuses an old case", async () => {
    const db = memory();
    for (const identity of [
      "baseline",
      "case-one",
      "case-title-",
      "case-title-FOREIGN",
      "foreign",
    ]) {
      expect(() => new TitleSavedDraft(OWNED_DSN, db.port, identity)).toThrow("case identity");
    }
    expect(db.calls).toEqual([]);
    const contact = new ContactSavedDraft(OWNED_DSN, db.port, "case-title-old");
    const retained = await contact.ensure(now);
    db.calls.length = 0;
    await expect(
      new TitleSavedDraft(OWNED_DSN, db.port, "case-title-old").ensure(now),
    ).rejects.toThrow("fresh");
    expect(db.calls.every((sql) => sql.startsWith("SELECT"))).toBe(true);
    expect(await contact.snapshot()).toEqual(retained.snapshot);
  });

  it("retains foreign user/session and changed answers/photos/expiry without a title UPDATE", async () => {
    for (const kind of ["user", "session", "answers", "photos", "expiry"]) {
      const db = memory();
      const identity = `case-title-${kind}`;
      const contact = new ContactSavedDraft(OWNED_DSN, db.port, identity);
      const own = await contact.ensure(now);
      const row = (
        kind === "user"
          ? db.users.get(own.publisherId)
          : kind === "session"
            ? db.sessions.get(own.sessionToken)
            : db.drafts.get(own.publisherId)
      ) as Row;
      if (kind === "user") row.email = "foreign@example.invalid";
      if (kind === "session") row.userId = "foreign";
      if (kind === "answers")
        row.answers = { listing: { title: "retained answer" }, violations: [] };
      if (kind === "photos") row.photos = [];
      if (kind === "expiry") row.expires_at = now;
      const retained = structuredClone(row);
      db.calls.length = 0;
      await expect(new TitleSavedDraft(OWNED_DSN, db.port, identity).ensure(now)).rejects.toThrow(
        /fresh|ownership|expired/,
      );
      expect(row).toEqual(retained);
      expect(db.calls.every((sql) => sql.startsWith("SELECT"))).toBe(true);
    }
  });

  it("fails closed when the publisher row changes between seed and conditional initialization", async () => {
    const db = memory();
    const fixture = new TitleSavedDraft(OWNED_DSN, db.port, "case-title-race");
    let changed: Row | undefined;
    db.race(() => {
      const row = db.drafts.get(fixture.publisherId) as Row;
      row.photos = [{ key: "retained/concurrent.jpg", name: "concurrent.jpg", bytes: 7 }];
      changed = structuredClone(row);
    });
    await expect(fixture.ensure(now)).rejects.toThrow("initialization conflict");
    expect(db.calls.filter((sql) => sql.startsWith("UPDATE publish_draft"))).toHaveLength(1);
    expect(changed).toBeDefined();
    expect(db.drafts.get(fixture.publisherId)).toEqual(changed);
    expect(db.calls.some((sql) => sql.startsWith("DELETE"))).toBe(false);
  });
});
