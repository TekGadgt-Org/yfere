# yfere Implementation Plan

> **Planning boundary:** yfere is a new standalone agent harness. Phases 1–5 and hermetic/mock work are authorized only after Ryan approves the prototype scope; they require no Jev credentials and must not make network calls. The initial task-agent registry is exactly Codex, native Claude Code, and OpenCode Go; all three adapters have independent provider-specific live gates. The narrow Claude exception is the unmodified pinned native runtime with native auth; yfere never extracts, copies, or replays Claude OAuth. Jev remains decision-only. Use durable Kanban tasks with independent review rather than implementing directly from this document.

**Goal:** Build yfere, a standalone evidence-driven multi-model agent harness. Its first implementation slice determines personas first, then resolves each selected persona’s model and skills, while keeping permissions, budgets, validation, execution, and telemetry deterministic and inspectable; the selector is not a separate product awaiting attachment to another harness.

Architecture: Build a standalone yfere harness in slices. Yfere owns its product boundaries and execution choices. The first deliverable is a fixture-driven selector and evaluation core with replaceable internal decision providers; Jev is one decision service, not the control plane. Its deterministic core is offline-capable for catalog/schema/policy tests, recorded replay, synthetic provider fixtures, and baseline evaluation, but it performs no fresh model execution in that path. Native yfere selection and future worker execution use independent transports and credentials: TypeSafe requires separately configured `TYPESAFE_API_KEY` plus explicit live authorization; the initial Codex, Claude Code, and OpenCode Go adapters each have separate provider gates, credentials, origins, runtime pins/data terms, and mutation approvals. The destination is the complete runnable yfere harness, with module-level separation between selection and execution.

**Tech Stack:** TypeScript on Node.js 20+, pinned pnpm, strict TypeScript, Zod for runtime contracts, Vitest for unit/contract tests, SQLite for run/decision/outcome records, JSON/YAML configuration, and `@typesafe-ai/sdk` behind a narrow internal provider transport boundary. Exact dependency versions are chosen and locked during bootstrap.

---

## 1. Planning status

This document is an implementation plan, not an implementation. No package, runtime, API integration, provider call, bot, or deployment has been created.

Source material reviewed:

- `/srv/obsidian/vault/Research/Adaptive Multi-Model Agent Harness/00 - Index.md`
- Technical report, Jev review, system comparisons, experiment gates, two-stage clarification, and MVP telemetry notes in that folder
- The TypeSafe AI skill at `typesafe-ai/skills`
- Current TypeSafe documentation index, System One concepts, API, confidence, JavaScript SDK, Choice, fan-out, and skill-suggestion material

The research supports a bounded selector/evaluation prototype. It does **not** yet support building a full Discord-facing harness or claiming that Jev improves task outcomes.

## 2. Orchestrator-owned MVP decisions

These defaults make the first implementation testable without pretending unresolved hypotheses are settled:

