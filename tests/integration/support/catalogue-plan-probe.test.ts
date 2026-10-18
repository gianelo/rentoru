import { describe, expect, it, vi } from "vitest";
import {
  CATALOGUE_STATE_SQL,
  CATALOGUE_ZONES_SQL,
  createCataloguePlanProbe,
} from "./catalogue-plan-probe";

function fixture(enabled = true) {
  let time = 0;
  const lines: string[] = [];
  const query = vi.fn(
    async (
      _sql: string | { text: string; query_timeout: number },
    ): Promise<{ rows: Record<string, unknown>[] }> => {
      time += 7;
      return {
        rows: [
          {
            "QUERY PLAN": [
              {
                "PRIVATE SQL": "PRIVATE ROW",
                Plan: {
                  "Node Type": "Sort",
                  "Plan Rows": 1,
                  Plans: [{ "Node Type": "Nested Loop", "Plan Rows": 1 }],
                },
              },
            ],
          },
        ],
      };
    },
  );
  const probe = createCataloguePlanProbe(
    { query },
    enabled,
    (line) => lines.push(line),
    () => time,
  );
  return { query, probe, lines };
}

function records(lines: string[]) {
  return lines.map((line) => JSON.parse(line.replace("[import-plan] ", "")));
}

describe("pre-read snapshot", () => {
  it("finishes state and candidate plan before each action; matches only fresh exact SQL", async () => {
    const f = fixture();
    const state = { actual_rows: 5798, reltuples: -1, relpages: 0, hashjoin: 1 };
    f.query.mockResolvedValueOnce({ rows: [state] });
    const result = {};
    let calls = 0;
    expect(
      await f.probe.aroundZonesRead("first", async () => {
        calls++;
        expect(records(f.lines).map((r) => r.event)).toEqual([
          "snapshot_start",
          "state",
          "candidate_plan",
          "snapshot_end",
        ]);
        expect(f.query.mock.calls.map(([config]) => config)).toEqual([
          { text: CATALOGUE_STATE_SQL, query_timeout: 5_000 },
          { text: `EXPLAIN (FORMAT JSON) ${CATALOGUE_ZONES_SQL}`, query_timeout: 5_000 },
        ]);
        f.probe.logger.logQuery(CATALOGUE_ZONES_SQL, []);
        return result;
      }),
    ).toBe(result);
    expect(calls).toBe(1);
    expect(records(f.lines)[1]).toMatchObject({ boundary: "first", ...state });
    expect(records(f.lines).at(-1)).toEqual({
      event: "association",
      boundary: "first",
      sql_match: "observed",
      backend: "unknown",
    });
    await f.probe.aroundZonesRead("second", async () => {
      f.probe.logger.logQuery(CATALOGUE_ZONES_SQL, ["PRIVATE"]);
      f.probe.logger.logQuery("PRIVATE SQL", []);
    });
    expect(records(f.lines).at(-1)).toEqual({
      event: "association",
      boundary: "second",
      sql_match: "unknown",
      backend: "unknown",
    });
    expect(records(f.lines).filter((r) => r.event === "candidate_plan")).toHaveLength(2);
  });

  it("whitelists every new record, signed estimates, numeric fields and runtime labels", async () => {
    const f = fixture();
    f.query.mockResolvedValueOnce({
      rows: [
        {
          actual_rows: "PRIVATE",
          reltuples: -2,
          relpages: Infinity,
          n_mod_since_analyze: NaN,
          analyze_count: -1,
          autoanalyze_count: 3,
          last_analyze: "PRIVATE",
          last_autoanalyze: 12,
          pid: 5,
          server_version_num: 180006,
          work_mem_bytes: 4194304,
          hashjoin: 2,
          nestloop: 0,
          memoize: "on PRIVATE",
          jit: 1,
          secret: "PRIVATE",
        },
      ],
    });
    f.query.mockResolvedValueOnce({
      rows: [
        {
          "QUERY PLAN": [
            {
              Plan: {
                "Node Type": "PRIVATE",
                "Plan Rows": "PRIVATE",
                secret: "PRIVATE",
              },
            },
          ],
        },
      ],
    });
    await f.probe.aroundZonesRead("PRIVATE" as "first", async () => {});
    expect(records(f.lines)[1]).toEqual({
      event: "state",
      boundary: "unknown",
      actual_rows: null,
      reltuples: null,
      relpages: null,
      n_mod_since_analyze: null,
      analyze_count: null,
      autoanalyze_count: 3,
      last_analyze: null,
      last_autoanalyze: 12,
      pid: 5,
      server_version_num: 180006,
      work_mem_bytes: 4194304,
      hashjoin: null,
      nestloop: 0,
      memoize: null,
      jit: 1,
    });
    expect(records(f.lines)[2]).toEqual({
      event: "candidate_plan",
      boundary: "unknown",
      mode: "estimated",
      sql_match: "unverified",
      backend: "unknown",
      nodes: [{ type: null, estimate: null }],
    });
    expect(f.lines.join(" ")).not.toContain("PRIVATE");
  });

  it.each(["57014", "PRIVATE"])(
    "preserves rejection and once-only action when diagnostics fail (%s)",
    async (code) => {
      const f = fixture();
      f.query.mockRejectedValue(Object.assign(new Error("PRIVATE"), { code }));
      const error = new Error("original");
      const action = vi.fn(async () => {
        throw error;
      });
      await expect(f.probe.aroundZonesRead("first", action)).rejects.toBe(error);
      expect(action).toHaveBeenCalledTimes(1);
      expect(records(f.lines).filter((r) => r.event === "unavailable")).toEqual([
        {
          event: "unavailable",
          boundary: "first",
          phase: "state",
          sqlstate: code === "57014" ? code : "unknown",
        },
        {
          event: "unavailable",
          boundary: "first",
          phase: "plan",
          sqlstate: code === "57014" ? code : "unknown",
        },
      ]);
      expect(f.lines.join(" ")).not.toContain("PRIVATE");
      const sinkFailure = createCataloguePlanProbe(f, true, () => {
        throw new Error("PRIVATE");
      });
      await expect(sinkFailure.aroundZonesRead("second", action)).rejects.toBe(error);
      expect(action).toHaveBeenCalledTimes(2);
    },
  );

  it("keeps disabled reads inert and reports missing metadata/plan honestly", async () => {
    const f = fixture(false);
    const action = vi.fn(async () => f);
    expect(await f.probe.aroundZonesRead("first", action)).toBe(f);
    expect(action).toHaveBeenCalledTimes(1);
    expect(f.query).not.toHaveBeenCalled();
    expect(f.lines).toEqual([]);
    const missing = fixture();
    missing.query.mockResolvedValue({ rows: [] });
    await missing.probe.aroundZonesRead("second", async () => {});
    expect(records(missing.lines)[1].actual_rows).toBeNull();
    expect(records(missing.lines)[2]).toMatchObject({
      event: "unavailable",
      phase: "plan",
      sqlstate: "unknown",
    });
  });
});

