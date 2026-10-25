# Design: MVP Rental Listings

Greenfield. This design carries the **blocking stack decision** for the whole project, and encodes the MVP's two hard guarantees (city isolation, cross-publisher photo dedup) structurally rather than by caller discipline.

## Decision at a glance

| Concern | Choice | Free tier at launch |
|---|---|---|
| Language / runtime | TypeScript, Node 22 | — |
| Framework | Next.js 15 App Router + React 19 | — |
| Hosting | Vercel (Hobby) | Yes — see D8, tracked debt |
| Database | Neon Postgres (pooled endpoint) | Yes |
| Data access | Drizzle ORM + `@neondatabase/serverless` | — |
| Object storage | Cloudflare R2 (S3 API, presigned PUT) | 10 GB, $0 egress |
| Auth | Auth.js v5, Google provider, Drizzle adapter | Yes |
| Email | Resend + React Email | 3k/mo, 100/day |
| Scheduler | Vercel Cron → authenticated HTTP job route | Yes — see D3 |
| Image processing | `sharp` (resize + dHash source buffer) | — |
| Test / lint | Vitest, Playwright, Biome, pnpm | — |

**`test_command`: `pnpm test`** (`vitest run`).

## Technical Approach

Screaming architecture: one folder per capability, each internally hexagonal. The Next.js `app/` tree is a thin delivery adapter that only translates HTTP/RSC into a use case call — no business rule lives there.

```
src/
  modules/
    identity/            listing-publication/   listing-search/
    contact-reveal/      listing-lifecycle/     listing-trust/
    broker-bulk-import/  voluntary-contribution/
      domain/            entities, value objects, invariants (zero deps)
      application/       use cases + ports (interfaces only)
      infrastructure/    Drizzle repos, R2, Resend, sharp adapters
  shared/                db client, config, result type, errors
app/                     routes, server actions, RSC containers
components/              atomic design; presentational only, no data fetching
```

UI follows container-presentational: RSC server components are the containers (they call use cases and fetch), client components are presentational and receive props.

**Guiding principle — guarantees live in the narrowest API.** A rule that can be forgotten by a caller is not a guarantee. Both hard rules below are enforced by making the unsafe query unrepresentable.

## Architecture Decisions

### D1 — TypeScript / Next.js / Vercel over anything else

| Option | Verdict |
|---|---|
| **Next.js + Vercel** | **Chosen.** Founder is TS full-stack; one repo, one deploy, one language across UI, use cases, and the job. Part-time hours are the scarcest resource — familiarity beats theoretical fit. |
| Python/Django, Go, Rails | Rejected. Objectively fine, but every bug becomes three nights instead of one. |
| Remix / SvelteKit / Astro | Rejected. Comparable fit, smaller ecosystem gain, no reason to trade away the founder's strongest tooling. |
| Split SPA + separate API | Rejected. Doubles deploys, CORS, and auth surface for a solo maintainer. |

### D2 — Neon + Cloudflare R2 over Supabase all-in-one

Supabase is the tempting "one service" answer and was seriously considered. It loses on **egress**: its free tier caps bandwidth at ~5 GB/month, and a listing page with 6 photos is ~2 MB, so the catalog would throttle at roughly 2,500 detail views/month — before the product has an audience.

R2 charges **zero egress** and gives 10 GB free, which is decisive for a photo-heavy marketplace. Once storage leaves Supabase, its remaining advantage is Auth, and Auth.js covers that inside the app with sessions in our own Postgres — which also keeps `user`, `listing`, `photo_hash`, and `reveal_event` joinable in one database with no cross-service reads.

Rejected: Vercel Postgres/Blob (thinner free tier, deeper lock-in), Railway/Render/Fly (no meaningful free tier remains), SQLite/Turso (weaker for the ad-hoc metric queries the north star needs).

### D3 — The scheduled job: dumb trigger, idempotent job

This is the constraint that breaks naive serverless designs, so it is designed to survive any scheduler.

**The trigger never does the work.** `POST /api/jobs/expiry-reminders` is an ordinary authenticated route that runs `SendExpiryRemindersUseCase`. Vercel Cron calls it daily. Because the entry point is plain authenticated HTTP, the scheduler is swappable in minutes — Cloudflare Worker cron, GitHub Actions, or a founder running `curl` by hand — with no code change. That is the real mitigation for platform risk.

The use case is **idempotent, batched, and self-recording**:

- Selects listings where `expires_at` falls in the 5-day window and status is `active`.
- Processes in bounded batches, so a platform execution timeout truncates rather than corrupts, and the next run resumes.
- `listing_reminder` carries `UNIQUE (listing_id, expires_at)`, so a re-run, retry, or double-trigger cannot double-send.
- Every run writes a `job_run` row: `started_at`, `finished_at`, `status`, `candidates_found`, `reminders_sent`, `failures`, `error`. **The job failing silently is the single highest-likelihood MVP risk; recorded runs from day one are the answer.**

Vercel Hobby crons fire once per day with best-effort timing (drift up to ~1 hour). At day granularity for a 5-day-ahead reminder, drift is irrelevant. Cron staleness is still detectable: a "no successful `job_run` in 48h" check is a follow-up, not MVP scope.

### D4 — Perceptual hashing: dHash + Hamming in Postgres

**Approach:** `sharp` normalizes each upload to a 9×8 grayscale buffer; a **64-bit dHash** (difference hash — each bit compares a pixel to its right neighbour) is computed in the publication use case. Cryptographic hashes are explicitly not used: they cannot see a re-encoded or resized copy of the same photo, which is exactly the scam pattern.

**Where the comparison runs:** server-side at publish time, inside `PublishListingUseCase`, **before** the listing becomes `active`. The hash is stored as Postgres `bit(64)`; similarity is `bit_count(hash # $candidate) <= 8` (Hamming distance), using the native `bit_count` available on Postgres 14+.

**The same-publisher exemption is structural.** The photo-hash port exposes exactly one lookup:

```ts
interface PhotoHashPort {
  // No "findAllMatches" exists. The exemption cannot be forgotten.
  findMatchesFromOtherPublishers(
    hash: PerceptualHash,
    excludePublisherId: PublisherId,
    maxDistance: number,
  ): Promise<PhotoHashMatch[]>;
}
```

The publisher exclusion is a required argument on the only available query, pushed into the SQL `WHERE publisher_id <> $2`. An honest owner republishing their own property after expiry passes by construction — the renewal flow cannot be broken by this rule.

*Scale note:* a sequential scan is correct and fast at MVP volume (thousands of photos). Past ~100k photos, split the hash into four 16-bit buckets with an exact-match prefilter, or move to a BK-tree. Not MVP work.

### D5 — City isolation enforced by schema and signature

Two layers, no runtime filter to forget:

1. `zone` has `UNIQUE (id, city_id)`; `listing` carries a **composite foreign key** `(zone_id, city_id) → zone(id, city_id)`. A Maracaibo listing physically cannot hold a Distrito Capital zone.
2. `ListingSearchPort.search(criteria)` takes `cityId` as a **required non-nullable** field. There is no "search all cities" method to call by accident.

Zones are a curated seed table maintained by the founder; no free text.

### D6 — North star: one event table, one view

The metric has **two definitions that must both survive**: every reveal action, and the count of unique `(tenant, listing)` pairs. They are served by **one table and one view** — a single write, no second copy of the truth.

**`contact_reveal_event` — the single source of truth.**
`id, listing_id, publisher_id, tenant_user_id, city_id, revealed_at`. Append-only, **never deduplicated**. Every reveal action is one row, including a tenant revealing the same listing five times. Nothing is ever collapsed or deleted. `RevealContactUseCase` performs exactly one insert.

`city_id` is **copied at write time**, not joined. This keeps the metric intact even if a listing is later edited, expired, hidden, or deleted — a metric that a `JOIN` can erase is not a metric. The view inherits that property for free.

**`contact_reveal_unique_pair` — the headline go/pivot number, as a view.**

```sql
CREATE VIEW contact_reveal_unique_pair AS
SELECT DISTINCT ON (tenant_user_id, listing_id)
       tenant_user_id,
       listing_id,
       publisher_id,
       city_id,
       revealed_at AS first_revealed_at,
       count(*) OVER (PARTITION BY tenant_user_id, listing_id) AS reveal_count
FROM contact_reveal_event
ORDER BY tenant_user_id, listing_id, revealed_at, id;
```

`DISTINCT ON` keeps the earliest row per pair — which is what makes `first_revealed_at`, `publisher_id`, and `city_id` first-reveal values — while the window `count(*)` carries the repeat count. Exactly one row per `(tenant_user_id, listing_id)`, by construction.

**Why a view rather than a maintained projection.** The headline query stays a plain `COUNT(*)` over a name that is already deduplicated, so the correct number remains the easy number and no analyst has to remember `COUNT(DISTINCT …)`. That guarantee is the point, and a view delivers it identically. A maintained table would buy latency at the price of three real correctness risks: silent divergence the moment the second write ever leaves the transaction, hot-row lock contention on popular listings, and a `reveal_count` cache that can drift from the authoritative log. At MVP scale the aggregation runs over a few thousand rows, so that trade buys speed the project does not need with correctness it cannot spare.

**Escalation path (the reason deferring is safe):** if the aggregation ever becomes slow, `contact_reveal_unique_pair` can be promoted to a `MATERIALIZED VIEW` with a scheduled refresh, or to a maintained projection table, **without changing a single calling query** — callers only ever reference the view name. The decision is reversible at any time, which is precisely why it can be deferred now.

| Question | Query | Supporting index on `contact_reveal_event` |
|---|---|---|
| Unique tenant-listing pairs, per city, over time | `COUNT(*)` on `contact_reveal_unique_pair` filtered by `city_id`, `first_revealed_at` | `(tenant_user_id, listing_id, revealed_at, id)` — supplies the `DISTINCT ON` ordering and the window partition with no sort step |
| Unique pairs for one listing | `COUNT(*)` on the view with `listing_id = $1` | `(listing_id, revealed_at)`; `listing_id` is a `DISTINCT ON` key so the predicate pushes down to the base table |
| Total reveal actions, per city, over time | `COUNT(*)` on `contact_reveal_event` | `(city_id, revealed_at)` |
| Reveal actions for one listing | `COUNT(*)` on `contact_reveal_event` | `(listing_id, revealed_at)` |

*Plan note:* `city_id` and `first_revealed_at` are derived inside the view, so predicates on them cannot push down to the base table — the view aggregates first, then filters. Adding `city_id` to the grouping key would enable pushdown but would split a pair into two rows if a listing's city ever changed, so correctness wins. This is exactly the cost the escalation path above is there to absorb.

**Cohort semantics:** a pair is counted once, in the period of its `first_revealed_at`. A tenant who first revealed a listing in month 1 and returns in month 3 adds nothing to month 3's unique-pair count — it shows up in `reveal_count` and in the raw log instead. State this next to the 6-month go/pivot number so it is never read as monthly-active behaviour.

### D7 — Phone verification: port with no adapter

`identity/application/ports/phone-verification.port.ts` defines the contract. The only shipped implementation is `DisabledPhoneVerificationAdapter`, returning `{ enabled: false }`, wired behind `PHONE_VERIFICATION_ENABLED=false`. The domain never branches on the flag; registration simply never awaits verification in the MVP. The future WhatsApp inbound-code adapter drops in with zero domain change.

### D8 — Vercel Hobby accepted as tracked debt, with a hard trigger

