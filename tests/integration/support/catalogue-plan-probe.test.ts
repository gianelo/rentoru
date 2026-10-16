import { describe, expect, it, vi } from "vitest";
import { CATALOGUE_ZONES_SQL, createCataloguePlanProbe } from "./catalogue-plan-probe";

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
                "Planning Time": 1,
                "Execution Time": 4,
                "PRIVATE SQL": "PRIVATE ROW",
                Plan: {
                  "Actual Rows": 5798,
                  "Actual Loops": 1,
                  "Shared Hit Blocks": 10,
                  "Shared Read Blocks": 0,
                  "Temp Read Blocks": 0,
                  "Temp Written Blocks": 0,
                  Plans: [{ "Node Type": "Nested Loop", "Actual Loops": 3 }],
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

describe("catalogue plan probe", () => {
  it("replays only the observed parameter-free query once and emits numeric metrics only", async () => {
    const f = fixture();
    f.probe.logger.logQuery(CATALOGUE_ZONES_SQL, []);
    await f.probe.run();
    await f.probe.run();
    expect(f.query).toHaveBeenCalledExactlyOnceWith({
      text: `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${CATALOGUE_ZONES_SQL}`,
      query_timeout: 5_000,
    });
    expect(f.lines).toEqual([
      '[import-plan] {"event":"plan","driver_explain_ms":7,"server_execution_ms":4,"planning_ms":1,"rows":5798,"max_loops":3,"nested_loops":1,"shared_hits":10,"shared_reads":0,"temp_reads":0,"temp_written":0,"jit_ms":null}',
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
      '[import-plan] {"event":"plan","driver_explain_ms":0,"server_execution_ms":4,"planning_ms":null,"rows":null,"max_loops":null,"nested_loops":0,"shared_hits":null,"shared_reads":null,"temp_reads":null,"temp_written":null,"jit_ms":null}',
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
