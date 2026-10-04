# Correct preview for real product input

User reported that the delivered preview did not work. Read-only inspection of their localhost:4362 browser tab showed: `Photo not read: This live-only action is unavailable in the synthetic fixture preview.`

Root cause: the link pointed to `scripts/workflow-preview.mjs`, an intentionally isolated fixture server that rejects `/api/photo`. Automated workflow checks against that server did not establish usability with the user's own photos. The handoff should have provided a connected local runtime for that use case, not the fixture.

Resolution: run the existing `server.mjs` from the same reviewed branch on loopback port 4363, loading the canonical checkout's existing `.env` through Node's `--env-file`. Use a distinct local access code supplied in the handoff. No application source modification, secret copying, production deployment or persistent test classification was needed.

Confirmed against localhost:4363:

- `GET /api/status`: HTTP 200, mode `live`.
- `POST /api/lire`: HTTP 200 with an extracted, quoted fact from a generic synthetic input label.
- `POST /api/classify`: upstream HTTP 200, request ID `e0e718ac-b011-43bc-acda-95016cbdee23`; request explicitly used `persist:false`. This is connectivity evidence, not an accuracy benchmark.
- `POST /api/photo`: HTTP 200 using a generated JPEG label, processed by real Bedrock. Expected reference `OCR-SMOKE` returned with the exact printed model/input/output text. No personal product photo used in this diagnostic.
- Connected browser opened at http://localhost:4363/ and its access form submitted successfully. Visible mode: `Live calls to api.legaldata.cleolabs.co`. The user's failed-upload tab was preserved, not overwritten.

The next real product upload must use port 4363, not the fixture on 4362. No claim is made that the user's own image has been reprocessed. Shared approvals and persistent classification writes were not exercised in this diagnostic.
