# Fase 28 — Medidas canónicas

## Intent

Close task 28.4 by adding an executable measurement contract for the three founder-approved canonical viewports: 390×844, 768×1024, and 1440×900.

## Context

- Source task: `openspec/changes/mvp-rental-listings/tasks.md` 28.4.
- The artboards are already drawn; the missing piece is the contract.
- Existing measurement harness uses `playwright.measure.config.ts`, `tests/measure`, `app/measure`, and `app/measure/lista`.
- The current result-list measurement still uses older 360×640 and 1280×800 criteria for task 14.29.
- Task 28.4 should not redesign header, filters, card widths, or legal/help pages; later tasks consume this contract.

## Tasks

- [x] Read Phase 28 context and dependencies.
- [x] Map the existing measurement harness and result-list composition.
- [x] Map breakpoint CSS mentioned by 28.4.
- [x] Add canonical viewport measurement contract.
  - Evidence: `tests/measure/canonical-viewports.spec.ts` measures 390×844, 768×1024, and 1440×900 on `/measure/lista`.
- [x] Fix the deterministic tablet overflow exposed by the contract.
  - RED: tablet failed with `scrollWidth=888 clientWidth=768`.
  - Cause: `Nav` actions overflowed to `right=888`; the grid itself measured 768.
  - Fix: `components/organisms/Nav.module.css` uses flexible desktop columns and tablet padding.
- [x] Update task 28.4 evidence.
  - Evidence: `openspec/changes/mvp-rental-listings/tasks.md` now records RED/GREEN and the nav overflow source.
- [x] Run focused measurement check.
  - Evidence: `pnpm exec playwright test --config=playwright.measure.config.ts tests/measure/canonical-viewports.spec.ts` passed 8/8.
  - Evidence: `pnpm exec playwright test --config=playwright.measure.config.ts tests/measure/layout.spec.ts -g "la barra del producto|canonical"` passed 3/3.

## Scope

Allowed implementation surfaces for this work:

- `tests/measure/**`
- `openspec/changes/mvp-rental-listings/tasks.md`
- `odd/tasks/fase-28-medidas-canonicas.md`

No production CSS change belongs to this task unless the measurement contract exposes a deterministic failure that blocks the contract itself.

## Verification plan

- Run focused Playwright measurement spec for the new canonical viewport contract.
- Run `pnpm typecheck` if TypeScript signatures or imports change beyond tests.

## Notes

Engram is available again after restarting the local server; save the final discovery when done.