1. **Standalone yfere product.** Build the selector/evaluation core as the first slice inside yfere, the new standalone harness. The product boundary is settled as yfere-native construction.
2. **Two dependent selection stages.** Stage 1 ranks personas. Stage 2 runs only for the selected personas and resolves any fields not explicitly overridden.
3. **Project-scoped roster policy.** Each project configures `max_agents`; the MVP default is `max_agents: 3` with supported range `1..4`. The normal policy attempts to fill all 3, while no-match/insufficient eligibility never backfills; a separately named admission policy must define whether fewer agents are allowed or the run abstains. This is not a universal limit. The selected distribution and rejected candidates are retained.
4. **Field-wise overrides.** A pinned model bypasses model selection. Pinned skills bypass skill selection. Both pinned means no stage-two decision for that persona. Overrides still pass deterministic authorization and compatibility checks.
5. **Skill semantics are explicit.** An omitted or `auto` skills field means required plus default skills and at most one dynamic skill. An explicit array, including `[]`, is the exact final set, may omit defaults, and must include every required skill; `[]` is invalid when required skills exist. Invalid, unavailable, or unauthorized pins fail closed. Start with at most one dynamic skill per persona.
6. **Closed catalogs only.** Jev and baseline selectors may select only stable IDs from versioned snapshots. They never invent personas, models, skills, paths, capabilities, or permissions.
7. **Code owns feasibility.** Availability, authorization, tool requirements, context limits, budgets, conflicts, workspace ownership, reviewer independence, and team-size bounds are enforced before and after semantic decisions.
8. **Freeze per task attempt.** The resolved assignment is immutable for one attempt. Permit at most one explicit replan after a typed infeasibility/provider failure; never loop implicitly.
9. **No confidence-as-permission.** Confidence may route to fallback or review but cannot authorize an action.
10. **Telemetry from the first executable slice.** Every decision records inputs by snapshot reference, offered/selected IDs, distributions, policy adjustments, latency, usage, errors, overrides, and downstream outcome references. TypeSafe round and exact input data classes are inspectable in redacted telemetry/config.
11. **Hermetic core, three initial task-agent providers, independent live transports.** Fixtures, recorded responses, deterministic policy, and baseline evaluation must run without credentials, network, or fresh model execution. Yfere owns a small statically registered `TaskAgentProvider` registry containing exactly Codex, Claude Code, and OpenCode Go; provider-specific semantics remain behind the common lifecycle/evidence contract, with no dynamic plugins or marketplace. Codex uses yfere-owned browser OAuth and direct Responses; Claude uses an unmodified pinned native Claude Code runtime with native auth state; OpenCode Go uses an independent API key and direct protocol-specific Go endpoints. TypeSafe/Jev remains the separate decision service for persona/model/skill determination, and OpenAI Decisions remains deferred. `max_agents: 3` is agent cardinality, not provider slots. Live provider gates are independent; no credential enters prompts, catalogs, decision state, SQLite, telemetry, fixtures, receipts, or artifacts. Contracts, fakes, and preflight mocks do not wait for credential provisioning.

Current public TypeSafe materials state that Jev is not trained on customer requests or responses, that zero data retention (ZDR) is offered to enterprise customers, and that the DPA retains Customer Personal Data for as long as necessary for the processing purpose and applicable law rather than for a fixed universal period. Those public statements do not establish this account’s plan, configured request/log retention, deletion route, applicable subprocessors/transfers, or ZDR entitlement; before live use, verify the actual account terms and decide whether ordinary account handling is acceptable or ZDR is required.
12. **No memory or Discord in the selector prototype.** Define interfaces and event boundaries only. Durable memory policy, Discord lifecycle, real task-agent execution, and automatic thew updates remain later gates.
13. **No online learning in the MVP.** Thews are static, versioned evidence. Evaluation can recommend changes but cannot mutate routing evidence automatically.
14. **No publication or deployment.** Repository creation, pushes, bot setup, secrets, and external service changes require separate approval.

### Explicit Ryan-owned Phase 9/Gate C decisions

Ryan settled the Phase 9 direction: all changes begin isolated, reviewed apply-back is default, and explicit dangerous Auto may skip only apply approval without widening grants; cancel/reap is default on client loss, with separately selected closed, digest-bound bounded continuation; approval supports single-operation or current-session closed blanket scope bound to non-secret credential/authorization/connection identity; and structured telemetry/receipts are default while raw prompts, tool output, and compaction sources are opt-in and deletion makes replay non-replayable. Continuation requires bounded duration/resources, a detached-operation allowlist, durable stop, reconnect/receipt behavior, and expiry cleanup; receipts have typed terminal outcomes plus explicit destructive/external scope. Remaining retention caps/schedules and unapproved host-acceptance details affect only their Gate C lanes.

## 3. Proposed repository shape

