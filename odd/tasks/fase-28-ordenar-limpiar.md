# Phase 28 — order and clear filters (28.9)

## Objective and scope
Close OpenSpec 28.9: label the sort control “Ordenar por”, offer both price directions and both publication-date directions, and make clearing active filters visible on mobile results. Preserve real links, URL shareability, city/zone routing and no-JavaScript behavior. Do not change unrelated navigation/header work (28.6), help/legal (28.12), or dependency/toolchain files.

## Source and decisions
- `openspec/changes/mvp-rental-listings/tasks.md` 28.9; legacy sort decision 14.47 is superseded only for labels and available date directions.
- Keep publication newest first as the existing default and existing URL representation; date oldest first is an explicit selectable direction. Preserve deterministic tie-breaking and reset pagination when sorting.
- Protected user changes: `package.json`, `pnpm-lock.yaml`, `.nvmrc` (never stage or modify).
- Strict TDD: required by `AGENTS.md`; runner `pnpm test` (`vitest run`) per OpenSpec design; observe RED, GREEN and a meaningful mutation check, plus served-HTML assertions for each new rule.

## Tasks
- [x] T1 — Extend sorting domain, query, menu and served-result tests for the four explicit choices while retaining the existing default and link semantics. Route: delegated `gentle-ai-worker` (multi-file); 91 focused and 40 integration tests passed; work-unit commit `ad69622`.
- [ ] T2 — Expose clear-all access in mobile city/zone results near the heading, without duplicate business rules; test the served HTML and no-JS path. Route: delegated `gentle-ai-worker` (multi-file); verify with focused component/served-page and crawlability checks. Commit work unit with tests and task evidence.
- [ ] T3 — Run applicable closing checks, reconcile OpenSpec 28.9 evidence, and record skipped/unavailable checks. Route: `gentle-ai-verify` for command-running checks; documentation only after confirmed behavior. Commit documentation with its work unit or a separately reviewable evidence commit if needed.

## Acceptance and verification
- Date newest is default; date oldest and both price directions are selectable via real links and yield correct deterministic ordering; invalid tokens fall back safely. Filters survive sort changes, page resets, and city/zone context remains intact.
- City and zone rendered HTML includes the correct sort links and a visible-on-mobile clear-all link for active filters; no-JS navigation works. No clear-all action appears when no filters are active.
- Run focused unit, integration (when DB is available), typecheck, Biome, token lint, and crawlability E2E (when harness is available); report blockers rather than marking tasks complete.

## Delivery and progress
- Branch: `fix/28-9-ordenar-limpiar` from `dev` at `2558320`.
- Delivery strategy: ask-on-risk; initial authored-line forecast ~350–450, refined after T1 to ~275–350 (T1 actual 125 authored lines, T2 and docs still pending). Monitor the 400-line PR review budget; ask before an oversized PR or split coherent slices.
- T1 evidence: writer observed 10 RED failures; 91 focused unit/served tests GREEN; mutated `fecha-asc` to `fecha-desc`, causing three focused tests to fail, then restored to 91 GREEN. Independent verifier reran 91 tests, typecheck and diff check; integration `pnpm test:integration tests/integration/listing-search.test.ts` passed 40/40 against existing healthy Postgres using `.env` read by Vitest. Parent structural spot check `git diff --check` passed. The new tied-date fixture asserts deterministic ID order across the page boundary. No user-owned package/lock/toolchain file was changed by T1.
- T2 implementation verified, awaiting explicit commit authorization: two served-route tests RED before code, 39 focused tests GREEN; removing the new anchor made both route tests RED, restoring it returned GREEN. Independent verifier reran the two served files (29/29), token lint (278 styles) and diff check; `pnpm typecheck` and focused Biome passed. The link is a real anchor after `<h1>`, shown below 768px, hidden at desktop where the existing chips' clear link remains. Zone route always has an active zone chip, hence its clear link returns to the city. Browser crawlability/visual check was not run: local harness would require a destructive E2E seed (`delete from city`) and no preview URL is configured; do not claim E2E passed.
- Current: T1 done (`ad69622`); T2 in progress until its work-unit commit; T3 pending. Next: ask permission to commit T2, then run closing checks and OpenSpec evidence.
- Commits: `ad69622 feat: agrega orden por publicación más antigua` (T1).
