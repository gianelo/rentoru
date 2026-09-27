# Restore post-merge measure CI on dev

## Scope and authority
- Branch `fix/ci-medidas-postmerge` started from `origin/dev=df2e6ce` in the dedicated `/Users/gianelo/Documents/Dev/py/rentoru-fase28-cierre` worktree. The other nine Phase 28 review branches and the original worktree's user changes remain untouched.
- Founder authorized a local TDD correction and, **only after verification**, push and one corrective PR against `dev`. No merge or publication of the other nine cuts is authorized.
- CI run `36288816572` failed `pnpm test:measure` twice on the same exact Git tree as green PR #314: attempt 1 suggestions `alta` never displayed Altamira (88/89), attempt 2 click on attributes escaped the JS modal before hydration and navigated to a real route with the measurement harness's intentionally fake DB (88/89). Local suggestion reproduction 10/10 passed; this does not dispose of CI failures.
- Preserve real no-JS form/links and the served HTML expectations, never weaken a threshold or skip a test. No DB seed or manual server kill. The measure harness uses port 3100; verify availability before each command, stop rather than attach to an unrelated server.

## Tasks
- [x] C1 — `tests/measure/sugerencias.spec.ts` enters `alta` in the still-SSR field via `addInitScript`+MutationObserver and asserts its preserved value, Altamira's exact href and city scope on served HTML. The named test was RED before code (field retained `alta`, option absent), GREEN 6/6 after `components/client/SearchSuggestions.tsx` catches up only a still-focused field differing from its `defaultValue`; removing that catch-up made the same test RED again, then restored. Independent `CI=true pnpm test:measure tests/measure/sugerencias.spec.ts` 6/6 after formatting, typecheck, focused Biome and diff check pass. No DB/no-JS behavior changed. Work-unit commit `627013a`.
- [x] C2 — `tests/measure/layout.spec.ts` now waits for `data-search-filter-enhanced` on the modal host before clicking the still-native `/alquiler/distrito-capital?filtros=atributos` link; it then verifies the click remains on `/measure`, opens attributes and leaves the last-row vs sticky-foot geometry check unchanged. `SearchFilterModal.tsx` sets this marker only after its click and submit listeners attach and removes it on cleanup. Named test RED with absent marker, GREEN after implementation, RED on temporary marker-removal mutation, restored. Independent `CI=true pnpm test:measure tests/measure/layout.spec.ts` 46/46 (last row 657.25 ≤ foot 674), `pnpm test:unit components/organisms/SearchPanel.test.tsx` 34/34 (SSR anchors), typecheck, focused Biome and diff check passed. The href browser assertion is a route/query regex, not strict full-string equality; no-JS fallback was not changed. Work-unit commit pending.
- [ ] C3 — Independently verify full measure, unit, typecheck, token lint, Biome and diff check on this branch. Confirm reviewable diff ≤400 and clean tree, then (only if gates pass) push this branch and open its corrective PR against `dev`; PR CI with ephemeral DB is distinct from local measurement. Record CI failures/skips without claiming preview/auth coverage; no merge.

## Evidence
- Baseline: #314 merged as `df2e6ce`, parents `c627b7f` and `367b07d`, both PR head and merge tree SHA `9fd8cb218bcb9f9e26b2040c38facd31645485df`.
- Awaiting RED/GREEN, mutation and work-unit commit identities.

## Rollback
- C1: only `components/client/SearchSuggestions.tsx` and `tests/measure/sugerencias.spec.ts`.
- C2: only `components/organisms/SearchFilterModal.tsx` and `tests/measure/layout.spec.ts` (plus an existing focused component test only if its contract demands one). No DB, route, taxonomic or domain changes.
