import { randomUUID } from "node:crypto";
import type { Page, Request, Route } from "@playwright/test";
import { ownedDatabase } from "../e2e/owned-test-database";

export interface EntryClient {
  connect(): Promise<unknown>;
  query(
    sql: string,
    values?: unknown[],
  ): Promise<{
    rows: Record<string, unknown>[];
    rowCount: number | null;
  }>;
  end(): Promise<void>;
}
export interface EntryOptions {
  origin: string;
  createClient?: (dsn: string) => EntryClient;
  token?: () => string;
}
const publisher = "e2e-publicante";
const email = "e2e-owner@rentas.invalid";

function loopbackOrigin(value: string): string {
  const url = new URL(value);
  if (
    url.protocol !== "http:" ||
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    url.port !== "3001" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error("Publication entry requires HTTP loopback origin on port 3001");
  return url.origin;
}

// Read every public table without exporting personal rows. Sorted row hashes retain
// multiplicity; count + digest detects changed rows, not only changed row counts.
async function fingerprints(client: EntryClient, excludedToken?: string) {
  const tables = await client.query(
    "select tablename from pg_tables where schemaname = 'public' order by tablename",
  );
  const result: Record<string, { count: string; fingerprint: string }> = {};
  for (const { tablename } of tables.rows) {
    if (typeof tablename !== "string") throw new Error("Invalid public table name");
    const quoted = `"${tablename.replaceAll('"', '""')}"`;
    const exclude = tablename === "session" && excludedToken !== undefined;
    const found = await client.query(
      `select count(*)::text as count, md5(coalesce(string_agg(row_hash, ',' order by row_hash), '')) as fingerprint from (select md5(to_jsonb(t)::text) as row_hash from public.${quoted} t${exclude ? ' where not ("sessionToken" = $1 and "userId" = $2)' : ""}) rows`,
      exclude ? [excludedToken, publisher] : undefined,
    );
    const row = found.rows[0];
    if (!row || typeof row.count !== "string" || typeof row.fingerprint !== "string") {
      throw new Error("Missing public table fingerprint");
    }
    result[tablename] = { count: row.count, fingerprint: row.fingerprint };
  }
  return result;
}
function unchanged(before: unknown, after: unknown) {
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    throw new Error("Public table fingerprints changed unexpectedly");
  }
}

/** Only a successfully inserted token grants cleanup authority. Never borrow a seed session. */
export async function withPublicationEntry<T>(
  options: EntryOptions,
  run: (lease: {
    token: string;
    origin: string;
    counts: Record<string, string>;
    verify: () => Promise<void>;
  }) => Promise<T>,
): Promise<T> {
  const dsn = ownedDatabase("55433"); // Guard before constructing or connecting pg.
  const origin = loopbackOrigin(options.origin);
  const client = options.createClient
    ? options.createClient(dsn)
    : new (await import("pg")).Client({ connectionString: dsn });
  const token = (options.token ?? randomUUID)();
  let inserted = false;
  let before: Awaited<ReturnType<typeof fingerprints>> | undefined;
  const failures: unknown[] = [];
  let result!: T;
  const cleanup = async () => {
    if (!inserted) return;
    const removed = await client.query(
      'delete from "session" where "sessionToken" = $1 and "userId" = $2',
      [token, publisher],
    );
    if (removed.rowCount !== 1) {
      throw new Error("Owned session cleanup did not delete exactly one row");
    }
    unchanged(before, await fingerprints(client));
  };
  try {
    await client.connect();
    const user = await client.query('select id, email from "user" where id = $1 and email = $2', [
      publisher,
      email,
    ]);
    if (user.rows.length !== 1 || user.rows[0]?.id !== publisher || user.rows[0]?.email !== email) {
      throw new Error("Required synthetic seed publisher missing; no user will be created");
    }
    const drafts = await client.query(
      'select count(*)::text as count from "publish_draft" where publisher_id = $1',
      [publisher],
    );
    if (drafts.rows[0]?.count !== "0") {
      throw new Error(
        `Synthetic publisher draft precondition failed: count=${drafts.rows[0]?.count}; preserve all drafts`,
      );
    }
    before = await fingerprints(client);
    const created = await client.query(
      'insert into "session" ("sessionToken", "userId", "expires") values ($1, $2, now() + interval \'30 days\') returning "sessionToken"',
      [token, publisher],
    );
    if (created.rowCount !== 1 || created.rows[0]?.sessionToken !== token) {
      throw new Error("Session INSERT did not return the owned token");
    }
    inserted = true;
    unchanged(before, await fingerprints(client, token));
    const during = await fingerprints(client);
    const verify = async () => {
      unchanged(during, await fingerprints(client));
      unchanged(before, await fingerprints(client, token));
    };
    result = await run({
      token,
      origin,
      counts: Object.fromEntries(Object.entries(before).map(([name, row]) => [name, row.count])),
      verify,
    });
    await verify();
  } catch (error) {
    failures.push(error);
  } finally {
    try {
      await cleanup();
    } catch (error) {
      failures.push(error);
    } finally {
      try {
        await client.end();
      } catch (error) {
        failures.push(error);
      }
    }
  }
  if (failures.length === 1) throw failures[0];
  if (failures.length > 1)
    throw new AggregateError(failures, "Publication entry and cleanup failed");
  return result;
}

