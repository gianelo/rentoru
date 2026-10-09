# Phase 36.10 — neutral photo chooser and cover copy

## Approved contract

Founder selected chooser **«Elegir fotos»**, cover explanation **«Es la foto principal de tu aviso»**, scope **publication AND editing**. Remove unnecessary phone-deletion help while preserving «Quitar del aviso», accessible action/photo identities and existing native POST. Keep secondary «Agregar más». No photo identity/order/storage/API/validation/compression/domain changes, CSS/token changes, menu sizing (36.11), broad F35 rewrite or repeated closed-phase checks.

Branch `feat/fase-36-fotos-textos` starts at `dev` `da34a8990b800f854439e0400652969ba271d589`. Original root, earlier worktrees and retained resources remain untouched. All code/tests/decision/evidence/task closure belong in the original PR(s) before Ready; after human merge only verify integration and update memory/TODO, no extra closing PR.

## Work units

- [ ] T1 — Deliver approved copy through real publication and editing callers. Observe meaningful rendered-body RED before source edits, GREEN, focused mutation/restoration and regression checks. Include bounded F35/G3 decision documentation. Route: one delegated writer (multi-file trigger); parent commits/review/tracking. Mapping correction: editing chooser belongs to `app/mis-avisos/SubirFoto.tsx`, shared with imported drafts; scope the approved chooser copy to editing via presentation props, preserve the default for other consumers and test both paths. The initial writer stopped before writes/RED; the parent extends the narrow allowlist without changing the approved product scope.
- [ ] T2 — Verify rendered UI at mobile/tablet/desktop and retained photo actions/data with existing functional tools. No unapproved infrastructure changes; read-only mapping first if reuse is uncertain. Record exact results and skipped/unavailable checks in this unit. Route: delegated verification; writer only for bounded tests if needed.
- [ ] T3 — Finish truthful documentation and PR-ready closure inside the same review unit(s); include the preserved three state-sentence corrections from `7f8b8f5` selectively. Independent final scope/structural checks before Ready. Parent owns commit/push/PR; human owns merges.

## Test-first evidence in progress

Initial command-path failure (exit 254) was not RED. Candidate-bound installed Vitest API then exposed a JPEG/PNG-only test oracle; existing WebP support was preserved by correcting tests. Meaningful copy RED was observed twice before production edits: six named copy failures / 42 passes through real publication/editing callers. Test-only review-button and server-reference metadata corrections preserved existing «Guardar y volver a revisar» and native POST.

Writer observed GREEN 48/48, and ten-file affected/regression GREEN 179/179 before and after mutations/restoration/formatting. Old choosers killed three cases, old cover copy all six copy cases, phone-help reintroduction five; mutation bytes restored to saved SHA-256 snapshots before later intentional editor formatting. Shared uploader default remains «Subir fotos»; editing explicitly overrides the presentation label. No collection/unhandled failures; protected hashes unchanged per test invocation.

Writer checks: scoped Biome nine changed TS/TSX PASS after two format corrections, token gate 318 files PASS, TypeScript no-emit/nonincremental PASS, whitespace PASS; physical tsconfig/next-env unchanged. Independent verification and native review/commit remain pending; no browser/CI/publication claimed. Reported current scope 287 authored A+D, 310 with the full plan before this evidence update; recount before review. Legacy fixed-root runners unused; no config/env/cache/watch loading, installs or new runner files.

## Verification and review workload

Applicable copy behavior follows strict test-first: real served HTML/DOM, not a mocked-away uploader or call spy. Preserve existing order/cover/last-photo/focus/native field triplets and editing protections. Existing domain/step-values/compression regressions remain guards, not permission to add rules to UI. Do not remove assertions, swallow errors, increase timeouts, install tools or claim absent checks passed.

Forecast: approximately 235–370 A+D before added editing coverage and the six-line documentary tail. Actual PR maximum is 400 A+D including tests/full documentation; normally format and recount, split coherent work units if needed, never golf or omit evidence. Default delivery strategy: ask-on-risk if a cohesive split exceeds the authorized budget. No size exception inherited. Source-mutating candidates follow the user-owned native review switch; approvals are exact, never task-checkbox authority.
