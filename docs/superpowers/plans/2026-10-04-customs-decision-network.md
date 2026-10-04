# Customs Decision Network Implementation Plan

> **For agentic workers:** Use subagent-driven-development for the UI task and focused review. Execute without further user checkpoints; the user approved the screens, architecture, lifecycle and implementation.

**Goal:** Deliver a runnable English product workflow connected to existing API classification persistence, history, human reviews and dossiers.

**Architecture:** Preserve the existing evidence/rule/arbitration functions. Add a server-side, allowlisted Legal API adapter and a focused workflow module for browser draft identity, immutable local versions and explicit distribution/monitoring states. Upstream classifications and reviews are the shared system of record; local evidence is labelled browser storage.

**Tech Stack:** Node ESM, node:test, existing HTML/CSS/JS, native fetch. No new runtime dependencies.

## Global Constraints

- Worktree `/Users/naomiehalioua/.codex-worktrees/customs-decision-network`; branch `feat/customs-decision-network`; base `2f2e635`.
- UI English. Preserve existing photo/evidence, rule, arbitration, dossier and France requirements capabilities.
- API key stays on the server; existing app access-code gate protects every added API route.
- Production deployment, hosted connectors and database migrations are not part of this local integration.
- Browser product drafts are explicitly local. Persisted classifications, history, reviews and dossiers come from the Legal API.
- HS6 approval is pre-classification approval; declaration export requires a national code and verified validity.
- Never show success before an API acknowledgement; preserve actual upstream status/error. Do not retry uncertain writes automatically.
- No external test calls during automated tests. Separate fixture evidence from live verification.

## Task 1: API adapter (primary agent)

Files: `lib/customs-api.mjs`, `tests/customs-api.test.mjs`, `tests/customs-routes.test.mjs`, `app.mjs`.

Interface: `createCustomsApi({baseUrl, key, fetchImpl = fetch})` returns `history(searchParams)`, `review(id, body)`, `reviews(id, searchParams)`, `dossier(id, searchParams)`, `validate(searchParams)`, `changes(searchParams)`. Each resolves `{status, body, contentType, requestId}`. JSON body stays structured; PDF body is a Buffer. Transport error produces 502 with a clear uncertainty message for writes. IDs are UUIDs; queries and review body use contract allowlists.

- [x] Write tests for exact upstream path/query/auth, JSON/PDF, rejection of invalid identifiers/unsupported query or review fields, version-conflict/quota status preservation, network failures and no credential disclosure.
- [x] Run `node --test tests/customs-api.test.mjs tests/customs-routes.test.mjs`; confirm missing adapter/routes fail.
- [x] Implement the adapter with fixed upstream paths and timeouts. Add protected routes: GET `/api/classifications`, POST `/api/classifications/:id/review`, GET `/api/classifications/:id/reviews`, GET `/api/classifications/:id/dossier`, GET `/api/codes/validate`, GET `/api/codes/changes`.
- [x] Keep `/api/classify` legacy envelope unchanged; explicit `persist:true` is supported upstream. Add request mode to `/api/status` for an explicit local fixture server only.
- [x] Run focused tests and inspect the current application callers.

## Task 2: Product workflow (UI implementer)

Files: `public/index.html`, `public/workflow.js`, `public/workflow.css`, `tests/workflow.test.mjs`. See exact task brief `/private/tmp/customs-network-ui-brief.md`.

The six approved scenes form one product journey. Capture/match, confirm identity, resolve facts/questions, inspect route decision, defend/approve, then export/check/reuse. Reuse existing form and graph content rather than replace evidence features.

- [x] Add independent pure-state tests for identity/version preservation, scope changes invalidating approval, blocked publishing, and API review failure retaining an unapproved state.
- [x] Run failing tests, implement the module, re-run.
- [x] Integrate a keyboard-accessible six-step shell and product/version context. Actual backend responses drive history/review/dossier; show actionable quota and unavailable-route messages.
- [x] Primary classification sends `persist:true` and `as_of`; bench/other-country exploratory calls must not silently create saved decisions. Do not send origin or document provenance to the strict upstream classifier.
- [x] Replace local-only validation with API review using `classification_id`, exact full retained code, reviewer, rationale and `expected_version`. Existing decision gates still apply. Reconcile uncertain writes through review/history.
- [x] Provide upstream JSON/PDF dossier downloads, visible history, explicit export receipts, on-demand code validity/coverage checks. External connector tiles stay “Not connected”. Check now is not continuous monitoring.
- [x] Document local draft persistence separately from API persistence, restore saved drafts without inheriting stale approvals, preserve historical versions.
- [x] Commit only owned files atomically and write report at `/private/tmp/customs-network-ui-report.md` including red/green commands, files, caveats.

## Task 3: Integration verification and handoff (primary agent)

Files: `tests/fixtures/customs-upstream.mjs`, `scripts/workflow-preview.mjs`, `README.md`, implementation verification notes in `docs/superpowers/`.

- [x] Provide a separately launched, loopback-only fixture preview with deterministic successful and failed upstream responses. Prominent “Fixture preview” label; no live API or model calls. Fixture mode is explicit configuration, never an automatic fallback.
- [x] Verify the adapter through the actual HTTP handler, including access-code enforcement.
- [x] Review branch changes against the approved lifecycle; resolve correctness findings.
- [x] Run focused tests plus offline baseline tests. Record unrelated missing-fixture/live-test limitations separately.
- [x] Use the browser to play a complete path, missing facts, review error/conflict, history/dossier and monitoring state. Inspect visual layout and responsive behavior.
- [x] Document runtime commands and remaining integration boundaries; commit local changes. Leave a runnable preview and precise verified status. No production push/deploy.
