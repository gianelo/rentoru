# Catalogue fixture statistics
Refresh statistics after the confirmation fixture is complete, not application SQL.
Worktree `rentoru-ci-estadisticas-fixtures`, branch `fix/estadisticas-fixtures-catalogo`.
Fresh dev base: `435b936f80403ce7bbb799ed1876baa364da2483`. No app is served.

## Specs
1. S1 — User: «dale» and «prepara y publica», accepting
   «¿Autorizas preparar y publicar una corrección acotada de las estadísticas de las fixtures de integración, comprobando su efecto con RED/GREEN?».
2. S2 — Accepted boundary:
   «Mantendré intactos la consulta de producción, los datos manuales, las aserciones y el timeout. El merge seguirá siendo tuyo.»
   Existing business assertions remain unchanged; the added regression protects
   the fixture-statistics maintenance itself.
3. S3 — User: «si primero como borrador y luego revisamos recuerda dejar los logs a ver si pasa algo tienes tu respuesta».
   Publish an explicitly partial Draft first, retain the existing diagnostic logs,
   and defer review. This does not claim unavailable checks passed.

## Tasks
- T1 [in_progress: authorized partial Draft publication] — S1–S3; bounded worker,
  parent-owned resources/Git. RED/GREEN and mutation/restoration observed. Named
  proof: `tests/integration/broker-bulk-import-confirm.test.ts`,
  `refreshes zone fixture statistics` and the four unchanged business cases.
  Work-unit commit `2582ece6d31cacdd7e0d5ea1ba2f1c6b4acef2b0` is local.
  User explicitly authorized partial Draft publication despite the stated proof
  limits. Preserve logs and observe the new-head CI, without rerunning old CI.
  No Ready, merge, main promotion, critical-profile activation or cleanup authority.
- T2 [blocked: user deferred review until after the Draft] — S3; independent
  PostgreSQL runtime and native assessment remain unavailable, not approved.
  No extra implementation, verification retry or publication beyond the Draft.

## Log
- L1 — Original user messages verbatim: «dale», then «prepara y publica».
  The accepted offer and boundaries are quoted in S1–S2.
- L2 — Diagnostic evidence: PR419 CI39034668002 had 5798 actual zones but
  `reltuples=0`, `relpages=1` before both reads. The candidate estimated one row;
  drivers took 4376.521/4543.692 ms and the case exceeded 5000 ms. Good PR420 CI
  had the same row count but unknown statistics (`-1`), a Hash Join candidate and
  23/21 ms reads. The earlier local S7 fresh-state experiment stayed fast: it did
  not reproduce this stale-zero state and did not justify a fix by itself.
- L3 — Read-only map confirmed the fixture-completion boundary: existing city
  and zone inserts in `beforeAll`. Await `ANALYZE public.zone` immediately after
  them. No production seeding/query, migration, index, workflow, observer or S8
  probe changes. The global CI ledger stays preserved in its original worktree
  and Engram2362, outside this PR, avoiding another PR419 tracking conflict.
- L4 — New regression reads real cardinality and `pg_class` through PostgreSQL.
  It requires nonempty data, positive pages/estimate, and cardinality within 5%
  (at least one row). This allows approximate statistics, not slower execution
  or a required planner. All four existing business assertions remain unchanged.
- L5 — Parent job100 fetched dev and created the clean, registered task worktree
  at the base above. Cached dependencies were reused; no installation/env reads.
  Before behavior edits, this document and its Engram mirror were created.
  Complete normally formatted source/test/docs/closure forecast: 170–240 changed
  lines, below 400. No screen changes: browser/served-HTML checks are inapplicable.
- L6 — Parent job101 created exclusive PG18.6 ARM64 resource
  `rentoru-ci419-stats-fix-01a13fa5`, ID `c433b5d47ce5`, loopback63048,
  role `fixdiag`; owner-session label `01a13fa5-01cc-71eb-ad69-c65e73fd3725`,
  task `ci419-fixture-statistics-fix`. Image `06cad38a5d9f` was cached, no pull.
  Volume `57d3097a58ed` and all phase data are retained, not approved for cleanup.
  Private manifest/output mode0600, directory0700; credentials are public fakes.
- L7 — Job102 created separate green/mutation/restored/suite databases beside
  the new red DB and applied shipped migrations serially to all five. It did
  not generate migrations or reset any old data. The temporary preparer requires
  a fresh empty owned DB and checks identity; it inserts/deletes only its two
  known fixture rows, analyzes the allocated empty page, verifies zero rows and
  statistics0/page1, then calls existing injected `seedTaxonomy`: 5 cities,
  5796 zones, 4203 aliases, no users/listings. It verifies stale0/page1 remains.
  The test adds one zone: local5797, not a reconstruction of CI's5798 provenance.
  No TRUNCATE, disabled autovacuum, forced planner or background-race retry.
- L8 — Before adding maintenance, parent job103 ran the public caller:
  `pnpm test:integration tests/integration/broker-bulk-import-confirm.test.ts`
  with `-t 'refreshes zone fixture statistics|SAME external reference'`, CI traces
  and the explicitly owned red URL. Exit1: two failed, three filtered out.
  The new guard failed `expected 0 to be greater than 0` in6ms; the ORIGINAL
  SAME-reference case timed out in5004ms against the unchanged5000ms limit.
  Both read snapshots were5797 actual/statistics0/page1, manual analyze1/auto0;
  candidate Nested Loop/index scans estimated1. Drivers2846.956/2810.066ms.
  Continuation outlived the deadline; the later closing-pool error was not its
  initiating cause. Public stdout/stderr and exit remain in job103's output.