/** Install before home loads. Suppress only viewport prefetch observation for
 * publication anchors; retain the native observer for every other target/API.
 * Keyboard activation avoids Next Link's separate hover-prefetch path.
 */
export function preventPublicationIntersectionPrefetch() {
  const NativeObserver = window.IntersectionObserver;
  window.IntersectionObserver = class extends NativeObserver {
    observe(target: Element) {
      if (target.tagName === "A") {
        const href = target.getAttribute("href");
        if (href !== null) {
          let url: URL;
          try {
            url = new URL(href, document.baseURI);
          } catch {
            super.observe(target);
            return;
          }
          if (
            url.origin === window.location.origin &&
            ["/publicar", "/publicar/paso/tipo"].includes(url.pathname)
          )
            return;
        }
      }
      super.observe(target);
    }
  };
}

/** Never export cookies, tokens, complete headers or URL query values. */
export function publicationTransport(request: Request) {
  const headers = request.headers();
  return {
    pathname: new URL(request.url()).pathname,
    method: request.method(),
    resourceType: request.resourceType(),
    navigation: request.isNavigationRequest(),
    rsc: headers.rsc === "1" ? "1" : null,
    prefetch:
      headers["next-router-prefetch"] !== undefined ||
      headers.purpose?.includes("prefetch") === true ||
      headers["sec-purpose"]?.includes("prefetch") === true,
  };
}

/** Retain ONLY a separate non-prefetch RSC destination fetch. Unchanged Next
 * may follow the entry redirect inline, which is legitimate client transport,
 * not a held-destination pass. Only the activation unit requires this gate with
 * its own Suspense boundary; the unchanged-product baseline must not call it.
 */
export async function holdPublicationDestination(
  page: Pick<Page, "route" | "unroute">,
  value: string,
) {
  const origin = loopbackOrigin(value);
  let signalHeld!: (evidence: ReturnType<typeof publicationTransport>) => void;
  let signalRelease!: () => void;
  const held = new Promise<ReturnType<typeof publicationTransport>>((resolve) => {
    signalHeld = resolve;
  });
  const released = new Promise<void>((resolve) => {
    signalRelease = resolve;
  });
  let disposed: Promise<void> | undefined;
  const handler = async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const evidence = publicationTransport(request);
    if (
      url.origin === origin &&
      evidence.pathname === "/publicar/paso/tipo" &&
      evidence.method === "GET" &&
      evidence.resourceType === "fetch" &&
      !evidence.navigation &&
      evidence.rsc === "1" &&
      !evidence.prefetch &&
      request.headers()["sec-fetch-dest"] === "empty" &&
      request.redirectedFrom() === null
    ) {
      signalHeld(evidence);
      await released;
    }
    await route.continue();
  };
  const match = `${origin}/publicar/paso/tipo*`;
  await page.route(match, handler);
  const release = async () => {
    signalRelease();
  };
  return {
    held,
    release,
    dispose: () => {
      disposed ??= (async () => {
        await release();
        await page.unroute(match, handler);
      })();
      return disposed;
    },
  };
}
