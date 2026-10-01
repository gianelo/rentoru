export function selectedOwnedDatabase(): string {
  const selector = process.env.F31_TEST_DB_PORT;
  if (selector === undefined) return ownedDatabase();
  if (selector !== "55433") {
    throw new Error("F31_TEST_DB_PORT must be exactly 55433 when set");
  }
  return ownedDatabase("55433");
}

export function ownedDatabase(localPort: "55431" | "55433" = "55431"): string {
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
  const local = url.hostname === "127.0.0.1" && url.port === localPort;
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
