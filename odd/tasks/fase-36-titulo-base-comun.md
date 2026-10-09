# Phase 36.8 — common integration base

## Authorization

The founder requests one common integration base for PRs #395, #396 and #397, followed by one final PR to `dev`. The founder explicitly accepts the final aggregate exceeding the 400-line review budget because the existing work units have been verified. This is not CI approval or authorization to execute merges.

## Scope

Create `feat/fase-36-titulo-integracion` from verified remote `dev` `43c6958863f855f4d8be81c6a50ca4af0bcde20e`, not from a source PR head. Preserve source heads `6daed6f`, `740f543` and `71e3727`, all existing worktrees and retained resources. This document is the real delivery ledger, not product code. No force push, history rewrite, merge, runtime restart, CI rerun/diagnosis, installation, credential access or data cleanup.

## Work unit and checks

- [x] Reorganize and independently verify the common-base delivery metadata. Base published, three PRs retargeted and #398 opened; human merges completed 2026-10-09 as recorded below. The following constraints describe the pre-merge checkpoint, not current pending work.
- Retargeting initially yields cumulative source diffs of 394, 667 and 904 lines. Keep #396 and #397 draft until earlier dependencies are merged and their actual diffs fit 400; do not present cumulative diffs as isolated review slices.
- Human merge order: #395 into the common base, then #396, then #397. Preserve ancestry where possible; squash requires actual diff verification. Mark each dependent PR ready only after checking its new diff and CI.
- The final draft PR initially contains this delivery ledger only. Its estimated eventual aggregate is 904 source lines plus this ledger. Do not claim the final branch already contains the three unmerged slices.
- No meaningful behavioral RED exists for GitHub metadata or passive Markdown. Verify exact heads, bases, state, membership and budgets structurally. Existing functional evidence remains historical; native browser review was declined, not approved.

## Current closure and separate follow-up

Functional 36.8 and delivery metadata are complete: human merges #395 `4334b2d03d0a52d5f55816af88ca34b1f22ddc74`, #396 `d170d5aae4f2dd25c0eed4e55f25b5458a7591d3`, #397 `7e25596345a6d11121449da8ad30359b99bfd164` entered the common base; #398 `e8cfced85435884f2812275c8f1ca256d216b942` entered `dev` (2026-10-09). Final tree `7a47fcd82212721b45e1d0891cd18a2fe89dd8ce` equals #397's tree, with no code change in the final merge. Parent-observed final rollups: 12 SUCCESS/10 SKIP each, zero failure/pending; heavy skipped checks are not passes. The old #396 integration failure (run `37858773614`, job `113589248522`) remains undiagnosed and paused separately, not a blocker to accepted delivery; later success does not prove its cause or fix. Historical functional and bounded native-review evidence remains in `fase-36-titulo-vivo.md`; no new test, aggregate approval, production verification or `main` change is asserted. T0/36.7 and unchecked 36.9 remain outside this closure.

## Historical pre-merge delivery metadata

Common base published with ledger commit `6217a326f535940b0a2570ccce61233948af1d0a`, directly descended from verified `dev`. Independent verification confirms [#395](https://github.com/gianelo/rentoru/pull/395), [#396](https://github.com/gianelo/rentoru/pull/396) and [#397](https://github.com/gianelo/rentoru/pull/397) target `feat/fase-36-titulo-integracion`; all source heads remain unchanged. #396 and #397 are draft pending earlier dependencies. Final [#398](https://github.com/gianelo/rentoru/pull/398) is draft from the common base to `dev`, currently this ledger only, not the unmerged product slices. No merge occurred. The observed source diffs are 394/667/904; summing isolated slices gave an incorrect intermediate estimate because documentation overlaps. At that snapshot #395/#397 had 12 successful and 10 skipped checks each, #396 had 11 successful/10 skipped plus the known integration failure, and #398 still had checks pending. Skipped checks are not passes. At that snapshot final integration remained blocked; the human merge closure above supersedes that pending state, not the undiagnosed failure.
