# yfere evaluation protocol

Status: pre-implementation protocol. No live provider or worker result is claimed.

## Purpose and experimental discipline

The first question is whether yfere's bounded, deterministic-policy selector can be exercised and replayed safely offline. The second is whether an authorized TypeSafe provider transport satisfies the supported contract and adds useful semantic selection. Only a separately authorized native yfere execution-runtime phase can measure downstream task quality or total accepted-task cost. Do not use execution outcomes as an offline-selector prerequisite, and do not claim vendor measurements as yfere results.

All arms use the same versioned task fixtures, catalogs, policy, budgets, acceptance rubrics, and context limits. Tuning and held-out evaluation are separated by task family/project. Every run retains rejected candidates and typed failures. Synthetic fixture, documented-example, and genuinely recorded-live provenance are distinct labels.

## Arms

1. Fixed capable baseline: one preconfigured feasible assignment.
2. Deterministic baseline: hard eligibility, static thews, stable rules, no semantic provider.
3. Structured-output baseline: conventional structured selector, fixture-backed first; runtime-validated and policy-constrained.
4. TypeSafe/jev arm: approved live provider transport or recorded live responses.
5. Hybrid arm: deterministic eligibility and reconciliation with TypeSafe semantic judgments.

The MVP uses a project-scoped `max_agents: 3` policy (supported range 1..4), not a universal K. The normal policy attempts to fill all 3; mandatory personas consume and deduplicate within the project maximum, and more mandatory personas is a configuration error. Fewer eligible real personas is `INSUFFICIENT_ELIGIBLE_PERSONAS`; `none` wins produce typed no-match and no backfill. A separately named admission policy may return fewer or abstain; it does not silently backfill. Skill, model/fallback, question, and retry limits are independent experiments/configuration fields.

For the TypeSafe arm, current public TypeSafe materials state that Jev is not trained on customer requests or responses, that zero data retention (ZDR) is offered to enterprise customers, and that the DPA retains Customer Personal Data for as long as necessary for the processing purpose and applicable law rather than for a fixed universal period. Those public statements do not establish this account’s plan, configured request/log retention, deletion route, applicable subprocessors/transfers, or ZDR entitlement; before live use, verify the actual account terms and decide whether ordinary account handling is acceptable or ZDR is required.

## Fixture families

Fixtures must cover:

- simple tasks where `none` or a single feasible persona is correct;
- frontend/accessibility, backend/security, research/writing, and mixed tasks;
- ties, reordered catalogs, irrelevant candidates, no-match, fewer-than-`max_agents`, mandatory overflow;
- pinned model, pinned skills, both pinned, omitted/auto skills, explicit `[]`, invalid pins, required-skill omission;
- model/skill incompatibility where skill choice must follow frozen model;
- unavailable/unauthorized endpoints, missing tools, context overflow, over-budget teams, ownership/reviewer conflicts;
- malformed/partial semantic responses, unknown IDs, invalid probability sums, ambiguous distributions;
- metadata prompt injection and untrusted catalog text;
- provider timeout, 401, 422, 429, 529, non-JSON success, abort, retries and shared deadline;
- one typed replan, replan exhaustion, deterministic fallback and final abstention;
- replay with exact snapshots and non-replayable deleted context.

The full selector must run through its hermetic deterministic path with recorded responses and deterministic baselines without a key or network; this path performs no fresh model execution. Default CI must deny network; a synthetic key with a fetch stub is not live authorization. This is an offline-capable test path, not a claim that yfere operates as an offline product.

## Verification lanes and gates

| Lane | Scope | Credentials/network | Required evidence |
| --- | --- | --- | --- |
| Hermetic core | schemas, catalogs, deterministic policy, recorded replay, synthetic providers, baseline evaluation | none; network denied; no fresh model execution | Gate A validity, replay, privacy, limits, and fixture coverage |
| Jev-only contract | TypeSafe request/response provider transport and live selection behavior | separate `TYPESAFE_API_KEY` plus explicit live authorization; no Codex credential | Gate B wire shape, runtime validation, bounded failures, metadata and selection evidence |
| Task-agent contract/adapter lanes | No provider calls; static mocks/fakes | Synthetic handles; no credentials | Contract validation, auth-preflight/status distinctions, provider-specific events, cancellation/process ownership, usage/model attribution, fallback/replan behavior, and redaction for Codex, Claude Code, and OpenCode Go |
| Matched provider evaluation | Controlled fixtures first; live separately authorized | Independent per-provider authorization | Matched supported coding tasks, equal grants/limits, per-provider model/usage evidence, and honest unknowns; live provider tests remain separately authorized |


