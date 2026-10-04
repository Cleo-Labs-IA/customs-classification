# Customs Decision Network: workflow and lifecycle

Date: 2026-10-04. Target: Cleo-Labs-IA/customs-classification, local repository `/Users/naomiehalioua/cleo-customs-classifier`, inspected main `2f2e635`.

The user approved the six-screen sequence and subsequently the architecture: the mini-app is the product workspace; the existing Legal API owns persisted classification snapshots, reviews and dossiers. This document makes the lifecycle and integration boundary concrete. It describes intended behavior, not implemented or deployed capabilities.

## Approved screens

| Screen | User outcome |
| --- | --- |
| Capture and match | Attach a product record/photo/documents and choose an existing identity or create a draft. |
| Canonical identity | Confirm the physical configuration; distinguish aliases from different variants. |
| Facts and one decisive question | Inspect source passages, resolve contradictions and answer the next relevant question. |
| Versioned route decision | Inspect the actual classification level, route, date, alternatives and encoded rule. |
| Defend and approve | Review evidence, resolve disagreement with recorded arbitration and save the API review. |
| Publish, monitor and reuse | Inspect delivery receipts, surveillance coverage and traceable reuse eligibility. |

The interface remains English. Preserve the existing evidence reader, rule workspace, signed arbitration and France requirements view. The target sequence stays on one product; details open within that context.

## Source-verified integration boundary

Legal API contracts were inspected at `origin/main` commit `ec3ad0d3fa1be0eda7103340bcb58a25d16e75ff`; this establishes source implementation, not deployment or migration availability. The local Legal API checkout is a different branch with concurrent work and is outside this change.

Reuse these contracts through the mini-app server adapter, keeping the API key server-side:

- `POST /v2/customs/classifications` with `persist:true`; retain the returned `classification_id`.
- `GET /v2/customs/classifications` for account-scoped history and recovery after uncertain writes.
- `POST /v2/customs/classifications/:id/review` with `expected_version`, plus `GET .../:id/reviews`.
- `GET /v2/customs/classifications/:id/dossier` for JSON/PDF from the stored snapshot.
- Existing code validation/change feeds and existing connector implementations when their account access, catalog coverage and deployment are verified.

The strict classification payload supports destination as `country`, `as_of`, product facts and components. Origin and source-document provenance belong to the app's route/evidence records; do not send unsupported fields. An origin stored in the route is not evidence that the classifier used it.

## Added records and ownership

| Record | Required content and relationship |
| --- | --- |
| Product | Account owner, stable ID, manufacturer/model/configuration, external aliases. Matching is a suggestion; user confirms identity. |
| ProductVersion | Immutable normalized facts, document references/hashes, verified passages, conflict resolutions, predecessor reference. Changed evidence creates a new version. |
| RouteDecision | ProductVersion reference, origin, destination, effective date, required classification level, rule/data versions, classification ID, predecessor reference. |
| Delivery | Decision and review version, destination, status, stable delivery reference, attempts and receipt/error. |
| Impact | Affected decision, changed dependency, detected/effective date, coverage and last successful check. |

Classification/review records remain in the Legal API. Route decisions reference them rather than create competing approval tables. The initial workspace uses its existing account boundary; a typed reviewer name is attributed review metadata, not proof of independently authenticated broker identity. Invitations, cross-account exchange and hosted connector credential management are separate later integrations.

Storage schema changes are outside this design-only turn. Before choosing or creating the product-version store, inspect the actual account schema and existing product records. Durable evidence retention must be compatible with classification retention; do not promise a permanent audit archive from a retained API snapshot alone.

## Lifecycle

Draft identity → evidence collection → proposed decision → ready for review → approved decision.

Evidence collection pauses for unresolved facts or contradictions. A proposed decision preserves the API engine status independently from the human review status. Existing engine/rule agreement checks and national-level checks continue to govern the available action. Human arbitration records the chosen code, rationale, examined evidence and reviewer; it does not silently change the underlying API snapshot.

An approved decision is eligible for declaration export only when the required national code is established and currently valid, blocking questions/conflicts are resolved, and no relevant change requires review. HS6 pre-classification remains explicitly labelled and cannot be presented as a national declaration code.

A relevant fact, rule, catalog or source change sets the app-level state to `review_required` and pauses new publication/reuse. The historical approval remains visible. The successor references the predecessor; the predecessor becomes `superseded` after the replacement approval succeeds. Existing external copies are listed for reconciliation rather than silently assumed to have changed.

Reuse requires the same confirmed physical configuration, compatible verified facts, the same route/date scope, usable catalog/rule versions, valid approval and no outstanding review trigger. Related SKUs receive a reuse suggestion until these conditions are checked. Reuse across a changed route creates a new decision.

Engine outcome, human review, code validity, delivery and monitoring are independent dimensions. Do not reduce them to one green status.

## Failure behavior

| Event | Visible behavior and recovery |
| --- | --- |
| Conflicting evidence or missing decisive fact | Preserve all sources; return to the evidence question/resolution. |
| Unsupported jurisdiction, stale dataset, missing national line | Display returned coverage/level; keep the dossier accessible and declaration export unavailable. |
| Authentication, quota or network error | Preserve draft and earlier result; surface the actual error. Do not present a replay as a live result. |
| Timeout after a classification/review write | Reconcile through history/reviews before retrying. No assumption that a failed response means no write occurred. |
| Review version conflict | Reload the current review, preserve the user's text and require reassessment of the changed version. |
| One connector fails | Keep approval and successful deliveries; retry the failed destination using its stable reference. |
| No monitoring coverage / failed check | Show coverage and last successful check; never claim universal active monitoring. |
| Relevant code/source change | Link the change to affected products/routes and open review; do not auto-approve the suggested replacement. |

“Published” requires a destination acknowledgement. A generated or downloaded CSV means “Exported for import”. Current local connector scripts do not establish hosted synchronization. Monitoring of cited rulings requires an actual supported source/check; the existing code-change feed alone does not establish it.

## Verification for implementation

Use independent fixture outcomes to check that unresolved facts, disagreement, stale review versions and insufficient code levels block the relevant action. Check that an approval failure never shows success and that a delivery failure never erases the approval. Check that changed facts create a successor without mutating the predecessor. Verify strict upstream payloads and account boundaries through server-adapter tests.

Play the approved product journey in the browser, including evidence resolution, an API error, review conflict, dossier retrieval, failed delivery and a review-triggering change. Keep replay fixtures clearly labelled. A live smoke check is a separate verification once account quota/access and deployed routes are confirmed. Do not use live classification for routine fixture tests.

## Scope and current state

Completed in this design pass: approved sequence, source-contract audit, lifecycle diagram, entity relationships, failure behavior and implementation acceptance criteria. The diagram is a non-mutating design preview.

The mini-app integration, product-version persistence, delivery orchestration and per-product monitoring remain implementation work. No production deployment, external publication, API mutation or database migration was performed in this pass.
