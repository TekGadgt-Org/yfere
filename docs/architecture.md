# yfere architecture

Status: implementation-grade prototype specification; planning only.

## Scope and invariants

yfere is a new standalone agent harness. The first implementation slice is its selector/evaluation core: it selects a project-scoped roster of known personas, resolves each selected persona's model and skills, validates all choices deterministically, records replayable decision evidence, and stops at a frozen assignment. The complete destination is native yfere execution; the first slice does not yet execute workers, deliver messages, install skills, write durable memory, deploy, or learn online.

The runtime is TypeScript on Node.js 20+, strict TypeScript, pinned pnpm, Zod, Vitest, SQLite, YAML/JSON catalogs, and `@typesafe-ai/sdk` behind an internal provider transport boundary. The core has an offline-capable deterministic path: catalog/schema/policy tests, recorded-decision replay, synthetic provider fixtures, and baseline evaluation require no credential or network and do not perform fresh model execution. Live selection is an independent TypeSafe transport requiring separately configured `TYPESAFE_API_KEY`, an explicit live flag, and separate human authorization; an environment key alone is insufficient. Future live worker execution is a native yfere-owned runtime with exactly three initial task-agent providers: Codex, Claude Code, and OpenCode Go. Codex uses `yfere auth codex` with yfere-owned browser OAuth and app-owned per-user refresh storage plus direct Responses transport; Claude uses an unmodified pinned native Claude Code process and its native auth state; OpenCode Go uses an independent yfere-stored API key and direct protocol-specific Go endpoints. Jev remains the separate decision service; OpenAI Decisions remains deferred. No provider credential crosses transports or enters selection state. The TypeSafe key remains in yfere's app-owned secret store until explicit removal/logout, replacement or rotation, provider revocation/expiry, or uninstall with credential removal; it never enters config snapshots, telemetry, logs, prompts, SQLite decision records, or artifacts. Request-data retention/processing terms for the round-1 prompt and round-2 persona/model/skill metadata are a separate live-use decision.

Non-negotiable boundaries:

- Closed, versioned catalogs are the only source of selectable IDs.
- Semantic providers may rank or classify known options; they cannot create IDs, permissions, paths, skills, assignments, or thews.
- Deterministic code owns authorization, availability, compatibility, budgets, context limits, deadlines, tie-breaking, cardinality, and final assignment.
- Every probabilistic answer is runtime-validated and followed by deterministic validation.
- Assignments are immutable for one task attempt. Only one explicit typed replan is permitted.
- Telemetry begins with the first executable selector and defaults to redacted metadata.

## Context and data flow

```text
versioned YAML/JSON catalogs + task input
        |
        v
schema validation -> immutable normalized snapshot -> hard eligibility
        |                                      |
        |                                      +--> exclusion reasons
        v
stage 1 persona Choice (recorded, deterministic, or TypeSafe provider transport)
        |
        v
project `max_agents` policy, mandatory inclusion, none/abstention, stable ties
        |
        +--> selected personas only
                    |
                    v
          2a model choices (dynamic fields only)
                    |
                    v
          deterministic model validation/freeze
                    |
                    v
          2b skill choices conditioned on frozen model (dynamic fields only)
                    |
                    v
          deterministic reconciliation: requirements, compatibility, budget,
          permissions, ownership, context, reviewer independence
                    |
                    v
          frozen ResolvedAssignment OR typed abstention/failure
                    |
                    v
          minimal redacted events + SQLite/replay record
```

A provider request is a logical call. Physical retries are separate attempt records and consume the same outer deadline and retry budget. Provider usage is recorded once per logical call, not once per question.

## Proposed repository/module ownership

