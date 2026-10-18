type Phase =
  | "vocabulary"
  | "cities"
  | "activeZones"
  | "collections"
  | "covers"
  | "session"
  | "navFlags";
interface Options {
  env?: Record<string, string | undefined>;
  now?: () => number;
  emit?: (line: string) => void;
}
const PHASES = new Set<Phase>([
  "vocabulary",
  "cities",
  "activeZones",
  "collections",
  "covers",
  "session",
  "navFlags",
]);

/** Per-request data preparation, not edge/startup or React rendering time. */
export function createHomeSsrTiming(options: Options = {}) {
  const env = options.env ?? process.env;
  const enabled =
    env.HOME_SSR_TIMING_DIAGNOSTICS === "1" &&
    env.VERCEL_ENV === "preview" &&
    env.VERCEL_GIT_COMMIT_REF === "dev";
  const now = options.now ?? (() => performance.now());
  const emit = options.emit ?? ((line: string) => console.info(line));
  const phasesMs: Partial<Record<Phase, number | null>> = {};
  let finished = false;
  const readTime = (): number | null => {
    try {
      const value = now();
      return Number.isFinite(value) && value >= 0 ? value : null;
    } catch {
      return null;
    }
  };
  const elapsed = (start: number | null): number | null => {
    const end = readTime();
    return start !== null && end !== null && end >= start ? end - start : null;
  };
  const started = enabled ? readTime() : null;

  return {
    measure<T>(phase: Phase, action: () => Promise<T>): Promise<T> {
      if (!enabled || !PHASES.has(phase)) return action();
      const start = readTime();
      return action().finally(() => {
        phasesMs[phase] = elapsed(start);
      });
    },
    finish() {
      if (!enabled || finished) return;
      finished = true;
      try {
        emit(
          JSON.stringify({
            schema: "home-ssr-timing/v1",
            dataPreparationMs: elapsed(started),
            phasesMs: { ...phasesMs },
          }),
        );
      } catch {
        // Diagnostics must never replace the page's result or error.
      }
    },
  };
}
