# yfere planning readiness

Status: reconciled planning package; no implementation artifacts are created here. yfere is a standalone agent harness: its selector/evaluation core is the first slice, while native execution remains the destination. Offline Phases 1–5 and hermetic/mock work are implementation-ready once the checklist's scope/config authorization is recorded; live TypeSafe validation and native execution remain separately gated.

## Effective MVP scope

The MVP is the first standalone yfere harness slice: a TypeScript selector/evaluation core. Its offline-capable hermetic path validates closed versioned catalogs, applies deterministic eligibility and policy, replays recorded answers, runs deterministic and fixture-backed baseline arms, resolves a project-scoped roster with `max_agents: 3` (supported range 1..4), performs ordered stage 2a model freeze then stage 2b model-conditioned skill selection, reconciles joint constraints, freezes an immutable assignment roster, and exports inspectable JSON reports. The normal policy attempts to fill all 3; `none` and insufficient eligible personas never backfill, and a separately named admission policy must define whether fewer are allowed or the run abstains. This slice is deliberately not yet the complete runnable harness; native yfere execution is the product destination.

- The initial approved evaluation objective is accepted-task output quality, with a minimum floor of at least 95% of the fixed capable baseline and zero additional critical failures. If quality does not improve but remains within the floor, at least 20% lower total accepted-task cost or context is required to justify complexity. These are pre-registered planning gates, not measured outcomes.
- The initial balanced task families are frontend/accessibility, backend/security, research/writing, and mixed tasks. The initial TypeSafe/Jev ceiling is $10 total spend and selector p95 target is <=2 seconds; these are limits, not results.
- The first slice does not execute workers, run Discord, install skills, write durable memory, learn online, deploy, publish, or provide a generic plugin/event platform. TypeSafe/Jev is the decision service, not a task-agent provider. The initial task-agent provider set for native yfere execution is exactly Codex, Claude Code, and OpenCode Go behind a statically registered yfere-owned `TaskAgentProvider`; `max_agents: 3` is agent cardinality, not provider allocation. Codex retains yfere-owned browser OAuth and direct Responses; Claude uses an unmodified pinned native Claude Code process with native auth state; OpenCode Go uses an independent API key and direct protocol-specific endpoints. Live authorization gates remain independent, and no credentials cross Jev, Codex, Claude, Go, browser-use, or secret-broker boundaries.

## Settled decisions

- Stage 1 selects personas; stage 2 is strictly ordered: 2a model questions, deterministic model validation/freeze, then 2b model-conditioned skill questions. Batching is permitted only within a substage.
- Exact explicit skill arrays, including `[]`, are final pins; they may omit defaults but must include required skills. Omitted/`auto` means required plus defaults and at most one compatible dynamic skill. An invalid/unauthorized/unavailable pin fails closed.
- An exact pinned skill bundle is validated before 2a. Its whole-bundle compatibility determines model candidates. Invalid pins or no compatible model are typed configuration/incompatible-pin failures, not silent drops, fallback, or semantic replans. A dynamic skill no-match means no addition; a returned non-offered/incompatible ID is `INVALID_DECISION`.
- `assignment_rosters` is the immutable aggregate keyed by `(run_id, task_attempt_id, generation)` with ordered `assignment_members`. Generation 0 is initial selection; the sole allowed replan creates generation 1 with explicit parent roster and decision lineage. Stable member ordering and IDs are deterministic across catalog insertion order and replay. Task-attempt, provider-call-attempt, and worker-attempt IDs are distinct.
- `selection/pipeline.ts` owns legal transitions, generation/replan counters, and event order. Policy modules are pure. The persistence port owns one unit-of-work transaction for roster freeze and required telemetry.
- Replay stores and checks canonicalization schema/version plus task-state, catalog, policy, question-set, response, provider-contract/SDK, and fixture-provenance hashes. Provenance is the closed union `synthetic | documented_example | recorded_live`. Mismatch or deleted input returns `NON_REPLAYABLE`; replay is read-only against production run/decision/outcome tables.
- The internal provider transport boundary is the sole owner of provider attempts and backoff. SDK retries are disabled. Every physical attempt and backoff consumes one immutable logical-call deadline and retry budget; abort/cancel wins immediately, then deadline, then retry policy. Unknown usage/billing remains unknown.
- Override events are closed records containing field, source, requested ID/hash, validation result, suppressed questions, and policy version.
- `examples/evaluation.yaml` is a prospective user config, not created in this planning task. Its exact schema is defined in `docs/evaluation-protocol.md` under “User-facing configuration and report contracts”: catalog references, policy version, project-scoped `max_agents: 3`, separate skill/model/fallback/retry/question limits, arm selection, fixture families, report destinations, network/live flags, the $10 spend ceiling, and the 2-second selector p95 target. The effective-config output will show normalized paths/IDs, policy and snapshot hashes, each independent limit, selected arms/fixtures, and effective live/network authorization without secrets. The versioned JSON evaluation report will include run/provenance IDs, effective-config hash, arm and fixture identifiers, assignment/rejection/abstention data, validity/replay/privacy metrics, latency/attempts/usage with unknowns preserved, and no unobserved quality or savings claims.