```text
docs/                         this specification set
examples/catalogs/            reviewed persona/model/skill/thew snapshots
examples/tasks/               synthetic task fixtures
src/config/load.ts            YAML/JSON parsing, canonicalization, snapshot IDs
src/config/schemas.ts         Zod schemas for catalog and policy inputs
src/domain/task.ts            Task, attempt, budgets, artifact ownership
src/domain/persona.ts         PersonaDefinition and override semantics
src/domain/model-endpoint.ts  ModelEndpoint and capability declarations
src/domain/skill.ts           SkillDefinition and trust/side-effect metadata
src/domain/thew.ts            ThewEvidence and applicability/provenance
src/domain/assignment.ts      ResolvedAssignment and immutable attempt identity
src/domain/events.ts          domain event envelopes and typed errors
src/decisions/decision-service.ts       provider-neutral interface
src/decisions/recorded-decision-service.ts replay fixture provider
src/decisions/deterministic-baseline.ts rule-only provider
src/decisions/structured-output-baseline.ts fixture-backed conventional baseline
src/decisions/typesafe-jev.ts           narrow TypeSafe provider transport
src/selection/eligibility.ts            hard candidate filtering
src/selection/persona-stage.ts          Choice validation, ordering, exact-K policy
src/selection/model-stage.ts            stage 2a model questions and answers
src/selection/skill-stage.ts            stage 2b model-conditioned skill questions
src/selection/reconcile.ts              joint deterministic checks and freeze
src/selection/pipeline.ts               orchestration/state transitions only
src/policy/budgets.ts                   arithmetic and shared limits
src/policy/permissions.ts               authorization and trust checks
src/policy/compatibility.ts             capabilities, conflicts, context
src/policy/fallback.ts                  abstention, fallback, replan policy
src/telemetry/store.ts                  repository port
src/telemetry/sqlite-store.ts           SQLite schema/migrations/transactions
src/telemetry/redact.ts                 allowlist/redaction policy
src/telemetry/report.ts                 replay/evaluation export
src/evaluation/fixtures.ts              hermetic task/catalog/decision fixtures
src/evaluation/arms.ts                  fixed, deterministic, structured, Jev, hybrid arms
src/evaluation/outcomes.ts              selector/live/execution outcome records
src/evaluation/compare.ts               metrics and gate reports
src/cli/select.ts                       offline selection command
src/cli/replay.ts                       recorded-decision replay command
src/cli/evaluate.ts                     offline evaluation command
tests/unit/                            pure schema/policy tests
tests/contract/                        provider and replay contract tests
tests/integration/                     SQLite and full offline pipeline tests
tests/fixtures/                        synthetic catalogs, tasks, responses
tests/live/                            explicitly opt-in network tests only
```

Dependency direction is inward: `domain` imports only standard-library types; `config` depends on domain schemas; `policy` depends on domain but remains pure; `decisions` depends on domain contracts but never policy; `selection/pipeline.ts` is authoritative for legal transitions, generation/replan counters, and event order; `selection/reconcile.ts` invokes pure policy functions and owns no transitions; `telemetry` exposes a persistence port whose unit-of-work transaction commits roster freeze plus required telemetry atomically. `evaluation` and CLI depend on public application ports. No domain or selector module imports Hermes, Discord, SDK internals, filesystem paths from catalog records, or credentials.

## Provider and TypeSafe transport boundaries

Yfere owns a small statically registered `TaskAgentProvider` contract covering auth preflight/status, start/resume/cancel, correlated events, tool/capability grants, workspace scope, serving-model identity, usage/cost with unknown preservation, terminal/uncertain outcomes, artifacts/receipts, retry ownership, and version identity. The initial registry contains exactly `codex`, `claude-code`, and `opencode-go`; there is no dynamic plugin loading or marketplace. Codex owns its yfere browser-OAuth lane, Claude supervises an unmodified native Claude Code runtime with native auth, and OpenCode Go uses an independent API-key direct adapter. Provider-specific semantics are preserved behind the boundary rather than made falsely equivalent. TypeSafe/Jev is the separate decision service for persona/model/skill determination; OpenAI Decisions remains deferred. `max_agents: 3` is agent cardinality, not one slot per provider.

`TypeSafeDecisionService` receives a provider-neutral `DecisionRequest` and returns a provider-neutral `DecisionResponse`. This internal boundary is the only module allowed to construct `TypeSafeClient`, read the approved secret, select the pinned decision model, or know the HTTP/SDK wire shape.