**Resolved — this is not an open risk.** Rentas launches and operates on Vercel Hobby while the product is entirely free and produces no revenue. That is legitimate use under the Hobby terms: no listing fee, no featured placement, no advertising, no paid tier of any kind in v1.

**Trigger condition (binding):** migrating to Vercel Pro (~$20/month) is a **required precondition of the first monetization step**, not a follow-up to it. Any of the following may not ship until the account is on Pro:

- a listing fee of any kind,
- a featured-placement or promoted-listing fee,
- advertising.

| Item | Value |
|---|---|
| Debt | Hosting plan is licensed for non-commercial use only |
| Accepted because | v1 is free forever by product decision; cost at launch must be zero |
| Trigger | First monetization step of any kind |
| Cost when triggered | ~$20/month, Vercel Pro |
| Migration effort | Plan upgrade only — same project, no code, config, or data change |

The debt is cheap precisely because it is a billing change, not an architectural one. Nothing in this design depends on Hobby-tier behaviour, and D3 already keeps the scheduler swappable, so even a full move off Vercel stays bounded.

## Data Flow

**Publish (with duplicate rejection)**

```
Publisher ─→ RSC form ─→ presigned PUT ──────────────→ R2 (temp prefix)
                │
                └─→ PublishListingUseCase
                      ├─ sharp → 9x8 grayscale → dHash(64)
                      ├─ PhotoHashPort.findMatchesFromOtherPublishers(...)
                      │     match  → REJECT, listing never becomes active
                      │     none   → persist hash + promote object
                      └─ listing.status = active, expires_at = now + 30d
```

**Expiry reminder (the only background process)**

```
Vercel Cron ─(Bearer CRON_SECRET)─→ POST /api/jobs/expiry-reminders
                                      └─→ SendExpiryRemindersUseCase
                                            ├─ find active, expires_at in 5d window
                                            ├─ per batch: insert listing_reminder
                                            │    (UNIQUE listing_id+expires_at ⇒ idempotent)
                                            ├─ EmailPort.send(renewal link w/ signed token)
                                            └─ job_run: counts, failures, error
Publisher ─→ GET /renew/{token} → confirmation page → POST → +30 days, token burned
```

Renewal is deliberately **GET-renders / POST-mutates**. Email security scanners prefetch links; a mutating GET would silently burn every renewal token before the publisher ever clicked.

## Data Model (core tables)

`user`, `account`, `session` (Auth.js) · `city` · `zone` · `listing` · `listing_photo` · `listing_photo_hash` · `contact_reveal_event` · `listing_report` · `moderation_action` · `listing_reminder` · `job_run` · `bulk_import_batch`

Added for this revision: `user.bulk_import_enabled` (boolean, default false, operator-set) · `listing.status` gains a `draft` state excluded from search, from contact reveal, and from the expiry clock · `listing.external_reference` (nullable) with a **unique index on (`publisher_id`, `external_reference`)** — that composite is what makes re-importing the same file idempotent, so it is a database constraint rather than an application check.

Views: `contact_reveal_unique_pair` (D6), created in a Drizzle migration alongside `contact_reveal_event`.

`listing.status`: `draft | active | expired | hidden_by_reports | removed`. `listing.publisher_type`: `owner | broker`, NOT NULL, no default — it is the core trust claim and must never be inferred. `listing.price_usd`: single `numeric(10,2)`, no currency column, no conversion.

Auto-hide: three rows in `listing_report` for one listing sets `hidden_by_reports`; operator restore writes a `moderation_action` and returns the listing to `active`.

## File Changes

| Path | Action | Description |
|---|---|---|
| `package.json`, `tsconfig.json`, `biome.json`, `vitest.config.ts`, `playwright.config.ts` | Create | Toolchain |
| `drizzle/` + `src/shared/db/schema.ts` | Create | Schema, migrations, and the `contact_reveal_unique_pair` view |
| `src/modules/*/{domain,application,infrastructure}/` | Create | Six capabilities |
| `app/`, `components/` | Create | Delivery + atomic-design UI |
| `app/api/jobs/expiry-reminders/route.ts`, `vercel.json` | Create | Job route + cron schedule |
| `.github/workflows/ci.yml`, `lighthouserc.json`, `scripts/budget-bundle.ts` | Create | CI gates, Lighthouse budgets, build-output budget assertion |
| `design/reference/sistema/` | Create | Design system of record (D14) — `SISTEMA.md`, `tokens.css`, `pantallas-compacto-menta.html` |
| `src/styles/tokens.css` | Create | The shipped subset of the token sets (D16) — `compacto`, `menta`, one dark theme |
| `openspec/config.yaml` | Modify | **Follow-up F1** — not edited by this phase |

## Testing Strategy

| Layer | What | How | Command |
|---|---|---|---|
| Unit | Domain invariants, dHash + Hamming math, expiry/renewal date rules, auto-hide threshold, use cases against in-memory port fakes. **Added:** CSV parsing (delimiter sniffing, BOM, encoding rejection), column allowlist and mass-assignment rejection, per-row validation results, CSV output escaping, image-derivative dimensions and byte budgets, suggestion widening (zone → city → none), contribution destination resolution | Vitest, no I/O | `pnpm test:unit` |
| Integration | Composite-FK city isolation, `bit_count` similarity SQL, reminder idempotency under double-run, `job_run` recording, **unique-pair view** (after N repeat reveals of one pair the view returns exactly one row, with `first_revealed_at` = earliest `revealed_at` and `reveal_count = N`, while `contact_reveal_event` still holds all N rows). **Added:** import idempotency via the unique `(publisher_id, external_reference)` index, draft state excluded from search/reveal/expiry, reveal rate limit across requests, sitemap contents after expiry | Vitest + Dockerised Postgres matching Neon's major version | `pnpm test:integration` |
| E2E | Publish → search → gated reveal; anonymous cannot see WhatsApp; duplicate photo rejected across accounts but accepted for the same publisher. **Added:** enabled broker imports → preview → confirm → attach photos → activate → appears in search; disabled account refused server-side; expired listing page shows same-city suggestions with no contact leaked; invitation dismisses and never precedes a reveal | Playwright | `pnpm test:e2e` |
| Crawlability | Zone landing pages and search results contain listings **with JavaScript execution disabled**; expired pages carry `noindex` and are absent from the sitemap | Playwright with scripting off | `pnpm test:e2e` |
| Budget | Read-path first-load JS, page transfer weight, LCP on a throttled 3G profile | Build-output assertion + Lighthouse CI | `pnpm budget:bundle`, `pnpm budget:lighthouse` |

Ports as interfaces make the domain and application layers fully testable with zero infrastructure — this is what makes strict TDD viable for a part-time founder.

**Integration tests must use real Postgres, not an emulator**, because `bit_count` semantics and composite-FK enforcement are precisely what is under test. The same reasoning now extends to bulk import: its idempotency guarantee is a unique index, not application code, so a fake would verify the fake.

With `CI=true`, the bulk-import confirmation file requests one estimated plan in `afterAll`, before fixture cleanup and outside the unchanged five-second test cases. Its Drizzle logger accepts only the exact observed parameter-free `listZones()` SELECT; absent/mismatched SQL emits `query_not_observed`. `EXPLAIN (FORMAT JSON)` plans that SELECT without executing it: no `ANALYZE` or `BUFFERS`. `[import-plan]` marks `mode=estimated`, preserves fixed-allowlist operator types and numeric/null row estimates, and keeps actual execution times, rows, loops, buffers and JIT fields `null` for compatibility. `driver_explain_ms` measures only the planning request round trip, not SQL execution. The snapshot is after the tests and need not match an earlier plan. Predicates, arbitrary identifiers, index names, SQL, parameters, raw plans, row data and exception text are never logged. Errors emit unavailable or remain silent without replacing test outcomes. The five-second outer deadline and per-query `query_timeout=5000` remain; existing test/hook limits are unchanged.

S8 adds `aroundZonesRead(first|second, action)` to both CI duplicate-confirmation catalogue `listZones` reads. `[import-plan]` emits `snapshot_start`, numeric/null `state`, unverified `candidate_plan` (or phase-specific `unavailable`), then `snapshot_end` before the actual read trace. Its subsequent `association` accepts only fresh exact SQL with zero parameters; unknown is not a match. State covers public.zone counts/estimates/pages, lagging analyze counters/epochs, snapshot PID/version, work_mem bytes and 0/1 planner/JIT flags. No raw SQL, settings strings, data or error text is emitted; SQLSTATE is restricted to 57014/42P01/42501, otherwise unknown.

The snapshot PID identifies only its single metadata SELECT; EXPLAIN/original backend remain unknown. Temporal SQL association is not the actual executed server plan. These awaited reads consume the unchanged five-second test budget and can warm caches/influence outcomes; a later PASS is not a fix. Per-query deadlines stop waiting, not cancellation. Legacy afterAll output remains unchanged. A real PostgreSQL read-only smoke and the first/second GitHub logs were verified in PR420 (merge `435b936`, PR CI39031240685; postmerge push gates39032550741). Instrumentation alone did not correct the historical latency.

Probe evidence: RED4 → focused GREEN12 with the existing query-observer tests; removing the parameter guard caused the intended test to fail, then was restored. The real confirmation caller passed 4/4 on the owned PostgreSQL 18 and emitted exactly one parsed plan summary. The later full integration run passed 407 tests but two suites refused the noncanonical diagnostic DSN before collection; those guards were not relaxed. Full unit coverage exited 1 with 3419 passing tests and three unchanged preview-resolver timeouts, without concurrent build/measure; no retry or cause claim. Types, lint, tokens and diff checks passed. These local results do not establish CI timing or a globally green suite. Independent static S1–S3 inspection found no demonstrated severe candidate defect; its sole runtime attempt failed before collection because the scratch could not resolve `@vitest/utils`: zero tests executed, no PASS. That inspection preceded the deadline addition and node-summary projection. The projection observed RED2 → GREEN13, but CI38924430876 returned unavailable, not nodes. The subsequent plain-EXPLAIN correction observed RED2 → GREEN13 with a realistic report lacking execution timings, plus types/format/diff PASS; it does not execute the SELECT or mix estimates with actual measurements. No additional database query, full suite or independent verifier was run for that correction. Its focused RED/GREEN now covers pool acquisition that never completes (13 focused tests passed); one real PostgreSQL lock check returned unavailable after 5003 ms, released the lock, reused the pool and preserved stored counts. The normal real-adapter path also emitted its plan. No full-suite or independent-runtime retry was performed.

**Crawlability is tested with scripting disabled, not asserted by inspection.** D11 makes organic search the distribution channel, and "renders without JavaScript" is the kind of property that silently breaks the first time someone reaches for a client component. If it is not executed as a test, it is not a guarantee.

### Preview-provider test double

`scripts/wait-for-preview.test.ts` caches synthetic provider JSON during setup and serves it through a POSIX-shell `gh` double. Starting Node on every simulated poll added process overhead despite the fake `sleep`. The production resolver, real JSON/URL validation, 40 attempts, 39 simulated sleeps and default five-second test limits remain unchanged.

`serves fake deployment responses without starting Node for each poll` runs the generated provider with a Node-denying executable and checks its exit, exact JSON/stdout/stderr and absence of Node calls. RED observed exit77; an ignored-Node-call mutation also failed the marker assertion, was restored, and returned GREEN. All 23 focused tests passed, preserving the previous 22 cases and their output/counter assertions; the local full unit suite passed 3643 tests across 321 files. This does not erase earlier recorded timeouts or establish their exact scheduling cause. Initial type validation caught a missing `NODE_ENV` in the new test's subprocess environment; it was made explicit and the regression test passed again. Typecheck, lint (eight warnings and two infos in untouched files), token gate and ShellCheck of the generated shell doubles passed. An initial lint run scanned generated negative fixtures under unignored `.tmp`; those task-owned artifacts were preserved in the existing ignored `test-results` directory, without modifying guards, lint configuration or fixture contents. No application, database or browser behavior changes; build/browser acceptance are inapplicable to this test-only unit. 36.17 still needs its own remaining checks and human acceptance.

