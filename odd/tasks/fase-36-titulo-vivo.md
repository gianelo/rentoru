# Phase 36.8 — live title counter and preview

## Authorization and objective

The founder authorized continuing 36.8 without duplicate infrastructure or repeated functional tests of accepted 36.7. Update the existing title counter and preview on typing, paste and deletion. Preserve native POST, saved drafts, server errors and the existing card, price, zone and photos. No new business rules, CSS, actions, schema or review-title row.

Active worktree: `.tmp/rentoru-f368-worktree`; branch `feat/fase-36-titulo-vivo-01`; freshly verified `dev` base `43c6958863f855f4d8be81c6a50ca4af0bcde20e`. Preserve the previous root branch, dirty documents and retained databases/app/proxy/session/photos. No commits, publication, merges, installations, credential reads, real email or cleanup are authorized by this continuation.

## Contracts and routing

- Reuse `characterCount` and `MAX_TITLE_CHARACTERS`: 90 Unicode code points. Keep the existing native `maxLength` of 180 UTF-16 units and server trimming/validation.
- The title island reuses the existing markup/classes, card and error rendering. Only local input-display state was added; the caller keys it by saved server title, not the typed value.
- One delegated writer. Begin with focused tests against the existing `PublishStep`, not a new-component import failure or duplicate stub. Parent-mediated verifier observes RED before production implementation; GREEN and targeted mutations follow.
- Tests use installed dependencies, isolated configuration (`config:false`, Vite `configFile:false`, `envDir:false`, cache disabled), explicit aliases and filters. No ambient `.env`, network, DB or new services for the unit stage.
- Product surfaces: `app/publicar/PublishStep.tsx`, `app/publicar/PublicationTitleField.tsx`, `app/publicar/PublicationTitleField.test.tsx`, `app/publicar/paso/[paso]/titulo-servido.test.tsx`. Parent owns this task file and its full memory mirror. Temporary runner: `.tmp/title-unit-runner.mjs`.
- Formatted candidate: 47 caller A+D + 53 island + 258 tests + 36 full plan = 394 reviewable lines; final recount must remain within 400. The retained 35-line untracked `.tmp` runner is local-only, not ignored or a PR file. No transferred exceptions, compressed code or weakened tests.
- Browser follow-up must reuse safe infrastructure where possible. The old contact fixture forbids title mutation and its app serves the old checkout. Do not weaken baseline guards or attribute that app to this worktree. Map narrow reuse/configuration before adding fixture/bootstrap code; earlier T2 forecast 450–750 is provisional, not permission to build it.

## Tasks

- [ ] T0 — Record 36.7 functional closure. Acceptance and five root documents independently verified: conservative 77 A+D, including the full untracked plan and prior ledger edits. Local commit remains pending explicit permission; no more functional tests of 36.7.
- [ ] T1 — Implement live title counter/preview. RED observed: `teclear, pegar y borrar…`, `cuenta 90 puntos…`, `cuenta 91 caracteres…` fail at the rendered counter after input (saved 15 rather than 4/90/91). GREEN observed (five cases); preserve input/paste/delete, Unicode, focus, metadata, saved title and errors. M1 (counter) and M2 (preview) were detected by the intended cases and both original expressions restored; Final checks pass: five title cases, Biome, tokens, TypeScript with zero diagnostics and whitespace. The CSS helper uses fail-closed narrowing. Native review and explicit local-checkpoint authorization remain pending.
- [ ] T2 — Verify browser enhancement and native no-JS persistence with independent owned case data, retaining the old baseline and services. Implementation/runner reuse must be mapped first.
- [ ] T3 — Run applicable checks and candidate-scoped native review under the user-owned switch; prepare a bounded local work unit. Publication and commits remain separate explicit decisions.

## Preserved evidence and outstanding work

36.7 was accepted by the founder after personally correcting missing `RESEND_API_KEY`; all #385–#393 merges were human actions, ending at `dev` `43c695`. No independent mailbox receipt, agent credential access or new native aggregate approval is asserted. Historical 143 unit tests and 3/3 no-JS cases (17.5s) are not new executions.

CI run 37715324207 first failed the duplicate-import test at 5000 ms (435/436), then passed on the same SHA (436/436, 38.06s); preview/e2e/budget were SKIPPED. Cause and fix remain unknown. The backend observer produced zero source changes and CI diagnosis is paused by the founder. Do not resume it in this task.

## Next step

Functional GREEN observed: five tests passed (726 ms) after the three genuine counter REDs. The integrated DOM cases now reach live preview, paste/deletion, focus, metadata, native form data and Unicode guards; the real-page SSR cases reach POST markup and accessible server errors. Action doubles use the existing `$$FORM_ACTION` protocol precedent, not ordinary function serialization; no POST guards were removed.

The two formatting corrections are applied. M1 detected frozen state through counter assertions (three failures/two SSR passes); M2 detected frozen preview while all three counters passed (three failures/two SSR passes). Both original expressions are restored; no intentional mutation remains. Final affected recheck passed: 5/5 title cases (834 ms), changed-test Biome and TypeScript zero diagnostics (7394 ms); earlier four-file Biome and 313-file token passes remain applicable, not new executions. The DOM helper checks `required(className)` without casts or weakened settings. Start candidate-scoped native review under the enabled switch; browser/no-JS HTTP persistence and the local commit remain separate pending steps.