### Named task-agent live gates (independent)

The following are separate gates, not one shared approval. A pass, credential, login, runtime, origin, model, data-term approval, spend ceiling, or account mutation approval for one gate cannot authorize another.

| Gate | Required provider-specific evidence |
| --- | --- |
| `Gate-TaskAgent-Codex` | yfere OAuth source with state/nonce/PKCE and registration/host binding; pinned client/runtime; approved Responses origins and models; request-data/retention terms; spend and deadline; separate approval for login, refresh rotation, logout, and revocation tests; callback, redirect, uncertain-refresh, and cleanup fixtures |
| `Gate-TaskAgent-ClaudeCode` | unmodified pinned native Claude Code runtime and allowlisted argv/env; native auth source (no token extraction/copy/replay); approved model/fallback and data/transcript terms; OS process/tool containment; spend/deadline; separate approval for login, profile/keychain mutation, logout, and revocation tests; inherited-config, cancellation, and cleanup fixtures |
| `Gate-TaskAgent-OpenCodeGo` | independent API-key source; pinned protocol codec and approved origins/redirect behavior; approved coding-only models and data-policy expiry; spend/deadline; separate approval for key rotation/revocation/account mutations; no balance/credit fallback; redirect/header/family/parser fixtures |

Each named gate records a provider ID, credential-source kind (never its value), runtime/codec identity, approved origins/models, account/data terms, spend/deadline, authorization marker, and fixture/conformance results. Mock, recorded, and preflight lanes may run without credentials but never satisfy a live gate.

Jev unavailability may use an explicitly configured deterministic or recorded route where policy permits; that is degraded selection behavior, not fresh Jev inference or proof of product operation offline.

### Gate A: hermetic selector validity

Required evidence:

- all schemas reject malformed/unknown/duplicate data without secret leakage;
- every semantic answer is runtime-validated and every selected ID is checked against closed catalogs;
- deterministic permissions, budgets, context, compatibility, project `max_agents`, override, winner-specific, and ownership checks pass;
- stage 2 receives only selected personas; dynamic model selection precedes model-conditioned skill selection;
- assignments freeze once per attempt; at most one explicit replan;
- replay reproduces assignment and exclusion reasons with no network or side effects;
- telemetry records logical calls once, physical attempts separately, bypasses, raw validated distributions, and unknown usage/timing explicitly;
- privacy tests show raw prompts, credentials, private memory, skill bodies, and arbitrary headers are absent;
- fixture matrix exercises all terminal paths.

This gate does not claim task-output improvement.

### Gate B: opt-in TypeSafe contract/selection validation

Prerequisites are an explicit live flag, separate human authorization, approved egress/data-retention policy, spend ceiling, pinned model/config, and a separately configured `TYPESAFE_API_KEY` through the approved secret mechanism. Key presence alone is not authorization. Codex browser-OAuth credentials are not a Jev prerequisite and must not be sent to Jev. Without these TypeSafe prerequisites, run mocked transport and recorded fixtures only.

Contract tests first use a network-denied custom fetch and synthetic key to assert exact allowlisted request shape, response validation, question correlation, selected-model metadata, timeout/abort, status mapping, and one shared retry/deadline budget. Authorized live tests then measure supported mixed questions, stage 1/2 request shapes, actual returned model/request ID/usage when supplied, missing optional metadata, latency, stability under candidate-order perturbations, and no-match behavior. Provider timing and billing remain unknown unless returned by the service; client wall time is measured locally.

Pass criteria are supported request/response shapes, bounded failures, no secret/body leakage, valid correlation, and stable deterministic reconciliation. The initial approved evaluation defaults are accepted-task output quality as primary objective; quality at least 95% of the fixed capable baseline with zero additional critical failures; balanced frontend/accessibility, backend/security, research/writing, and mixed task families; $10 total TypeSafe/Jev spend ceiling; and selector p95 latency <=2 seconds. If quality does not improve but remains within the floor, the selector must reduce total accepted-task cost or context by at least 20% to justify complexity. These are pre-registered gates, not measured results.