### Coverage policy

No global percentage target. A repository-wide number rewards testing whatever is cheapest to cover, which is rarely what carries risk.

Instead: a **90% floor on `src/modules/*/domain/` and `src/modules/*/application/`**, and **no target** on `infrastructure/` or `app/`. Those two pure layers hold every invariant, have zero dependencies, and cost almost nothing to cover — a gap there is a real gap. Infrastructure and delivery are covered by the integration and E2E layers instead, where a percentage would measure nothing useful.

## Continuous Integration

Pull requests targeting `dev`, `staging` or `main` run lint, types, tokens, unit/coverage, integration on ephemeral PostgreSQL 18 and a production build once, without waiting for Vercel. Their fake build credentials never point at a live database. Required GitHub checks must be configured separately; workflow presence alone does not block merge.

Pushes to `dev` and `staging` run layout measurements, local E2E/crawlability and budgets. Browser suites use only the job-owned database; Lighthouse measures the matching live deployment without creating application data. The resolver binds the newest Preview deployment to the pushed SHA, accepts the expected branch or SHA as the provider's ref, requires its latest status to succeed and fails on timeout/API errors instead of substituting a stable domain or local success. Vercel may publish SHA-only refs, which do not independently attest the source branch.

The push `e2e` job is a `fail-fast: false` matrix of three parallel legs, each with its own PostgreSQL 18 container, migrations and deterministic seed: `publication` (36.3), `reads` (general E2E + crawlability, then 30.2–30.4) and `auth` (30.4b2–30.7, then 29.2 pagination last because it appends rows). No leg sees another's writes, so cross-block ordering no longer rests on a shared database. The optional dev critical profile still changes only the general read step.

`measure` and every e2e leg install the browser through `.github/scripts/install-playwright-browser.sh`: apt has stalled that step for 409–827 s (normally 11–28 s), so each attempt is cut at 180 s with its whole process group, retried once, and two failed attempts fail the job with a `::warning::` per attempt. Whether a retry avoids the slow mirror is measured after merge.

Concurrency keeps one group per workflow and ref; a newer run cancels a stale one only for pull requests and `dev`, so a started `staging` run always finishes; GitHub keeps one pending run per group, so a queued intermediate `staging` push can be superseded while the newest one still runs. CI never deploys (Vercel migrates in `vercel-build`), so cancelling CI cannot cancel a migrating deployment. The repository is public; heavy suites stay on pushes for proportionality and speed, and F2's private-repo minutes row below no longer constrains that split.

| Gate | Command | Needs |
|---|---|---|
| Lint + format | `pnpm biome ci` | — |
| Types | `pnpm tsc --noEmit` | — |
| Unit | `pnpm test:unit` | — |
| Coverage floor | `pnpm test:coverage` | domain + application ≥ 90% |
| Integration | `pnpm test:integration` | Postgres service container, Neon's major version |
| Build | `pnpm build` | — |
| Bundle budget | `pnpm budget:bundle` | build output |
| Token contract (D16) | `pnpm lint:tokens` | — |
| E2E + crawlability | `pnpm test:e2e` | local production app + job-owned PostgreSQL |
| Lighthouse budget | `pnpm budget:lighthouse` | preview deployment URL |

### Shared catalogue fixture statistics

The confirmation integration fixture runs `ANALYZE public.zone` after its city/zone
inserts. Earlier tests can empty and reseed the shared catalogue, leaving an empty
table estimate despite thousands of rows. Refreshing statistics at this fixture's
completion isolates its reads from that inherited state; production SQL, seeding,
business assertions and the five-second test limit stay unchanged.

`refreshes zone fixture statistics` checks actual cardinality and `pg_class` through
PostgreSQL: nonempty data, positive pages/estimate, and a 5% cardinality allowance
(at least one row) for approximate statistics. This is not a latency allowance or
a required planner choice. Controlled RED/GREEN and removal of the maintenance
protect this boundary; neither reconstructs the historical autoanalyze interleaving.

### Opt-in home data timing (preview dev only)

`HOME_SSR_TIMING_DIAGNOSTICS=1` emits `home-ssr-timing/v1` only when Vercel
runtime metadata also says `VERCEL_ENV=preview` and `VERCEL_GIT_COMMIT_REF=dev`.
Missing metadata, Production, staging and other values remain silent. Enable only
as a Preview/dev override; removing the flag disables it without changing data.
One completed home preparation emits closed phase labels and finite ms/null,
never arguments, results, errors, URLs, SQL, IDs or session/environment contents.
`dataPreparationMs` excludes edge/startup, root layout and React/HTML rendering;
parallel phase times overlap and must not be summed. Redirects/errors retain their
behavior without claiming completed preparation. Queries, order and HTML stay
unchanged; clock/sink failures cannot replace the application's result or error.

### E2E profiles: selection is not the complete CI sequence

`pnpm test:e2e:smoke:read` selects anonymous home, search and publication-access checks from `publish-access` and `busqueda-inicio`. `pnpm test:e2e:critical:read` adds `camino-de-lectura-sin-javascript`, `filtros-sin-javascript`, `sugerencias-sin-javascript` and `aviso-malformado-sin-javascript`: results/detail navigation, filters, suggestions and invalid routes. Both explicitly select the existing `chromium` and JavaScript-disabled `crawlability` projects; per-test skips still apply. Neither includes the separate `measure` harness.

Append `--list` to either command to inspect the actual selection without launching browsers, servers or database fixtures. Running the tests requires the existing local app/proxy and deterministic catalogue on a separately owned disposable PostgreSQL database. Do not seed or run mutating fixtures against manual Dev/Staging/Production data. Missing catalogue can cause existing tests to skip: collection alone is not a functional PASS.

The accepted destination policy is critical public reads **plus isolated publication and authenticated contact checks in dev**, with exhaustive checks in staging and unchanged basic PR gates. The `:read` commands cover only its public-read portion. This first slice defines selectors; it does not change current workflow triggers, gate conditions, retries, assertions or coverage.

| Tier | Composition | Current execution |
|---|---|---|
| Smoke public reads | `pnpm test:e2e:smoke:read` | Explicit command, not wired into CI yet |
| Critical public reads | `pnpm test:e2e:critical:read` | Explicit command, not the entire critical tier |
| Critical writes/authentication | Existing exclusive publication, logout, contact revelation, report and door blocks | Remain isolated and mandatory in current CI |
| Complete E2E | Exclusive publication first; general specs with existing exclusions; listing diagnostics/routes; isolated authenticated/door blocks; seeded pagination last | Existing ordered `e2e` job on dev/staging |
| Other complete gates | `measure`, bundle/row budgets and SHA-bound Lighthouse | Existing separate jobs on dev/staging |

`pnpm test:e2e` remains the general Playwright command, **not an alias for the complete ordered CI sequence**. Two opt-in fixtures remain excluded by the default configuration. Do not replace the full pipeline with a bare Playwright invocation or `pnpm verify` (which can recreate a DB and stop processes). Before retiring current dev jobs, validate the staging replacement and the before/after guarantees, including the existing Notion13 dependencies; no profile definition alone permits skipping a gate.

### Prepared CI transition: full by default, staging always full

The optional, nonsecret repository variable `CI_DEV_PROFILE=critical` prepares a controlled switch for dev only. An unset or unrecognized value preserves complete dev execution. GitHub string comparisons are case-insensitive. Staging always keeps the complete E2E sequence, measure and budgets regardless of that variable; PR gates are unchanged.

Critical dev selects `test:e2e:critical:read` instead of the exhaustive general read loop. Exclusive publication, served listing/route diagnostics, authenticated logout/contact/report/door checks and seeded pagination still run in their original order against job-owned PostgreSQL, without preview access. General read failures still fail the step. Only dev's measure, preview resolver and budget jobs are deferred to staging in that mode.

**Do not enable this variable yet.** First integrate the prepared configuration, validate an intermediate staging candidate (the product phase need not be finished), and satisfy the existing replacement/promotion dependencies09/12/13. Setting the variable is a separate explicit operator action, not something this workflow or implementation performs. Returning it to `full` or removing it restores the previous complete dev schedule; it does not undo application data or migrations. Main promotion remains a separate normal dev→main PR for the validated content.

`ci-profiles.test.ts` checks the branch/profile matrix and executes the actual general-step shell with a disposable fake `pnpm`, verifying exact selected commands, stdout/stderr and failure exit codes without browsers, servers or databases. This proves dispatch, not an executed staging deployment or functional browser PASS.

**A budget nobody measures automatically is a wish.** `budget:bundle` reads the build output and fails when read-path first-load JS exceeds 130 KB — fast, needs no deployment, and catches the most common regression (someone converts a server component to a client component). `budget:lighthouse` runs against the preview deployment and fails on LCP over 2.5 s on a throttled 3G profile, search transfer over 230 KB, or detail transfer over 500 KB. Image derivative budgets are already asserted at generation time in unit tests, so they need no separate gate.

**`build` is a gate because type-checking is not building.** This was learned the expensive way: a production deploy failed on `Module not found: Can't resolve '@/modules/...'` while every gate was green, because nothing in the gate set compiled the application. `tsc --noEmit` resolved the path alias through tsconfig `paths`; the bundler resolved it through a different mechanism and did not. Module resolution, bundler configuration, and server/client boundary violations are all invisible to the other gates and all fatal at deploy. The gate costs one build and no deployment.

**Toolchain constraint discovered at the same time: TypeScript stays on the 5.x line.** TypeScript 7 (the native port) was installed because it was newest, and Next.js 15.5 does not support it — it removed `baseUrl`, which is how Next derives bundler aliases from tsconfig `paths`, and it does not expose the JavaScript compiler API that Next's `next.config.ts` loader calls (`Cannot read properties of undefined (reading 'fileExists')`). This is D1's own reasoning applied to a version number: the scarcest resource is part-time hours, and a toolchain the framework does not support turns every bug into three nights. Re-check Next.js's supported TypeScript versions before raising this ceiling.

**`lint:tokens` is the enforcement half of D16.** It fails when a component stylesheet contains a colour literal, a corner radius, a thumbnail dimension, or a type size written as a value rather than a custom property. It costs no deployment and runs in milliseconds. Without it, D16 is a convention — and a convention that every future component must remember is precisely what this codebase's guiding principle rejects.

**Deployment scope is explicit.** `vercel.json` allows automatic Git deployments only for `dev`, `staging` and `main`; it does not revoke manual/CLI deployment privileges. Preview branch variables isolate Dev and Staging; Production belongs to `main`. Feature PRs require neither a deployment nor live DB credentials. These repository rules take effect only after integration into the relevant refs; old feature refs may retain their previous deployment configuration.

Deployment verification requires the automation bypass credential and a reachable HTTP 200 page; missing prerequisites fail rather than reporting unmeasured Lighthouse as green. The deployment URL comes from GitHub's matching deployment record, not `dev.rentoru.com`/`staging.rentoru.com`. GitHub/Vercel metadata is the identity authority; this is not an independent attestation of the running application's SHA.

