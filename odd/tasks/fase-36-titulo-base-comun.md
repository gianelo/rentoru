# Phase 36.8 — common integration base

## Authorization

The founder requests one common integration base for PRs #395, #396 and #397, followed by one final PR to `dev`. The founder explicitly accepts the final aggregate exceeding the 400-line review budget because the existing work units have been verified. This is not CI approval or authorization to execute merges.

## Scope

Create `feat/fase-36-titulo-integracion` from verified remote `dev` `43c6958863f855f4d8be81c6a50ca4af0bcde20e`, not from a source PR head. Preserve source heads `6daed6f`, `740f543` and `71e3727`, all existing worktrees and retained resources. This document is the real delivery ledger, not product code. No force push, history rewrite, merge, runtime restart, CI rerun/diagnosis, installation, credential access or data cleanup.

## Work unit and checks

- [ ] Reorganize and independently verify the common-base delivery metadata. Steps: publish the integration base with this ledger; retarget all three existing PRs; open a draft integration-to-dev PR. Record Git identities and PR URLs after observing each result.
- Retargeting initially yields cumulative source diffs of 394, 667 and 904 lines. Keep #396 and #397 draft until earlier dependencies are merged and their actual diffs fit 400; do not present cumulative diffs as isolated review slices.
- Human merge order: #395 into the common base, then #396, then #397. Preserve ancestry where possible; squash requires actual diff verification. Mark each dependent PR ready only after checking its new diff and CI.
- The final draft PR initially contains this delivery ledger only. Its estimated eventual aggregate is 904 source lines plus this ledger. Do not claim the final branch already contains the three unmerged slices.
- No meaningful behavioral RED exists for GitHub metadata or passive Markdown. Verify exact heads, bases, state, membership and budgets structurally. Existing functional evidence remains historical; native browser review was declined, not approved.

## Blockers

The known #396 `integration` failure has not been diagnosed. CI clearance and all merges remain pending. Reorganization alone does not fix or clear that failure.

## Observed delivery metadata

Common base published with ledger commit `6217a326f535940b0a2570ccce61233948af1d0a`, directly descended from verified `dev`. Independent verification confirms [#395](https://github.com/gianelo/rentoru/pull/395), [#396](https://github.com/gianelo/rentoru/pull/396) and [#397](https://github.com/gianelo/rentoru/pull/397) target `feat/fase-36-titulo-integracion`; all source heads remain unchanged. #396 and #397 are draft pending earlier dependencies. Final [#398](https://github.com/gianelo/rentoru/pull/398) is draft from the common base to `dev`, currently this ledger only, not the unmerged product slices. No merge occurred. The observed source diffs are 394/667/904; summing isolated slices gave an incorrect intermediate estimate because documentation overlaps. At that snapshot #395/#397 had 12 successful and 10 skipped checks each, #396 had 11 successful/10 skipped plus the known integration failure, and #398 still had checks pending. Skipped checks are not passes. Keep final integration blocked until dependencies and CI are resolved.