## Unresolved Ryan decisions

These remain explicit decisions and are not invented by the implementation plan:

1. Current public TypeSafe materials state that Jev is not trained on customer requests or responses, that zero data retention (ZDR) is offered to enterprise customers, and that the DPA retains Customer Personal Data for as long as necessary for the processing purpose and applicable law rather than for a fixed universal period. Those public statements do not establish this account’s plan, configured request/log retention, deletion route, applicable subprocessors/transfers, or ZDR entitlement; before live use, verify the actual account terms and decide whether ordinary account handling is acceptable or ZDR is required. This is separate from API-key storage: yfere keeps the key in its app-owned secret store until explicit removal/logout, replacement or rotation, provider revocation/expiry, or uninstall with credential removal, with no arbitrary TTL; it never enters config snapshots, telemetry, logs, prompts, SQLite decisions, or artifacts.
2. No host or retention decision remains unresolved for the approved offline core and controlled native fixtures. Any future host/capability expansion or scoped policy override requires a new reviewed decision.

The objective, project `max_agents: 3` default, independent limits, three-provider initial task-agent scope, TypeSafe input classes, quality floor, initial task families, $10 Jev ceiling, p95 latency target, and 20% simpler-baseline rule are approved planning defaults. They are not measured outcomes.

## Review finding disposition

Product review findings:

- Stale plan stage-2 batching contradiction: resolved. The plan now requires 2a model freeze before 2b skill questions; batching is substage-local only.
- Stale plan `skills: []` semantics: resolved. The plan and contracts now define exact explicit arrays, required-skill validation, and omitted/`auto` dynamic behavior.
- Undefined MVP objective, quality floor, thresholds, task families, and priority: resolved with Ryan-approved planning defaults (accepted-task quality; >=95% fixed baseline and zero additional critical failures; balanced four task families; $10 Jev ceiling; p95 <=2s; 20% cost/context fallback rule), explicitly labeled as gates rather than measured outcomes.
- Misleading Jev credential opening gate: resolved. Phases 1–5 and hermetic/mock work are explicitly no-key; live TypeSafe and future Codex lanes remain independently gated.
- Undefined config/report UX: resolved at planning level. The prospective `examples/evaluation.yaml`, effective-config output, and JSON report shape are specified without creating implementation files.
- The research-gap audit's phrase “offline-first” is retained only as historical source wording; the effective contract is offline-capable hermetic tests/replay, not an offline product or fresh offline inference.

Maintainability review findings:

- Assignment persistence and project `max_agents`/replan lineage: resolved with the immutable `assignment_rosters` aggregate, ordered members, generation, parent lineage, constraints, and integration-test requirements.
- Pinned-skill stage-2 semantics: resolved with pre-2a bundle validation, whole-bundle compatibility, typed no-compatible-model failure, and dynamic post-freeze skill behavior.
- Replay provenance: resolved with canonicalization/version and all required state/question/response/provider/fixture hashes, closed provenance, mismatch behavior, and read-only replay.
- Retry/deadline ownership: resolved with the internal provider transport boundary's sole ownership and one shared logical budget covering every attempt and backoff, with explicit cancellation precedence.
- Transition, transaction, identifier, override, provenance, stable-ordering, and minimal-abstraction gaps: resolved in architecture/contracts and prospective tests. No generic plugin registry, event bus, or worker runtime is added.