`measure` retains CI traces only for unexpectedly failed cases and uploads only `test-results/**/trace.zip` for three days, without changing timeouts, retries or assertions. DOM/network snapshots remain enabled; screenshots, sources and extra attachments are disabled. These ZIPs are unsanitized: the local harness uses fixtures/fake DB wiring but may request public external images and set synthetic cookies. Never reuse this upload policy for authenticated remote E2E or real user sessions. A failure before trace finalization may leave no ZIP; that warning does not turn the failed measure step green.
After Chromium installation, `node --test scripts/measure-trace.test.cjs` checks the actual runner/config using synthetic manual browser contexts without Next, navigation or DB: an unexpected failure must retain browser events, while a passing case must discard its trace.

### D9 — Bulk import is a loader, not a second publication path

The CSV import parses, validates, and creates **drafts**, then hands every listing to the existing `listing-publication` use cases. It gets no repository write path of its own into `listing`.

The reason is the one that always applies here: *a rule the caller can forget is not a guarantee.* If import owned its own inserts, every publication invariant — publisher type, curated zone, USD-only price, min content — would have to be re-implemented and would silently drift the first time one of them changed. `publisher_type` in particular is derived from the importing account and is **unreadable from the file**; a broker who writes `owner` in a column must not become an owner, because that single claim is the product's core trust signal.

**Two phases, because the CSV cannot carry images.** Phase A creates drafts from the file. Phase B attaches photos through the presigned PUT to R2 already designed for the single-listing flow. This reuses the existing trust pipeline unchanged, and keeps image bytes off the serverless function entirely — Vercel caps a function request body at ~4.5 MB, which a real portfolio would blow past instantly. Server-side URL fetching was rejected: it buys nothing and adds an SSRF surface.

**Access is granted per account by the operator.** With 5–10 seed brokers, an operator-set `bulk_import_enabled` flag caps blast radius, removes any need for rate-limiting or anti-abuse machinery in v1, and doubles as the exact bargaining chip the broker alliance was promised.

### D10 — Contribution stays outside the system

Voluntary contribution is a dismissible invitation and an external link. No payment rail is integrated, no contributor state is stored, and no capability is gated. Processing payments in-app would add compliance, reconciliation, and financial-data handling — the precise capability the MVP excluded on purpose.

The destination is server configuration, never request input. A contribution page that accepts a destination parameter lets an attacker phish under our own domain, and this product's entire value proposition is *you do not get scammed here*.

### D11 — SEO is the distribution channel, not a polish task

After the influencer launch, organic search is the only channel this product has. Tenants type "alquiler apartamento chacao" into Google, and paid portals own those results today. SEO is therefore a first-class architectural concern, not something to retrofit.

**Public content, gated contact — these do not conflict.** The listing body (title, description, price, city, zone, photos) is public and indexable; only the WhatsApp number is gated behind registration, and it is already omitted server-side for anonymous requests. Google indexes everything that ranks without the contact ever leaking. This falls out of a decision already made, and it must not be undone by moving listing content behind the session gate.

**Curated zones are a keyword asset.** Because zones are a finite, operator-maintained list, the set of (city, zone) pairs is known ahead of time and each pair becomes a statically generated landing page. This is the highest-leverage SEO surface in the project: long-tail queries with commercial intent and near-zero competition from portals that do not structure their catalog this way.

**URLs carry the keywords and the city guarantee**: `/alquiler/<ciudad>/<zona>/<slug>-<id>`. Search filters live in query parameters so a filtered search is linkable and shareable — which matters more than usual here, because listings circulate by WhatsApp.

**Expiry is an SEO liability, and the fix is also a conversion win.** A 30-day lifecycle means indexed URLs die continuously. An expired listing MUST NOT 404. It returns **200 with `noindex`**, states plainly that the listing expired, and shows active listings from the same zone. Rationale: someone arriving from Google on an expired listing typed the exact zone and the exact intent — they are the highest-value visitor the site receives. Throwing a 404 at them discards a tenant who was ready to reveal a contact. Index hygiene is handled by dropping the URL from the sitemap immediately, which is the signal that actually governs crawl budget; `410` would clean the index marginally faster while destroying the visitor.

**Suggestions never cross city.** The same absolute city-isolation guarantee that governs search governs the suggestion block. Widen zone → city, never city → country.

**Thin and duplicate content is now a real risk.** Bulk import lets one broker create forty near-identical listings. Minimum description length is enforced at publication, and listings below a content threshold carry `noindex` so a thin portfolio cannot drag the whole domain down.

### D12 — Image derivatives generated at upload, not optimized on demand

`sharp` is already in the publication pipeline to produce the dHash source buffer. It also generates the display derivatives there, which are stored in R2 alongside the listing. The platform's on-demand image optimizer is **not** used.

Two reasons, and the second is a hard product ceiling:

**Egress.** R2 charges zero egress; the hosting platform's image optimization is a metered resource on the free tier. Serving derivatives from R2 stays free at any traffic level, and traffic is precisely what success looks like.

**Storage.** Originals are discarded after hashing and normalization. A phone photo is 3–8 MB; six per listing is roughly 30 MB, which against R2's 10 GB free tier caps the catalog at **~330 listings**. Storing only derivatives (a card thumbnail and a ~200 KB detail image per photo) puts the same tier at **~7,000 listings** — an order of magnitude more, for free. Nothing needs the original: the dHash is computed at upload and persisted as 64 bits, and no view renders above the detail size.

**The `compacto` structure (D14) shrinks the thumbnail derivative.** The row thumbnail is 44 × 34 CSS px on mobile and 64 × 48 on desktop, so one derivative at **128 × 96** covers both at 2× device pixel ratio. The earlier figure was sized for a 96 × 72 row (192 × 144 at 2×) — 2.25× the pixels. The consequence is that the search-results byte budget stops being tight and the storage ceiling moves further out. This is the clearest case of a visual choice paying for itself in the performance budget rather than costing against it, and it is the real return on `compacto` — see the density note in D14, which explains why the return does *not* show up as more listings per screen.

### D12a — Lectura privada de fotos retenidas (36.15, T1; S2–S3/S7)

La recuperación reutiliza `readPublicationDraft`: `store.load(publisherId, now)` excluye
borradores vencidos y la normalización no escribe. `readDraftPhoto` recibe identidad
confiable del futuro adaptador de sesión y un índice entero exacto del orden guardado;
verifica la clave con `tokenFromOwnedKey` antes de `PhotoStoragePort.read`.
Devuelve sólo bytes admitidos por `detectContentType`/`inspectUploadedPhoto` y su MIME,
sin claves ni URLs públicas de `incoming`, sin renovar, borrar, derivar o promover.
La ausencia/selección/propiedad/bytes inválidos dan `notFound`; errores opacos de lectura
dan `unavailable` (el puerto no distingue objeto ausente de servicio inaccesible).
`read-draft-photo.test.ts` protege autorización, borde de vencimiento, orden y admisión.
Este núcleo no restaura aún miniaturas: ruta autenticada, cabeceras privadas, explicación
recuperable y prueba de bytes/navegación quedan para T2/T3; no implica entrega ni cierre.

### D12b — Miniaturas autenticadas al regresar (36.15, T2; S2–S3/S7)

`/publicar/fotos/vista/[indice]` reutiliza la sesión confiable y `readDraftPhoto`:
bytes/MIME admitidos o cuerpo vacío 401/404/503, siempre `private, no-store` y
`nosniff`. No acepta propietario, clave ni URL del request como autorización.
`draft-photo-preview` restringe la misma lectura del borrador por identidad de foto;
una URL posicional anterior al guardado/reordenamiento no muestra otra ocupante.
`PhotoUploader` conserva esa URL al mover filas, orden/portada y campos nativos;
el error de imagen conserva la foto y ofrece reintentar o quitar/volver a subir,
sin imagen ficticia. Sólo revoca previews blob creadas localmente.
Pruebas: `route.test.ts` cubre respuestas/autorización/propiedad/admisión sin escritura;
`fotos-servido.test.tsx` atraviesa StepPage/PublishStep y protege imágenes/orden/portada;
`PhotoUploader.dismiss.test.tsx` protege reordenar, fallo, reintento y retirada.
Verificación local T2: 39 pruebas enfocadas, tipos y Biome; mutaciones de sesión y
miniaturas detectadas/restauradas. No es prueba de DB/storage real, decodificación,
navegación ni aceptación visual (T3/T4); revisión nativa T1 sigue diferida, sin aprobación.

### D13 — Spartan density over visual identity

The reference point is a classifieds board, not a design showcase: information-dense, single column on mobile, system font stack, no carousel, no hero, no animation. Justified by the audience (mobile on metered, often expensive data), the product (people come for the catalog), and the team (one part-time founder).

**But deliberately not retro.** Craigslist looks like 1996 because it never changed, not because ugliness causes speed. This product is new, unknown, and operating in a market where users already fear being scammed — a site that looks abandoned confirms that fear. The target is spartan and current, not spartan and dated.

**The read path WORKS without JavaScript, and may be better with it.** *(Reworded by the founder on 2026-08-25. The rule previously read "the read path ships no JavaScript", which was read as a ban and was never what the gates measured.)*

Browsing, searching and filtering are server-rendered with the state in the URL, and every action has a real `href` or form underneath it. **On that floor, JavaScript is welcome**: a search modal, live result counts, suggestions while typing, a photo viewer that does not reload. The distinction that matters is that the base must not depend on the script arriving — a control that only exists in JavaScript locks out anyone whose bundle failed; the same control layered over a real link locks out nobody.

**Two gates make this measurable, and they were always a budget rather than a prohibition:** `pnpm budget:bundle` allows 130 KB gzip of first-load JS on the read path, of which ~102 KB is Next.js plus React — a floor nobody controls — leaving roughly 28 KB for this codebase; and the `crawlability` e2e project runs the suite with scripting disabled, which is what turns "works without JavaScript" into a measurement instead of a claim.

Three reasons hold the floor, and none is aesthetic: organic search is this product's acquisition channel, and a zone page that needs JavaScript to render listings indexes badly; connections here are poor and data is expensive, so a bundle that fails to arrive leaves a blank page rather than a degraded one; and listings circulate by WhatsApp, whose in-app browser is where scripts break most often.

Two surfaces sit outside the read path entirely, behind a session: **publish step 2** (photo compression in the device — the difference between uploading 30 MB and 1) and **bulk import** (the file preview). `/mis-avisos` and the import screens are exempt for the same reason: no tenant browsing ever reaches them.

### D14 — Visual language, decided in HTML rather than a design tool

