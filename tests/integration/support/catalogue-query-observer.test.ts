import { describe, expect, it } from "vitest";
import { observeCatalogueQueries } from "./catalogue-query-observer";

type Callback = (this: unknown, ...args: unknown[]) => void;
function fixture() {
  let time = 0;
  let failure: unknown;
  const lines: string[] = [];
  const config = { text: "PRIVATE SQL", values: ["PRIVATE PARAM"] };
  const result = { rowCount: 7, rows: ["PRIVATE ROW"] };
  const client = { private: "PRIVATE CLIENT" };
  const release = () => {};
  const receiver = {};
  const calls: unknown[][] = [];
  const pool = {
    connect(...args: unknown[]): unknown {
      expect(this).toBe(pool);
      const callback = args[0];
      time += 2;
      if (typeof callback === "function") {
        Reflect.apply(callback, receiver, [failure, failure ? undefined : client, release]);
        return undefined;
      }
      return failure ? Promise.reject(failure) : Promise.resolve(client);
    },
    query(...args: unknown[]): unknown {
      expect(this).toBe(pool);
      calls.push(args);
      const callback = args.at(-1);
      if (typeof callback === "function") {
        return this.connect((error: unknown) => {
          time += 3;
          Reflect.apply(callback, receiver, [error, error ? undefined : result]);
        });
      }
      return new Promise((resolve, reject) => {
        this.connect((error: unknown) => {
          time += 3;
          if (error) reject(error);
          else resolve(result);
        });
      });
    },
  };
  const originals = { ...pool };
  return {
    pool,
    originals,
    config,
    result,
    client,
    release,
    receiver,
    calls,
    lines,
    fail: (error: unknown) => {
      failure = error;
    },
    observe: (enabled = true, sink = (line: string) => lines.push(line)) =>
      observeCatalogueQueries(pool, enabled, () => time, sink),
  };
}

describe("catalogue query observer", () => {
  it("preserves receiver, config/parameter identity and promise result; acquisition is inside driver", async () => {
    const f = fixture();
    const restore = f.observe();
    try {
      expect(await f.pool.query(f.config, f.config.values)).toBe(f.result);
      expect(f.calls[0]?.[0]).toBe(f.config);
      expect(f.calls[0]?.[1]).toBe(f.config.values);
      expect(f.lines).toEqual([
        "[import-query] id=1 event=acquire duration_ms=2.000",
        "[import-query] id=1 event=driver duration_ms=5.000 row_count=7",
      ]);
      expect(await f.pool.connect()).toBe(f.client);
      expect(f.lines.at(-1)).toBe("[import-query] id=2 event=acquire duration_ms=2.000");
    } finally {
      restore();
    }
    expect(f.pool.query).toBe(f.originals.query);
    expect(f.pool.connect).toBe(f.originals.connect);
  });

  it.each(["23505", "PRIVATE CODE"])(
    "rethrows original promise error %s and restores on failure",
    async (code) => {
      const f = fixture();
      const error = Object.assign(new Error("PRIVATE ERROR"), { code });
      f.fail(error);
      const restore = f.observe();
      const suffix = code === "23505" ? " sqlstate=23505" : "";
      try {
        await expect(f.pool.query(f.config)).rejects.toBe(error);
        await expect(f.pool.connect()).rejects.toBe(error);
        expect(f.lines).toEqual([
          `[import-query] id=1 event=acquire_error duration_ms=2.000${suffix}`,
          `[import-query] id=1 event=driver_error duration_ms=5.000${suffix}`,
          `[import-query] id=2 event=acquire_error duration_ms=2.000${suffix}`,
        ]);
      } finally {
        restore();
      }
      expect(f.pool.query).toBe(f.originals.query);
      expect(f.pool.connect).toBe(f.originals.connect);
    },
  );

  it.each([false, true])(
    "preserves callback return, arguments, receiver and single invocation (error=%s)",
    (fails) => {
      const f = fixture();
      const error = new Error("PRIVATE ERROR");
      if (fails) f.fail(error);
      const restore = f.observe();
      let count = 0;
      const callback: Callback = function (...args) {
        count++;
        expect(this).toBe(f.receiver);
        expect(args).toEqual([fails ? error : undefined, fails ? undefined : f.result]);
        if (fails) expect(args[0]).toBe(error);
        else expect(args[1]).toBe(f.result);
      };
      try {
        expect(f.pool.query(f.config, callback)).toBeUndefined();
        expect(f.pool.query(f.config.text, f.config.values, callback)).toBeUndefined();
        expect(count).toBe(2);
        expect(f.calls[0]?.[0]).toBe(f.config);
        expect(f.calls[1]?.[1]).toBe(f.config.values);
        expect(f.lines).toHaveLength(4);
        expect(f.lines[2]).toContain("id=2 event=acquire");
        f.pool.connect(function (this: unknown, ...args: unknown[]) {
          expect(this).toBe(f.receiver);
          expect(args).toEqual([
            fails ? error : undefined,
            fails ? undefined : f.client,
            f.release,
          ]);
        });
        expect(f.lines.join(" ")).not.toContain("PRIVATE");
      } finally {
        restore();
      }
    },
  );

  it("captures acquisition IDs before overlapping queries complete out of order", async () => {
    const pending: Callback[] = [];
    const lines: string[] = [];
    const pool = {
      connect(callback: Callback) {
        pending.push(callback);
      },
      query() {
        return new Promise((resolve) => {
          this.connect((_error, result) => resolve(result));
        });
      },
    };
    const restore = observeCatalogueQueries(
      pool,
      true,
      () => 0,
      (line) => lines.push(line),
    );
    try {
      const first = pool.query();
      const second = pool.query();
      pending[1]?.(undefined, { rowCount: 2 });
      pending[0]?.(undefined, { rowCount: 1 });
      await Promise.all([first, second]);
      expect(lines).toEqual([
        "[import-query] id=2 event=acquire duration_ms=0.000",
        "[import-query] id=1 event=acquire duration_ms=0.000",
        "[import-query] id=2 event=driver duration_ms=0.000 row_count=2",
        "[import-query] id=1 event=driver duration_ms=0.000 row_count=1",
      ]);
    } finally {
      restore();
    }
  });

  it("is inert when disabled and isolates a failing diagnostic sink from application errors", async () => {
    const f = fixture();
    f.observe(false)();
    expect(f.pool.query).toBe(f.originals.query);
    expect(f.pool.connect).toBe(f.originals.connect);
    expect(f.lines).toEqual([]);
    const error = new Error("original");
    f.fail(error);
    const restore = f.observe(true, () => {
      throw new Error("sink");
    });
    try {
      await expect(f.pool.query(f.config)).rejects.toBe(error);
      let count = 0;
      f.pool.query(f.config, (received: unknown) => {
        expect(received).toBe(error);
        count++;
      });
      expect(count).toBe(1);
    } finally {
      restore();
    }
  });
});
