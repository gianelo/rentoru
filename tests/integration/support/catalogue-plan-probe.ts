export const CATALOGUE_ZONES_SQL =
  'select "zone"."id", "zone"."name", "zone"."city_id", "zone"."kind", "zone"."category", "parent"."name" from "zone" left join "zone" "parent" on "zone"."parent_id" = "parent"."id" order by "zone"."name" asc';

type Plan = Record<string, unknown>;
const numeric = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
function nodes(value: unknown): Plan[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const node = value as Plan;
  return [node, ...(Array.isArray(node.Plans) ? node.Plans.flatMap(nodes) : [])];
}

/** One CI-only replay of the exact observed SELECT; never logs SQL, data or errors. */
export function createCataloguePlanProbe(
  pool: {
    query(config: {
      text: string;
      query_timeout: number;
    }): Promise<{ rows: Record<string, unknown>[] }>;
  },
  enabled: boolean,
  sink: (line: string) => void = console.info,
  clock: () => number = () => performance.now(),
) {
  let observed: string | undefined;
  let attempted = false;
  const emit = (metrics: Record<string, unknown>) => {
    try {
      sink(`[import-plan] ${JSON.stringify(metrics)}`);
    } catch {
      /* Best-effort telemetry. */
    }
  };
  return {
    logger: {
      logQuery(query: string, params: unknown[]) {
        if (enabled && query === CATALOGUE_ZONES_SQL && params.length === 0) observed = query;
      },
    },
    async run() {
      if (!enabled || attempted) return;
      attempted = true;
      if (!observed) {
        emit({ event: "unavailable", reason: "query_not_observed" });
        return;
      }
      let deadline: ReturnType<typeof setTimeout> | undefined;
      try {
        const start = clock();
        const expired = new Promise<never>((_resolve, reject) => {
          deadline = setTimeout(() => reject(new Error("Probe deadline")), 5_000);
        });
        const result = await Promise.race([
          pool.query({
            text: `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${observed}`,
            query_timeout: 5_000,
          }),
          expired,
        ]);
        const driver = clock() - start;
        const report = (result.rows[0]?.["QUERY PLAN"] as Plan[] | undefined)?.[0];
        if (!report || numeric(report["Execution Time"]) === null) throw new Error("Invalid plan");
        const tree = nodes(report.Plan);
        if (tree.length === 0) throw new Error("Missing plan");
        const root = tree[0] as Plan;
        const loops = tree.map((node) => numeric(node["Actual Loops"])).filter((n) => n !== null);
        const jit = report.JIT as { Timing?: { Total?: unknown } } | undefined;
        emit({
          event: "plan",
          driver_explain_ms: numeric(driver),
          server_execution_ms: numeric(report["Execution Time"]),
          planning_ms: numeric(report["Planning Time"]),
          rows: numeric(root["Actual Rows"]),
          max_loops: loops.length ? Math.max(...loops) : null,
          nested_loops: tree.filter((node) => node["Node Type"] === "Nested Loop").length,
          shared_hits: numeric(root["Shared Hit Blocks"]),
          shared_reads: numeric(root["Shared Read Blocks"]),
          temp_reads: numeric(root["Temp Read Blocks"]),
          temp_written: numeric(root["Temp Written Blocks"]),
          jit_ms: numeric(jit?.Timing?.Total),
        });
      } catch {
        emit({ event: "unavailable", reason: "explain_failed" });
      } finally {
        if (deadline !== undefined) clearTimeout(deadline);
      }
    },
  };
}