- L9 — Worker added one awaited ANALYZE and short rationale after fixture inserts.
  Fresh green DB was independently prepared with the same stale precondition.
  MATCHING command: exit0, two passed/three filtered,793ms; guard4ms and SAME115ms.
  Both boundaries actual/estimate5797/pages159, manual analyze2/auto0;
  drivers46.143/20.579ms. The candidate includes Seq Scan/Memoize/Index Scan;
  exact SQL association was observed, but the original/EXPLAIN backend remains
  unknown. Bugfix memory2425 was saved immediately after this GREEN.
- L10 — Mutation removed ONLY the maintenance. Fresh mutation DB: intended guard
  failed on zero estimate,6ms; exit1, one failed/four filtered. Exact fixed-source
  bytes were restored (SHA256 `f60a4c0154dd9aadd72510c7b37d5dc8d8073a6d57d39c51eeea4874552f513e`).
  Fresh restored DB, complete file: exit0, five passed,743ms. Original cases
  took57/87/27/3ms; guard4ms. Drivers19.825/31.757ms. No green DB was reused to
  manufacture the negative result. Evidence files and the source backup remain.
- L11 — Parent self-check first found TS2339 in the NEW guard: `rows[0]` could
  be undefined. Explicit missing-row failure now narrows it; no cast, non-null
  shortcut or business assertion weakening. Final typed source SHA256:
  `42c62ba3e67fdf6b72d3ab4a63d72ac1bc7e26d337e515f9d96470d4302bdd9f`.
  Corrected `pnpm typecheck --incremental false`, targeted Biome and diff check
  all exit0. Disabling incremental caching changes no check; the private backup
  was renamed `.txt` because it is not an executable TypeScript module.
- L12 — Existing full-suite guards require127.0.0.1:55431/rentas_test with fake
  postgres credentials and DATABASE_URL unset. No guard was relaxed. Port55431
  was verified free; job104 created NEW exclusive cached PG18 resource
  `rentoru-ci419-stats-suite-01a13fa5`, ID `15d7070309c9`, owner-session as above,
  task `ci419-fixture-statistics-full-suite`, volume `00ee427c1e5e`. Shipped
  migrations passed. The original63048 `_suite` DB remains unused and retained.
  Job105 runs the final typed candidate's full integration suite against55431,
  with DATABASE_URL/GITHUB_ACTIONS unset and CI traces on: exit0, 47 files and
  448 tests passed,30.08s (job wall31s). Both protected suites ran; no skips or
  relaxed guards. One pg concurrent-query deprecation warning remains unchanged.
- L14 — Initial native ASSESS refused undeclared untracked scratch files and
  produced no candidate/risk proof. Treat that unavailable result as high for
  verification: one independent verifier is required. Bind only the four intended
  files through a work-unit commit, then assess the explicit committed range;
  private preparation/data artifacts are not review scope. No approval claimed.
- L13 — Residual limits: ANALYZE also warms caches. These controlled results
  support fixture maintenance, not the unique historical autoanalyze timing,
  the actual server execution plan, universal performance stability, LCP repair
  or dev-profile activation. Manual5433, peer55437, historical54482 and S7's
  diagnostic57893 are untouched. Neither task-owned PG resource may be deleted
  without fresh ownership/loss inspection and human confirmation.

- L15 — Committed-range ASSESS also refused undeclared private scratch. It did
  not produce a candidate/risk verdict; no third attempt or native approval.
  Independent verification mvcgpxih-u-iq9p read the entire committed document and
  archived baseline/candidate into its own scratch. Source hash42c62ba3 and the
  exact25 added lines were confirmed; all four original cases, S8, cleanup and
  timeout are unchanged. Node22.23.3 ran. Docker failed before connection at the
  default unix:///var/run/docker.sock (missing socket in isolated verifier HOME).
  No context/socket change or retry: SQL0, callback0, negative probes0. This is
  static proof only, not independent PostgreSQL verification. Its proposed
  callback harness was not executed and is not added to this focused fix.
  Parent448 PASS remains valid but cannot be relabelled independent proof.
  Candidate code remains unchanged; this latest status is local/mirrored only.
  T1 is blocked on the human's disposition: publish explicitly PARTIAL Draft
  with both limitations, without Ready/merge, or preserve locally. Do not begin
  more verification or claim the missing evidence passed. No push/PR yet.

- L16 — User decision verbatim: «si primero como borrador y luego revisamos recuerda dejar los logs a ver si pasa algo tienes tu respuesta».
  The prior blocked state in L15 is superseded for partial publication ONLY.
  Parent will commit this complete disposition, push normally, create Draft to
  dev and observe one new-head CI. Existing S8 first/second snapshot, association,
  driver and legacy plan logs stay untouched; no new logger or weakened errors.
  Private local RED/GREEN/mutation/full-suite artifacts and resources are retained.
  State the native-assessment and independent-runtime limitations in the PR body;
  defer review rather than claiming T2 complete. No Ready/merge/Main/profile flag,
  cleanup or new verification round. Publication/CI still pending actual evidence.
