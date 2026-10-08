import { describe, expect, it } from "vitest";
import {
  ContactSavedDraft,
  connectOwnedDatabase,
  OWNED_DSN,
  type QueryPort,
} from "./contact-saved-draft";

const now = new Date("2030-01-01T00:00:00.123Z");
type Row = Record<string, unknown>;
function memory() {
  const users = new Map<string, Row>();
  const sessions = new Map<string, Row>();
  const drafts = new Map<string, Row>();
  const calls: string[] = [];
  const port: QueryPort = {
    async query(sql, values = []) {
      calls.push(sql);
      const [id, a, b, c] = values;
      const key = String(id);
      const table = sql.includes('"user"') ? users : sql.includes('"session"') ? sessions : drafts;
      if (sql.startsWith("SELECT")) return { rows: table.has(key) ? [table.get(key) as Row] : [] };
      if (sql.startsWith("INSERT") && !table.has(key)) {
        table.set(
          key,
          table === users
            ? { id, name: a, email: b }
            : table === sessions
              ? { sessionToken: id, userId: a, expires: b }
              : {
                  publisher_id: id,
                  answers: JSON.parse(String(a)),
                  photos: JSON.parse(String(b)),
                  expires_at: c,
                },
        );
      }
      if (sql.startsWith("UPDATE")) {
        const row = table.get(key);
        if (row) row.expires = a;
      }
      if (sql.startsWith("DELETE")) table.delete(key);
      return { rows: [] };
    },
  };
  return { port, users, sessions, drafts, calls };
}
function setup() {
  const db = memory();
  return { ...db, fixture: new ContactSavedDraft(OWNED_DSN, db.port) };
}