The two TypeSafe rounds are inspectable and minimized. Round 1 sends only the initial user prompt or the orchestrator-settled/aggregated prompt after clarification or a grill session, represented as the approved settled-prompt data class; the caller-generated closed question definitions are not a separate private-context input. Round 2 sends only selected persona definitions and the available model and skill catalog metadata needed for those decisions. Neither round sends credentials, auth tokens, unrelated history, raw private memory, arbitrary filesystem content, or unneeded skill bodies. The wire payload is explicitly allowlisted: `{ model, state, questions }`; never spread domain objects into it. Record round and exact data-class identifiers in redacted telemetry/config. Input-scope approval does not approve account retention or legal terms; those remain a live-use prerequisite.

Use `.withResponse()` only to retain an allowlisted request ID/header. Do not log bodies or arbitrary headers. Provider timing and billing are `unknown` unless actually supplied by a supported response. Configure SDK retries off (`maxRetries: 0`) and own bounded attempts/backoff under one outer deadline; if SDK retries are ever enabled, physical attempts must be observable and consume that same budget. Abort must cancel the complete logical call. Adapter errors map to typed `PROVIDER_AUTH`, `PROVIDER_INVALID_REQUEST`, `PROVIDER_RATE_LIMITED`, `PROVIDER_OVERLOADED`, `PROVIDER_TIMEOUT`, `PROVIDER_MALFORMED_RESPONSE`, or `PROVIDER_UNAVAILABLE` without exposing secrets.

The live TypeSafe constructor is lazy. Recorded, deterministic, and mocked transports never construct a credential-seeking client and never reach the network. `TYPESAFE_LIVE=1` plus an out-of-band authorization marker is required for live selection tests; CI defaults to network-denied. A future Codex executor has its own browser-OAuth preflight and credential store. Jev credentials are never sent to Codex, Codex OAuth tokens are never sent to Jev, and neither credential is placed in decision state or telemetry. Provider authentication is not interchangeable; a configured baseline/recorded route is degraded selection behavior, not fresh Jev inference. Current public TypeSafe materials state that Jev is not trained on customer requests or responses, that zero data retention (ZDR) is offered to enterprise customers, and that the DPA retains Customer Personal Data for as long as necessary for the processing purpose and applicable law rather than for a fixed universal period. Those public statements do not establish this account’s plan, configured request/log retention, deletion route, applicable subprocessors/transfers, or ZDR entitlement; before live use, verify the actual account terms and decide whether ordinary account handling is acceptable or ZDR is required.

## SQLite ownership and privacy

The first executable slice writes linked records transactionally:

- `runs(run_id, task_id, task_attempt_id, policy_version, status, created_at, redacted_task_ref)`
- `catalog_snapshots(snapshot_id, kind, version, content_hash, canonicalization_version, provenance, retained_until)`
- `decisions(decision_id, run_id, stage, logical_call_id, provider, requested_model, returned_model, task_state_hash, question_set_hash, response_hash, provider_contract_hash, fixture_provenance, started_at, elapsed_ms, status)`
- `decision_candidates(decision_id, question_id, candidate_id, probability, provider_winner, final_selected, exclusion_reason)`
- `provider_call_attempts(provider_call_attempt_id, logical_call_id, ordinal, status, elapsed_ms, retryable_error_code, usage, billing)`
- `assignment_rosters(roster_id, run_id, task_attempt_id, generation, parent_roster_id, parent_decision_lineage, ordered_member_ids_json, policy_version, catalog_snapshot_id, status, frozen_at)`
- `assignment_members(member_id, roster_id, ordinal, persona_id, model_id, skill_ids_json, policy_adjustments_json, override_refs_json)`
- `worker_attempts(worker_attempt_id, assignment_member_id, status)` as an interface-only record until execution exists
- `outcomes(outcome_id, run_id, kind, rubric_version, status, artifact_ref, observed_at)`
- `artifacts(artifact_id, run_id, kind, redacted_ref, content_hash)`

`assignment_rosters` is the immutable aggregate: generation 0 is initial selection; the one allowed replan creates generation 1 with an explicit parent roster and decision lineage. Foreign keys and unique constraints enforce one frozen roster per `(run_id, task_attempt_id, generation)`, stable member ordinals/IDs, and idempotent logical calls. Use distinct task-attempt, provider-call-attempt, and worker-attempt identifiers. JSON columns contain validated, redacted structured data only. Raw prompts, complete task text, Discord messages, memory contents, credentials, authorization headers, skill bodies, and private artifacts are excluded by default. Hashes identify snapshots but do not make deleted content recoverable; retention/deletion applies to payloads and snapshots as well as indexes. A deleted context makes a trace explicitly non-replayable.

