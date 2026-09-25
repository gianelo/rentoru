# Fase 28 — filter panel cleanup (28.8)

## Goal
Close OpenSpec task 28.8: remove visual and interaction clutter from the filter panel while preserving the no-JavaScript served path.

## Source requirements
- Remove the “usar este precio” / “usar esta superficie” style buttons: typing/selecting the value is the intent.
- Remove numeric facet notes like “1 de 71”.
- Preserve the zero-results guard: options that would lead to zero results stay disabled, visually grey, but do not print the zero.
- Relaxation suggestion moves to text above; the main button says consistently “aplicar filtros”.
- Remove duplicated count under the panel header when the page already says the active-property count above.
- Preserve progressive enhancement: the served/no-JS filter path must keep working.

## Tasks
- [x] Map current SearchPanel model/component/tests for every 28.8 requirement.
- [x] Write RED tests for removed count notes, disabled zero options without numeric text, and stable apply button copy.
- [x] Implement the smallest domain/component/CSS changes.
- [x] Run focused unit/component/e2e/measure checks and record evidence in OpenSpec.

## Evidence
- Branch: `fix/28-8-limpia-panel-filtros`
- Commit: pending
- RED: `pnpm exec vitest run src/modules/listing-search/domain/search-confirm.test.ts src/modules/listing-search/domain/search-options.test.ts components/atoms/SegmentedControl.test.tsx components/organisms/SearchPanel.test.tsx` failed before implementation on fixed CTA copy, removed price submit, removed facet notes/counts, removed previews, and disabled-zero no-count assertions (17 failures observed).
- GREEN focused: `pnpm exec vitest run src/modules/listing-search/domain/search-confirm.test.ts src/modules/listing-search/domain/search-options.test.ts src/modules/listing-search/domain/search-panel.test.ts components/atoms/SegmentedControl.test.tsx components/organisms/SearchPanel.test.tsx app/alquiler/[ciudad]/busqueda-sin-javascript.test.tsx app/alquiler/[ciudad]/[zona]/zona-sin-javascript.test.tsx` passed 7 files / 163 tests.
- Independent verifier found and remediation closed two blockers: the no-JS price form needed a visible submit after removing “Usar este precio”, and `SearchPanel` was deciding the empty-state CTA href instead of receiving it from domain. Re-verification found no remaining blockers.
- Full unit: `pnpm test:unit` passed 268 files / 2,971 tests after updating one stale application expectation from `Ver 1 aviso` to `Aplicar filtros` and deleting the retired search-preview tests.
- Typecheck: `pnpm exec tsc --noEmit` passed.
- Tokens: `pnpm lint:tokens` passed.
- Measure: `pnpm exec playwright test --config=playwright.measure.config.ts tests/measure/layout.spec.ts --grep "28\.8|14\.32"` passed 5/5.
- E2E: `pnpm exec playwright test tests/e2e/filtros-sin-javascript.spec.ts --grep "filtro de la pastilla|baños|puesto|metros"` skipped 8/8 because no preview deployment/local e2e catalogue was available.
- Lint/format: `pnpm exec biome check <touched files>` passed; `pnpm exec biome check src/modules/listing-search/application/build-filter-panel.test.ts` also passed.
