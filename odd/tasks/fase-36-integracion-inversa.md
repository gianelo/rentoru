# Phase 36.7 — human delivery closure addendum

36.7 delivery and functional acceptance are closed. This small addendum preserves verified closure facts from the original root ledger, absent from the current `dev` checkout; it does not import unrelated local history.

The human merged #385–#393. The final reverse-integration sequence was #393 → #392 → #391 → #390 → #389 → #388; only final [#388](https://github.com/gianelo/rentoru/pull/388) targeted `dev`. Its human merge produced `43c6958863f855f4d8be81c6a50ca4af0bcde20e` at 2026-10-08T01:55:30Z.

The founder then corrected missing `RESEND_API_KEY`, confirmed the real form worked and requested closing 36.7. Independent mailbox receipt was not a founder requirement and remains unverified. No agent secret access, real email observation or production checks are asserted. Named historical tests and acceptance are recorded in `odd/tasks/fase-36-reporte-zona-faltante.md`.

Historical CI run [37715324207](https://github.com/gianelo/rentoru/actions/runs/37715324207) on the same `43c6958`: integration 435/436 at the original 5000 ms timeout, then 436/436 PASS (38.06s). Budget/preview/e2e were SKIPPED, not passes. Cause remains unknown; diagnosis is paused separately, not repaired by the green run.

The separate documentary checkpoint was published as `9f011e03bf617577bac20857571c1a70a68cd9f2` in [#403](https://github.com/gianelo/rentoru/pull/403), then human-merged to `dev` as `da34a8990b800f854439e0400652969ba271d589` at 2026-10-09T10:26:46Z. This supersedes the prepared/unpublished checkpoint status, without changing later 36.8/36.9 closure. Source-specific consumed approvals are not reused; no functional reruns, resource changes or `main` changes occurred here.
