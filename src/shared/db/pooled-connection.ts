const POOLED_HOST_MARKER = "-pooler.";
const NEON_HOST_SUFFIX = ".neon.tech";

/**
 * The narrowest guarantee for D2 (design.md): the runtime is serverless, so
 * the Neon *direct* connection endpoint is the predictable way to exhaust
 * Postgres connections under concurrency. When the host is Neon's, its pooled
 * endpoint (PgBouncer, hostname carries `-pooler.`) is the only one this app
 * is allowed to use.
 *
 * The rule is Neon's, not Postgres's. Any other host — the local container,
 * CI's service, another provider — has no `-pooler.` endpoint to demand, and
 * pooling there is that provider's configuration, so it passes unchanged.
 *
 * This is enforced here — the narrowest point any connection string passes
 * through — rather than left as a deployment convention a caller has to
 * remember, per the design's guiding principle: "a rule a caller can forget
 * is not a guarantee".
 */
export function assertPooledConnectionString(connectionString: string): string {
  let host: string;

  try {
    // Case-folded and stripped of a trailing root dot: `new URL()` does
    // neither for `postgresql:`, and either would slip the direct endpoint past.
    host = new URL(connectionString).hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    throw new Error("DATABASE_URL is not a valid connection string.");
  }

  if (host.endsWith(NEON_HOST_SUFFIX) && !host.includes(POOLED_HOST_MARKER)) {
    throw new Error(
      `DATABASE_URL must target Neon's pooled endpoint (hostname containing "${POOLED_HOST_MARKER}"), ` +
        `got "${host}". The direct endpoint exhausts connections under serverless concurrency (design.md D2).`,
    );
  }

  return connectionString;
}
