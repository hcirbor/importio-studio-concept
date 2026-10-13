# Phase 4A production engine contract

`src/lib/data/execution-contract.ts` is the stable domain boundary for live execution. The existing `StudioExecutionFacade` remains a mock presentation adapter; a live adapter will translate `ExecutionEngine` records into the current view models without making components import transport or mock modules.

## Contract decisions

- Every asynchronous operation returns `ExecutionResult<T>`. Failures are data, with stable codes for blocked, unavailable, timeout, cancellation, invalid input, capacity, conflict and not-found outcomes.
- Planning and validation are separate. Limits are part of the accepted plan and travel with it into a run.
- A run has a lifecycle, an attempt number, ordered events, a nullable terminal outcome and measured usage. `costUsd` is always `null` because the live engine does not provide a dependable cost.
- Results, datasets, evidence and captures are separate retained records linked by stable IDs. Result values may be explicitly `null`.
- Human-review inputs and decisions are named separately from CiteOtter's automated evidence review. Recording a decision does not automatically finish a run or change its outcome to `partial`; a later adapter must map an observed engine transition explicitly.
- Cancellation and retry are first-class. Retry creates another attempt and does not rewrite the prior run.
- Monitors accept only `none` and `on_change`. An `on_change` monitor notifies only for a changed event; unchanged and failed observations remain inspectable without claiming delivery.

The deterministic `MockContractExecutionEngine` exercises the contract only in memory. It does not call CiteOtter or use credentials.

## Intended CiteOtter translation

The translation was checked read-only against `kapetacom/citeotter` commit `a4c955ab58b9c593a0c22a716f486cfe5f593ca3`, especially `internal/service/http.go`, `contract.go`, `monitor.go`, `enrich.go` and `usage_summary.go`. This records an intended adapter, not a claim that Studio already implements it.

| Studio contract | Current read-only CiteOtter surface | Translation note |
|---|---|---|
| `plan` | Studio-local | Build the bounded task/monitor/enrichment request. Do not send credentials to the browser. |
| `validate` | `POST /v1/tasks/validate`, `POST /v1/monitors/validate` | Preserve field-level validation faults. Enrichment validation currently occurs on create, so a Studio preflight must remain local until a read-only validation route exists. |
| Extract | `POST /v1/tasks` with workflow `extract` | One public HTTPS source; read-only `read_page`. |
| Research | `POST /v1/tasks` with workflow `agent` | One to three seed pages with link following; at most six pages. Search may use `POST /v1/search`, but discovered facts still require task evidence. |
| Collect | `POST /v1/tasks` with workflow `collect` | One seed, link following, at most three pages and ten records. |
| Run lifecycle/events | `GET /v1/tasks/{id}`, `GET /v1/tasks/{id}/events` | Translate durable task snapshots and event stream into ordered contract events. |
| Cancellation/retry | `POST /v1/tasks/{id}/cancel`; a new idempotent submission for retry | Never overwrite the prior attempt. |
| Results/evidence | Task detail result, sources and evidence | Retain source/evidence relationships and explicit missing/null values. CiteOtter's `review` is automated evidence verification, not Studio `humanReview`. |
| Captures | No supported capture endpoint identified | Return unavailable capture records. Do not claim screenshots, HTML snapshots or recordings are live. |
| Enrichment | `POST /v1/enrichments`, list/detail/export routes | Translate row IDs, value/unknown/missing/not-run states and per-field evidence. |
| Monitors | create/validate/list/get/state/delete routes under `/v1/monitors` | Page/topic only; schedule is 60–10,080 minutes; notify is `none` or `on_change`. |
| Usage | `GET /v1/usage` plus per-task usage | Preserve model requests, tokens when known, page attempts and tool time. Force `costUsd` to `null`. |

The adapter must stay behind allowlisted `/api/engine/*` server routes. CiteOtter accepts public HTTPS pages only, may report blocked/unavailable pages, and has no direct-database integration requirement. The TypeScript SDK remains incomplete, so implementation phases must check the Go HTTP handlers rather than infer endpoint support from the SDK.

## Explicitly not confirmed

- No live API was called and no credential was requested.
- No CiteOtter source or deployment was changed.
- Capture availability, automatic decision-to-`partial`, price-threshold monitors, Email/Slack monitor channels and browser interaction are not supported by this contract mapping.
- The production engine path remains unresolved until the live host/company account and credential issuer are chosen and the Phase 4 gateway proves the adapter path.