### Gate C: native yfere execution runtime

Only after Gate A and a deliberately approved native yfere execution design. Build and exercise yfere's own executor against controlled local fixture projects and synthetic/approved provider paths. Construct and compare matched routed and baseline assignments within yfere under equal tools, permissions, initial context, budget, and task families. The first-party runtime must cover local project-path selection, yfere-native filesystem/shell/git/network grants, cancellation and reaping of owned child processes, artifacts in the selected workspace or yfere run store, project-artifact versus run-receipt retention, honest uncertain-side-effect receipts, and explicit approval for destructive or other external effects. This gate is the first place to measure accepted-task quality, missed/redundant responsibility, total cost per accepted task, worker and wall-clock latency, token volume/peak context, repair/rework, and human correction. A fixed or deterministic baseline winning is a valid result.

Native yfere execution remains outside the first selector slice and is the destination of Phase 9 under its separate authorization gate. Structured telemetry and terminal receipts are default; full raw prompts, raw tool output, and compaction source content require opt-in and deletion must surface non-replayability.

## Metrics and analysis

Selector validity: schema pass rate, invalid-answer rejection, eligibility correctness, assignment validity, `max_agents`/none/abstention coverage, fallback and replan rates, policy-adjustment count, replay equality, and catalog-order stability.

Semantic selection: per-question agreement to labeled fixture judgments, distribution/log-loss/Brier only where labels justify them, selective risk versus coverage, candidate-order/paraphrase/distractor stability, and winner-specific fit. Provider confidence is not task success probability or authorization.

Operational: client decision latency and tails, physical attempts, outer deadline failures, input/output tokens, estimated cost with its basis, provider-confirmed billing when supplied, SQLite write time, cancellation/reaping, uncertain effects, approval/intervention frequency, apply-back acceptance/rejection, requested-versus-serving provider/model attribution, resource consumption, artifact outcomes, and replayability. Do not count batched usage once per question. Separate aggregate worker duration from wall-clock task time in Gate C. Preserve unknown values and prohibit fabricated quality, savings, or replay claims.

Outcome: rubric-versioned accepted-task quality, corrections, rework, total cost per successful/accepted task, missed/redundant work, and peak worker context. Never infer a counterfactual saving from a selector trace or shadow route without executed/evaluated alternatives.

## User-facing configuration and report contracts

The implementation must provide this exact prospective `examples/evaluation.yaml` shape before bootstrap. The file is intentionally not created by this planning task:

```yaml
schema_version: 1
catalogs:
  personas: examples/catalogs/personas.yaml
  models: examples/catalogs/models.yaml
  skills: examples/catalogs/skills.yaml
  thews: examples/catalogs/thews.yaml
policy_version: mvp-1
project_policy:
  max_agents: 3
  max_dynamic_skills_per_agent: 1
  max_model_candidates: 4
  max_fallback_models: 1
  max_retries: 2
arms:
  - fixed-capable
  - deterministic
  - structured-fixture
  - typesafe-jev
  - hybrid
fixture_families:
  - frontend-accessibility
  - backend-security
  - research-writing
  - mixed
output:
  report: reports/evaluation.json
  effective_config: reports/effective-config.json
network:
  allow: false
  typesafe_requests: false
live_gates:
  typesafe_human_approved: false
limits:
  typesafe_spend_ceiling_usd: 10
  selector_p95_target_ms: 2000
```

The loader rejects unknown top-level fields, invalid paths, unsupported arms/families, `project_policy.max_agents` outside `1..4`, invalid independent limits, TypeSafe requests unless both `network.allow` and `network.typesafe_requests` are true, live execution unless `live_gates.typesafe_human_approved` is also true, and a spend ceiling above the approved initial ceiling unless a later human approval changes the contract. It emits an effective-config JSON object with `schema_version`, normalized catalog paths, catalog/policy snapshot hashes, project policy limits, selected arms and fixture families, report destinations, effective network and human-approval gates, spend and latency limits, and no secrets.

The JSON evaluation report is versioned and must contain at least:

```json
{
  "schema_version": 1,
  "run_id": "...",
  "provenance": "synthetic|documented_example|recorded_live",
  "effective_config_hash": "...",
  "catalog_snapshot_ids": ["..."],
  "policy_version": "mvp-1",
  "project_policy": {"max_agents": 3, "max_dynamic_skills_per_agent": 1, "max_model_candidates": 4, "max_fallback_models": 1, "max_retries": 2},
  "arms": [{
    "id": "deterministic",
    "fixture_family": "backend-security",
    "assignments": [],
    "rejections": [],
    "abstentions": [],
    "metrics": {
      "assignment_validity": {"value": 0, "status": "observed|unknown"},
      "replay_equality": {"value": 0, "status": "observed|unknown"},
      "selector_latency_ms": {"p95": 0, "status": "observed|unknown"},
      "attempts": 0,
      "usage": {"input_tokens": "unknown", "output_tokens": "unknown", "billing": "unknown"},
      "accepted_task_quality": {"value": "unknown", "status": "unknown"}
    }
  }],
  "gate_assessment": {
    "quality_floor": "not_measured|pass|fail",
    "critical_failures": "not_measured|observed",
    "simpler_baseline_rule": "not_applicable|pass|fail",
    "claims": []
  }
}
```

Report values use `unknown`/status fields until directly observed. The report must retain assignment/rejection/abstention records, validity/replay/privacy metrics, latency/attempts/usage with unknowns preserved, and provenance; it must not claim selector or Jev improvement, accepted-task quality, cost savings, or context reduction without the corresponding authorized experiment evidence.

## TDD implementation sequence and prospective commands

Commands assume the eventual pinned package scripts and must remain offline by default:

```text
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm test:contract
pnpm test:integration
pnpm test:live:typesafe       # explicit flag + authorization; skipped otherwise
pnpm evaluate --config examples/evaluation.yaml
pnpm replay --run <run-id>
```

Implement vertical slices, writing each test before production code and observing the expected failure:

1. `tests/unit/config.schemas.test.ts`, `tests/unit/catalog-normalize.test.ts`: task/catalog schemas, duplicate IDs/references, unknown versus zero, explicit empty versus auto, canonical snapshot hashes.
2. `tests/unit/decision-contracts.test.ts`, `tests/contract/recorded-decision-service.test.ts`: exact question correlation, missing/extra answers, invalid probabilities, response provenance, cancellation/deadline.
3. `tests/unit/eligibility.test.ts`, `tests/unit/permissions.test.ts`, `tests/unit/compatibility.test.ts`, `tests/unit/budgets.test.ts`: hard filters, authorization, required tools, context, shared budget, conflicts, reviewer and ownership rules.
4. `tests/unit/persona-stage.test.ts`: project `max_agents` 1..4, stable ties, mandatory overflow, fewer-than-limit, none/no backfill, preserved raw winner/distribution.
5. `tests/unit/model-stage.test.ts`, `tests/unit/skill-stage.test.ts`: selected-only stage 2, ordered 2a/2b, pinned fields, explicit skill lists, required-skill errors, winner-specific validation.
6. `tests/integration/selection-pipeline.test.ts`: frozen assignments, deterministic reconciliation, one replan, fallback, abstention, no network.
7. `tests/integration/sqlite-store.test.ts`, `tests/unit/redact.test.ts`: transactional linked records, idempotency, one logical call versus physical attempts, redaction/retention/non-replayable state.
8. `tests/contract/typesafe-wire.test.ts`, `tests/contract/typesafe-errors.test.ts`: mocked transport request allowlist, runtime response validation, 401/422/429/529/timeout/abort/non-JSON, request ID/metadata allowlist, shared deadline.
9. `tests/integration/replay.test.ts`, `tests/integration/evaluation-arms.test.ts`: exact replay and baseline comparison reports.
10. `tests/live/typesafe-live.test.ts`: opt-in only, explicit authorization marker, pinned model and approved fixtures; never default CI.

Each slice is RED -> minimal GREEN -> refactor with the full suite rerun. No runtime code is created by this planning task.

## Go/no-go criteria

Go to implementation when Gate A contracts are accepted, fixture families cover every state machine branch, the approved primary objective/quality floor/thresholds are recorded, and no default command can call a provider or mutate external systems. The approved defaults are accepted-task output quality; at least 95% of the fixed capable baseline with zero additional critical failures; balanced frontend/accessibility, backend/security, research/writing, and mixed task families; $10 total TypeSafe/Jev spend ceiling; and selector p95 latency <=2 seconds. If quality does not improve but remains within the floor, require at least 20% lower total accepted-task cost or context. Do not interpret these thresholds as measured outcomes. Do not proceed to live work without Gate B prerequisites. Do not proceed to Gate C without a separately approved native yfere execution protocol.