```text
yfere/
├── .hermes/plans/
│   └── 2026-09-18_053427-yfere-implementation.md
├── docs/
│   ├── architecture.md
│   ├── decision-contracts.md
│   ├── evaluation-protocol.md
│   └── threat-model.md
├── examples/
│   ├── catalogs/
│   │   ├── personas.yaml
│   │   ├── models.yaml
│   │   ├── skills.yaml
│   │   └── thews.yaml
│   ├── evaluation.yaml       # prospective user config; schema defined before bootstrap
│   └── tasks/
├── src/
│   ├── cli/
│   │   ├── select.ts
│   │   ├── replay.ts
│   │   └── evaluate.ts
│   ├── config/
│   │   ├── load.ts
│   │   └── schemas.ts
│   ├── domain/
│   │   ├── task.ts
│   │   ├── persona.ts
│   │   ├── model-endpoint.ts
│   │   ├── skill.ts
│   │   ├── thew.ts
│   │   ├── assignment.ts
│   │   └── events.ts
│   ├── decisions/
│   │   ├── decision-service.ts
│   │   ├── recorded-decision-service.ts
│   │   ├── deterministic-baseline.ts
│   │   ├── structured-output-baseline.ts
│   │   └── typesafe-jev.ts
│   ├── selection/
│   │   ├── eligibility.ts
│   │   ├── persona-stage.ts
│   │   ├── model-skill-stage.ts
│   │   ├── reconcile.ts
│   │   └── pipeline.ts
│   ├── policy/
│   │   ├── budgets.ts
│   │   ├── permissions.ts
│   │   ├── compatibility.ts
│   │   └── fallback.ts
│   ├── telemetry/
│   │   ├── store.ts
│   │   ├── sqlite-store.ts
│   │   ├── redact.ts
│   │   └── report.ts
│   └── evaluation/
│       ├── fixtures.ts
│       ├── arms.ts
│       ├── outcomes.ts
│       └── compare.ts
├── tests/
│   ├── unit/
│   ├── contract/
│   ├── integration/
│   ├── fixtures/
│   └── live/
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
└── vitest.config.ts
```

The exact paths can change during specification review, but module ownership should remain explicit: domain contracts, semantic decision transport, deterministic policy, telemetry, and native execution must not collapse into one router function. Before bootstrap, define `examples/evaluation.yaml` with catalog refs, policy version, project `max_agents: 3`, separate dynamic-skill/model/fallback/retry/question limits, arm selection, fixture families, report destination, and network/live flags; define the effective-config and JSON evaluation-report shapes in the public CLI contract.

## 4. Core contracts to specify before coding

### 4.1 Catalog records

- `PersonaDefinition`
  - stable ID and version
  - concise role and negative-selection examples
  - required capabilities and output contract
  - required/default/eligible skill IDs
  - optional model override and skill override
  - workspace/artifact ownership
  - review-independence requirements
- `ModelEndpoint`
  - stable endpoint ID, provider, exact model/version when available
  - transport and availability state
  - supported modalities/features/tools/context
  - authorization/data-handling labels
  - cost and operational evidence references
- `SkillDefinition`
  - stable installed ID, version, content hash, trust status
  - positive/negative selection description
  - prerequisites, side-effect class, conflicts, and instruction-token estimate
- `ThewEvidence`
  - endpoint/persona/skill/task-family identity
  - metric and rubric versions, sample count, uncertainty, provenance, timestamp
  - explicit unknown values rather than numeric zeroes

### 4.2 Decision service

The interface accepts a versioned state plus typed questions and returns validated answers and provider metadata. The caller, not the internal provider transport boundary, decides how answers affect policy.

Required implementations:

- `RecordedDecisionService` for deterministic fixtures/replay
- `DeterministicBaseline` for rule-only comparisons
- `StructuredOutputBaseline` for a conventional LLM comparison, initially fixture-backed
- `TypeSafeJevDecisionService` using current SDK/API contracts, added without exposing credentials to state or telemetry

### 4.3 Selection pipeline

1. Load and validate immutable catalog snapshots.
2. Apply hard eligibility and authorization filters.
3. Build concise stage-one state from the task and eligible persona metadata.
4. Request one persona `Choice`; validate the complete returned distribution.
5. Rank deterministically and take configured top K, with stable tie-breaking.
6. Apply mandatory personas and explicit overrides according to policy.
7. Build stage-two questions only for unresolved fields of selected personas.
8. Run stage 2 in order: issue model questions (2a) for unresolved selected personas, deterministically validate and freeze each model, then issue model-conditioned skill questions (2b). Batching is allowed within one substage only; never batch 2a and 2b together.
9. Validate each selected item itself, not an aggregate fit from another candidate.
10. Reconcile shared budget, capability, conflict, and artifact-ownership constraints.
11. Emit either a frozen `ResolvedAssignment` or a typed abstention/failure requiring fallback/review.
12. Persist a redacted decision trace and snapshot references.

### 4.4 Telemetry model