describe("catalogue plan probe", () => {
  it("replays only the observed parameter-free query once and emits numeric metrics only", async () => {
    const f = fixture();
    f.probe.logger.logQuery(CATALOGUE_ZONES_SQL, []);
    await f.probe.run();
    await f.probe.run();
    expect(f.query).toHaveBeenCalledExactlyOnceWith({
      text: `EXPLAIN (FORMAT JSON) ${CATALOGUE_ZONES_SQL}`,
      query_timeout: 5_000,
    });
    expect(f.lines).toEqual([
      '[import-plan] {"event":"plan","mode":"estimated","driver_explain_ms":7,"server_execution_ms":null,"planning_ms":null,"rows":null,"max_loops":null,"nested_loops":1,"shared_hits":null,"shared_reads":null,"temp_reads":null,"temp_written":null,"jit_ms":null,"nodes":[{"type":"Sort","estimate":1,"rows":null,"loops":null,"hits":null,"filtered":null,"join_filtered":null},{"type":"Nested Loop","estimate":1,"rows":null,"loops":null,"hits":null,"filtered":null,"join_filtered":null}]}',
    ]);
    expect(f.lines.join(" ")).not.toContain("PRIVATE");
  });

  it.each([
    ["PRIVATE SQL", []],
    [CATALOGUE_ZONES_SQL, ["PRIVATE PARAM"]],
  ])("does not replay an unrecognized or parameterized statement", async (sql, params) => {
    const f = fixture();
    f.probe.logger.logQuery(sql as string, params as unknown[]);
    await f.probe.run();
    expect(f.query).not.toHaveBeenCalled();
    expect(f.lines).toEqual([
      '[import-plan] {"event":"unavailable","reason":"query_not_observed"}',
    ]);
  });

  it("stops waiting after five seconds even when pool acquisition never completes", async () => {
    vi.useFakeTimers();
    try {
      const lines: string[] = [];
      const query = vi.fn(() => new Promise<{ rows: Record<string, unknown>[] }>(() => {}));
      const probe = createCataloguePlanProbe({ query }, true, (line) => lines.push(line));
      probe.logger.logQuery(CATALOGUE_ZONES_SQL, []);
      let finished = false;
      const pending = probe.run().then(() => {
        finished = true;
      });
      await vi.advanceTimersByTimeAsync(5_000);
      expect(finished).toBe(true);
      expect(lines).toEqual(['[import-plan] {"event":"unavailable","reason":"explain_failed"}']);
      await pending;
    } finally {
      vi.useRealTimers();
    }
  });

  it("replaces private or non-finite metric values with null", async () => {
    const f = fixture();
    f.query.mockResolvedValueOnce({
      rows: [
        {
          "QUERY PLAN": [
            {
              "Execution Time": 4,
              "Planning Time": "PRIVATE",
              Plan: {
                "Actual Rows": "PRIVATE",
                "Actual Loops": Infinity,
                "Shared Hit Blocks": -1,
                "Shared Read Blocks": NaN,
                Plans: [{ "Node Type": "PRIVATE", "Actual Loops": -1 }],
              },
              JIT: { Timing: { Total: "PRIVATE" } },
            },
          ],
        },
      ],
    });
    f.probe.logger.logQuery(CATALOGUE_ZONES_SQL, []);
    await f.probe.run();
    expect(f.lines).toEqual([
      '[import-plan] {"event":"plan","mode":"estimated","driver_explain_ms":0,"server_execution_ms":null,"planning_ms":null,"rows":null,"max_loops":null,"nested_loops":0,"shared_hits":null,"shared_reads":null,"temp_reads":null,"temp_written":null,"jit_ms":null,"nodes":[{"type":null,"estimate":null,"rows":null,"loops":null,"hits":null,"filtered":null,"join_filtered":null},{"type":null,"estimate":null,"rows":null,"loops":null,"hits":null,"filtered":null,"join_filtered":null}]}',
    ]);
  });

  it("is inert outside CI and does not replace a test result with a diagnostic error", async () => {
    const disabled = fixture(false);
    disabled.probe.logger.logQuery(CATALOGUE_ZONES_SQL, []);
    await disabled.probe.run();
    expect(disabled.query).not.toHaveBeenCalled();
    expect(disabled.lines).toEqual([]);
    const failed = fixture();
    failed.query.mockRejectedValueOnce(new Error("PRIVATE ERROR"));
    failed.probe.logger.logQuery(CATALOGUE_ZONES_SQL, []);
    await expect(failed.probe.run()).resolves.toBeUndefined();
    expect(failed.lines).toEqual([
      '[import-plan] {"event":"unavailable","reason":"explain_failed"}',
    ]);
    const throwingSink = createCataloguePlanProbe(failed, true, () => {
      throw new Error("PRIVATE SINK");
    });
    throwingSink.logger.logQuery(CATALOGUE_ZONES_SQL, []);
    await expect(throwingSink.run()).resolves.toBeUndefined();
  });
});
