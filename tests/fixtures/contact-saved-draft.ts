import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import type { StoredPublicationDraft } from "../../src/modules/listing-publication/domain/publication-steps";

export const OWNED_DSN = "postgresql://owned:owned@127.0.0.1:55437/owned_contact";
export interface QueryPort {
  query(sql: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}
export interface DraftSnapshot {
  readonly answers: Omit<StoredPublicationDraft, "photos">;
  readonly photos: StoredPublicationDraft["photos"];
  readonly expiresAt: string;
}
function requireOwnedDsn(dsn: string) {
  if (dsn !== OWNED_DSN) throw new Error("exact owned DSN required");
}
/** Explicit opt-in only; importing never connects or reads ambient credentials. */
export async function connectOwnedDatabase(dsn: string) {
  requireOwnedDsn(dsn);
  const { Client } = await import("pg");
  const client = new Client({
    host: "127.0.0.1",
    port: 55437,
    user: "owned",
    password: "owned",
    database: "owned_contact",
    ssl: false,
    application_name: "owned-f367",
    options: "",
  });
  await client.connect();
  return {
    query: (sql: string, values?: unknown[]) => client.query(sql, values),
    close: () => client.end(),
  };
}
const sql = {
  user: 'SELECT id, name, email FROM "user" WHERE id = $1',
  session: 'SELECT "sessionToken", "userId", expires FROM "session" WHERE "sessionToken" = $1',
  draft: "SELECT answers, photos, expires_at FROM publish_draft WHERE publisher_id = $1",
  insertUser: 'INSERT INTO "user" (id, name, email) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
  insertSession:
    'INSERT INTO "session" ("sessionToken", "userId", expires) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
  insertDraft:
    "INSERT INTO publish_draft (publisher_id, answers, photos, expires_at) VALUES ($1, $2::jsonb, $3::jsonb, $4) ON CONFLICT DO NOTHING",
  renew: 'UPDATE "session" SET expires = $2 WHERE "sessionToken" = $1 AND "userId" = $3',
  deleteDraft: "DELETE FROM publish_draft WHERE publisher_id = $1",
  deleteSession: 'DELETE FROM "session" WHERE "sessionToken" = $1 AND "userId" = $2',
  deleteUser: 'DELETE FROM "user" WHERE id = $1 AND name = $2 AND email = $3',
};
function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
function instant(value: unknown) {
  return new Date(value instanceof Date ? value.getTime() : String(value));
}
const answers: DraftSnapshot["answers"] = {
  listing: { propertyType: "apartamento", reference: "Referencia sintética owned-f367" },
  violations: [],
};
const photos: DraftSnapshot["photos"] = [
  { key: "owned-f367/synthetic-photo.jpg", name: "synthetic-photo.jpg", bytes: 123 },
];
const duration = 7 * 24 * 60 * 60 * 1000;
function ownedDraft(snapshot: DraftSnapshot) {
  if (
    !isDeepStrictEqual(snapshot.answers, answers) ||
    !isDeepStrictEqual(snapshot.photos, photos)
  ) {
    throw new Error("draft ownership conflict");
  }
}
/** Retain baseline; only a distinct case-* identity supports per-case cleanup. */
export class ContactSavedDraft {
  readonly publisherId: string;
  readonly sessionToken: string;
  private readonly name: string;
  private readonly email: string;
  constructor(
    dsn: string,
    private readonly port: QueryPort,
    private readonly identity = "baseline",
  ) {
    requireOwnedDsn(dsn);
    if (identity !== "baseline" && !/^case-[a-z0-9-]{1,40}$/.test(identity)) {
      throw new Error("case identity required");
    }
    const hex = createHash("sha256").update(`owned-f367-${identity}`).digest("hex");
    this.publisherId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
    this.name = `owned-f367-${identity}`;
    this.email = `${this.name}@example.invalid`;
    this.sessionToken = `${this.name}-${this.publisherId}`;
  }
  private async row(statement: string, ...values: unknown[]) {
    return (await this.port.query(statement, values)).rows[0];
  }
  private async user() {
    const row = await this.row(sql.user, this.publisherId);
    if (row && (row.name !== this.name || row.email !== this.email)) {
      throw new Error("user ownership conflict");
    }
    return row;
  }
  private async session() {
    const row = await this.row(sql.session, this.sessionToken);
    if (row && row.userId !== this.publisherId) throw new Error("session ownership conflict");
    return row;
  }
  async snapshot(): Promise<DraftSnapshot> {
    if (!(await this.user())) throw new Error("missing owned user");
    const row = await this.row(sql.draft, this.publisherId);
    if (!row) throw new Error("missing owned draft");
    const snapshot = {
      answers: row.answers,
      photos: row.photos,
      expiresAt: instant(row.expires_at).toISOString(),
    };
    return freeze(structuredClone(snapshot) as DraftSnapshot);
  }
  async ensure(now: Date) {
    const expiry = new Date(+now + duration);
    if (!(await this.user())) {
      await this.row(sql.insertUser, this.publisherId, this.name, this.email);
      if (!(await this.user())) throw new Error("user ownership conflict");
    }
    let session = await this.session();
    if (!session) {
      await this.row(sql.insertSession, this.sessionToken, this.publisherId, expiry);
      session = await this.session();
    }
    if (!session || !(+instant(session.expires) > +now))
      throw new Error("expired session; renew explicitly");
    if (!(await this.row(sql.draft, this.publisherId))) {
      await this.row(
        sql.insertDraft,
        this.publisherId,
        JSON.stringify(answers),
        JSON.stringify(photos),
        expiry,
      );
    }
    const snapshot = await this.snapshot();
    ownedDraft(snapshot);
    if (!(Date.parse(snapshot.expiresAt) > +now))
      throw new Error("expired draft; retained unchanged");
    return { publisherId: this.publisherId, sessionToken: this.sessionToken, snapshot };
  }
  async renewSessionForTest(now: Date) {
    if (!(await this.user()) || !(await this.session())) throw new Error("missing owned session");
    await this.row(sql.renew, this.sessionToken, new Date(+now + duration), this.publisherId);
  }
  async cleanupCase() {
    if (this.identity === "baseline") throw new Error("retain baseline");
    if (!(await this.user())) return;
    await this.session();
    ownedDraft(await this.snapshot());
    await this.row(sql.deleteDraft, this.publisherId);
    await this.row(sql.deleteSession, this.sessionToken, this.publisherId);
    await this.row(sql.deleteUser, this.publisherId, this.name, this.email);
  }
}