Use linked records rather than one opaque trace blob:

- `runs`
- `catalog_snapshots`
- `decisions`
- `decision_candidates`
- `assignments`
- `worker_attempts` (interface initially; real execution later)
- `outcomes`
- `artifacts`

Raw private prompts, credentials, complete Discord messages, and memory contents are not default telemetry. Hashes identify retained snapshots but do not make sensitive content safe.

## 5. Phased implementation plan

### Phase 0: Specification and decision closure

**Deliverables**

- `docs/architecture.md`
- `docs/decision-contracts.md`
- `docs/evaluation-protocol.md`
- `docs/threat-model.md`
- Updated implementation plan incorporating independent product and maintainability review

**Acceptance**

- Every domain object has one owner and a runtime-validation boundary.
- All user-visible and provider-facing data flows are diagrammed.
- The deterministic/probabilistic boundary is explicit.
- Credential, private-context, and telemetry retention boundaries are explicit.
- Baseline arms and go/no-go measures are agreed before live testing.

### Phase 1: Hermetic project bootstrap

**Files**

- Create `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `vitest.config.ts`
- Create source/test directory skeleton only as needed by the first tests

**Steps**

1. Pin Node and pnpm expectations.
2. Enable strict TypeScript and deterministic test settings.
3. Add lint/typecheck/test scripts.
4. Add a no-network default test command.
5. Verify clean install, typecheck, and one intentional red/green smoke test.
6. Commit only after all bootstrap commands pass.

### Phase 2: Domain schemas and catalog loading (TDD)

**Tests first**

- duplicate IDs and invalid references are rejected
- unknown is distinct from zero/missing
- explicit empty skills differ from auto skills
- override references must exist and remain authorized
- hashes and versions participate in snapshot identity
- catalog order does not change normalized output

**Implementation**

- Add strict Zod schemas and inferred TypeScript types.
- Normalize catalogs into immutable maps.
- Produce deterministic snapshot IDs from canonical serialized content.
- Return path-aware validation errors with no secret values.

### Phase 3: Decision-service abstraction and replay fixtures (TDD)

**Tests first**

- every requested question receives exactly one typed answer
- unknown question IDs, missing answers, invalid probabilities, and malformed distributions fail closed
- replay binds to exact state/question/catalog versions
- provider metadata can be absent without being treated as zero
- cancellation and one shared deadline propagate through the interface

**Implementation**

- Define provider-neutral question/answer types limited to MVP needs.
- Build `RecordedDecisionService` from retained fixture records.
- Add request/response redaction and typed error taxonomy.
- The internal provider transport boundary is the sole owner of physical provider attempts and backoff. Every attempt and backoff consumes the one logical-call `deadlineMs` and `retryBudget`; cancellation/deadline wins over retry, and no layer may retry outside that budget.

### Phase 4: Deterministic eligibility and policy engine (TDD)

**Tests first**

- unavailable/unauthorized endpoints are never offered
- missing required skill or tool fails the persona before semantic selection
- optional skills cannot grant tools or permissions
- shared budget rejects individually valid but jointly infeasible teams
- reviewer independence and artifact ownership conflicts are enforced
- no candidate remains produces a typed abstention, never a bypass

**Implementation**

- Add pure eligibility, permissions, compatibility, and budget functions.
- Return decisions with machine-readable exclusion reasons.
- Keep arithmetic and exact lookups out of every semantic provider transport.

### Phase 5: Two-stage selector (TDD)

**Tests first**

- stage two receives only actual stage-one selections
- top-K sorting is stable across source catalog order
- `k` outside `1..4` is rejected
- pinned fields suppress only their corresponding questions
- both fields pinned skip stage two for that persona
- explicit skill arrays are exact (`[]` is invalid when required skills exist); omitted/`auto` adds required/default plus at most one compatible dynamic skill
- pinned bundles are validated before 2a; valid bundles constrain model candidates, invalid/unavailable/unauthorized bundles and no-compatible-model are typed failures
- dynamic skill choices follow a frozen model; no-match means no addition and non-offered/incompatible IDs fail closed
- winner-specific relevance/compatibility is checked
- one bounded replan occurs only for configured typed failures
- assignments freeze as one project-policy `max_agents: 3` roster aggregate for a task attempt; repeated writes are idempotent and one replan creates generation 1 with parent lineage

**Implementation**

- Build question factories with complete meaning in instructions/criteria; do not rely on question IDs.
- Implement stage-one ranking, ordered stage 2a model selection/freeze, substage-local batching only, stage 2b model-conditioned skill selection, and deterministic reconciliation.
- Persist rejected candidates, distributions, overrides, and policy adjustments.

### Phase 6: TypeSafe Jev provider transport and contract tests

**Prerequisite:** Ryan separately authorizes the live TypeSafe lane and confirms the TypeSafe request-data handling terms: request/log retention duration or criteria, deletion route, training exclusion, applicable subprocessors/transfer terms, and whether ordinary account handling is acceptable or enterprise ZDR is required. The TypeSafe key is stored only in yfere's app-owned secret store until explicit removal/logout, replacement or rotation, provider revocation/expiry, or uninstall with credential removal; it is never written to fixtures, source, telemetry, config snapshots, prompts, SQLite decision records, or artifacts. The TypeSafe provider transport and mocked contract tests require no real key. Codex, Claude Code, and OpenCode Go execution lanes are separate named gates with independent credential sources, runtime/origin/model/data-term/spend/deadline approvals, and separately approved login/rotation/revocation/account mutations; none is a Jev prerequisite.

**Hermetic/mock transport tests**

- exact SDK request shape from mocked transport
- pinned model versus alias is explicit configuration
- 401, 422, 429, 529, timeout, malformed body, and partial-answer paths
- full distribution validation and question correlation
- retry count remains inside one total deadline/retry budget

**Opt-in live tests**

- mixed questions in one request
- stage-one and stage-two request shapes
- round 1 prompt allowlist and round 2 selected-persona/catalog-metadata allowlist, with inspectable round/data-class telemetry
- model/version and usage metadata capture
- client-observed latency distinct from provider-reported evaluation time
- none/ambiguous cases and candidate-order perturbations

**Gate:** The first implementation slice remains the hermetic selector and policy path. Live TypeSafe selection and the Codex, Claude Code, and OpenCode Go adapters are independently authorized lanes; a full workflow requires each selected provider's own gate and reports preflight status separately. No API key or native runtime means fixture/baseline development continues; it is not a reason to weaken contracts.

### Phase 7: Telemetry and deterministic replay (TDD)

**Tests first**

- one provider call is recorded once even when it answers many questions
- overrides are represented as closed bypass records, not model decisions
- replay reproduces assignment and rejection reasons without a network call and returns `NON_REPLAYABLE` for changed state/question/response/provider-contract provenance
- replay is read-only against production run/decision/outcome tables
- project `max_agents: 3` roster persistence is idempotent; one replan creates generation 1 with explicit parent lineage
- stable roster/member ordering and IDs survive catalog insertion-order changes
- redaction excludes configured sensitive fields
- deletion/retention policy applies to retained snapshots and payloads, not just indexes
- concurrency preserves parent-child decision identity

**Implementation**

- Add SQLite migrations and repository interfaces.
- Store structured events and references with transactional writes.
- Add JSON report export for evaluation without a dashboard.

### Phase 8: Evaluation harness and baselines

**Arms**

1. Fixed capable agent/team
2. Deterministic rules plus measured/static thews
3. Conventional structured-output selector
4. Jev selector
5. Hybrid deterministic policy plus Jev semantic judgments

**Fixture families**

- simple single-role tasks where no extra workers should launch
- frontend/accessibility, backend/security, research/writing, and mixed tasks
- multiple valid personas, no good persona, ties, irrelevant catalogs
- model/skill incompatibility, over-budget teams, injected metadata, unavailable providers
- override and partial-override cases

**Measures**

- assignment validity
- task success under a predefined rubric
- missed and redundant responsibilities
- total cost per accepted task
- end-to-end latency and tails
- total tokens and peak per-worker context
- selection stability and abstention coverage
- human correction/rework

**Gate:** Complexity advances only if the hybrid materially improves quality or cost/latency at an agreed quality floor. A simpler baseline winning is a valid outcome.

### Phase 9: Native yfere execution runtime

Do this only after Phases 1–8 produce a stable selector and useful evidence. This phase constructs and exercises yfere’s native execution runtime against controlled local fixture projects and synthetic/approved provider paths.

Implement and verify yfere-owned:

- per-task model and skill injection
- isolated context and least-privilege tool grants
- durable run/cancel/restart semantics for yfere-owned work, including honest uncertain-side-effect receipts
- trace completeness and redaction
- artifact ownership and reviewer independence
- selected local project workspace, isolated changes with reviewed apply-back by default or explicitly dangerous non-widening Auto apply-back, yfere-owned filesystem/shell/git/network tool grants, owned child-process lifecycle and cancellation/reaping, independently selected digest-bound bounded continuation with explicit limits/allowlist/stop/reconnect/expiry semantics, artifacts in the project workspace or yfere run store, run receipts and retention, and restart semantics
- honest reporting of uncertain external side effects; single-operation or current-session closed blanket approval bound to non-secret credential/authorization/connection identity, invalidated on changes/revocation, with destructive/external inclusion surfaced; typed terminal receipts; structured telemetry/receipts by default and raw content opt-in; detailed host-execution policy is owned by the Phase 9 threat model
- configuration readability and authorization boundaries

Provider/transport boundaries remain replaceable internal yfere interfaces. Selection/domain code must not import execution internals. Gate C constructs the common execution core and all three initial adapters (Codex, Claude Code, OpenCode Go), first with fakes/controlled projects and then separately authorized per-provider live acceptance. Host execution requires the separately approved threat model and authorization gate.

### Deferred phases

- Discord ingress/delivery lifecycle
- durable memory with provenance/revisions/retention
- automatic thew updates or online learning
- dashboards
- remote skill discovery/installation
- recursive delegation
- deployment/publication

The three initial task-agent adapters are not deferred; only their live credential provisioning and live acceptance are separately gated. Each deferred phase requires its own threat model, acceptance matrix, and authorization.

## 6. Validation commands expected after bootstrap

Exact commands are finalized with the package manifest, but the implementation should provide:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm test:contract
pnpm test:integration
pnpm test:live:typesafe   # explicit opt-in; skipped without credentials
pnpm evaluate --config examples/evaluation.yaml
pnpm replay --run <run-id>
```

