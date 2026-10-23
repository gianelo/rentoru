export const CATALOGUE_ZONES_SQL =
  'select "zone"."id", "zone"."name", "zone"."city_id", "zone"."kind", "zone"."category", "parent"."name" from "zone" left join "zone" "parent" on "zone"."parent_id" = "parent"."id" order by "zone"."name" asc';

// One backend supplies this numeric snapshot; later queries are not pinned to it.
export const CATALOGUE_STATE_SQL = `SELECT
  (SELECT count(*)::float8 FROM public.zone) AS actual_rows,
  c.reltuples::float8 AS reltuples, c.relpages::float8 AS relpages,
  s.n_mod_since_analyze::float8 AS n_mod_since_analyze,
  s.analyze_count::float8 AS analyze_count,
  s.autoanalyze_count::float8 AS autoanalyze_count,
  extract(epoch FROM s.last_analyze)::float8 AS last_analyze,
  extract(epoch FROM s.last_autoanalyze)::float8 AS last_autoanalyze,
  pg_backend_pid() AS pid,
  current_setting('server_version_num')::float8 AS server_version_num,
  pg_size_bytes(current_setting('work_mem'))::float8 AS work_mem_bytes,
  (current_setting('enable_hashjoin')::boolean)::int AS hashjoin,
  (current_setting('enable_nestloop')::boolean)::int AS nestloop,
  (current_setting('enable_memoize')::boolean)::int AS memoize,
  (current_setting('jit')::boolean)::int AS jit
FROM pg_class c LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
WHERE c.oid = 'public.zone'::regclass`;
const flags = new Set(["hashjoin", "nestloop", "memoize", "jit"]);
const stateFields = [
  "actual_rows",
  "reltuples",
  "relpages",
  "n_mod_since_analyze",
  "analyze_count",
  "autoanalyze_count",
  "last_analyze",
  "last_autoanalyze",
  "pid",
  "server_version_num",
  "work_mem_bytes",
  ...flags,
];
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
  let boundaryMatched: boolean | undefined;
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
        if (enabled && query === CATALOGUE_ZONES_SQL && params.length === 0) {
          observed = query;
          if (boundaryMatched !== undefined) boundaryMatched = true;
        }
      },
    },
    async aroundZonesRead<T>(label: "first" | "second", action: () => Promise<T>): Promise<T> {
      if (!enabled) return action();
      const boundary = label === "first" || label === "second" ? label : "unknown";
      const record = (metrics: Plan) => emit({ ...metrics, boundary });
      const start = clock();
      record({ event: "snapshot_start" });
      for (const phase of ["state", "plan"] as const) {
        let deadline: ReturnType<typeof setTimeout> | undefined;
        try {
          const expired = new Promise<never>((_resolve, reject) => {
            deadline = setTimeout(() => reject(new Error("Probe deadline")), 5_000);
          });
          const result = await Promise.race([
            pool.query({
              text:
                phase === "state"
                  ? CATALOGUE_STATE_SQL
                  : `EXPLAIN (FORMAT JSON) ${CATALOGUE_ZONES_SQL}`,
              query_timeout: 5_000,
            }),
            expired,
          ]);
          if (phase === "state") {
            const row = result.rows[0] ?? {};
            record({
              event: "state",
              ...Object.fromEntries(
                stateFields.map((key) => {
                  const value = row[key];
                  const metric =
                    key === "reltuples" && value === -1
                      ? -1
                      : flags.has(key)
                        ? value === 0 || value === 1
                          ? value
                          : null
                        : numeric(value);
                  return [key, metric];
                }),
              ),
            });
          } else {
            const report = (result.rows[0]?.["QUERY PLAN"] as Plan[] | undefined)?.[0];
            const tree = nodes(report?.Plan);
            if (!tree.length) throw new Error("Missing plan");
            record({
              event: "candidate_plan",
              mode: "estimated",
              sql_match: "unverified",
              backend: "unknown",
              nodes: tree.map((node) => ({
                type: nodeTypes.has(node["Node Type"] as string) ? node["Node Type"] : null,
                estimate: numeric(node["Plan Rows"]),
              })),
            });
          }
        } catch (error) {
          const code = (error as { code?: unknown } | null)?.code;
          record({
            event: "unavailable",
            phase,
            sqlstate: code === "57014" || code === "42P01" || code === "42501" ? code : "unknown",
          });
        } finally {
          if (deadline !== undefined) clearTimeout(deadline);
        }
      }
      record({ event: "snapshot_end", elapsed_ms: numeric(clock() - start) });
      boundaryMatched = false;
      try {
        return await action();
      } finally {
        record({
          event: "association",
          sql_match: boundaryMatched ? "observed" : "unknown",
          backend: "unknown",
        });
        boundaryMatched = undefined;
      }
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
