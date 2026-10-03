import type { Page, Route } from "@playwright/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type EntryClient,
  holdPublicationDestination,
  preventPublicationIntersectionPrefetch,
  withPublicationEntry,
} from "./publication-entry";

const origin = "http://localhost:3001";
const dsn = "postgresql://postgres:postgres@127.0.0.1:55433/rentas_test";
const own = "own-new-token";

// A stateful SQL double: ownership mistakes affect real double state, not just a spy count.
function database() {
  const sessions = new Map([["preexisting-token", "e2e-publicante"]]);
  const calls: { sql: string; values?: unknown[] }[] = [];
  let collision = false;
  let drafts = 0;
  let missing = false;
  let cleanupFailure = false;
  const client: EntryClient = {
    connect: vi.fn(async () => {}),
    end: vi.fn(async () => {}),
    query: async (sql, values) => {
      calls.push({ sql, values });
      if (sql.includes("pg_tables"))
        return { rows: [{ tablename: "session" }, { tablename: "user" }], rowCount: 2 };
      if (sql.includes("fingerprint")) {
        const remaining = [...sessions].filter(
          ([token, user]) => !(values?.[0] === token && values?.[1] === user),
        );
        return {
          rows: [
            {
              count: String(sql.includes('"session"') ? remaining.length : 1),
              fingerprint: JSON.stringify(sql.includes('"session"') ? remaining : ["seed-user"]),
            },
          ],
          rowCount: 1,
        };
      }
      if (sql.startsWith("select id, email"))
        return {
          rows: missing ? [] : [{ id: "e2e-publicante", email: "e2e-owner@rentas.invalid" }],
          rowCount: missing ? 0 : 1,
        };
      if (sql.includes('from "publish_draft"'))
        return { rows: [{ count: String(drafts) }], rowCount: 1 };
      if (sql.startsWith("insert")) {
        if (collision) throw new Error("collision");
        sessions.set(String(values?.[0]), String(values?.[1]));
        return { rows: [{ sessionToken: values?.[0] }], rowCount: 1 };
      }
      if (sql.startsWith("delete")) {
        if (cleanupFailure) throw new Error("cleanup failed");
        let n = 0;
        for (const [token, user] of sessions) {
          if (
            sql.includes('"sessionToken" = $1') && sql.includes('"userId" = $2')
              ? token === values?.[0] && user === values?.[1]
              : user === "e2e-publicante"
          ) {
            sessions.delete(token);
            n++;
          }
        }
        return { rows: [], rowCount: n };
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
  };
  return {
    client,
    sessions,
    calls,
    collision: () => {
      collision = true;
    },
    draft: () => {
      drafts = 1;
    },
    missing: () => {
      missing = true;
    },
    failCleanup: () => {
      cleanupFailure = true;
    },
  };
}

beforeEach(() => {
  vi.stubEnv("TEST_DATABASE_URL", dsn);
  vi.stubEnv("DATABASE_URL", undefined);
  vi.stubEnv("PLAYWRIGHT_BASE_URL", undefined);
  vi.stubEnv("GITHUB_ACTIONS", undefined);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function options(db: ReturnType<typeof database>) {
  return { origin, createClient: vi.fn(() => db.client), token: () => own };
}

describe("publication entry session ownership", () => {
  it("creates only a new session and preserves preexisting sessions through exact cleanup", async () => {
    const db = database();
    await withPublicationEntry(options(db), async (lease) => {
      expect(lease.token).toBe(own);
      expect(db.sessions.size).toBe(2);
      await lease.verify();
    });
    expect([...db.sessions]).toEqual([["preexisting-token", "e2e-publicante"]]);
    expect(db.calls.find((call) => call.sql.startsWith("delete"))).toEqual({
      sql: 'delete from "session" where "sessionToken" = $1 and "userId" = $2',
      values: [own, "e2e-publicante"],
    });
    expect(db.client.end).toHaveBeenCalledOnce();
  });

  it("does not acquire cleanup ownership after a collision INSERT", async () => {
    const db = database();
    db.collision();
    await expect(withPublicationEntry(options(db), async () => {})).rejects.toThrow("collision");
    expect(db.calls.filter((call) => call.sql.startsWith("delete"))).toEqual([]);
    expect(db.sessions.size).toBe(1);
    expect(db.client.end).toHaveBeenCalledOnce();
  });

  it("cleans its own session when the callback throws", async () => {
    const db = database();
    await expect(
      withPublicationEntry(options(db), async () => {
        throw new Error("callback failed");
      }),
    ).rejects.toThrow("callback failed");
    expect([...db.sessions.keys()]).toEqual(["preexisting-token"]);
    expect(db.client.end).toHaveBeenCalledOnce();
  });

  it("reports cleanup failure and still closes the client", async () => {
    const db = database();
    db.failCleanup();
    await expect(withPublicationEntry(options(db), async () => {})).rejects.toThrow(
      "cleanup failed",
    );
    expect(db.client.end).toHaveBeenCalledOnce();
  });

  it("reports both callback and cleanup failures without masking either", async () => {
    const db = database();
    db.failCleanup();
    const result = withPublicationEntry(options(db), async () => {
      throw new Error("callback failed");
    });
    await expect(result).rejects.toMatchObject({
      errors: [new Error("callback failed"), new Error("cleanup failed")],
    });
    expect(db.client.end).toHaveBeenCalledOnce();
  });

  it.each(["draft", "missing"] as const)(
    "refuses %s seed precondition without writes",
    async (condition) => {
      const db = database();
      db[condition]();
      await expect(withPublicationEntry(options(db), async () => {})).rejects.toThrow(
        /seed|draft/i,
      );
      expect(db.calls.some((call) => /^(insert|delete)/.test(call.sql))).toBe(false);
    },
  );

  it("detects unexpected existing-row changes during the lease", async () => {
    const db = database();
    await expect(
      withPublicationEntry(options(db), async (lease) => {
        db.sessions.set("unexpected-existing-change", "other-user");
        await lease.verify();
      }),
    ).rejects.toMatchObject({
      errors: [
        new Error("Public table fingerprints changed unexpectedly"),
        new Error("Public table fingerprints changed unexpectedly"),
      ],
    });
  });

  it.each(["ambient", "preview", "protected", "origin"])(
    "guards %s before client construction",
    async (condition) => {
      const db = database();
      const input = options(db);
      if (condition === "ambient") vi.stubEnv("DATABASE_URL", "forbidden");
      if (condition === "preview") vi.stubEnv("PLAYWRIGHT_BASE_URL", "https://preview.invalid");
      if (condition === "protected") vi.stubEnv("TEST_DATABASE_URL", dsn.replace("55433", "55435"));
      if (condition === "origin") input.origin = "https://remote.invalid";
      await expect(withPublicationEntry(input, async () => {})).rejects.toThrow();
      expect(input.createClient).not.toHaveBeenCalled();
    },
  );
});

describe("selective publication IntersectionObserver setup", () => {
  function observerFixture() {
    const calls = {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
      takeRecords: vi.fn(() => []),
    };
    class NativeObserver {
      constructor(
        readonly callback: IntersectionObserverCallback,
        readonly options?: IntersectionObserverInit,
      ) {}
      observe(target: Element) {
        calls.observe(target);
      }
      unobserve(target: Element) {
        calls.unobserve(target);
      }
      disconnect() {
        calls.disconnect();
      }
      takeRecords() {
        return calls.takeRecords();
      }
    }
    const browser = { IntersectionObserver: NativeObserver, location: { origin } };
    vi.stubGlobal("window", browser);
    vi.stubGlobal("document", { baseURI: `${origin}/` });
    const anchor = (href: string, tagName = "A") =>
      ({ tagName, getAttribute: () => href }) as unknown as Element;
    return { browser, calls, anchor, NativeObserver };
  }

  it("suppresses only same-origin publication entry and tipo anchor observation", () => {
    const { browser, calls, anchor } = observerFixture();
    preventPublicationIntersectionPrefetch();
    const observer = new browser.IntersectionObserver(vi.fn());
    observer.observe(anchor("/publicar"));
    observer.observe(anchor(`${origin}/publicar/paso/tipo?_rsc=ignored`));
    expect(calls.observe).not.toHaveBeenCalled();
  });

  it("delegates unrelated anchors and non-anchor observations to the native observer", () => {
    const { browser, calls, anchor } = observerFixture();
    preventPublicationIntersectionPrefetch();
    const observer = new browser.IntersectionObserver(vi.fn());
    const targets = [
      anchor("/"),
      anchor("/publicar/paso/zona"),
      anchor("https://external.invalid/publicar"),
      anchor("/publicar", "DIV"),
      anchor("http://["),
    ];
    for (const target of targets) observer.observe(target);
    expect(calls.observe.mock.calls).toEqual(targets.map((target) => [target]));
  });

  it("preserves native callback, options and lifecycle methods", () => {
    const { browser, calls, anchor, NativeObserver } = observerFixture();
    preventPublicationIntersectionPrefetch();
    const callback = vi.fn();
    const options = { rootMargin: "200px", threshold: 0.5 };
    const observer = new browser.IntersectionObserver(callback, options);
    expect(observer).toBeInstanceOf(NativeObserver);
    expect(observer.callback).toBe(callback);
    expect(observer.options).toBe(options);
    const target = anchor("/");
    observer.unobserve(target);
    observer.disconnect();
    expect(observer.takeRecords()).toEqual([]);
    expect(calls.unobserve).toHaveBeenCalledWith(target);
    expect(calls.disconnect).toHaveBeenCalledOnce();
    expect(calls.takeRecords).toHaveBeenCalledOnce();
    observer.callback([], observer as unknown as IntersectionObserver);
    expect(callback).toHaveBeenCalledWith([], observer);
  });
});

function routedPage() {
  let handler: ((route: Route) => Promise<void>) | undefined;
  const page = {
    route: vi.fn(async (_match: string, callback: (route: Route) => Promise<void>) => {
      handler = callback as typeof handler;
    }),
    unroute: vi.fn(async () => {}),
  } as unknown as Pick<Page, "route" | "unroute">;
  function request(
    path: string,
    method = "GET",
    overrides: {
      headers?: Record<string, string>;
      navigation?: boolean;
      resourceType?: string;
      redirected?: boolean;
    } = {},
  ) {
    const continued = vi.fn(async () => {});
    const route = {
      request: () => ({
        url: () => new URL(path, origin).href,
        method: () => method,
        headers: () => ({ "sec-fetch-dest": "empty", ...(overrides.headers ?? { rsc: "1" }) }),
        isNavigationRequest: () => overrides.navigation ?? false,
        resourceType: () => overrides.resourceType ?? "fetch",
        redirectedFrom: () => (overrides.redirected ? {} : null),
      }),
      continue: continued,
    } as unknown as Route;
    return { continued, done: handler?.(route) };
  }
  return { page, request };
}

describe("separate real destination request gate", () => {
  it.each([
    ["document", { navigation: true, resourceType: "document" }],
    ["prefetch", { headers: { rsc: "1", "next-router-prefetch": "1" } }],
    ["purpose prefetch", { headers: { rsc: "1", purpose: "prefetch" } }],
    ["sec-purpose prefetch", { headers: { rsc: "1", "sec-purpose": "prefetch;prerender" } }],
    ["missing RSC", { headers: {} }],
    ["document fetch destination", { headers: { rsc: "1", "sec-fetch-dest": "document" } }],
    ["non-fetch", { resourceType: "xhr" }],
    ["redirect chain", { redirected: true }],
  ] as const)("rejects %s as held destination evidence", async (_name, overrides) => {
    const routed = routedPage();
    const gate = await holdPublicationDestination(routed.page, origin);
    let held = false;
    void gate.held.then(() => {
      held = true;
    });
    try {
      const request = routed.request("/publicar/paso/tipo", "GET", overrides);
      await Promise.resolve();
      expect(held).toBe(false);
      expect(request.continued).toHaveBeenCalledOnce();
      await request.done;
    } finally {
      await gate.dispose();
    }
  });

  it("holds only the GET destination and continues real transport on release", async () => {
    const routed = routedPage();
    const gate = await holdPublicationDestination(routed.page, origin);
    const entry = routed.request("/publicar");
    await entry.done;
    expect(entry.continued).toHaveBeenCalledOnce();
    const post = routed.request("/publicar/paso/tipo", "POST");
    await post.done;
    expect(post.continued).toHaveBeenCalledOnce();
    const destination = routed.request("/publicar/paso/tipo?_rsc=real");
    const evidence = await gate.held;
    expect(evidence).toEqual({
      pathname: "/publicar/paso/tipo",
      method: "GET",
      resourceType: "fetch",
      navigation: false,
      rsc: "1",
      prefetch: false,
    });
    expect(destination.continued).not.toHaveBeenCalled();
    await gate.release();
    await destination.done;
    expect(destination.continued).toHaveBeenCalledOnce();
    await gate.dispose();
    await gate.dispose();
    expect(routed.page.unroute).toHaveBeenCalledOnce();
  });

  it("dispose releases an outstanding destination without fabricating a response", async () => {
    const routed = routedPage();
    const gate = await holdPublicationDestination(routed.page, origin);
    const destination = routed.request("/publicar/paso/tipo");
    await gate.held;
    await gate.dispose();
    await destination.done;
    expect(destination.continued).toHaveBeenCalledOnce();
  });
});
