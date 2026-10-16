export const CATALOGUE_ZONES_SQL =
  'select "zone"."id", "zone"."name", "zone"."city_id", "zone"."kind", "zone"."category", "parent"."name" from "zone" left join "zone" "parent" on "zone"."parent_id" = "parent"."id" order by "zone"."name" asc';

type Plan = Record<string, unknown>;
const nodeTypes = new Set([
  "Sort",
  "Hash Join",
  "Nested Loop",
  "Seq Scan",
  "Index Scan",
  "Index Only Scan",
  "Hash",
  "Materialize",
  "Memoize",
  "Merge Join",
  "Incremental Sort",
  "Gather",
  "Gather Merge",
]);
const numeric = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
function nodes(value: unknown): Plan[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const node = value as Plan;
  return [node, ...(Array.isArray(node.Plans) ? node.Plans.flatMap(nodes) : [])];
}

/** One CI-only estimated plan for the observed SELECT; never executes it or logs data. */
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
            text: `EXPLAIN (FORMAT JSON) ${observed}`,
            query_timeout: 5_000,
          }),
          expired,
        ]);
        const driver = clock() - start;
        const report = (result.rows[0]?.["QUERY PLAN"] as Plan[] | undefined)?.[0];
        if (!report) throw new Error("Invalid plan");
        const tree = nodes(report.Plan);
        if (tree.length === 0) throw new Error("Missing plan");
        emit({
          event: "plan",
          mode: "estimated",
          driver_explain_ms: numeric(driver),
          server_execution_ms: null,
          planning_ms: null,
          rows: null,
          max_loops: null,
          nested_loops: tree.filter((node) => node["Node Type"] === "Nested Loop").length,
          shared_hits: null,
          shared_reads: null,
          temp_reads: null,
          temp_written: null,
          jit_ms: null,
          nodes: tree.map((node) => ({
            type: nodeTypes.has(node["Node Type"] as string) ? node["Node Type"] : null,
            estimate: numeric(node["Plan Rows"]),
            rows: null,
            loops: null,
            hits: null,
            filtered: null,
            join_filtered: null,
          })),
        });
      } catch {
        emit({ event: "unavailable", reason: "explain_failed" });
      } finally {
        if (deadline !== undefined) clearTimeout(deadline);
      }
    },
  };
}