CI should execute the real supported configuration, use only synthetic credentials/fixtures by default, and keep live provider tests in an explicitly authorized lane. Dependency installation is the sole narrow exception: an explicit package-manager-scoped registry request may fetch the pinned pnpm bootstrap/lockfile inputs and support license audit; it does not authorize arbitrary network, runtime/provider egress, login/auth, telemetry, or live tests. CI and yfere runtime defaults remain network-denied, and every dependency fetch is recorded.

## 7. Review gates

1. **Product review before implementation:** Does the prototype answer the actual yfere hypothesis without turning into a general observability or agent-platform project?
2. **Maintainability review before implementation:** Are domain ownership, internal provider transport boundaries, schemas, and deferred scope clear enough to avoid a monolithic router?
3. **Security review before any live credential or external context:** Verify secret loading, provider egress, logging/redaction, catalog trust, and permission boundaries.
4. **QA review at each executable milestone:** Map every requirement to retained tests and distinguish fixture, live-contract, and end-to-end evidence.
5. **Human gate:** Ryan approves API-key setup, external calls, repository creation/push, Discord bot work, deployment, and publication separately.

## 8. Risks and mitigations

- **Top-K Choice is not independent persona applicability.** Treat it as an experiment arm, retain the distribution, compare against per-persona judgments and fixed-team baselines later.
- **Selection quality can be confused with worker quality.** Link decisions to downstream outcomes and run plausible alternatives on evaluation tasks.
- **Jev typed output can still be semantically wrong.** Revalidate IDs, relations, winner-specific fit, and all hard constraints.
- **Catalog text is an injection surface.** Only reviewed installed metadata enters decision state; attachment never grants capability.
- **Telemetry can become a privacy leak.** Store sanitized metadata and scoped snapshots, not raw chat/memory by default.
- **Provider retry multiplication can destroy budgets.** One immutable request deadline and shared retry budget wrap SDK behavior.
- **Native runtime scope can expand unsafely.** Keep selection and execution as separate yfere modules, reuse only explicitly inspected reference patterns, and gate host execution with its own threat model, authorization, and receipts.
- **Static thews can become stale.** Version evidence, preserve unknowns, and revalidate after model/persona/skill/rubric changes.
- **Evaluation can self-reinforce preferred routes.** Use held-out task families, route blinding, challenger runs, and preserved rejected candidates.

