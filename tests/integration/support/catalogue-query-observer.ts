type PoolMethods = {
  connect: (...args: never[]) => unknown;
  query: (...args: never[]) => unknown;
};

/** Pool.query includes acquisition, not just server execution. No SQL/config inspection. */
export function observeCatalogueQueries<T extends PoolMethods>(
  pool: T,
  enabled: boolean,
  clock: () => number = () => performance.now(),
  sink: (line: string) => void = console.info,
): () => void {
  if (!enabled) return () => {};
  const { connect, query } = pool;
  let sequence = 0;
  let activeQuery: number | undefined;
  const wrap = <F extends (...args: never[]) => unknown>(
    original: F,
    event: "acquire" | "driver",
  ): F =>
    new Proxy(original, {
      apply(target, receiver: unknown, supplied: unknown[]) {
        const id = event === "acquire" ? (activeQuery ?? ++sequence) : ++sequence;
        const start = clock();
        const previous = activeQuery;
        const finish = (error: unknown, result: unknown) => {
          // Diagnostics must never replace application results/errors, even if the sink fails.
          try {
            const duration = clock() - start;
            const count =
              result && typeof result === "object" && "rowCount" in result ? result.rowCount : null;
            const state =
              error && typeof error === "object" && "code" in error && error.code === "23505";
            sink(
              `[import-query] id=${id} event=${event}${error ? "_error" : ""} duration_ms=${(Number.isFinite(duration) ? Math.max(0, duration) : 0).toFixed(3)}` +
                (event === "driver" &&
                !error &&
                typeof count === "number" &&
                Number.isSafeInteger(count) &&
                count >= 0
                  ? ` row_count=${count}`
                  : "") +
                (state ? " sqlstate=23505" : ""),
            );
          } catch {
            // Best-effort numeric telemetry only; intentionally isolated from the query.
          }
        };
        const args = [...supplied];
        const callback = args.at(-1);
        const callbackMode = typeof callback === "function";
        if (callbackMode) {
          args[args.length - 1] = function (this: unknown, ...values: unknown[]) {
            finish(values[0], values[1]);
            return Reflect.apply(callback, this, values);
          };
        }
        // pg-pool calls this.connect synchronously, before returning its query promise.
        if (event === "driver") activeQuery = id;
        let returned: unknown;
        try {
          returned = Reflect.apply(target, receiver, args);
        } catch (error) {
          if (!callbackMode) finish(error, undefined);
          throw error;
        } finally {
          activeQuery = previous;
        }
        if (returned instanceof Promise) {
          return returned.then(
            (result: unknown) => {
              finish(undefined, result);
              return result;
            },
            (error: unknown) => {
              finish(error, undefined);
              throw error;
            },
          );
        }
        return returned;
      },
    });
  pool.connect = wrap(connect, "acquire");
  pool.query = wrap(query, "driver");
  return () => {
    pool.connect = connect;
    pool.query = query;
  };
}