No-go or retain the simpler baseline if hybrid selection does not improve quality at the agreed floor, or does not reduce total accepted-task cost/latency/context enough to justify provider and reconciliation overhead; if privacy/authorization invariants fail; if version pinning/data handling cannot be established; if replay or deterministic checks are incomplete; or if the catalog is too small to justify semantic routing. A simpler deterministic/fixed system winning is an intended valid outcome.

## Prior-art synthesis amendments (2026-10-02)

Jev remains the first decision-service arm through the existing seam, with fixed, deterministic, recorded, and structured-fixture arms retained. The OpenAI Decisions API is a deferred challenger, not an enabled arm: no endpoint, schema, probability conversion, credential path, or performance claim is inferred from the limited-preview announcement. Admission requires an inspectable contract, authorized fixtures, the same validation/privacy invariants, and a reviewed mapping for any answer representation that is not a complete distribution.

Browser-use is a future capability evaluation lane, separate from harness prior art and outside selector MVP. Phase B0 (post-native execution gate) tests a fake adapter and closed grants with network denied; B1 tests a pinned out-of-process adapter and controlled local fixture pages, including redirects, private-IP denial, artifact containment, cancellation, cleanup, and uncertain effects; B2 is separately authorized read-only/live-effect testing with dedicated accounts and exact approvals. Browser results measure observed capability and effect confirmation only, never inferred external success. Browser-use upstream telemetry, cloud services, credentials, and real pages are not enabled by this plan.

Browser B0 is a contract-definition/conformance/freeze gate against the sole normative source `docs/decision-contracts.md`; it records the accepted version and canonical hash. B1 and B2 are blocked until B0 passes and must use that version/hash, not the support-boundary report as an alternate contract. Before B1/B2, an independent out-of-browser egress reference monitor must enforce DNS A/AAAA/CNAME revalidation and connection-target checks, redirect/proxy-route checks, denial of loopback/RFC1918/ULA/link-local/multicast/metadata/encoded aliases and disallowed ports, and coverage of WebSocket, service-worker, subresource, download, and proxy traffic. Fixtures must include DNS rebinding, IPv6, redirect chains, proxy bypass, subresources, WebSockets, and metadata services. B1/B2 also require exact one-use approval/receipt conformance and secret-entry capture controls; browser secret entry remains disabled by default.

Gate C no longer awaits four wholly unresolved choices. Ryan settled the direction: isolated reviewed apply by default with explicit dangerous Auto, cancel/reap by default with a closed digest-bound continuation policy, single-operation or session-only closed blanket approval bound to non-secret credential/authorization/connection identity, and structured telemetry/receipts by default with raw content opt-in. Conformance must reject omitted or widened continuation fields; require `detachedAt` copied only from the trusted exactly correlated detach/client-loss observation, overflow-safe exact `expiresAt = detachedAt + durationMs`, and fail closed on duration/deadline mismatch, detach-event mismatch, stale/future timestamp, overflow, untrusted clock, or failed correlation. These negative fixtures must run at initial detach, reconnect, rebind, resume, and process restart; none may rewrite, renew, or extend `detachedAt`, `durationMs`, or `expiresAt`. Conformance must also reject grant expiry after continuation expiry, cross-identity grants, and receipts lacking explicit destructive/external scope or typed terminal outcomes. The approved host matrix is macOS arm64 and Linux x64 for release-blocking native/lifecycle coverage and Linux arm64 and macOS x64 for build/install/schema/replay/smoke; unmatched hosts fail closed. The approved global bounded retention policy is the normative default, with explicit effective-config/receipt digesting and honest cap eviction/truncation. Dependency fetches are limited to explicit pinned-pnpm package-registry access for bootstrap/lockfile/license audit; CI, runtime, provider, telemetry, and live-test network remains denied. Deletion must make replay honestly non-replayable.

Sources/provenance: `docs/prior-art-dossier-2026-10-02.md`, `docs/decision-services-comparison-2026-10-02.md`, and `docs/browser-use-support-boundary-2026-10-02.md`.