## State machines

Two-stage selection: `RECEIVED -> VALIDATED -> ELIGIBLE -> PERSONA_REQUESTED -> PERSONA_VALIDATED -> ROSTER_FROZEN -> MODEL_REQUESTED -> MODELS_VALIDATED -> SKILL_REQUESTED -> SKILLS_VALIDATED -> RECONCILED -> ASSIGNMENT_FROZEN`. Any deterministic or provider error transitions to `ABSTAINED`, `FALLBACK_REQUIRED`, or `FAILED`; no implicit loop.

Project roster policy: the initial project configuration is `max_agents: 3`; the supported policy range is 1..4. Reserve/deduplicate mandatory personas within that project-scoped maximum; mandatory count greater than `max_agents` is `CONFIG_ERROR`; fewer than `max_agents` eligible real personas is `INSUFFICIENT_ELIGIBLE_PERSONAS`; include `none`; a `none` winner is `NO_MATCH` and never backfills. The MVP normally attempts to fill all 3, but returns fewer only where a separately defined admission policy permits it; otherwise it abstains rather than backfills. This limit is not reused for dynamic skills, models/fallbacks, retries, or questions. Preserve the provider winner and raw distribution separately from the final roster.

Override bypass is field-wise. Validate an exact pinned skill bundle before 2a. A valid bundle constrains the model candidate set by deterministic compatibility with the entire bundle; invalid, unavailable, or unauthorized pins and a bundle with no compatible model produce typed configuration/incompatible-pin failure, never silent drop, fallback, or semantic replan. An omitted or `auto` skills field means required plus default plus at most one compatible dynamic addition. An explicit list, including `[]`, is the exact final pinned set, suppresses 2b, may omit defaults, and must contain every required skill; `[]` is valid only with no required skills. After a model is frozen, dynamic skill choices offer only compatible optional skills; a valid no-match means no addition, while any non-offered or incompatible returned ID is `INVALID_DECISION`. A pinned model suppresses 2a and constrains 2b; both pinned skip inference. Bypass never skips deterministic checks.

Abstention/fallback: `NO_MATCH`, malformed/ambiguous semantic output, or no feasible assignment enters `ABSTAINED`; policy may choose a configured capable generalist only if it passes the same hard checks, producing a `FALLBACK_APPLIED` event. Otherwise require review/clarification. Confidence cannot authorize fallback or actions.

Replan: a frozen attempt may enter `REPLAN_ELIGIBLE` only for one configured typed infeasibility/provider failure. Create a new explicit replan decision trace, reapply all hard filters, and freeze once. A second request, same failure, or implicit loop is `REPLAN_EXHAUSTED`.

Replay: `RECORDED_INPUT_BOUND -> ANSWERS_REPLAYED -> DETERMINISTIC_VALIDATION -> ASSIGNMENT_REPRODUCED`; exact canonicalization schema/version plus task-state, catalog, policy, question-set, response, provider-contract/SDK, and fixture-provenance hashes must match. Provenance is a closed union: `synthetic`, `documented_example`, or `recorded_live`. Replay performs no network call and no mutation of production run/decision/outcome tables; an explicitly requested audit may write only a separately scoped audit artifact. Missing, deleted, or mismatched inputs yield `NON_REPLAYABLE`, not a fabricated result.

## Implementation boundary

The first implementation slice is yfere's standalone selector/evaluation core. Yfere owns its product boundaries and execution choices. The slice must run the full selector without keys/network. TypeSafe live contract tests and native yfere execution-runtime construction are later, separately authorized gates. Phase 9 decisions are limited to yfere-native workspace/tool/process/cancellation/side-effect/artifact/receipt/approval semantics.

## Prior-art synthesis amendments (2026-10-02)

The prior-art dossier, decision-services comparison, and browser-use support boundary are provenance for these bounded additions; they do not create compatibility targets for any external harness. ADOPT: separate transport reconnection, session reconstruction, execution recovery, and decision replay; retain requested-versus-serving model attribution; and bind future approvals and receipts to an active attempt. ADAPT: the existing provider-neutral decision seam is the only future decision-service review point. Jev remains the decision lane; an OpenAI Decisions adapter is deferred until an inspectable, versioned contract exists. No probabilities, endpoint, or provider enum is invented.