> **REVISADA 2026-08-22, cuando llegaron las nueve láminas al repositorio.** Lo de abajo se conserva entero porque su razonamiento sigue siendo el que hay que discutir para revertir cualquiera de estos cambios. Cinco afirmaciones quedaron superadas, y conviene leerlas antes que el texto original.
>
> **1. «Results are a dense list, not a card grid» — SUPERADA.** El fundador dibujó la cuadrícula: dos columnas de 158 px en móvil, tres de 254 px en escritorio. Está construida y mergeada (14.25).
>
> El argumento de D14 no era estético sino de peso: *«many small thumbnails fit, many detail images do not»*, con la lista de resultados en ~128 KB contra un tope de 150. **Ese argumento se midió en vez de descartarse**: `pnpm budget:bundle` reporta hoy la peor ruta de lectura en **103,96 KB gzip contra un tope de 130**, con la cuadrícula ya adentro. La restricción se respeta; lo que cambió es cómo se cumple — cuatro derivadas por foto, la más chica de 160×120 y 0,3 KB, en vez de una miniatura por fila.
>
> Lo que sigue vivo del párrafo original y **no** hay que perder: la densidad se acota sobre la pieza (antes la fila, ahora la tarjeta) y **nunca como un conteo de avisos sobre el pliegue**, porque ese número se mueve con la fuente del sistema y con el largo de un título, y un test que lo afirme falla por razones que no tienen que ver con la regresión que quería atrapar.
>
> **2. «At 1280 results stay a list rather than becoming a grid» — SUPERADA** por lo mismo.
>
> **3. «The publish form stays a single ~600px column» — SUPERADA.** Publicar pasó a **nueve pasos, una pregunta por pantalla**, con una columna de 520 px y un riel de 240 px a la izquierda en escritorio. La razón está en `design/especificaciones/Rentas - Publicar - Especificacion.md` §1 y es de producto, no de layout: son 14 campos obligatorios y uno pide 120 caracteres escritos con el pulgar.
>
> **4. «The surface inventory is settled: 22 screens» y «six screens are drawn» — DESACTUALIZADAS.** Hay **nueve láminas** en `design/pantallas/`, de otras pantallas: inicio, los cuatro pasos de búsqueda, resultados, ficha móvil y escritorio, entrar móvil y escritorio, publicar móvil y escritorio, y el sistema. El inventario de 22 sigue siendo útil como recordatorio de que los estados vacío, rechazado y vencido existen; el conteo ya no describe la realidad.
>
> **5. El título mismo — «rather than a design tool» — quedó impreciso.** El fundador diseña en Claude Design y entrega artboards `.dc.html`. **El fondo de la decisión sobrevive intacto y por eso no se cambia el título a la ligera**: lo entregado sigue siendo HTML real, versionado en el repositorio, que se puede abrir y pesar. Lo que cambió es quién lo produce, no que se pueda medir.
>
> **Lo que NO cambió, y conviene decirlo porque es lo que sostiene el resto:** el precio pesa más que el título; el publicador se distingue por forma y no por color; el color semántico se reserva para significado; el punto de quiebre es 768; y `menta` + `compacto` sigue siendo la combinación adoptada — verificada byte a byte contra `src/styles/tokens.css`.
>
> **Lo que las láminas agregan y D14 no podía saber:** la franja de **768 a 1099 px no está dibujada en ningún archivo** (los nueve artboards son 360 o 1280), y el **contenedor de 1100 no se estira nunca** en 1440, 1920 ni 4K — lo que escala es el número de columnas, no el tamaño de la pieza. Ver la tarea 20.10.


The visual reference is built as real HTML under `design/reference/`, versioned with the repository, not as mockups in a design tool. The reason is D12/D13: this product's binding design constraint is transfer weight, and a mockup cannot be weighed. Designing in a medium that cannot measure the budget is designing blind. Building the reference in HTML is also the honest test of the "no webfonts" decision, since it ships the same system stack the product does.

**The reference is not a specification.** Verifiable requirements live in the capability specs; the reference is the visual source of truth that the components in PR1b, PR2, PR3, and PR5 are built against. It exists so the type scale, spacing rhythm, and component inventory are settled *before* the first UI is written, rather than being invented three times and reconciled later.

**The surface inventory is settled: 22 screens** across five flows — discovery (8), publishing (5), publisher management (2), bulk import (4), and trust/contribution/email (3). This matters more than it sounds: the bulk-import preview with per-row errors is the most complex screen in the product, and the empty, rejected, and expired states are the ones that get improvised at midnight when nobody drew them.

**Durable constraints on any visual direction**, independent of palette:

- **Results are a dense list, not a card grid.** With a catalogue still being seeded, showing that options exist outweighs showing one photograph well, and the small row thumbnail is what keeps the search page inside its transfer budget: many small thumbnails fit, many detail images do not. **Density is enforced as a bound on the row (≤ 96px at 360px), not as a count of listings above the fold.** The count is a proxy: it shifts with the system font, the chrome height, and the length of a title, so a test asserting it fails for reasons that have nothing to do with the regression it was meant to catch. The bound holds the thing that actually matters.

  Worth recording, because it is counter-intuitive and will be re-litigated: **`compacto` buys bytes, not rows.** The row's height is driven by its text stack — price line, two-line title clamp, metadata — which is taller than either thumbnail size. Shrinking the thumbnail from 96 × 72 to 44 × 34 changes the row's height barely at all. It changes the transfer weight a great deal. Anyone who later wants materially more listings per screen has to cut a line of text, not a thumbnail, and that is a product decision about what a listing must say to be worth tapping — not a token change.
- **Price outranks the title.** It is what people scan in classifieds, and it earns its emphasis typographically rather than through colour.
- **`publisher_type` is distinguished by form, not colour alone** — filled versus outlined. It survives colour blindness and a cheap screen in daylight, and it is the product's central trust claim rather than a decorative tag.
- **Semantic colour is reserved for meaning** — error and expiry — and is never spent on decoration.
- Type is the system stack across eight named roles (list price, detail price, page title, listing title in detail, listing title in list, body, metadata, badge). Separation comes from borders and whitespace. Under `compacto` the price role resolves to the monospace member of the system stack with `tabular-nums`, so prices align as a column down the list — a scanning aid, not a stylistic flourish.
- Dark tokens are defined so a later dark mode is a swap rather than a rewrite; **v1 ships light only**.

**The breakpoint is 768px**, and it is stated here because nothing else stated it. `SISTEMA.md` names the two design widths (360 and 1280) and says there is "one relevant breakpoint" without giving a number; the reference HTML shows fixed artboards with no media queries at all, so it could not supply one either. 768 is the value the earlier `BRIEF-PANTALLAS.md` already specified and the conventional tablet threshold — below it the single-column mobile layout, at or above it the sidebar layout. A value that only exists inside an implementation is a value that gets changed by accident.

**Two viewports, and desktop is not the mobile layout stretched.** Discovery is designed mobile-first at 360px, but the product is not mobile-only, and one flow is desktop-first by nature: **nobody uploads a 40-row CSV from a phone**. At 1280px the surplus width goes to placing things alongside — filters as a persistent sidebar, listing detail as photos plus a sticky data column, import preview as a full table with every column visible and no horizontal scroll. It does not go to enlarging everything: the publish form stays a single ~600px column, because a wide form loses the relationship between label and field, and results stay a list rather than becoming a grid. Requirements stated at 360px are floors, not a declaration that desktop is out of scope.

**The palette and visual tone are RESOLVED: `menta` + `compacto`.** After a pine/teal direction and a graphite, accent-free direction were both built and rejected, the founder explored the space as two independent axes and selected the combination **structure `compacto` + theme `menta`**: deep blue `#272343` on a cool grey field `#F0F5F9`, white surfaces, 12px corner radius, pill badges, and a 44 × 34 row thumbnail on mobile.

The approved reference lives at `design/reference/sistema/`:

| File | Role |
|---|---|
| `SISTEMA.md` | The design system of record — tokens, button hierarchy, component anatomy, per-screen layout, content register |
| `tokens.css` | All 13 token sets (9 themes × 4 structures) as CSS custom properties |
| `pantallas-compacto-menta.html` | Six of the 22 surfaces rendered at 360px and 1280px in the chosen combination |

**Six screens are drawn; the other sixteen are derived, not improvised.** The reference covers search results, listing detail, publish step 1, zone landing, my listings, and bulk import preview — the load-bearing ones. The remaining surfaces (empty, rejected, expired, auth, contribution, email) are built from the same tokens, the same three-level button hierarchy, and the same row anatomy. What was adopted is the *system*; the six screens are its worked examples. A surface that needs a value the system does not define is a signal to extend the system, not to invent a local one.

The rejected graphite exploration was removed on 2026-08-17: it was kept "as a comparison point" and never once consulted, while the comparison that actually matters — implementation against the adopted system — is served by `design/reference/sistema/`. `design/reference/BRIEF.md` and `BRIEF-PANTALLAS.md` were the inputs that produced this system and are now **historical** — superseded by `SISTEMA.md` wherever they disagree, and they do disagree: both were written against the `estandar` structure (96 × 72 thumbnail, five listings above the fold). They stay for provenance: `design.md` cites the brief as the source of the 768px breakpoint, and a citation whose source has been deleted cannot be checked.

`design/README.md` maps every file in that folder to what it is and to its original Claude Design name. It exists because these files were moved and renamed out of the exported handoff structure, which later made the design system look absent from the repository when it was merely elsewhere.

### D15 — Accessibility baseline

Not previously specified anywhere. Three reasons it is cheap here and expensive to retrofit: semantic HTML is exactly what D11's crawlability requires, the no-JavaScript read path removes most of the usual failure modes for free, and the audience is on constrained devices and connections where these properties are not an edge case.

Baseline, enforced as testable requirements in the capability specs rather than as aspiration: text contrast meets WCAG AA, every form control has an associated label (never a placeholder standing in for one), interactive targets are at least 44px, keyboard focus is always visible, every listing photo carries alternative text, and page structure uses real headings and landmarks.

### D16 — Two-axis token contract: no component writes a literal visual value

The design system separates two independent axes, both declared on the `<html>` element:

- **`data-theme`** — colour roles, corner radius, control fill. Nine values; `menta` is shipped.
- **`data-layout`** — row density, thumbnail geometry, price scale, title typography. Four values; `compacto` is shipped.

**The rule, which is the whole point: no component writes a hex, a corner radius, a thumbnail dimension, or a type size as a literal.** Every one reads a CSS custom property. This is the same principle the rest of this design runs on — *guarantees live in the narrowest API*. A convention that every component author must remember to follow is not a guarantee; a value that only exists in one place cannot be contradicted in another.

**The acceptance criterion is falsifiable and takes ten seconds.** Change the two attributes in the browser inspector. The entire application must repaint, correctly, with no exceptions. Anything that does not change is a literal that leaked in. This is a CI-checkable property, not a code-review opinion: a lint rule rejecting hex literals and hard-coded px in component styles is added to the existing gate set.

**Why keep the axes at all when the combination is already chosen.** Three concrete reasons, none of them "in case we change our minds":

1. **Dark mode is already a committed direction.** D14 says dark tokens are defined so a later dark mode is a swap rather than a rewrite. `violeta` and `oscuro` are exactly that — complete dark token sets, already authored. Without the theme axis, D14's promise would have to be built from scratch later.
2. **Density is a plausible user preference.** `compacto` at ten rows per screen is right for scanning a catalogue and wrong for someone on a phone in bright sun; `estandar` is the same content at five rows. If that preference is ever offered, it is a stored attribute value, not a second stylesheet.
3. **The tokens already exist, fully written.** Adopting all thirteen sets costs a file copy. Discarding twelve of them and reconstructing one later costs a refactor.

**What actually ships, however, is three token sets — not thirteen.** D13 does not permit shipping CSS that no user renders. Production carries `compacto`, `menta`, and the one dark theme wired to `prefers-color-scheme`; the remaining ten stay in `design/reference/sistema/tokens.css` as the library. The inspector-flip criterion is then evaluated across the shipped sets, which is enough to prove no literal leaked — a value that correctly follows one theme swap follows all of them.

**Structure changes are not free and must be re-measured.** Only `compacto` and `estandar` meet the byte budget with margin. `editorial` shows four listings per screen, which reads as empty in a catalogue still being seeded. Any change to `data-layout` re-opens the above-the-fold count in D14 and the thumbnail derivative size in D12.

### Performance Budget

Hard numbers, verified on the preview deployment before each user-facing PR merges. A budget without a number is a wish.