## Phase gates

- Gate 0: Ryan has approved the standalone yfere harness scope and evaluation defaults. TypeSafe private-data terms and live calls remain separately gated; the approved ordinary-handling posture permits only synthetic/public/reviewed-minimized inputs. The held-out split is an evaluation-protocol control, not a Ryan product decision.
- Offline implementation lane: Phases 1–5 plus hermetic/mock work may proceed with no credentials, no network, and no fresh model execution after the scope/config checklist is recorded.
- Gate A: no-network hermetic schemas, policy, recorded replay, project-roster pipeline, roster persistence, redaction, and fixture coverage pass. Gate A makes no task-output improvement claim.
- Gate B: separately authorized TypeSafe/Jev contract and live-selection validation with `TYPESAFE_API_KEY`, egress/retention approval, spend ceiling, and explicit authorization. This gate is independent of Codex.
- Gate C: native yfere execution is authorized only for accepted hosts and controlled disposable fixtures. Full native/lifecycle release blocking is macOS arm64 and Linux x64; Linux arm64 and macOS x64 cover build/install/schema/replay/smoke. The host matrix and approved bounded retention policy are normative prerequisites, while every live provider and external effect remains independently gated.
- Deferred: Discord, durable memory, online learning, dashboards, remote skill discovery, recursive delegation, deployment, and publication.

## Implementation authorization checklist

Before creating implementation artifacts:

- [x] Ryan has approved the standalone selector/evaluation scope.
- [x] Ryan has approved the primary objective, quality floor, initial task families, $10 Jev ceiling, p95 latency target, and simpler-baseline cost/context gate; these remain unmeasured planning defaults.
- [x] Ordinary TypeSafe handling is limited to synthetic/public/reviewed-minimized inputs; unknown/private/sensitive classification fails closed and private data needs separately verified written ZDR-equivalent terms. Live Jev remains separately gated.
- [ ] `examples/evaluation.yaml` schema and effective-config/report contracts are accepted.
- [ ] Offline default and network-denied CI behavior are enforced.
- [ ] Project `max_agents`, pinned-bundle, roster-generation, replay-provenance, retry/deadline, override, and stable-order tests are listed in the implementation card.
- [ ] No implementation card requests provider credentials or live calls for Phases 1–5.
- [ ] TypeSafe live work has separate key, authorization, egress, retention, and spend approvals; this Gate B decision is independent of Phase 9.
- [x] Approved host-acceptance matrix: native/lifecycle release blocking on macOS arm64 and Linux x64; build/install/schema/replay/smoke on Linux arm64 and macOS x64; fail-closed unsupported hosts and listed boundary coverage.
- [x] Approved global bounded retention defaults, deletion semantics, cap-pressure behavior, and effective-config/receipt digest requirements are recorded in the normative contract.
- [ ] Codex, Claude Code, and OpenCode Go static registry/contract and provider-specific mock/preflight lanes are covered without credentials.
- [ ] Claude native child-process/auth-state boundaries and OpenCode Go API-key/network/data-policy gates are reviewed separately.
- [ ] `Gate-TaskAgent-Codex`, `Gate-TaskAgent-ClaudeCode`, and `Gate-TaskAgent-OpenCodeGo` are separately approved with provider-specific credential source, runtime/origin/model/data terms, spend/deadline, and login/rotation/revocation/account-mutation markers; one gate cannot authorize another.
- [ ] No credential crosses Codex, Claude, Go, Jev, Decisions, browser-use, or secret-broker boundaries.
- [ ] No Discord, memory, deployment, publication, or push is included without separate approval.

## Prior-art synthesis amendments (2026-10-02)

The expanded evidence is reconciled without changing yfere's standalone identity or the exact three-provider task-agent boundary (`codex | claude-code | opencode-go`), Jev decision lane, independent project limits, yfere-owned auth, native host-runtime destination, or TypeSafe safety terms. The approved native Claude Code runtime is a narrow exception to the older blanket external-adapter rejection: it must remain unmodified and pinned, use native auth, and never expose extracted/copied/replayed OAuth; other compatibility adapters remain out of scope. ADOPT: explicit reconnection/session/execution/replay distinctions, attempt-bound approvals, uncertain-effect receipts, retained requested/serving model attribution, and bounded artifact/context views. ADAPT: alternative decision services enter only through the existing `DecisionService`; Jev remains first and OpenAI Decisions is deferred pending inspectable contracts. REJECT/DEFER: external harness adapters, plugin marketplaces, dynamic loading, broad provider scope, hosted-browser obligations, and unsupported vendor equivalence.