## 9. Settled implementation authorization and separately gated live evaluation

The following policy directions and offline/controlled-fixture implementation authorization are settled, not pending Ryan decisions. TypeSafe ordinary-handling classification, the accepted host matrix, and the bounded global retention policy are normative in `docs/decision-contracts.md`. Live Jev/provider calls, credentials, unrestricted network, external effects, deployment, and publication remain separately unapproved gates and must not be inferred from this implementation authorization.

1. **TypeSafe request-data handling terms.** Ordinary handling is approved only for synthetic, public, or explicitly reviewed/minimized inputs after excluding source code, diffs, secrets, credentials, conversations, customer/third-party data, private paths/repository identifiers, raw output, and raw artifacts; unknown classification fails closed. Private/proprietary/sensitive content requires separately verified written ZDR-equivalent terms. This is separate from the yfere API-key lifecycle and does not authorize live calls; API-key availability is not authorization.
2. **Phase 9 native-runtime parameters.** Ryan approved isolated reviewed apply by default (plus explicit non-widening Auto), cancel/reap by default (plus bounded digest-bound continuation), session-scoped closed approvals, and structured-default/raw-opt-in observability. Native/lifecycle release blocking is macOS arm64 and Linux x64; Linux arm64 and macOS x64 are required build/install/schema/replay/smoke hosts, with fail-closed unsupported hosts and the listed boundary fixtures. The global bounded retention policy is approved as specified in `docs/decision-contracts.md`. Controlled native work is authorized only in disposable fixtures; live providers, external effects, and unrestricted network remain separately gated.