| Surface | Budget |
|---|---|
| Search results page | ≤ 230 KB total transfer (was 150 — see the revision note below) |
| Listing detail page | ≤ 500 KB total transfer including photos |
| Row thumbnail (128 × 96 derivative, serves 44 × 34 mobile and 64 × 48 desktop at 2×) | ≤ 10 KB |
| Detail photo | ≤ 200 KB |
| JavaScript on the read path | ≤ 130 KB (was 30 — see the revision note below) |
| LCP on a throttled 3G profile | ≤ 2.5 s |

The homepage marks only the first cover of its first rendered collection as `loading="eager"` with `fetchPriority="high"`. Empty collections and unavailable covers have already been omitted by the domain. Every other cover, including other `ListingStrip`/`ListingCard` consumers, keeps lazy loading without a priority override. This native HTML hint adds no client JavaScript and preserves `<picture>` variants. `app/inicio-servido.test.tsx` asserts the page body for a populated, empty or coverless recent collection; component tests protect the default. The request-start delay in CI motivated this change, but its LCP effect must be measured on the exact deployment; the 2.5 s limit is unchanged.

Local implementation evidence, not CI or LCP proof: homepage-body RED3 → focused GREEN62; disabling the page's priority handoff made all three new cases fail, then the handoff was restored. Layout `measure` passed 218/218; types, lint and tokens passed. The full coverage command exited 1 with 3415 passing tests and two 5000 ms timeouts in the unchanged `scripts/wait-for-preview.test.ts`; their cause remains unproven. Independent source inspection found consistent wiring/defaults, but its isolated Corepack bootstrap required a blocked download: zero tests executed, no retry/install. Full-suite and independent runtime proof remain incomplete; no performance improvement or publication is claimed.

The explicitly authorized isolated resolver diagnostic executed its five no-match cases once with the installed Vitest entry point and one worker: exit 0, five passed, seventeen filtered out, 13.50 s wall time. The previously timed-out empty/staging cases took 3178/2534 ms against the unchanged 5000 ms limit. Their exit/error/output and 39 simulated waits remained asserted. This did not reproduce the failures in isolation; it does not establish contention as their cause, replace the failed full-suite result or supply the missing independent runtime proof.

CI preserves a sanitized diagnostic even when Lighthouse assertions fail. `node scripts/lighthouse-summary.mjs` reads only `.lighthouseci/lhr-<digits>.json` and writes `.lighthouseci/diagnostic.json`; only this exact file is uploaded, retained for seven days and named with the commit SHA/run attempt. Raw reports, HTML, request details, URLs, cookies and screenshots are never uploaded.
The summary contains allowlisted numeric metrics, the legacy Lighthouse LCP phase timings and an enumerated element tag/rectangle. Missing phases stay `null`; observed timings are not mixed with the scored/simulated breakdown. This is diagnostic evidence, not an optimization or a threshold change.

**T5 / S6 — safe budget stdout.** The single authorized staging budget rerun passed on the unchanged SHA; this establishes variation, not a fix, original cause or stability. The exporter now optionally reads `.lighthouseci/assertion-results.json` and emits one JSON line per sorted report **after** successfully writing the unchanged `lighthouse-diagnostic/v1` artifact. Invocation remains `node scripts/lighthouse-summary.mjs`, with no arguments or environment inputs; invalid/missing reports retain exit 1, empty stdout and the fixed sanitized stderr. Valid reports retain exit 0 and empty stderr, even without usable assertions.

Stdout schema `lighthouse-budget-log/v1`:
- `ordinal`: one-based report order, never a filename, URL or fingerprint.
- `configuredThrottlingMethod`: `simulate`, `devtools`, `provided` or `unknown`; configuration, not an independently observed method.
- `scoredLcpMs`, `pageBytes`, `scoredLcpPhasesMs`: existing scored metrics/four phases; unavailable values stay null.
- `observedLargestContentfulPaintMs`: explicitly separate observed metric, not budget-tested. The legacy mixed timings object is not relabeled as observed.
- `assertionScope`: `url-aggregate`; `constraints`: null when unavailable, otherwise sanitized distinct `{metric, unit, limit, actual, delta, producerPassed, level}` records. Units are `ms` or `bytes`; signed delta is producer actual minus limit, never a recomputed pass decision.

Only exact nonempty private `finalUrl` matches contribute. Accepted producer records require known LCP/byte audit IDs, `maxNumericValue`, `<=`, finite nonnegative actual/expected, boolean passed and `error`/`warn`/`off` level. All distinct matching constraints survive; identical sanitized tuples collapse. URL-aggregate actual may differ from the report's scored metric. Missing/malformed/empty/unmatched assertion results never fabricate limits or PASS. Nonfinite deltas serialize as null (accepted nonnegative finite operands already bound their difference).

`ci.assert.includePassedAssertions=true` retains producer passing results; thresholds, matrix, run count and throttling remain unchanged. New exporter output contains no raw records/errors, URLs, DOM, headers, cookies or request identities. This does not sanitize upstream LHCI logs: including passed assertions expands its normal output. No workflow/context fields, resource/cache claims or performance changes are introduced.

Proof is the public CLI in `scripts/lighthouse-summary.test.ts`: exact stdout/stderr/exit/artifact checks, producer constraints, final-vs-requested URL selection, hostile sentinels, invalid records, method labels and original artifact/error/workflow behavior. Log-only work has no meaningful served-HTML/browser acceptance; real child-process CLI execution is the functional caller. S1–S5 policy is unchanged; complete staging validation, original diagnosis and dev-profile activation remain separate pending work. Publication and integration remain parent-owned.

**Revision, 2026-08-16 — two of these numbers were unreachable and are now measured rather than assumed.**

Building the budget gates surfaced it immediately: **Next.js 15 App Router plus React 19 ship ~102 KB gzip of shared framework runtime on every route, before a single line of this application's code exists.** Verified against Next's own build output, not estimated. The original 30 KB was set by analogy and never checked against the framework floor — the same failure as the review forecast that omitted the cost of proof, and caught the same way: by building the thing that measures.

The knock-on was the page budget. 102 KB of JavaScript plus HTML, CSS and ten row thumbnails does not fit inside 150 KB, so that number was unreachable too.

Revised: **read-path JavaScript ≤ 130 KB** (the measured ~102 KB floor plus ~28 KB of headroom, preserving the original intent — roughly 30 KB is what *this codebase* may add on top) and **search results ≤ 230 KB** cold transfer.

**The weakness, recorded rather than buried.** Because 102 of those 130 KB are a constant nobody controls, the JavaScript gate carries far less signal than its number implies: 15 KB of genuinely bad client code still passes. The stricter design — budget the delta above the framework baseline, and separately assert the baseline has not grown — was considered and set aside in favour of the simpler absolute. If this gate ever fires and the cause turns out to be a framework version bump rather than application code, that is the signal to switch to measuring the delta.

Rejected outright: lowering the gate until it passed, which makes a check into decoration; and reconsidering the framework, which D1 chose deliberately on the argument that part-time hours are the scarce resource and an unfamiliar toolchain turns every bug into three nights. That argument still holds.

## Security Boundaries

Full threat matrix is **N/A** — no routing/shell/subprocess/VCS-automation/executable-classification boundary exists. The following boundaries require RED tests:

| Boundary | Requirement | RED test |
|---|---|---|
| Cron job route | Constant-time `Bearer CRON_SECRET` check; unauthenticated request must not send email | Unauthenticated POST returns 401 and `reminders_sent = 0` |
| Renewal token | HMAC-signed, listing-scoped, single-use, expiring; GET never mutates | Replayed token rejected; GET leaves `expires_at` unchanged |
| Photo upload | MIME + magic-byte + size validation via `sharp` before persistence | Non-image and oversized payloads rejected |
| Contact reveal rate | **40 distinct listings per account per rolling 24 hours**, counted per listing and never per action; the catalog and its WhatsApp numbers must not be drainable by one registered account | Account holding 40 distinct listings in the window is refused the 41st; a repeat reveal of a listing already inside the window consumes no allowance |
| Bulk import access | `bulk_import_enabled` checked server-side on every import endpoint; hiding the UI is not a control | Enabled-flag-less account POSTing directly returns 403 and creates no draft |
| Presigned upload scope | Key derived server-side with a per-account prefix; short TTL; `content-length-range`; fixed content-type | Client-supplied key rejected; oversized PUT rejected |
| Draft ownership | Photo attachment authorised against the draft's owner | Broker B attaching to broker A's draft returns 403 |
| CSV input bounds | Max file size and max row count enforced before parsing; streaming parse, never load-all | Oversized file refused without being parsed |
| Generated CSV output | Leading `=`, `+`, `-`, `@` neutralised in every emitted field | Formula-like value exports inert |
| Contribution destination | Resolved from server config only; never from a query parameter, path segment, or body | Crafted destination parameter is ignored; configured destination is served |
| CSV column mapping | Unrecognised columns ignored, never mapped; `publisher_type`, `status`, `expires_at`, ownership never sourced from the file | File carrying those columns produces drafts with system-derived values |

WhatsApp numbers are never included in anonymous RSC payloads — the field is omitted server-side, not hidden with CSS.

Session handling and CSRF come from Auth.js, query parameterisation from Drizzle, and output escaping from React defaults. These are inherited from the stack choice, not re-implemented — but the boundaries above are not covered by any of them.

## Migration / Rollout

No migration — greenfield. Ship in capability slices, each independently deployable: identity → publication (+trust) → search → reveal → lifecycle. Each slice is sized against the 400-line review budget; publication+trust is the likeliest to need splitting.

**Seeding a real environment.** `pnpm db:seed:taxonomy` seeds the territory only and is the command for production. `pnpm db:seed` also inserts two invented publishers and ten fake listings, so its CLI refuses (exit 1, before any database access) unless the command itself sets `SEED_DEMO_TARGET` to exactly `local`, `dev` or `staging`. The value is read before `.env`, so a stale file pointing at production cannot authorize demo rows. Calls that pass their own handle (`seed(db)` in tests and `budget:rows`) are unaffected.

## Required Follow-up Actions

**F1 — `openspec/config.yaml` (this phase does NOT edit it; `sdd-tasks` must sequence it as an early task):**

```yaml
context: |
  Stack: TypeScript / Next.js 15 App Router / React 19 on Vercel.
  Data: Neon Postgres + Drizzle ORM. Storage: Cloudflare R2. Auth: Auth.js v5 (Google).
  Email: Resend. Architecture: hexagonal per capability under src/modules/, screaming layout.
  Testing: Vitest (unit + integration), Playwright (e2e). Style: Biome. Package manager: pnpm.
testing:
  runner: vitest
  command: pnpm test
  layers: { unit: true, integration: true, e2e: true }
  coverage: { available: true, command: pnpm test:coverage }
  quality: { linter: biome, type_checker: tsc, formatter: biome }
  status: resolved
rules:
  apply:
    test_command: pnpm test
  verify:
    test_command: pnpm test
    build_command: pnpm build
```

**F2** — confirm current free-tier limits (Vercel cron, Neon storage, R2, Resend daily cap, **GitHub Actions monthly minutes for private repositories**) at implementation time; provider tiers change.

**F2 — re-verified 2026-08-16 (PR0a), against each provider's live pricing/docs pages:**