Browser-use is an explicit future standalone yfere capability milestone, not an MVP dependency: a provider-neutral contract, pinned out-of-process adapter, grant/approval/receipt semantics, and fake → hermetic → controlled-local → separately authorized live test gates. Browser-use's internal agent loop, direct Python embedding, stock MCP boundary, cloud services, profiles, and upstream telemetry remain out of scope unless separately approved. Add these Phase 9 checklist items before browser implementation: source/package/runtime/browser pin and license review; grant/action/receipt acceptance; profile/artifact/origin/approval/cleanup tests; and separate terms/data/spend approval for hosted services or telemetry.

Remaining decisions are the TypeSafe account data-handling/ZDR choice and future browser capability decisions. The approved host acceptance matrix and bounded global retention caps/schedules are settled in the normative contract; they are not unresolved recommendations. Ryan has settled the Phase 9 direction: isolated reviewed apply is default with explicit dangerous Auto apply-back; cancel/reap is default with separately bounded continuation; approval is single-operation or session-only closed blanket scope; structured telemetry is default and raw content opt-in. Browser transport, binary policy, secret entry, artifact retention, and sidecars remain future choices.

## Explicit Ryan-owned Phase 9/Gate C decisions

These decisions are intentionally named, with the dossier's current recommendations, and remain owned by Ryan:

1. Workspace/apply-back — Ryan settled isolated changes with reviewed apply-back as default and an explicitly dangerous Auto apply-back that may skip only apply approval; it must not widen any grant. The approved host matrix affects Gate C native host lanes, not Phases 1–5 or offline/mock work.
2. Detach policy — Ryan settled cancel/reap on client loss as default. A separately selected bounded continuation must create immutable canonical `detachedAt` from the trusted observed detach/client-loss transition (exactly correlated to session/run/task attempt), carry the selected `durationMs`, and require overflow-safe exact `expiresAt = detachedAt + durationMs`; stale/future/untrusted/mismatched/unverifiable observations or deadlines fail closed. Reconnect, rebind, resume, and restart cannot rewrite or renew `detachedAt`, `durationMs`, or `expiresAt`; grant expiry remains no later than continuation expiry. The approved host matrix remains a Gate C lifecycle prerequisite.
3. Approval breadth — Ryan settled single-operation approval or a current-session-only, revocable, closed-envelope blanket approval. Destructive/external inclusion must be surfaced and authority cannot cross credentials, projects, providers, or sessions. Conformance remains required before Gate C effect lanes.
4. Retention — Ryan settled structured telemetry/receipts by default and raw prompts/tool output/compaction sources opt-in, with deletion making replay non-replayable. The bounded global time/size caps and exact project-artifact/run-receipt deletion schedules are approved defaults in the normative contract and affect Gate C artifact/receipt lanes.

The settled mode/grant/session policy does not block Gate C. The approved host-acceptance matrix independently gates affected native host-execution/lifecycle lanes; approved bounded retention caps/schedules independently gate each affected artifact/receipt lane. Neither blocks Phases 1–5, offline selector/schema/persistence/replay, or mocked Jev contract work.

### Phase 9 conformance scenarios

The authorization checklist must cover default isolated reviewed apply; dangerous Auto without grant widening; default disconnect cancel/reap; trusted transition-derived immutable `detachedAt`, selected `durationMs`, overflow-safe exact `expiresAt = detachedAt + durationMs`, grant-deadline ordering, clock/deadline/event-correlation failure, and explicit duration/deadline plus detach-event mismatch negative fixtures at initial detach, reconnect, rebind, resume, and restart (with no reset/reconnect/rebind/resume/restart non-renewal); single-operation approval; session blanket creation, revocation, expiry, and session isolation; structured telemetry by default; raw content disabled/redacted by default; raw-content opt-in; and deletion producing an honest non-replayable replay result.
