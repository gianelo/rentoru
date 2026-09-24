# R2 CORS Policy Assertion

## Intent

Close task 3.19 by confirming the production R2 CORS policy after the founder already verified production upload/Vercel manually. The work started as an executable assertion, but the final decision is to record manual evidence instead of adding a Cloudflare control-plane token.

## Context

- Source task: `openspec/changes/mvp-rental-listings/tasks.md` 3.19.
- Historical defect: browser photo upload failed in production because R2 CORS omitted the production origin. Server-side logs did not see it.
- Current expected policy is recorded in `docs/rentoru-cutover.md` §5a.
- Founder confirmed the live R2 CORS policy manually on 2026-09-24.

## Manual verification evidence

Confirmed policy:

```json
[
  {
    "AllowedOrigins": [
      "https://rentoru.com",
      "https://dev.rentoru.com",
      "http://localhost:3000",
      "https://*.vercel.app"
    ],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```

This covers the task's required production assertions:

- `AllowedOrigins` contains `https://rentoru.com`.
- `AllowedMethods` contains `PUT`.
- `AllowedHeaders` contains `content-type`.

## Automation attempt and decision

An executable `pnpm assert:r2-cors` gate was briefly implemented with S3 `GetBucketCorsCommand`, but running it with local `.env` reached R2 and returned `Access Denied`. The local R2 credentials are object-plane credentials and are not sufficient evidence for bucket CORS control-plane reads.

Cloudflare documents the relevant control-plane API under `/accounts/{account_id}/r2/buckets/{bucket_name}/cors`, which would require a Cloudflare API token. The founder decided not to introduce that automation now. The misleading script/helper/test/docs were removed so the repository does not carry a gate that cannot run in the current credential model.

## Tasks

- [x] Re-read task 3.17/3.19 and cutover context.
  - Evidence: read `tasks.md` around Phase 3 and `docs/rentoru-cutover.md` §5a.
- [x] Map current R2 upload implementation and CI env posture.
  - Evidence: read `src/modules/listing-publication/infrastructure/r2-photo-storage.ts`, its tests, `app/publicar/fotos/upload-request.ts`, and `.github/workflows/ci.yml` comments.
- [x] Decide whether 3.19 is still valid.
  - Outcome: valid as CORS configuration verification.
- [x] Attempt real automation without faking the bucket.
  - Evidence: `pnpm assert:r2-cors` without `.env` failed closed on missing vars; `set -a; source .env; set +a; pnpm assert:r2-cors` reached R2 and failed with `Access Denied`.
- [x] Record manual verification and remove misleading automation.
  - Evidence: task 3.19 now records the live CORS policy confirmed by the founder; script/helper/test/docs were removed.

## Verification

- Manual evidence above confirms the policy required by 3.19.
- Cleanup check pending after file removals.

## Notes

Engram mirror attempted before writes, but the local Engram server is incompatible with the current CLI (`server 0.1.0`, CLI `2.1.0`), so durable mirror could not be saved. File artifact is the source of recovery for this work.