| Provider | Limit | Confirmed value | Delta vs. this design |
|---|---|---|---|
| Vercel Hobby | Cron schedule | Once per day only; execution window ±59 min; 100 cron jobs/project | Matches D3's "best-effort timing, drift up to ~1 hour" — no delta |
| Vercel Hobby | Data transfer | 100 GB/mo Fast Data Transfer, up to 10 GB Fast Origin Transfer | Not previously stated numerically — recorded for reference, no delta |
| Neon Free | Storage | **0.5 GB per project** | **Delta.** This design never states a Neon storage number, but 0.5 GB is a materially tight ceiling for *all* relational data combined — not only `contact_reveal_event`. At realistic MVP row sizes this still comfortably covers thousands of listings/users/reveals, but it sharpens the existing open question on `contact_reveal_event` retention and unbounded draft rows (see Open Questions) into a near-term concern rather than a distant one |
| Neon Free | Compute | 100 CU-hours/project/month (≈400 hrs at 0.25 CU); 5-minute autosuspend, cannot be disabled on Free | New information — no prior claim to compare against |
| Neon Free | Egress | 5 GB/month | New information — no prior claim to compare against |
| Cloudflare R2 Free | Storage | 10 GB-month/month | Matches D2/D12's "10 GB" — no delta |
| Cloudflare R2 Free | Egress | Free for all storage classes, always | Matches D2/D12's "$0 egress" — no delta |
| Cloudflare R2 Free | Requests | 1M Class A ops/month, 10M Class B ops/month | New information — no prior claim to compare against |
| Resend Free | Send caps | 3,000 emails/month, 100 emails/day | Matches design table's "3k/mo, 100/day" — no delta |
| GitHub Actions (Free plan, private repo) | Minutes | 2,000 minutes/month (Linux-minute equivalent; Windows runners bill 2x, macOS 10x) | Historical: the repository is now public, so this quota no longer applies; the push/PR split stays for proportionality and speed (Continuous Integration) |

No provider tier is tighter than this design assumed, with the exception of Neon storage, which the design never quantified in the first place. The most actionable consequence: the existing open question "Retention for `contact_reveal_event`" and "Draft lifetime" should be revisited before the 0.5 GB ceiling, not the 10 GB R2 ceiling, becomes the operative constraint on how long the MVP can run unattended.

## Tracked Debt

| Debt | Trigger to repay | Cost | Decision |
|---|---|---|---|
| Vercel Hobby non-commercial licensing (D8) | **Fired**, and **resolved by deferral.** Soliciting voluntary contributions is money solicited from a Hobby deployment | ~$20/mo (Vercel Pro) | **Decided: the Pro migration happens last.** Launch on Hobby without the contribution invitation |

**D8 — decided.** The original trigger was "first listing fee, featured-placement fee, or advertising". A Wikipedia-style contribution ask is not a fee, but it does solicit money from a deployment whose plan is licensed for personal, non-commercial use. Of the two honest exits, the founder chose the second: **launch on Hobby without the contribution invitation, and migrate to Pro at the end.**

**The binding consequence: PR10 may be built, but its invitation MUST NOT be enabled in production before the Pro migration.** This is the one place where a completed, merged, passing work unit is still not allowed to be live. It therefore needs a switch rather than a memo — the invitation ships behind an environment flag that is off by default, so shipping the code and soliciting the money are two separate acts. A guarantee that depends on remembering not to deploy something is not a guarantee.

## D30 — Cierre de ficha (decisiones del fundador, issue #288)

La ficha adopta navegación visible con flechas y gesto táctil fuera del visor, conservando que tocar una foto abra su URL de visor; allí el gesto debe cambiar la imagen grande, no sólo desplazar miniaturas. Es una excepción **sólo para ficha** al «no carousel» original de D13: los enlaces nativos mantienen la lectura sin JavaScript. El pie propio con ID/reporte y el pie global debajo son **dos secciones apiladas deliberadamente**, sin contenido repetido; se revierte 23.3 sólo para ficha, no para el visor inmersivo.

El reporte pide un motivo obligatorio entre «posible estafa», «datos incorrectos», «duplicado», «no disponible» y «otro», con explicación opcional. La identidad de quien reporta ya está en su sesión y permanece privada; persistencia y validación corresponden a dominio/aplicación, no al componente. El mensaje obligatorio de revelación decidido en Open Questions sigue vigente; estudiar el enlace WhatsApp condicional existente antes de cualquier modificación. La salida de sesión de 28.11 dirige por defecto a `/`; la ficha requiere una excepción de retorno seguro a esa misma URL pública, ya anónima.

Medidas canónicas compartidas: móvil 390×844, tablet 768×1024 y escritorio 1440×900; todo ancho inferior a 768 usa composición móvil, incluido 440×956. Las pruebas previas a 390×840 permanecen como evidencia histórica. **Esta fase sólo corrige y acepta la ficha**: una auditoría separada debe verificar las otras pantallas antes de afirmar cumplimiento transversal. Las capturas del issue son hipótesis a contrastar con dev, no resultados actuales. Plan, imágenes y trazabilidad: `odd/tasks/fase-30-cierre-ficha.md`; la Fase 29 ya está integrada en `dev` y `main`; #287 permanece abierto y #288 sigue abierto.

## Fase 36 — Supersesiones y gates de publicación (#289)

