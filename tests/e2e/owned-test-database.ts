export function ownedDatabase(): string {
  const value = process.env.TEST_DATABASE_URL;
  if (!value || process.env.DATABASE_URL !== undefined || process.env.PLAYWRIGHT_BASE_URL) {
    throw new Error(
      "Authenticated listing E2E requires an isolated local database and no ambient DATABASE_URL or preview URL",
    );
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Authenticated listing E2E requires the exact owned test database DSN");
  }
  const local = url.hostname === "127.0.0.1" && url.port === "55431";
  const ci =
    process.env.GITHUB_ACTIONS === "true" && url.hostname === "localhost" && url.port === "5432";
  if (
    url.protocol !== "postgresql:" ||
    url.username !== "postgres" ||
    url.password !== "postgres" ||
    url.pathname !== "/rentas_test" ||
    url.search !== "" ||
    url.hash !== "" ||
    !(local || ci)
  ) {
    throw new Error("Authenticated listing E2E requires the exact owned test database DSN");
  }
  return value;
}