describe("owned saved draft", () => {
  it("rejects every nonexact DSN before any query", async () => {
    const db = memory();
    for (const dsn of [
      `${OWNED_DSN}?sslmode=disable`,
      `${OWNED_DSN}/`,
      OWNED_DSN.replace("55437", "55433"),
      OWNED_DSN.replace("127.0.0.1", "localhost"),
      OWNED_DSN.replace("owned:owned", "other:owned"),
      OWNED_DSN.replace("owned:owned", "owned:other"),
      OWNED_DSN.replace("owned_contact", "foreign"),
    ]) {
      expect(() => new ContactSavedDraft(dsn, db.port)).toThrow("owned DSN");
      await expect(connectOwnedDatabase(dsn)).rejects.toThrow("owned DSN");
    }
    expect(db.calls).toEqual([]);
  });
  it("creates an authenticated baseline with meaningful nonempty saved data", async () => {
    const { fixture, users, sessions, drafts } = setup();
    const result = await fixture.ensure(now);
    expect(users.get(result.publisherId)?.email).toBe("owned-f367-baseline@example.invalid");
    expect(sessions.get(result.sessionToken)?.userId).toBe(result.publisherId);
    expect(new Date(String(sessions.get(result.sessionToken)?.expires)).getTime()).toBeGreaterThan(
      +now,
    );
    expect(result.snapshot.answers.listing).toEqual({
      propertyType: "apartamento",
      reference: "Referencia sintética owned-f367",
    });
    expect(result.snapshot.photos).toHaveLength(1);
    expect(result.snapshot.expiresAt).toBe("2030-01-08T00:00:00.123Z");
    expect(drafts.size).toBe(1);
  });
  it("reuses baseline without rewriting answers photos or expiry and returns frozen copies", async () => {
    const { fixture, calls, drafts } = setup();
    const first = await fixture.ensure(now);
    const original = first.snapshot.answers;
    (drafts.get(first.publisherId) as Row).answers = {
      violations: original.violations,
      listing: {
        reference: original.listing.reference,
        propertyType: original.listing.propertyType,
      },
    };
    calls.length = 0;
    const second = await fixture.ensure(new Date(+now + 1000));
    expect(second).toEqual(first);
    expect(calls.every((sql) => sql.startsWith("SELECT"))).toBe(true);
    expect(Object.isFrozen(second.snapshot.answers.listing)).toBe(true);
    expect(Object.isFrozen(second.snapshot.photos[0])).toBe(true);
    const row = drafts.get(first.publisherId) as Row;
    (row.answers as { listing: { reference: string } }).listing.reference = "changed later";
    expect(first.snapshot.answers.listing.reference).toBe("Referencia sintética owned-f367");
    expect((await fixture.snapshot()).answers.listing.reference).toBe("changed later");
    expect((await fixture.snapshot()).expiresAt).toBe(first.snapshot.expiresAt);
  });
  it.each(["user", "session", "draft"])(
    "refuses foreign %s without overwriting it",
    async (kind) => {
      const { fixture, users, sessions, drafts, calls } = setup();
      const result = await fixture.ensure(now);
      const row = (
        kind === "user"
          ? users.get(result.publisherId)
          : kind === "session"
            ? sessions.get(result.sessionToken)
            : drafts.get(result.publisherId)
      ) as Row;
      if (kind === "user") row.email = "foreign@example.invalid";
      if (kind === "session") row.userId = "foreign";
      if (kind === "draft") row.photos = [];
      const before = structuredClone(row);
      calls.length = 0;
      await expect(fixture.ensure(now)).rejects.toThrow("ownership");
      expect(row).toEqual(before);
      expect(calls.every((sql) => sql.startsWith("SELECT"))).toBe(true);
    },
  );
  it("requires explicit session-only renewal for expired authentication", async () => {
    const { fixture, sessions, calls } = setup();
    const result = await fixture.ensure(now);
    const expired = new Date(+now - 1);
    (sessions.get(result.sessionToken) as Row).expires = expired;
    await expect(fixture.ensure(now)).rejects.toThrow("expired session");
    calls.length = 0;
    await fixture.renewSessionForTest(now);
    expect(calls.filter((sql) => !sql.startsWith("SELECT"))).toEqual([
      'UPDATE "session" SET expires = $2 WHERE "sessionToken" = $1 AND "userId" = $3',
    ]);
    expect((await fixture.ensure(now)).snapshot).toEqual(result.snapshot);
  });
  it("refuses an expired draft without refreshing it", async () => {
    const { fixture, drafts } = setup();
    const result = await fixture.ensure(now);
    (drafts.get(result.publisherId) as Row).expires_at = now;
    await expect(fixture.ensure(now)).rejects.toThrow("expired draft");
    expect((await fixture.snapshot()).expiresAt).toBe(now.toISOString());
  });
  it("cleans only its per-case identity while retaining baseline and sentinel", async () => {
    const db = setup();
    const baseline = await db.fixture.ensure(now);
    db.users.set("sentinel", { id: "sentinel" });
    const perCase = new ContactSavedDraft(OWNED_DSN, db.port, "case-one");
    const own = await perCase.ensure(now);
    await expect(db.fixture.cleanupCase()).rejects.toThrow("retain baseline");
    await perCase.cleanupCase();
    await perCase.cleanupCase();
    expect(db.users.has(own.publisherId)).toBe(false);
    expect(db.sessions.has(own.sessionToken)).toBe(false);
    expect(db.drafts.has(own.publisherId)).toBe(false);
    expect(db.users.has("sentinel")).toBe(true);
    expect(await db.fixture.snapshot()).toEqual(baseline.snapshot);
  });
  it("fails closed on cleanup and renewal of a foreign identity", async () => {
    const db = setup();
    const fixture = new ContactSavedDraft(OWNED_DSN, db.port, "case-two");
    const own = await fixture.ensure(now);
    (db.users.get(own.publisherId) as Row).name = "foreign";
    db.calls.length = 0;
    await expect(fixture.cleanupCase()).rejects.toThrow("ownership");
    await expect(fixture.renewSessionForTest(now)).rejects.toThrow("ownership");
    expect(db.calls.every((sql) => sql.startsWith("SELECT"))).toBe(true);
  });
});