Future browser automation is a standalone yfere-owned capability, not selector MVP scope or harness compatibility. The reviewed boundary is a provider-neutral `BrowserCapabilityProvider` with a version-pinned, out-of-process browser-use adapter. Yfere owns grants, origin/network policy, approvals, artifact handles, cancellation/reaping, redaction, and uncertain-effect receipts; browser-use's agent loop, Python internals, MCP, cloud services, profiles, and credentials are not authorities. A browser milestone is added only after the native execution gate: contract/fake adapter, hermetic process cleanup, controlled-local browser, then separately authorized live lanes. See `docs/browser-use-support-boundary-2026-10-02.md`.

REJECT/DEFER: plugin marketplaces, dynamic loading, broad provider implementations, compatibility adapters other than the approved unmodified pinned native Claude Code runtime with native auth, hosted browser obligations, and long-lived sidecars absent measured need. Claude OAuth is never extracted, copied, or replayed. Sources: `docs/prior-art-dossier-2026-10-02.md`, `docs/decision-services-comparison-2026-10-02.md`, and `docs/browser-use-support-boundary-2026-10-02.md`.

## Future Phase 9 browser module ownership and dependency direction

Browser modules are post-MVP and remain outside selector imports. `src/browser/capability-provider.ts` owns the normative provider contract; `src/browser/policy.ts` is the reference monitor for grants, origins, actions, limits, and approvals; `src/browser/adapter-child-process.ts` owns pinned adapter/IPC framing and process-tree lifecycle; `src/browser/approval-broker.ts` owns one-use exact-operation approvals; `src/browser/artifacts-receipts.ts` owns containment, hashes, receipts, and observed effects; and `src/browser/lifecycle-cleanup.ts` owns cancellation, timeout, crash handling, reaping, and cleanup uncertainty. Dependencies point inward to domain contracts and yfere policy; selector, task-provider, and decision-service modules do not import browser modules.

The browser provider may receive only scoped grants, action data, and opaque artifact/secret handles. It cannot access task-provider or decision-service credentials, decision state, unrestricted prompts, or arbitrary paths. A future out-of-browser egress reference monitor is mandatory before B1/B2 and independently enforces DNS/connection, redirect, proxy, subresource, WebSocket, service-worker, download, and metadata/private-address policy.

Phase 9 policy direction is settled: all workspace changes begin isolated, reviewed apply-back is default, and an explicitly dangerous Auto apply-back may skip only that approval without widening filesystem, shell, git, network, credential, provider-live, browser, destructive-effect, or external-effect grants; cancel/reap is default on client loss and bounded continuation is separately selected through the closed, digest-bound continuation policy, which derives immutable `detachedAt` only from the trusted exactly correlated detach/client-loss observation and requires overflow-safe exact `expiresAt = detachedAt + durationMs` (duration/deadline/event mismatch, stale/future timestamp, untrusted clock, overflow, or failed correlation rejects admission). Approval is single-operation or current-session closed blanket scope, bound to non-secret credential, authorization-source, and connection identities and invalidated by identity or revocation changes. Structured telemetry/receipts are default and raw content is opt-in; receipts use closed terminal/continuation outcomes and explicit destructive/external scope. The approved native host matrix is macOS arm64 and Linux x64 for release-blocking lifecycle coverage, with Linux arm64 and macOS x64 for build/install/schema/replay/smoke; unsupported host capability fails closed. Acceptance includes case/path/symlink, Git/apply-back, process-tree, crash/restart, atomic persistence, denied DNS/IP/proxy, resource-limit, deadline, and unsupported-host fixtures. The global bounded retention defaults, TypeSafe ordinary-handling classification rules, and implementation authorization are normative in `docs/decision-contracts.md`.
### Reduced Phase 3 implementation

The offline replay service owns copied fixture bytes and publishes a complete
temporary index only after every fixture validates. Identity is a nested
structured canonical tuple (`runId`, `stage`, `logicalCallId`), not a delimiter
string. The implementation intentionally does not include a proof engine,
private allocator, global object-plan cache, or live-provider path.
