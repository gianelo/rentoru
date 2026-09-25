# Fase 28 — real filter modal (28.2)

## Goal
Close OpenSpec task 28.2: make the enhanced filter panel a real modal when JavaScript is available, while preserving the served/no-JavaScript filter path.

## Source requirements
- With JavaScript, opening filters shows a real dismissible layer instead of a page-on-page overlay.
- The layer closes with outside click and Escape through the existing `useDismissLayer` primitive from 28.1.
- Filter choices are held client-side while the modal is open; the background/listing URL must not update until the user presses the single confirm action.
- Applying filters closes the modal.
- “Limpiar todo” must not leave the modal in the broken old state; its behavior must be made explicit and tested.
- The trigger stays inside the search pill, renders active while the modal is open, and the header stays above the veil.
- B1 accordion applies across mobile, tablet, and desktop: one open group at a time.
- Four groups only: `precio`, `habitaciones`, `publica`, `atributos`; baños and size stay inside Habitaciones; “atributos” is labeled “La propiedad tiene”.
- No duplicated per-group confirm buttons; one confirm action at the bottom.
- Preserve progressive enhancement: without JavaScript the current served filter path continues to work.

## Tasks
- [x] Map current SearchPanel/SearchPill/useDismissLayer flow and identify the smallest split between server no-JS form and client modal state.
- [x] Resolve the remaining copy tension between 28.2’s older “Ver N avisos” line and 28.8’s fixed `Aplicar filtros` contract before encoding tests. Decision: keep `Aplicar filtros`; with JavaScript, `Limpiar todo` applies the cleared filters and closes the modal.
- [x] Write RED tests for dismiss behavior, deferred apply, single-open accordion across breakpoints, trigger active state, and no-JS preservation.
- [x] Implement the smallest domain/application/component/CSS changes within the mapped surfaces.
- [x] Run focused unit/component/measure/e2e checks, update OpenSpec evidence, and request review/commit authorization.

## Evidence
- Branch: `fix/28-2-modal-filtros`
- Commit: `9eb28f5 fix: convierte filtros en modal real`
- Decision: keep `Aplicar filtros`; with JavaScript, `Limpiar todo` applies the cleared filters and closes the modal.
- RED: `pnpm exec vitest run components/organisms/SearchFilterModal.test.tsx components/molecules/SearchPill.test.tsx src/modules/listing-search/domain/search-accordion.test.ts` failed before implementation: Escape/outside click left `[role="dialog"]` mounted; room option click changed `window.location.search` to `?filtros=habitaciones&hab=2`; `Limpiar todo` left `?filtros=todos`; `SearchPill` lacked `aria-expanded="true"`/`data-filter-open`.
- GREEN: `pnpm exec vitest run components/organisms/SearchFilterModal.test.tsx components/organisms/SearchPanel.test.tsx components/molecules/SearchPill.test.tsx src/modules/listing-search/domain/search-accordion.test.ts` passed 93/93; `pnpm test:measure tests/measure/layout.spec.ts --grep "28\\.2"` passed 6/6; `pnpm lint:tokens`, `pnpm typecheck`, and focused `pnpm exec biome check --write ...` passed. `pnpm test:e2e tests/e2e/filtros-sin-javascript.spec.ts` ran but reported 10 skipped.
- Mutation check: temporarily kept `filtros` in `withoutPanelState`; `pnpm exec vitest run components/organisms/SearchFilterModal.test.tsx` failed exactly the draft-apply/clear assertions, then passed 4/4 after restoring.
- Verifier blocker remediated 2026-09-25: the draft previously recomputed from each served option link, so clicking `hab=2` then `banos=2` applied only `/alquiler/distrito-capital?banos=2`. RED: `pnpm exec vitest run components/organisms/SearchFilterModal.test.tsx` failed the new sequential-click component test with that URL. GREEN: the modal now merges each option/form delta into the current draft; the same command passed 5/5, the focused suite passed 94/94, `pnpm typecheck` passed (Node 24 engine warning only), and focused `pnpm exec biome check ...` passed for the touched TS/TSX files.
- Second verifier blocker remediated 2026-09-25: a draft-only selection could not be removed before confirm because the option href still represented the served/base state. RED: `pnpm exec vitest run components/organisms/SearchFilterModal.test.tsx` failed the new toggle test with `/alquiler/distrito-capital?hab=2` instead of the clean URL. GREEN: draft merging now treats clicking a source value already present in the draft as a UI-state toggle back to the base values for that parameter, preserving served no-JS links and deferred navigation.
- CI remediation 2026-09-25: GitHub `measure` caught the older 22.11 sticky-foot geometry test still assuming desktop opened all groups; the test now opens `atributos` explicitly under B1 before measuring. GitHub `e2e` caught `filtros-sin-javascript.spec.ts` running in the normal JS project where 28.2 correctly defers option clicks until confirm; the spec now runs only in `crawlability`. Local verification: `pnpm test:measure tests/measure/layout.spec.ts` passed 45/45; `pnpm exec biome check tests/measure/layout.spec.ts tests/e2e/filtros-sin-javascript.spec.ts` passed; local e2e projects load but skip 5/5 without catalogue harness.