Approved defaults are recorded in the evaluation protocol: accepted-task output quality; at least 95% of the fixed capable baseline with zero additional critical failures; balanced frontend/accessibility, backend/security, research/writing, and mixed task families; $10 total TypeSafe/Jev spend ceiling; selector p95 <=2 seconds; and, if quality does not improve but remains within the floor, at least 20% lower total accepted-task cost or context. These are planning gates, not measured outcomes.

## 10. Definition of “ready to implement”

Planning is ready when:

- architecture, decision contracts, evaluation protocol, and threat model are internally consistent;
- product and maintainability reviewers have inspected the plan;
- their findings are resolved or explicitly accepted;
- the Phase 1–8 scope and deferred list are frozen;
- the first evaluation objective, quality floor/thresholds, task-family fixture set, and spend/latency priority are chosen by Ryan;
- no implementation card can accidentally perform live provider calls, create credentials, deploy, push, or publish.

## Prior-art synthesis amendments (2026-10-02)

Accepted deltas are limited to failure/evidence semantics: separate transport reconnection, session reconstruction, execution recovery, and replay; active-attempt approval binding; uncertain external-effect receipts; requested/serving model attribution; and bounded artifact/context views. The existing phases and standalone yfere boundaries remain authoritative. The initial task-agent registry is exactly Codex, the unmodified pinned native Claude Code subprocess, and OpenCode Go; Jev remains decision-only, and each provider follows the sole normative `task-agent-provider/v1` contract. Alternative decision services use the existing seam only; OpenAI Decisions remains deferred until public, versioned contracts and approved comparisons exist. No endpoint or schema is invented.

Browser-use is a future Phase 9 capability milestone, not selector MVP or a compatibility target. Plan a yfere-owned provider-neutral contract and pinned out-of-process adapter with fake/hermetic, controlled-local, and separately authorized live lanes. Yfere owns grants, approvals, origins, artifacts, cancellation/reaping, redaction, and uncertain receipts; browser-use's autonomous loop, Python embedding, stock MCP boundary, cloud services, and upstream telemetry are rejected or deferred. Add contract/error/cleanup/isolation tests before any browser live gate.

Provenance: `docs/prior-art-dossier-2026-10-02.md`; `docs/decision-services-comparison-2026-10-02.md`; `docs/browser-use-support-boundary-2026-10-02.md`.
