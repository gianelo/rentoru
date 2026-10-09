# Phase 36.9 — live description guidance

## Scope and contracts

The founder authorizes the next similar publication task after closing 36.8. Reuse the title enhancement pattern, existing copy/classes and retained test resources; no redesign, new runtime, installation, CI diagnosis, 36.7 work or data cleanup. Current branch `feat/fase-36-descripcion-viva-01` starts at local passive closure `b51cefd76ad5be06055f1904db61befc8c69bb32`, directly after verified `dev` merge `e8cfced85435884f2812275c8f1ca256d216b942`.

- Keep existing domain limits: minimum 120 and maximum 1200 Unicode code points; reuse `characterCount`. Guidance answers minimum sufficiency, not complete server validity.
- Preserve remaining >= 0, rounded/clamped progress (119 → 99%, >=120 → 100%), current copy and native POST/server rejection/saved attempts. Preserve the textarea's existing absence of `maxLength`.
- Product decisions belong in pure domain code. Client state only supplies current text and renders its returned model; key by saved server text, not typed text. Preserve other answers, metadata, photos and errors.
- One writer at a time, tests first, meaningful caller RED for stale live guidance, GREEN and targeted mutation checks. Initial missing-new-domain-module RED alone does not establish live behavior; caller coverage is required in T2.
- Reuse existing installed runners and attached browser configuration/fixture. Verify only the current unit; do not repeat closed 36.8 checks or rebuild infrastructure. Each review unit includes behavior, tests and full documentation within 400 A+D; T2 estimate 300–430 is unresolved, not an exception.
- Publication is not part of this implementation turn. Any later multi-slice delivery uses the requested common integration base, not the rejected chain of different PR bases. Native authority is candidate-specific and 36.8 approvals cannot cover 36.9.

## Tasks

- [ ] T1 — Add pure description guidance with tests for empty/nullish text, 119/120/121, Unicode, clamping and independence from server maximum validation. Observe test-first failure, focused GREEN and behavior-discriminating mutations; preserve server guards. Candidate surfaces: `src/modules/listing-publication/domain/description-guidance.ts` and `.test.ts`.
- [ ] T2 — Connect description island and real PublishStep/StepPage tests. Observe stale-live-guidance RED before caller changes; verify typing/paste/deletion/focus/server-prop reset, unchanged metadata and served native POST/error markup. Derive final bounded surfaces and recount before expanding the unit.
- [ ] T3 — Verify real JS-on/off behavior with existing owned title journey setup and safe unique `case-title-description-*` drafts; native valid/rejected persistence, reload and baseline preservation. Reuse runtime/data and stop only the identified app/sink afterward. Record checks, review outcomes and work-unit commit identities before marking 36.9 complete.

## Current evidence

Read-only exploration confirmed static guidance in `PublishStep.tsx:568–601`, domain counting/guards in `publishable-listing.ts:130,145,261,360–368`, and existing copy in `step-copy.ts:66–70` / `violation-copy.ts:106–117`. T1 helper and tests are implemented, but no UI caller is connected yet. Test-first collection RED was observed before the module existed (132 ms, zero executed cases); this is not live-behavior RED. Independent GREEN 17/17 (219 ms), four assertion-discriminating in-memory mutations killed, final GREEN 17/17 (112 ms), unchanged subject hashes, focused Biome PASS and TypeScript zero diagnostics (810 roots/2888 files, 7420 ms) are observed. Native review and work-unit commit remain pending. T1 expected 110–190 A+D including tests/docs; actual counts remain required. The inherited 24-A+D passive 36.8 closure is included in any eventual first-PR recount, not silently excluded.
