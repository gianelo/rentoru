# Phase 28 closure — responsive surfaces and remaining decisions

## Goal and authority
Finish the remaining 28.x tasks from `openspec/changes/mvp-rental-listings/tasks.md` without inventing screens or hiding regressions. Founder clarified that the canonical viewports for every surface are mobile **390×840** (supersedes 390×844), iPad **768×1024**, and desktop **1440×900**. The #286 finding 6 screenshot is the same footer issue as 28.5; keep existing 9a desktop and 9b mobile footer boards, derive tablet from the system. Preserve historical evidence measured at 390×844 as historical, not as new 840px evidence.

## Boundaries
- Branch `fix/28-cierre-responsive`, isolated sibling worktree rooted at `/Users/gianelo/Documents/Dev/py/rentoru-fase28-cierre` from `origin/dev` merge `c627b7f`. Main worktree user-owned package.json, pnpm-lock.yaml and .nvmrc must remain untouched.
- No business rules in front, strict RED→GREEN, mutation-check meaningful rules, and served HTML test for new rules. Derive visual treatment from `design/reference/sistema/SISTEMA.md`, tokens and relevant boards; extend the system instead of inventing local values.
- Avoid destructive local E2E seeds or killing existing servers. Run independent verification and report skipped checks. 400 reviewable changed lines per PR; ask-on-risk, split by independent work units if exceeded. Do not push/create PR or merge without user decision.

## Tasks
- [x] T1 — Canonical mobile viewport 390×840 (tablet 768×1024, desktop 1440×900); `tests/measure/footer.spec.ts` verifies real SiteFooter layout/link touch targets on served `/measure` at all three sizes. Tablet RED document width 1100>768 was caused by `DetailSplit` fixed 640+40+420 columns activating at 768; footer itself fit x0..768. Shifted detail split and footer three-column breakpoints to the existing 1100px container, retained 16px tablet inset, and consolidated 28.17 with 28.5 in OpenSpec. Historical 390×844 evidence preserved. Writer RED→GREEN: tablet 1100/768→768/768; mutating DetailSplit breakpoint back to 768 restored RED 1116/768, then restored. Independent `pnpm test:measure` 89/89, `pnpm test:unit components/design-contract.test.tsx` 50/50, typecheck, token lint, focused Biome and diff check green. Rollback boundary: footer/canonical measure contracts, SiteFooter/Container/DetailSplit CSS and OpenSpec viewport/28.17 notes. Work-unit commit `41e1ca9`.
- [ ] T2 — Complete 28.6 mobile Nav redesign across every mounted screen, with read-path without JS and collision decisions for contact door, filter modal and publish wizard; derive from chosen idea D and system assets. Resolve product collision decisions before writing; forecast/partition if >400 lines. Commit pending.
- [ ] T3 — Design and implement 28.12 help/legal ten-page responsive treatment at 390×840, 768×1024, 1440×900 using shared anatomy, served HTML and browser measurements. Review design/system extension before code; forecast/partition if >400 lines. Commit pending.
- [ ] T4 — Resolve 28.15 back exit on mobile results from canonical board and founder feedback, implement decision with served HTML/no-JS tests. Product decision pending (button vs clearer breadcrumb). Commit pending.
- [ ] T5 — Resolve 28.16 long zone slug: measure impact and existing link stability, request founder decision to retain or shorten, and implement only the decided behavior with redirect compatibility if changed. Commit pending.
- [ ] T6 — Verify full relevant gates, reconcile remaining OpenSpec checkboxes with named tests/files, record all work-unit commit IDs, assess review budget/PR slices and report delivery for user decision. Commit pending.

## Evidence log
- PR #313 was merged into `dev` at `c627b7f` before this feature started. No implementation or verification for this feature yet.
