# Local workflow verification

Runtime revision: `ca63673` on `feat/customs-decision-network`, based on `2f2e635`. No production deployment, push or database migration performed.

## Automated evidence

Run under Node v22.23.3:

```sh
APPLICABILITE_HORS_LIGNE=1 node --test --test-reporter=spec --test-skip-pattern='live|défaut 18' tests/applicabilite.test.mjs tests/decision.test.mjs tests/dossier.test.mjs tests/exigences.test.mjs tests/moteur.test.mjs tests/obligations.test.mjs tests/customs-api.test.mjs tests/customs-routes.test.mjs tests/workflow.test.mjs tests/workflow-fixture.test.mjs
```

Raw runner summary: tests 144; suites 0; pass 144; fail 0; cancelled 0; skipped 0; todo 0. The name filter excludes historical live/API and shell-browser cases before enumeration; the summary is not a claim that the unfiltered suite was run. No deduplication or extrapolation of runner counts. Confidence: verified against the executed command output.

Historical source fixtures `essais/modules/obligations-raw/` and `essais/arbre/nc2026.txt` were copied from the canonical checkout into ignored paths. No credentials or new dependencies were copied.

API adapter, API handlers, immutable versions, scope invalidation, acknowledgement validation, HS6 versus national requests, exact code validity, review locking, numeric review pagination, complete change pagination, late-page failures, superseding reviews and stale check resets are covered. RED/GREEN evidence is recorded in the task reports.

## Browser evidence

Manually exercised through the native browser controls at `http://localhost:4362/`, using the explicitly synthetic local server. No production writes or model calls.

- Capture, physical identity confirmation, evidence reading and encoded-rule result reached the review scene.
- Synthetic 503 review failure left the HS field empty, retained reviewer/rationale and required reconciliation.
- HS6 approval was acknowledged; declaration CSV stayed disabled even after code validity succeeded. JSON/PDF download actions were exercised. Binary PDF content is additionally checked by automated handler/fixture tests; browser download placement was not independently verified on disk.
- Reuse created an unapproved successor with identity unconfirmed. Historical approval remained available.
- Selecting national scope invalidated the former classification association. Reassessment returned a national candidate; approval retained the full code. Validity enabled CSV; export showed the explicit “Exported for import” receipt.
- HS6 showed no tracked change coverage; the national synthetic catalogue showed a change feed. Both stated checks were on demand, not continuous monitoring.
- Reloaded final runtime, restored a saved draft, reconfirmed identity and reassessed. A synthetic 409 conflict disabled approval, preserved reviewer/rationale and required explicit review reconciliation. A later approval succeeded only after that reconciliation.
- Final-runtime successor displayed no previous validity/change-check timestamps. Account history showed separate approved and unreviewed records.
- Empty datasheet with `[question]` produced the decisive function question. Review remained “needs information”, human validation unset and approval disabled.
- Visual inspection of the narrow in-app browser showed readable stacked cards and actions without apparent horizontal clipping. Other viewport sizes and assistive-technology combinations were not exhaustively tested.

## Independent review

API review approved. Final branch review found numeric review-cursor incompatibility and incomplete change pagination; both fixed and re-reviewed. The subsequent scope-check reset was also reviewed. Final reviewer verdict at `ca63673`: ready to merge within the local integration scope; no unresolved blocking finding.

Parent verified the nonempty reports and required sections before using their conclusions:

- `/private/tmp/customs-network-api-review.md`: PASS.
- `/private/tmp/customs-network-ui-report.md`: PASS; tests independently rerun.
- `/private/tmp/customs-network-final-review.md`: PASS, including the correction addendum.

## Live boundary and remaining limitations

Read-only `GET /v2/customs/classifications?limit=1` against the configured real API returned HTTP 200 with the expected history array. The live classification and review-write flows were not exercised. Synthetic outcomes demonstrate interface behavior, not legal classification accuracy.

Product identity, extended evidence and draft versions remain browser-local. Shared classification/review/dossier storage is provided by the existing Legal API. Reviewer name is attribution, not separate reviewer authentication. No hosted product registry, ERP/Shopify connector, delivery acknowledgement or continuous monitoring has been implemented. Change impact matching is conservative exact-code matching across the complete returned feed.

The prior evidence/rule/arbitration and France requirements components are retained with their original quality warnings. No new claim of expert legal review is made.