La premisa de sólo WhatsApp del [comentario 13](https://github.com/gianelo/rentoru/issues/289#issuecomment-5956647895) queda superada por la corrección del fundador en 36.13: «el whatsapp no es obligatorio es una opcion mas» y «debe haber 1 contacto cualquier de los 3». Se exige un contacto elegido entre WhatsApp, teléfono y correo, conservando `wa.me`, `tel:` y `mailto:`. Teléfono y WhatsApp admiten sólo Venezuela; teléfono incluye móviles y fijos. Se valida formato, no titularidad, asignación real ni existencia de cuenta WhatsApp. No cambia autenticación por correo, ni se convierten contactos históricos. El inventario conserva alta, borradores, legado, edición, importación y defaults sin migración de esquema/datos propuesta.

Formatos aprobados: `0412 123 4567`, `4121234567`, `+58 412 1234567`, `0058 412 1234567` y `584121234567` equivalen a `+584121234567`; espacios, guiones y paréntesis alrededor del prefijo son admitidos. Extensiones, letras, países distintos y `+58 0412…` se rechazan, sin reparación silenciosa. `wa.me` recibe dígitos internacionales sin `+`; `tel:` conserva `+58`. 36.14 implementará la política centralizada de país en dominio, sólo Venezuela activa y ampliable sin framework genérico. Al iniciar 36.14 el fundador exige validación vigente siempre, también al editar o activar contactos sin cambios porque aún no hay clientes, y WhatsApp sólo móvil; teléfono conserva móviles y fijos. No se convierten datos almacenados: un formato inválido bloquea la operación hasta su corrección explícita. Implementación por cortes en `odd/tasks/fase-36-validacion-contacto.md`, aún sin completar. Fuentes, límites y tratamiento por superficie: `odd/tasks/fase-36-contacto-compatible.md`.

El [comentario 21](https://github.com/gianelo/rentoru/issues/289#issuecomment-5957005019) descarta tamaños de capturas como autoridad; rigen D30 y el sistema responsive vigente, coordinando la discrepancia de 390×840 con F34. Revisar requiere lámina aprobada antes de implementación. El warning actual de inmutabilidad absoluta contradice la regla existente de 18.38: dueño → inmobiliaria sí; la dirección inversa sigue cerrada hasta decisión explícita, no queda autorizada por el comentario 18.

36.18 ratifica explícitamente con el fundador «Sí, mantener el bloqueo — recomendado»: dueño →
inmobiliaria sí; inmobiliaria → dueño no. Revisar debe reutilizar la advertencia
`PUBLISHER_TYPE_ONE_WAY_*` existente en Quién publica/Editar, sin cambiar la regla de 18.38 ni sus
consumidores compartidos.
La revisión posterior cuestionó la claridad y la razón de esa asimetría, sin autorizar cambiarla.
El fundador aplazó la revisión: «listo luego lo veo. cerremos ya esto.» En esa pausa no había aceptación
visual ni nueva decisión que permitiera inmobiliaria → dueño; se conservó el cambio local sin publicar.
Posteriormente aceptó el aviso servido sin cambios: «ya probe todo bien cierra los dos chrome test que
abriste». Se mantiene la regla vigente; esta aceptación no autoriza cambios de dominio ni publicación.

Copy/jerarquía, loader contextual, país/formato y botón vs checkbox quedan como gates al iniciar sus unidades. El digest `901444967` no prueba deduplicación ni fallo de sesión: cualquier consulta productiva requiere autorización read-only separada, sin mutación. Plan y criterios completos: `odd/tasks/fase-36-cierre-publicacion.md`; esta adenda confirma alcance, no implementación ni nuevas decisiones numeradas.

### Digest901444967 — cierre de diagnóstico36.19

El fundador dispone cerrar36.19 como «no se pudo replicar»: no se confirmó una causa ni se corrigió
el fallo. Los 62 casos locales con dobles no identifican el incidente; el acceso productivo autorizado
funcionó, pero las consultas históricas fallaron sin diagnóstico utilizable. No se atribuye el digest
a deduplicación, sesión, storage o persistencia, ni se afirma ausencia de logs o retención vencida.
36.20 conserva su requisito de causa y alcance aprobados; no se cierran 18.39/18.40 por este resultado.
Actualización 2026-10-23: el fundador cierra 36.20 sin corrección tras publicar sin fallo en dev; el incidente
sigue sin reproducir y sin causa confirmada.
Evidencia y límites completos: `odd/tasks/fase-36-cierre-publicacion.md`,36.19; cierre documental local,
sin cambios funcionales ni publicación/integración; en aquel checkpoint todavía sin commit.

### Atributos36.21 — decisión G7 y estado local

El fundador eligió «Botón secundario — recomendado»: declarar ninguna sustituye la selección y continúa;
no se convierte en checkbox ni se infiere una respuesta de casillas vacías no enviadas.
El botón comparte acciones con Seguir/Atrás, pero `form` lo asocia a su POST externo propio;
se conservan `featuresDeclared`, los campos de retorno y la operación nativa sin formularios anidados.
El rol CSS de Atributos permite empaquetar cuatro acciones al volver desde Revisar, sin cambiar
selectores compartidos, tokens, parser ni reglas de publicador. RED/GREEN/mutaciones y HTML servido
protegen vínculo y alcance;16 composiciones y flujos reales ambos modos pasan con DB propia.
El fundador acepta explícitamente «Sí, acepto esta versión» sobre6ca025e…/7e550180… en3005;
es aceptación visual local, no entrega ni permiso de push/PR. Después ordena cerrar jobs y Chrome:
servicios y navegador propios detenidos, ausencia física comprobada, DB conservada y app ya no servida.
Unidades `055f6f7`/`cdbe1f7` publicadas en PR[#430](https://github.com/gianelo/rentoru/pull/430) a dev;
estado final en el mismo PR, sin integración ni resultado remoto de CI acreditado al registrar.
Evidencia, fallos y límites: `odd/tasks/fase-36-atributos-ninguna.md`.

### Photo copy — bounded G3/F35 coordination (F36.10)

Founder approved «Elegir fotos» and «Es la foto principal de tu aviso» for publication and editing. The cover explanation appears once per surface; the historical phone-deletion help is removed, while «Quitar del aviso», «Hacer portada», photo identities and native POST remain intact. Editing supplies presentation copy to the shared uploader; imported drafts retain its «Subir fotos» default. This supersedes only those historical 18.15 literals, not compression copy, photo rules, menu sizing (36.11) or the remaining F35.4 audit. Browser acceptance remains T2 in `odd/tasks/fase-36-fotos-textos.md`.

### Menú de fotos compacto — decisión acotada (F36.11, P1)

El fundador aprobó dos porciones: registrar el diseño y después implementarlo.
Desde el breakpoint existente de **768px**, el disparador tendrá un círculo visible
de **30px** dentro del mismo `<summary>` pulsable de **44×44px**; por debajo,
móvil sin cambios. Se conservan el glifo `⋯`, el foco visible, las acciones y
la geometría/comportamiento del menú abierto, incluido Escape y cierre exterior.
La razón es reducir el peso visual sobre la foto sin exigir más precisión al pulsar.
Referencia: [Publicar Desktop](../../../design/pantallas/Rentoru%20-%20Publicar%20-%20Desktop.dc.html)
(líneas 335–336); la decisión posterior conserva el target accesible del sistema.

Baseline inspeccionado en `f8bf20a07826b26afa8dacaf9674c2af6fe22d38`, no en el WIP anterior:
`app/publicar/fotos/photo-uploader.module.css:229–260,357–437` define el summary
44×44 con radio `--r` y pinta fondo/borde en toda esa caja desde 768px;
`src/styles/tokens.css:43,66` fija ambos targets en 44px. El caller real es
`app/publicar/PublishStep.tsx:567–572`, con `draft.photos`; el summary nativo y
el glifo están en `app/publicar/fotos/PhotoUploader.tsx:550–559`.
El rol visible requiere un token semántico propio, no reducir ni reutilizar el target:
ver [autoridad visual](../../../design/reference/sistema/SISTEMA.md#menú-de-fotos--superficie-visible-f3611).
P1 sólo documenta: sin app servida ni aceptación manual actual; implementación,
RED/GREEN, mutación y evidencia servida quedan para P2. No cierra 36.1 ni 36.11.

### Jerarquía de Quién publica — decisión acotada (F36.12, P1)

El fundador aprobó mostrar «¿Quién publica?» una sola vez visualmente, como H1.
El `fieldset` conserva su `legend` nativo con ese texto, accesible pero oculto
visualmente mediante `styles.srOnly`; no se elimina ni se usa `aria-hidden`.
Los labels «Soy el dueño» e «Inmobiliaria o corredor» permanecen intactos.
Sin selección por defecto para un borrador sin respuesta; se conserva la ya guardada.
La razón es quitar la pregunta duplicada sin perder el nombre accesible del grupo
ni convertir una omisión en una declaración de dueño.
Referencias: [Publicar Mobile](../../../design/pantallas/Rentoru%20-%20Publicar%20-%20Mobile.dc.html#12c)
(líneas 246–249) y [Publicar Desktop](../../../design/pantallas/Rentoru%20-%20Publicar%20-%20Desktop.dc.html#13a)
(líneas 368–371): un titular seguido de opciones; su dueño ilustrado no autoriza default.
Esta decisión conjunta resuelve sólo esta jerarquía de F35.4, no su auditoría restante.
No cambia contacto, reglas de negocio, estilos globales ni revisar (36.18).

Baseline inspeccionado: `e6a3c650d0cb853e75a46382320eaa3dbfb0d900` (dev, merge #409).
El caller `/publicar/paso/quien`, en `app/publicar/paso/[paso]/page.tsx`, renderiza
`app/publicar/PublishStep.tsx`: H1 en línea 222 y legend visible en 579;
`app/publicar/step-copy.ts` define la pregunta de `quien`.
`app/publicar/publish-steps.module.css:23–25` ya compone `srOnly` desde
`src/styles/a11y.module.css`; no hace falta una utilidad ni CSS global nuevos.
P1 sólo registra la decisión: sin cambio de comportamiento, app servida ni RED significativo.
Readback estructural por padre/verificador; P2 queda pausada, sin inicio automático.
P2 requerirá RED/GREEN sobre HTML del caller, mutación restaurada, nombre accesible,
labels, teclado/foco, ausencia de default y aceptación visual humana; 36.12 sigue sin cerrar.

### Revisar — composición aprobada F36.16

El fundador aprobó la lámina `design/pantallas/Rentoru - Revisar - Responsive-v1.html` y su CSS v1: «si me gusta alli vi las 3 medidas con el inspecionadro». Derivada del sistema, móvil sitúa Cambiar junto al título; tablet apila valores a ancho completo y escritorio distribuye etiqueta, valor y Cambiar en el contenedor centrado1100px. Evidencia y versión aceptada: `odd/tasks/fase-36-revisar-lamina.md` L15–L20; cuatro medidas del agente PASS y aceptación humana separadas. Aprobación local, sin implementación36.17 ni integración acreditada; warning sin cambio, reservado a36.18. No amplía tokens ni auditoría F34.

## Open Questions

- [ ] Hamming threshold: `<= 8` is the proposed hard-block distance. Needs calibration against real Venezuelan listing photos before launch — too loose blocks honest publishers, too tight lets re-encoded scams through.
- [ ] Retention for `contact_reveal_event` beyond the 6-month go/pivot decision (personal-data exposure). Note that pruning the log also changes the view — there is no separate copy to fall back on.
- [ ] **Vercel Pro before launch, or contribution invitation deferred?** See tracked debt D8. Founder decision, blocking for the contribution capability.
- [ ] **Contribution payment rail.** Stripe does not operate in Venezuela and PayPal is restricted. Candidates: Binance Pay, Zelle, Pago Móvil, a USDT address. Founder decision; it changes nothing architecturally since the destination is a server-side constant, but the page cannot ship without it.
- [x] **Contact-reveal rate limit threshold. RESOLVED (founder, 2026-08-24): 40 distinct listings per account per rolling 24 hours.** Twenty is the comparison volume this design already accepted as genuine, so the limit sits at double it: a real tenant never reaches it, and draining the catalogue at forty a day is not a strategy anyone pursues. **The unit is the listing, not the action** — a tenant reopening the same advert three times while comparing is not draining anything, and a limit that charged them for it would bill the exact behaviour the product wants.

  **Resolved together with a second decision that changes what the limit is even for.** A rate limit does not protect the contact database; it only slows its extraction, and a number once revealed can never be un-revealed. The alternative considered was inverting the model entirely — the tenant sends interest and the publisher makes contact — which protects the numbers structurally because they never leave the system. It was **rejected for the MVP** on three grounds: in rentals the first caller wins, so introducing latency hands the tenant to whoever still publishes a number; publishers here list once and forget, so an unanswered lead reads as a dead product and the platform wears the blame; and it cannot ship regardless, because the only mailer adapter that exists is `console-lifecycle-mailer.ts` and a publisher who is never notified never learns anyone was interested.

  **What ships instead: the reveal costs a written message.** The tenant writes their message to the publisher before the contact is disclosed, the message is stored on the reveal event, and the contact action opens prefilled with it. Latency stays at zero because the tenant was going to write that message anyway — they write it thirty seconds earlier, in a form that already exists. Bulk harvesting now costs a message per listing instead of a click, and the stored text becomes an abuse signal by intent (empty, identical, or junk messages) that a counter cannot see. Stated at its real strength: **this is not a wall** — a script can autofill — but it raises the cost and improves the publisher's first contact at the same time, which a rate limit alone never does. The framing behind both decisions is that the contact database is not the moat: these numbers are already on Marketplace and in neighbourhood groups, published by owners who want to be called. The tenant flow is the asset, and hardening the numbers until contact becomes expensive is paid for in the only currency this product has.

  **Consequence for D6:** `contact_reveal_event` gains a `message` column, **nullable, with a `NOT VALID` CHECK constraint rather than `NOT NULL DEFAULT ''`**. Reveal rows already exist, and defaulting them to an empty string would write into an append-only log that those tenants submitted a blank message when the product had never asked them for one — the same reasoning that made every foreign key here `ON DELETE restrict`. `NOT VALID` leaves history unchecked while enforcing the rule on every subsequent insert and update, so `NULL` means *this reveal predates the requirement* and nothing else; `length(btrim(message)) > 0` keeps a blank submission from ever being confused with it. The constraint is deliberately never validated. The event log stays append-only and the unique-pair view is unaffected — the message is carried, never aggregated.
- [ ] **CSV bounds.** Maximum row count and file size. Should be sized against the largest real seed-broker portfolio, not guessed.
- [ ] **Optional CSV columns.** Whether `habitaciones`, `banos`, and `metros2` are accepted depends on whether those fields exist on `listing`; confirm against the schema when the publication module is written rather than inventing columns the model cannot store.
- [ ] **Draft lifetime.** An imported draft that never receives photos lives forever today. Decide whether drafts expire, and whether the broker is reminded — otherwise the table accumulates dead rows against the Neon free-tier ceiling.
- [x] **Palette and visual tone (D14).** **RESOLVED: `compacto` + `menta`.** The design system of record is `design/reference/sistema/SISTEMA.md`, with tokens at `design/reference/sistema/tokens.css` and six worked surfaces at `design/reference/sistema/pantallas-compacto-menta.html`. PR1b is unblocked. See D16 for the token contract that carries the system to the sixteen surfaces the reference does not draw.

### Publicar · Listo — fase 37

La confirmación posterior a publicar deja de ser un texto provisional. La ficha ya existe, así que «Listo» enlaza al aviso y muestra su resumen. Tres decisiones de diseño técnico, con su razón:

- **Lectura propia por id, no la lista completa.** `PublisherListingsPort` lee todos los avisos del publicador; «Listo» necesita uno. Se agrega un puerto de lectura al lado (AGENTS.md §3) que sólo devuelve un aviso del propio publicador y activo; cualquier otro caso devuelve nada, porque el `id` viaja en la URL y cualquiera puede escribir otro.
- **La portada no espera a nadie.** Las derivadas se generan dentro de `publishListing`, antes del redirect; la pantalla usa la misma derivada pública que la ficha.
- **Compartir falla cerrado.** El enlace de WhatsApp necesita la URL absoluta; sin `SITE_URL` el bloque no se dibuja, en vez de compartir un enlace relativo que no abre nada.

Plan y gates: `odd/tasks/fase-37-publicar-listo.md`.

### Correos — fase 38

Los cinco correos comparten hoy un renderizador copiado cuatro veces, con un color (`#101010`) que no pertenece al sistema. Dos decisiones con su razón:

- **Un solo renderizador que recibe bloques ya decididos.** Cada dominio sigue decidiendo qué dice su correo; el renderizador sólo sabe dibujar párrafos y una acción. Así el diseño cambia en un lugar y ninguna regla de producto se muda a la presentación (AGENTS.md §1).
- **Valores del sistema resueltos, con una prueba que los ata a `tokens.css`.** Los clientes de correo no entienden variables CSS, así que el correo necesita literales; una tabla única y comprobada evita que esos literales se desvíen del sistema en silencio, que es justo lo que pasó con `#101010`.

Plan y gates: `odd/tasks/fase-38-correos.md`.

### Fondo de página — fase 41

El sistema define roles para paneles (`--surface`, `--tint`, `--bg` dentro de bloques) pero ninguno para la página. El resultado es que cada pantalla con `min-block-size: 100dvh` pinta su propio fondo, y el mismo flujo de publicar pasa de blanco a blanco azulado en su última pantalla. La decisión: **la página no pinta su fondo; lo pone un solo rol del sistema en `base.css`**, igual en los dos temas, y los paneles conservan sus roles. Una prueba sobre las hojas de estilo evita que una pantalla nueva vuelva a pintarlo, salvo las excepciones que apruebe el fundador. Plan y gates: `odd/tasks/fase-41-fondos.md`.
