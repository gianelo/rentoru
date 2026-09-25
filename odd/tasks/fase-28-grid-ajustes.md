# Fase 28 — grid adjustments (28.13 + 28.14)

## Goal
Close OpenSpec tasks 28.13 and 28.14 with the smallest reviewable slice: add measured separation between the active filter chips row and the listing grid on tablet/desktop, and reduce the desktop listing-card image/card width at the canonical 1440×900 viewport.

## Source requirements
- `openspec/changes/mvp-rental-listings/tasks.md` 28.13: active filter chips are visually stuck to the grid on tablet and desktop; add vertical separation.
- `openspec/changes/mvp-rental-listings/tasks.md` 28.14: listing image is too wide in desktop at 1440×900; this applies to the grid card, not the listing detail page.
- Design-token rule: no local literal geometry in component CSS when a token is needed.
- Served HTML/viewport contract required for new visual rules.

## Tasks
- [x] Map current grid/chip/card geometry and choose token-backed expectations.
  - Evidence: `gentle-ai-explore` mapped `FilterChips`, `ListingCard`, `SearchResultsHeader`, and `tests/measure/canonical-viewports.spec.ts`.
  - Decision: founder chose `240px` for the desktop card/image width.
- [x] Write RED measure coverage for 28.13 and 28.14 in the canonical viewport harness.
  - RED: `pnpm test:measure -- tests/measure/canonical-viewports.spec.ts` failed with gap `0px` for 28.13 and card width `254px` for 28.14.
- [x] Implement the smallest token/CSS changes for chips spacing and desktop card width.
  - 28.13: `FilterChips.module.css` adds `margin-block-end: var(--card-gap)` from 768px.
  - 28.14: `--card-w-desktop` changes from `254px` to `240px` and the design docs now name the new token value.
- [x] Run focused verification and record evidence in OpenSpec.
  - `pnpm exec playwright test --config=playwright.measure.config.ts tests/measure/canonical-viewports.spec.ts` → 10/10 passed.
  - `pnpm test:unit -- components/molecules/ListingCard.test.tsx` → 269 files / 2,987 tests passed.
  - `pnpm lint:tokens` → passed.
  - `pnpm exec biome check tests/measure/canonical-viewports.spec.ts components/molecules/FilterChips.module.css components/molecules/ListingCard.module.css components/molecules/ListingCard.test.tsx src/styles/tokens.css "design/reference/sistema/SISTEMA.md" "design/especificaciones/Rentoru - Flujos y funcionalidades.md" odd/tasks/fase-28-grid-ajustes.md` → passed for checked files.
  - Broader accidental measure run had the known unrelated `tests/measure/sugerencias.spec.ts` Escape flake; the canonical viewport file passed cleanly on targeted rerun.

## Evidence
- Branch: `fix/28-13-28-14-grid-ajustes`
- Commit: pending (do not commit until explicitly authorized by user)
