# yfere prior-art dossier — 2026-10-02

Prepared by Ryan's research agent; not yet human-reviewed. Research and recommendations only. This document does not amend the effective planning contracts or authorize implementation, credentials, provider calls, deployment, publication, or dependencies.

## Executive recommendation

Keep yfere a standalone harness with its own native runtime, exactly three initial task-agent providers (Codex, Claude Code, and OpenCode Go), separate Jev decision transport, ordered persona → model freeze → model-conditioned skill selection, immutable rosters, and independent resource limits. The useful prior art is failure semantics and evidence handling—not another product's identity, credential store, deployment model, or marketplace.

The highest-value proposals are:

1. Distinguish transport reconnection, session reconstruction, execution recovery, and deterministic decision replay. None implies the others.
2. Define a future native execution receipt that records intent, ownership, observed completion, and uncertain effects; never rerun an interrupted mutation merely because its answer is missing.
3. Bind approvals to an active operation and attempt, reject duplicate/stale answers, and make cancellation win while approval is pending.
4. Preserve requested versus serving model attribution, including context limits and costs, without mutating a frozen yfere assignment.
5. Store large outputs as scoped, retained artifacts and expose bounded views; preserve the evidence needed to verify summaries and worker claims.
6. Use paired task-level evaluation and include coordinator, worker, failed-attempt, compaction, and decision costs before claiming savings.

### Concise recommendation matrix

Classifications are recommendations: **ADOPT** means preserve/add the principle; **ADAPT** means use an independently specified yfere variant; **REJECT** means incompatible with settled boundaries; **DEFER** means potentially useful after a named gate. They are not implementation authorization. Detailed entries below give tradeoffs and licensing.

| Pattern | Classification | Best evidence | Exact yfere destination |
|---|---|---|---|
| Separate live persistence, restore, screen history, and replay | ADOPT | Herdr state documentation and handoff tests [19][20] | `decision-contracts.md` / Provider and replay contracts; Phase 9 / Gate C |
| Hot PTY/server handoff | DEFER | Herdr handoff implementation [18] | Post-Gate-C operator runtime, not selector MVP |
| Run-identity-aware reconnect and cancellation | ADAPT | Odysseus detached runs and recovery tests [26][30] | Phase 9 worker-attempt lifecycle and receipts |
| Explicit approval scope and immutable first answer | ADAPT | Odysseus approval tests; Goose coordinator [28][51] | `threat-model.md`; Phase 9 tool policy |
| Crash recovery classified by side-effect replay safety | ADAPT | pi durable tool implementation/recovery tests [34][35] | Phase 9 uncertain-effect receipts; never decision replay |
| Transcript/context projection separated from event history | ADAPT | pi session format and agent-loop tests [38][37] | Future context policy; retain current snapshot hashes |
| Serving-model attribution updates all derived metrics | ADOPT | oh-my-pi executor regression test [43] | `Endpoint`, `DecisionResponse`, `fallback.applied`; future worker attempts |
| Isolation capture before apply-back; preserve failed-merge evidence | ADAPT | oh-my-pi isolation runner [44] | Phase 9 workspace/artifact ownership |
| One policy path for normal and evaluation workers | ADOPT | oh-my-pi structured-subagent implementation/tests [46][47] | `selection/pipeline.ts` ownership now; future executor seam |
| Bounded outputs backed by artifacts | ADAPT | Goose large-response handler and tests [52] | `Task.contextPolicy`, `InputRef`, artifacts; Phase 9 |
| Shielded but bounded child shutdown, terminate/kill/reap | ADAPT | Claude Python SDK transport and tests [61][62] | Phase 9 owned-process contract and Gate C fixtures |
| Flat supervisor/worker topology before autonomous teams | ADOPT / DEFER teams | Claude subagent/team docs [7][11] | Existing roster limit; recursive delegation remains deferred |
| Jev routing as one component, not an authority | ADAPT | Halv product facts and published run [12][13] | Existing `DecisionService` only; no product adapter |
| Combined-workflow benchmark used as selector proof | REJECT | Halv interim methodology [66] | `evaluation-protocol.md`; `ThewEvidence.applicability` |
| External harness dependency, credential reuse, marketplace | REJECT | Product differences discussed below | Architecture / Scope and invariants; Provider boundaries |

## Method, temporal scope, and evidence limits

Research retrieved October 2, 2026. Repository selection used the default-branch commit API with `until=2026-10-02T20:46:01Z`; all code citations below are pinned to full SHAs rather than moving branches. Website/docs observations were retrieved during the same research session and may not be historical snapshots at that exact second. No claim is made about an October 2 end-of-day release. The source manifest records local source paths and SHA-256 hashes; the Sources section is generated from the citation ledger.

The supplied homepages were examined first. Important provenance correction: `odysseusai.dev` describes itself as an independent guide, explicitly unaffiliated with the maintainers. It is used only to establish that boundary, not as primary evidence for implementation; the dossier uses the linked `odysseus-dev/odysseus` repository instead.[2][25] The supplied pi-mono route led to the current `earendil-works/pi` repository, also identified in pi's own session documentation.[38]

Git clone attempts were rejected by the execution environment; public GitHub API metadata and SHA-addressed codeload archives were the legitimate fallback. Downloaded source was read, not installed or imported. Tests below were **inspected, not executed**. Test existence is evidence of intended behavior and regression coverage, not proof that upstream CI or yfere passes. No live models, credentials, agents, desktop apps, or upstream test suites were run.

| Inspected repository | Pinned commit | Evidence boundary |
|---|---|---|
| `herdrdev/herdr` | `65e35a3858b4a9f6cb9bdf712ffb16c474363846` | Runtime implementation, integration tests, versioned 0.9.3 docs [18][19][20] |
| `odysseus-dev/odysseus` | `2992bf6d368a11472323e47d3bfed91e79cefc6b` | Python run/approval/context code and tests [26][27][28][29][30] |
| `earendil-works/pi` | `69f0be6f0a6ca1bf66a2a9cf59c821b632e6bca1` | Agent loop, durable harness, recovery tests, session format [34][35][36][37][38] |
| `can1357/oh-my-pi` | `cf2d9c1a97139eb2f3efb9fe4b3e343a64cad00e` | Subagent executor, fallback test, isolation, output and policy modules [42][43][44][45][46][47] |
| `aaif-goose/goose` | `591edd47cf2cfea4957d720c607cf2a4def8673d` | Approval coordinator/tests, output handler/tests, provider and telemetry code [51][52][56][58] |
| `anthropics/claude-agent-sdk-python` | `68db221ebe29c1d82b0001ae80fa71e10d57d80a` | Open Python transport wrapper and tests, not proprietary runtime internals [61][62] |
| `anthropics/claude-code` | `1c229fcd1e1e4e452e29a8f116b45fe4cfe2c528` | Public changelog/license; runtime behavior supplemented by official docs [64][65] |
| Halv | No public runtime source inspected | Product claims, public selected-run JSON, September 30 technical report, terms/privacy [12][13][14][15][66] |

### What “affects yfere” means

The authoritative local basis is `docs/architecture.md`, `docs/decision-contracts.md`, `docs/evaluation-protocol.md`, `docs/threat-model.md`, `docs/planning-readiness.md`, and `.hermes/plans/2026-09-18_053427-yfere-implementation.md`. `docs/research-gap-audit.md` supplies historical research context, not a replacement for those six effective documents. In particular:

- Architecture / **Proposed repository/module ownership**, **Provider and TypeSafe transport boundaries**, **SQLite ownership and privacy**, and **State machines** remain settled.
- Contracts / **Runtime schema outlines**, **Deterministic semantics**, **Provider and replay contracts**, and **Idempotency and resource limits** remain settled.
- Readiness / **Phase gates** keeps Phases 1–5 and hermetic/mock work separate from Gate B live Jev selection and Phase 9 / Gate C native execution.
- `Task`, `Endpoint`, `SkillDefinition`, `ThewEvidence`, `DecisionResponse`, `ResolvedAssignment`, and `TelemetryEvent` below refer to those exact existing contracts. Proposed runtime receipt fields are not already implemented schemas.

## 1. Herdr: process continuity is not semantic replay

**Observed.** Herdr's versioned state table distinguishes a running server after detach from snapshot reconstruction after restart, optional terminal-history replay, native-agent resume, and best-effort live handoff. Restart does not resurrect arbitrary old processes. Screen history is off by default because terminal output can contain sensitive material. A successful handoff still does not preserve every in-flight request, subscription, or client connection.[20]

**Implementation/test evidence.** `src/server/handoff.rs` contains replacement-server import and failed-child cleanup paths. `tests/live_handoff.rs` exercises continued pane I/O, HTTP-server survival, named-session socket preservation, and rollback after incompatible protocol or injected import failure; assertions include original child liveness and further I/O after failure.[18][19]

**H1 — ADOPT the vocabulary and invariant.** Affect contracts / Provider and replay contracts now as clarification; Phase 9 should distinguish `reattach`, `restore`, and recovery from interrupted execution. yfere decision replay must remain hash-bound, read-only, no-network, and credential-free. A restored screen or conversation is not evidence that an external operation did or did not occur. Tradeoff: more explicit operator states, but less false assurance.

**H2 — ADAPT failure-safe preservation.** Require future persistence loading to preserve unreadable/incompatible bytes before replacement, and report failed recovery without silently using a different workspace. This is motivated by Herdr's documented backup-before-overwrite and unavailable-directory behavior.[20] Affect architecture / SQLite ownership and privacy, future session storage, and Phase 9 recovery fixtures. Do not copy its file format, backup cadence, or retention counts; yfere needs its own retention approval.

**H3 — DEFER hot handoff; REJECT external-CLI hosting as yfere's architecture.** Handoff is useful when preserving already-running PTYs across upgrades; yfere's first slice has no worker processes. It adds ownership-transfer and compatibility failure modes before demonstrating value. Phase 9 should first prove cancellation/reaping and restart receipts, not implement a terminal multiplexer. Herdr's product is specifically a persistent home for coding-agent terminals, a different boundary from a native yfere executor.[1]

**License.** Root Apache-2.0; any later copied implementation requires license/notice and modification handling. Recommendation here is design inspiration, not dependency adoption.[17]

## 2. Odysseus: detached runs and scoped authority

**Observed code.** `agent_runs.py` retains ordered SSE output independently of browser subscriptions. It explicitly limits durability to the running server process. Replacement cancels the predecessor, and the new run waits for predecessor cleanup; cancellation can be bound to opaque run identity rather than whichever run currently occupies the session.[26] The fallback/reconnect test file checks resuming a detached stream instead of resubmitting the selected model, preserving requested/actual model labels, and treating terminal errors differently from recoverable transport loss. Some tests inspect source strings; others execute a mocked JavaScript environment.[30]

**O1 — ADAPT reconnect-without-resubmit.** Future Phase 9 run status should be addressable by `workerAttemptId`; a disconnected viewer must not create another worker or replay a mutation. Use durable state or declare loss explicitly—do not import the in-memory-only durability assumption. Distinguish an ended run, dropped transport, and unknown process outcome. Tradeoff: canonical state and subscriptions cost more than treating every reconnect as a fresh request.

**Approval evidence.** The approval store binds requests to owner/session/run and exact tool content. Tests distinguish task approval from chat-session approval, verify a fresh turn does not inherit task scope, and verify copying a persisted approval card into a different chat does not grant permission.[27][28]

**O2 — ADAPT scoped approvals; REJECT blanket trust from transcript appearance.** Phase 9 should bind grants to the normalized operation, selected workspace, attempt, policy version, and approved effect; persist evidence separately from the model-facing transcript. A rendered “approved” card is not authority. Do not adopt broad “remaining actions” or chat-wide grants as yfere's default: the tests show those are real product policies, not a universally safe permission model.[28] Tradeoff: narrower scope causes more prompts but prevents a broad grant from being mistaken for one action.

**Context evidence.** The compactor preserves recent material, sanitizes orphaned tool/result structure, and retains the conversation when summarization fails. It also has truncation fallbacks, including oversized tool arguments.[29]

**O3 — ADAPT protocol-valid context reduction; REJECT silent semantic repair.** Future `Task.contextPolicy` may reduce a model-facing projection, but must not alter canonical tool arguments, grant scope, or decision inputs. Overflow of required decision context remains typed `CONTEXT_LIMIT`; a summary is not an equivalent replay snapshot. Test dangling calls/results, compaction failure, and policy constraints surviving reduction. Tradeoff: abstention can be less convenient than arbitrary truncation but keeps decisions inspectable.

**License/boundary.** Root AGPL-3.0. Treat implementation reuse as a separate licensing decision, especially for distributed/network-served derivatives; this report does not authorize copying. The self-hosted workspace's deployment, login, memory, and integrations are not requirements for yfere.[24][25]

## 3. pi: small agent loop, richer durability, separate replay concepts

**Observed.** pi exposes an agent loop with context transformation and provider-message conversion; its tests explicitly cover transformation before conversion, custom message handling, and tool calls/results.[36][37] Its coding-agent session format records a JSONL tree with entry IDs/parents, selected-model changes, physical response model identity, and compaction checkpoints; this is distinct from the durable harness package.[38]

**P1 — ADAPT transcript-to-context projection, not storage replacement.** Preserve an immutable evidence history and construct a bounded provider projection. A future compaction receipt should identify source range/hashes, summary provenance, retained tool links, resulting token estimate, and any omission. Affect `Task.contextPolicy`, `TelemetryEvent.snapshotRefs`, and Phase 9 context management. Keep SQLite and exact selector canonicalization; do not replace roster persistence with a JSONL conversation tree. Tradeoff: raw history can be sensitive, so retention/deletion must still make replay honestly non-replayable.

**Durability evidence.** pi's durable harness makes tool execution its own recoverable unit. The tool implementation recognizes interrupted execution and replay policy; recovery tests reopen SQLite, retain partial output, and distinguish unsafe interrupted tools from declared replay-safe reruns.[33][34][35]

**P2 — ADAPT replay-safety classification.** A future native tool receipt should distinguish “intent recorded,” “started,” “result observed,” “failed,” and “effect uncertain.” Before permitting a retry, require deterministic policy plus a replay-safe operation or an external idempotency/reconciliation mechanism. Neither “no result” nor “model says retry” proves no effect. Affect Phase 9 / Gate C, `TypedError`, and worker-attempt/artifact relationships. Do not grant a skill the ability to declare its own irreversible action safe. Tradeoff: uncertain states require operator intervention, but avoid duplicated sends/deletes/purchases.

**P3 — REJECT importing pi durability as yfere decision replay.** Resume can execute work; yfere's specified replay cannot. No pi runtime dependency, session-format compatibility target, automatic schema migration, or foreign credential discovery is proposed. Keep the narrow yfere-owned provider interface; pi's provider/message types are reference material for transport normalization, not authorization.[39]

**License.** Root MIT. Retain notices for any later substantial copied portions; the recommendation is independent implementation, with package/transitive license review before any dependency decision.[32]

## 4. oh-my-pi: fallback attribution, isolation lifecycle, and one spawn policy

**Observed/tested intent.** The subagent executor's fallback regression constructs a primary and fallback model with different context windows. It asserts both final result identity/window and streamed progress move to the serving model, not just the initially selected model.[42][43]

**M1 — ADOPT requested/serving identity separation; ADAPT fallback to frozen assignments.** Affect `Endpoint.requestedModel/exactModel`, `DecisionResponse.requestedModel/returnedModel`, `TelemetryEvent`, and future worker attempts. Every fallback must pass current capability, authorization, context, skill-bundle, deadline, and budget checks. Do not mutate `ResolvedAssignment` inside its attempt; policy must determine whether this is an allowed physical transport identity or a new lineage/replan. Unknown actual model remains unknown. Tradeoff: more attribution records, but accurate context gauges and cost evidence.

**Isolation evidence.** `isolation-runner.ts` separates preparation, isolated execution, change capture, and optional merge/apply-back. Its failed-apply branch rescue preserves a branch when commits exist or the recovery probe is inconclusive. `output-manager.ts` seeds allocated names from existing artifacts on resume to prevent clobbering older outputs.[44][45]

**M2 — ADAPT capture-before-apply and artifact identity.** Phase 9 should return artifact handles, baseline/source hashes, change manifests, and apply status separately from a worker's narrative. Preserve failed-merge evidence and never delete the sole reachable result because a probe failed. Use caller-owned yfere IDs rather than model-generated labels as durable identity. Worktree/copy isolation separates edits, not network, credentials, or all host filesystem access; yfere still needs explicit native grants. Tradeoff: retained patches consume storage and require cleanup policy.

**Policy evidence.** `structured-subagent.ts` centralizes policy resolution/execution for task and evaluation frontends; accompanying tests exercise the same entry points with isolated settings and mocks.[46][47]

**M3 — ADOPT one policy path, not all features.** Reinforce `selection/pipeline.ts` as the transition owner now; future normal and evaluation executors must share policy/cancellation/receipt logic rather than a “benchmark-only” shortcut. REJECT importing recursive spawn settings, broad tool discovery, or extension hooks into the selector. Tradeoff: shared code can expose more configuration complexity unless yfere keeps a deliberately smaller contract.

**License.** Root MIT with multiple copyright holders. Preserve applicable notices if copying; no oh-my-pi dependency, OAuth store, provider account, subscription assumption, or settings compatibility is proposed.[41]

## 5. Goose: approval races, output pressure, provider metadata, telemetry

**Observed/test evidence.** The confirmation coordinator holds one active-turn guard, tracks requests separately from notifications, rejects unknown/already-answered request IDs, and allows cancellation during waits. Tests cover a second active turn, clearing requests on guard drop, batch completion, and first-answer immutability.[51]

**G1 — ADAPT approval state machine.** In Phase 9, a prompt response must atomically consume the exact pending grant once; cancellation or run termination invalidates it. A wakeup is not state. Test approve/deny races, stale answers, cross-attempt answers, and cancel while waiting. This strengthens tool-policy enforcement without changing semantic selection authority. Tradeoff: durable multi-process approvals need database constraints beyond the in-memory Rust guards inspected here.

**Output evidence.** Goose redirects oversized text to a retained temporary file and returns a file reference; its unit tests cover small, large, and mixed content. On write failure the implementation returns original content with a warning.[52]

**G2 — ADAPT large-output indirection; REJECT unbounded fallback.** Use scoped artifact handles, byte/line accounting, hashes, retention ownership, and bounded preview/search. If retention fails, emit a typed failure or bounded omission notice rather than injecting all text into context. Affect `Task.contextPolicy`, `InputRef`, artifact contracts and Phase 9 receipts. Tradeoff: less immediate context, but recoverable evidence and predictable budgets. Never label a truncated output complete.

**Provider/delegation evidence.** Goose provider metadata separates setup requirements, known-model metadata, and deprecation information. Its subagent parameters carry a session ID, task configuration, callbacks, and cancellation token; output extraction may return final-only text or collected text.[56][53]

**G3 — ADAPT explicit capability/preflight metadata and bounded handoffs (historical wording superseded).** The earlier source recommendation to keep yfere's single Codex implementation behind its own interface is retained only as provenance; it is superseded by the effective exact three-provider registry (`codex | claude-code | opencode-go`). Represent setup failure separately from model incompatibility; no foreign config-key or credential-store import. Worker output should be a schema-validated receipt plus artifact references, not a success claim inferred from the last sentence. Affect architecture / Provider boundaries and Phase 9 delegation. DEFER broad provider/extension support; its existence elsewhere does not justify an MVP registry.

**Telemetry evidence.** Goose records optional usage fields only when present, carries response-model attribution, and gates message/tool-content capture behind an explicit environment option.[58]

**G4 — ADOPT unknown-preserving telemetry; REJECT content capture by ambient switch.** Affect `DecisionResponse`, `TelemetryEvent.redactedPayload`, redaction tests, and evaluation reports. yfere should use its existing allowlist and explicit approved audit scope, not let an environment flag spill prompts/tool arguments into logs. Tradeoff: reduced diagnostic richness is deliberate.

**License.** Root Apache-2.0; inspect NOTICE and component licenses before future copying/distribution. No Goose dependency or MCP extension marketplace is proposed.[50]

## 6. Claude Code: documented orchestration versus inspectable wrapper code

**Public boundary.** Official documentation describes the runtime loop and SDK relationship; the open Python SDK transport constructs and supervises a Claude CLI subprocess. Its implementation is evidence for that wrapper, not visibility into the complete product's internal scheduling or safety enforcement.[5][6][61] The public Claude Code repository's license reserves rights and points to commercial terms; a public changelog is not a reusable open runtime.[64][65]

**Topology.** Official docs distinguish focused subagents from independent teams sharing coordination. Teams are experimental and have additional coordination/token overhead and documented resumption/shutdown limitations.[7][11]

**C1 — ADOPT bounded supervisor/worker topology; DEFER autonomous teams.** Preserve yfere's project-scoped `max_agents` and independent attempt limits. Later workers get explicit briefs, grants, ownership, acceptance conditions, and a result destination. Do not infer permission for peer-to-peer or recursive delegation from a persona description. Affect Phase 9 delegation, `ResolvedAssignment`, and review independence. Tradeoff: less flexible collaboration, but a much smaller ownership and cancellation state space.

**Checkpoint boundary.** Official checkpointing describes restoring supported file edits, not rollback of every shell action or external effect.[9]

**C2 — ADOPT “checkpoint is not transaction rollback.”** Phase 9 receipts must preserve uncertainty for network, shell, and external mutations even when workspace files can be restored. Show the operator which effects are outside rollback. REJECT presenting a rewind button as cancellation of already-completed side effects. No new rollback implementation is authorized here.

**Cancellation evidence.** The SDK's `close()` uses a cancellation shield with bounded waits, closes input, then escalates from graceful exit to terminate and kill; unreaped children remain tracked. Tests explicitly cover grace timeout, SIGTERM success without SIGKILL, and already-exited children.[61][62]

**C3 — ADAPT bounded cleanup ownership.** Native yfere should stop accepting work immediately on abort while permitting bounded owned-resource cleanup, record termination attempts and observed exit, and report unreaped/uncertain state rather than success. Phase 9 must define descendant/process-group ownership separately—the SDK wrapper does not prove all arbitrary descendants are contained. Gate C should test blocked stdin, ignored termination, exit races, cancellation during cleanup, and no killing of unrelated processes. Keep selection's existing abort → deadline → retry precedence.

**Skills/policy boundary.** SDK code maps requested skill names to allowed-tool patterns and defaults settings sources; tests reject rule-syntax/control-character injection and distinguish absent, empty, and explicit skill configurations.[61][62] **C4 — ADAPT hostile-identifier tests; REJECT its semantics as yfere's semantics.** yfere explicit arrays remain exact pins with required skills included, and skill text never grants tools. Retain only reviewed catalog content; no automatic project/user skill discovery or hook execution in Phases 1–5.

**License/auth.** Python SDK root MIT does not license the Claude product or authorize account reuse. REJECT borrowing the Claude SDK's executor semantics, wrapping the SDK as yfere's executor, or extracting/copying Claude authentication. The approved initial provider scope instead includes the unmodified pinned native Claude Code subprocess with its native auth, alongside direct Codex and direct OpenCode Go adapters; Jev remains a separate decision-only lane. This paragraph supersedes the older Claude-adapter rejection disposition and is governed by the exact `task-agent-provider/v1` contract in `docs/decision-contracts.md`.[60][64]

## 7. Halv: assess “Jev-powered Herdr” precisely

### What the evidence supports

Halv says its coordinator prepares self-contained task briefs and Jev chooses a lane, model, and reasoning effort; failed checks can escalate to a stronger tier. It combines that routing with context compression, code indexing, and command-output filtering. It describes a desktop workspace around existing agent CLIs, rather than a source-published native execution kernel.[12]

A retrieved public selected-run record dated September 28, 2026 includes coordinator/worker model usage, a verifier result, task checksum, and a routing entry naming Jev with a specific provider-model identifier.[13] This corroborates what Halv publishes about its workflow; it is not independent proof that the historical provider execution occurred exactly as recorded.

**Verdict on Ryan's hypothesis:** “a Jev-routed multi-agent workspace with some Herdr-like operator goals” is a reasonable **functional analogy**. “Herdr powered by Jev,” shared code, a fork, shared process architecture, ownership, or a dependency is **not established**. Herdr's inspected evidence centers on persistent terminals/PTY handoff; Halv's evidence centers on desktop routing/context tooling.[18][12] No such lineage evidence was found in the inspected public material; that is a bounded negative finding, not proof none exists privately.

### Hlv1 — ADAPT constrained routing visibility; REJECT authority transfer

Show why a configured route was chosen, whether pins suppressed inference, and which model actually served. Affect `DecisionRequest`, `DecisionResponse`, `override.bypassed`, `fallback.applied`, and report UX. Keep Jev decision-only, deterministic hard filters, exact pins, and ordered 2a/2b. Do not adopt Halv's lane selection as an additional task-provider permission, automatic escalation beyond one replan, or a claim that routing alone saves money. Tradeoff: fewer adaptive paths, but policy remains replayable.

### Hlv2 — ADOPT evidence accounting; DEFER optimization claims

The September 30 vendor report describes an interim combined-workflow comparison: 14 tasks with three repetitions, 25/42 verifier passes per arm, $144.67 versus $337.50 reported model cost, and more total tokens in the Halv arm. It explicitly does not isolate one component and excludes infrastructure-invalid attempts and a rolled-back policy experiment.[66] The public sample supplies per-role accounting and verifier linkage, a useful evidence shape rather than a yfere result.[13]

Recommendation: keep the approved yfere quality floor and cost/context gates. Require task-level paired results, held-out families, excluded-attempt ledger, unknown costs, all worker/coordinator/selector overhead, actual serving models, and verifier provenance. Separate selection validity from execution quality and compare routing-only versus context-tooling arms before attributing a benefit. Repetitions are not independent new tasks; equal aggregate passes can hide changed failures. Affect `evaluation-protocol.md`, `ThewEvidence` applicability, and outcome exports. This research did not rerun the benchmark, validate provider billing, or audit the full published dataset.

### Hlv3 — DEFER proprietary optimizer/desktop integration

Halv's public privacy page distinguishes local indexing/compression from model-provider requests and separate account/billing/update/app-event services. Its beta terms place review responsibility on the user; these pages do not expose an implementable routing API or source license.[14][15] Do not import an assumed local-only privacy guarantee, credential store, product dependency, compression algorithm, or subscription economics. Unknowns include internal permission enforcement, durable receipt semantics, process containment, and routing request/retention contracts. These need source/contracts or an independently authorized product evaluation, not inference from screenshots.

## Cross-cutting contract deltas for synthesis

The following are proposals to the downstream planning synthesis task, not edits already made.

| Concern | Proposed delta | Settled boundary preserved | Evidence anchor |
|---|---|---|---|
| Agent lifecycle/orchestration | Future attempt states separate running, waiting approval, cleanup, terminal, uncertain | No executor in first slice; one transition owner | O1, G1, C3 |
| Delegation | Brief + acceptance + grants + ownership + typed completion and artifact handles | Bounded roster; no recursive teams | M3, G3, C1 |
| Context/compaction | Immutable source provenance plus bounded projection and explicit omissions | Required selector inputs never silently trimmed | O3, P1, G2 |
| Session persistence/replay | Name reconnection, restart recovery, transcript restore, and decision replay separately | Read-only, exact-hash selector replay | H1, O1, P2 |
| Provider abstraction | Normalize capabilities, preflight, stream/tool errors, cancellation, usage, identity | Exactly three initial implementations: Codex, Claude Code, OpenCode Go; Jev decision-only | P3, G3 |
| Model switching/fallback | Record requested/serving identity and derived metric changes; revalidate route | Frozen assignment; pins fail closed; bounded replan | M1, Hlv1 |
| Skills/extensions | Add hostile identifier and output-format fixtures | Reviewed catalogs; text is not authority; no dynamic loading | C4 |
| Tool policy/approvals | Exact pending scope, immutable answer, stale/cancel invalidation | Model cannot grant tools | O2, G1 |
| Auth | Explicit independent Jev/Codex preflight with app-owned secrets | No foreign account/store import or live authorization implied | G3, C4 |
| Workspace isolation | Separate change capture, review/apply, cleanup ownership | Worktree is not a security sandbox | M2 |
| Cancellation/process ownership | Bounded cleanup; terminate/kill/reap observations; uncertain status | No claiming unobserved effects undone | C2, C3 |
| Artifacts/receipts | Scoped references, hashes, baseline, verification, retention and no clobber | Project outputs distinct from redacted run receipts | M2, G2 |
| Telemetry | Redacted events, optional usage, returned-model identity, exclusion accounting | Unknown is not zero; no raw content by ambient flag | G4, Hlv2 |
| Failure recovery | Reconcile unsafe effects before retry; preserve evidence on failed restore/apply | Replay never executes or loads credentials | H2, P2, M2 |
| Operator UX | Show blocked versus disconnected versus terminal/uncertain; expose route and cleanup status | Reports first, dashboards deferred | O1, M1, Hlv1 |

### Suggested acceptance fixtures, not claimed test results

For the offline selector lane: assert invalid pins never trigger fallback; a mismatched physical model cannot rewrite a frozen assignment; unknown usage stays unknown; compaction does not change approved decision inputs; duplicate persistence preserves event/roster identity; hostile catalog IDs cannot become tool rules; missing snapshots yield `NON_REPLAYABLE`. These extend existing pure/schema/replay/redaction requirements without workers or network.

For separately authorized Phase 9 / Gate C:

- Disconnect/reconnect during mutation: reconnect returns canonical attempt status, no second invocation.
- Crash after intent and before result: unsafe operation becomes uncertain; a safe read can retry only under explicit policy.
- Approve/deny/cancel race: exactly one valid answer, no post-cancel effect, stale/cross-run answers rejected.
- Worker ignores termination or blocks on I/O: cleanup deadline bounds the wait; ownership and unreaped state remain visible.
- Oversized output and storage-full: no unbounded context fallback; receipt states what was retained/omitted.
- Isolation apply failure: preserve patch/branch and baseline; parent workspace not silently treated as updated.
- Context reduction: maintain tool-call/result structure, acceptance requirements, grants and artifact handles; compare quality, not just token count.
- Fallback to smaller window: compatibility rechecked and metrics use serving identity; frozen lineage unchanged unless explicit replan.
- Claimed successful artifact: independently inspect artifact and acceptance evidence before terminal success.

## Licensing and reuse disposition

This is a source-license inventory, not a legal clearance. Every recommendation above is for independent specification unless a later task explicitly approves code reuse. Root licenses do not automatically cover trademarks, third-party assets, bundled tools, transitive dependencies, accounts, or service terms.

| Source | Observed root license/boundary | Reuse disposition |
|---|---|---|
| Herdr | Apache-2.0 [17] | ADAPT concepts; notice/license/modification review before copying |
| Odysseus | AGPL-3.0 [24] | ADAPT behavioral lessons; DEFER copying pending explicit licensing compatibility review |
| pi | MIT [32] | ADAPT concepts; retain applicable notices for substantial copied portions |
| oh-my-pi | MIT [41] | ADAPT concepts; preserve listed copyright holders if copying |
| Goose | Apache-2.0 [50] | ADAPT concepts; inspect NOTICE/component obligations if copying |
| Claude Python SDK | MIT [60] | Wrapper-source lessons only; no inference about product rights |
| Claude Code | Rights reserved/commercial terms [64] | Document behavior; REJECT runtime copying/dependency for this plan |
| Halv | Public beta terms, no inspected runtime source license [14] | Documentation/evidence only; DEFER any implementation reuse |

## Focused Ryan decisions

The effective planning decision is exactly three initial task-agent providers—Codex, Claude Code, and OpenCode Go—behind a small static registry; earlier Codex-first wording in this historical dossier is superseded. Jev remains decision-only, and OpenAI Decisions remains deferred.

1. **Workspace/apply policy (historical recommendation, superseded):** selected project root and allowable paths; whether workers write there directly or return isolated changes for explicit apply. The effective closure is isolated reviewed apply-back by default, with explicitly dangerous Auto that changes only apply approval and never widens grants.
2. **Approval breadth (historical recommendation, superseded):** which effect classes can receive session/task grants, if any, versus exact-operation approval. The effective closure is single-operation or current-client-session closed blanket approval; destructive/external scope remains explicit.
3. **Retention (historical recommendation, superseded):** project artifacts versus run receipts, raw output/compaction-source retention, and what deletion should render non-replayable. Structured telemetry/receipts are default and raw content opt-in; the dated recommendation is superseded by Ryan's approved bounded global caps/schedules in `docs/decision-contracts.md`.
4. **Detach and cancellation policy (historical recommendation, superseded):** whether an intentionally detached worker continues after client exit and who may stop it. Cancel/reap is the default; bounded continuation is separately selected and must be bounded by immutable canonical instants and cannot be renewed by reconnect, rebind, or restart.

These entries preserve the dossier's historical provenance and are superseded where they conflict with the October 3, 2026 approval. They are not current requests awaiting Ryan; future host expansion or scoped retention overrides require a new reviewed decision.

The account-specific TypeSafe retention/ZDR decision remains a separate existing Gate B prerequisite. No new decision is needed merely to acknowledge the limited Halv analogy; proving implementation lineage is not necessary for yfere's design.

## Handoff and verification scope

Deliverable is this dossier. Supporting local evidence is in `.research-prior-art/`, including pinned source snapshots, `source-manifest.json`, `ledger.json`, and the original planning baseline. The Sources section below is generated mechanically. Citation verification checks IDs and URL consistency, not semantic truth; findings above were tied to inspected primary files and explicit documentary boundaries.

The downstream synthesis should apply only accepted deltas to the effective planning package. This research does not change those documents, implement a runtime, run upstream tests, make inference calls, or establish performance/security certification for any product.

## Sources

[1] https://herdr.dev — Herdr homepage
[2] https://odysseusai.dev — Independent Odysseus guide
[5] https://code.claude.com/docs/en/how-claude-code-works — Claude loop documentation
[6] https://platform.claude.com/docs/en/agent-sdk/overview — Claude Agent SDK overview
[7] https://code.claude.com/docs/en/sub-agents — Claude subagents
[9] https://code.claude.com/docs/en/checkpointing — Claude checkpoints
[11] https://code.claude.com/docs/en/agent-teams — Claude teams
[12] https://halv.ai/llms-full.txt — Halv product facts
[13] https://halv.ai/evidence/swe-rebench-astra-42-pairs/pairs/01/rep-1/halv.json — Halv sample selected run
[14] https://halv.ai/terms — Halv terms
[15] https://halv.ai/privacy — Halv privacy
[17] https://github.com/herdrdev/herdr/blob/65e35a3858b4a9f6cb9bdf712ffb16c474363846/LICENSE — herdrdev/herdr LICENSE
[18] https://github.com/herdrdev/herdr/blob/65e35a3858b4a9f6cb9bdf712ffb16c474363846/src/server/handoff.rs — herdrdev/herdr src/server/handoff.rs
[19] https://github.com/herdrdev/herdr/blob/65e35a3858b4a9f6cb9bdf712ffb16c474363846/tests/live_handoff.rs — herdrdev/herdr tests/live_handoff.rs
[20] https://github.com/herdrdev/herdr/blob/65e35a3858b4a9f6cb9bdf712ffb16c474363846/docs/versions/0.9.3/website/src/content/docs/session-state.mdx — herdrdev/herdr docs/versions/0.9.3/website/src/content/docs/session-state.mdx
[24] https://github.com/odysseus-dev/odysseus/blob/2992bf6d368a11472323e47d3bfed91e79cefc6b/LICENSE — odysseus-dev/odysseus LICENSE
[25] https://github.com/odysseus-dev/odysseus/blob/2992bf6d368a11472323e47d3bfed91e79cefc6b/README.md — odysseus-dev/odysseus README.md
[26] https://github.com/odysseus-dev/odysseus/blob/2992bf6d368a11472323e47d3bfed91e79cefc6b/src/agent_runs.py — odysseus-dev/odysseus src/agent_runs.py
[27] https://github.com/odysseus-dev/odysseus/blob/2992bf6d368a11472323e47d3bfed91e79cefc6b/src/tool_approvals.py — odysseus-dev/odysseus src/tool_approvals.py
[28] https://github.com/odysseus-dev/odysseus/blob/2992bf6d368a11472323e47d3bfed91e79cefc6b/tests/test_tool_approval_task_scope.py — odysseus-dev/odysseus tests/test_tool_approval_task_scope.py
[29] https://github.com/odysseus-dev/odysseus/blob/2992bf6d368a11472323e47d3bfed91e79cefc6b/src/context_compactor.py — odysseus-dev/odysseus src/context_compactor.py
[30] https://github.com/odysseus-dev/odysseus/blob/2992bf6d368a11472323e47d3bfed91e79cefc6b/tests/test_live_fallback_round_attribution.py — odysseus-dev/odysseus tests/test_live_fallback_round_attribution.py
[32] https://github.com/earendil-works/pi/blob/69f0be6f0a6ca1bf66a2a9cf59c821b632e6bca1/LICENSE — earendil-works/pi LICENSE
[33] https://github.com/earendil-works/pi/blob/69f0be6f0a6ca1bf66a2a9cf59c821b632e6bca1/packages/durable/README.md — earendil-works/pi packages/durable/README.md
[34] https://github.com/earendil-works/pi/blob/69f0be6f0a6ca1bf66a2a9cf59c821b632e6bca1/packages/durable/src/harness/tool.ts — earendil-works/pi packages/durable/src/harness/tool.ts
[35] https://github.com/earendil-works/pi/blob/69f0be6f0a6ca1bf66a2a9cf59c821b632e6bca1/packages/durable/test/harness-tools-recovery.test.ts — earendil-works/pi packages/durable/test/harness-tools-recovery.test.ts
[36] https://github.com/earendil-works/pi/blob/69f0be6f0a6ca1bf66a2a9cf59c821b632e6bca1/packages/agent/src/agent-loop.ts — earendil-works/pi packages/agent/src/agent-loop.ts
[37] https://github.com/earendil-works/pi/blob/69f0be6f0a6ca1bf66a2a9cf59c821b632e6bca1/packages/agent/test/agent-loop.test.ts — earendil-works/pi packages/agent/test/agent-loop.test.ts
[38] https://github.com/earendil-works/pi/blob/69f0be6f0a6ca1bf66a2a9cf59c821b632e6bca1/packages/coding-agent/docs/session-format.md — earendil-works/pi packages/coding-agent/docs/session-format.md
[39] https://github.com/earendil-works/pi/blob/69f0be6f0a6ca1bf66a2a9cf59c821b632e6bca1/packages/ai/src/types.ts — earendil-works/pi packages/ai/src/types.ts
[41] https://github.com/can1357/oh-my-pi/blob/cf2d9c1a97139eb2f3efb9fe4b3e343a64cad00e/LICENSE — can1357/oh-my-pi LICENSE
[42] https://github.com/can1357/oh-my-pi/blob/cf2d9c1a97139eb2f3efb9fe4b3e343a64cad00e/packages/coding-agent/src/task/executor.ts — can1357/oh-my-pi packages/coding-agent/src/task/executor.ts
[43] https://github.com/can1357/oh-my-pi/blob/cf2d9c1a97139eb2f3efb9fe4b3e343a64cad00e/packages/coding-agent/test/task/subagent-fallback-context-window.test.ts — can1357/oh-my-pi packages/coding-agent/test/task/subagent-fallback-context-window.test.ts
[44] https://github.com/can1357/oh-my-pi/blob/cf2d9c1a97139eb2f3efb9fe4b3e343a64cad00e/packages/coding-agent/src/task/isolation-runner.ts — can1357/oh-my-pi packages/coding-agent/src/task/isolation-runner.ts
[45] https://github.com/can1357/oh-my-pi/blob/cf2d9c1a97139eb2f3efb9fe4b3e343a64cad00e/packages/coding-agent/src/task/output-manager.ts — can1357/oh-my-pi packages/coding-agent/src/task/output-manager.ts
[46] https://github.com/can1357/oh-my-pi/blob/cf2d9c1a97139eb2f3efb9fe4b3e343a64cad00e/packages/coding-agent/src/task/structured-subagent.ts — can1357/oh-my-pi packages/coding-agent/src/task/structured-subagent.ts
[47] https://github.com/can1357/oh-my-pi/blob/cf2d9c1a97139eb2f3efb9fe4b3e343a64cad00e/packages/coding-agent/test/task/structured-subagent.test.ts — can1357/oh-my-pi packages/coding-agent/test/task/structured-subagent.test.ts
[50] https://github.com/aaif-goose/goose/blob/591edd47cf2cfea4957d720c607cf2a4def8673d/LICENSE — aaif-goose/goose LICENSE
[51] https://github.com/aaif-goose/goose/blob/591edd47cf2cfea4957d720c607cf2a4def8673d/crates/goose/src/agents/tool_confirmation_coordinator.rs — aaif-goose/goose crates/goose/src/agents/tool_confirmation_coordinator.rs
[52] https://github.com/aaif-goose/goose/blob/591edd47cf2cfea4957d720c607cf2a4def8673d/crates/goose/src/agents/large_response_handler.rs — aaif-goose/goose crates/goose/src/agents/large_response_handler.rs
[53] https://github.com/aaif-goose/goose/blob/591edd47cf2cfea4957d720c607cf2a4def8673d/crates/goose/src/agents/subagent_handler.rs — aaif-goose/goose crates/goose/src/agents/subagent_handler.rs
[56] https://github.com/aaif-goose/goose/blob/591edd47cf2cfea4957d720c607cf2a4def8673d/crates/goose-provider-types/src/base.rs — aaif-goose/goose crates/goose-provider-types/src/base.rs
[58] https://github.com/aaif-goose/goose/blob/591edd47cf2cfea4957d720c607cf2a4def8673d/crates/goose/src/agents/gen_ai_telemetry.rs — aaif-goose/goose crates/goose/src/agents/gen_ai_telemetry.rs
[60] https://github.com/anthropics/claude-agent-sdk-python/blob/68db221ebe29c1d82b0001ae80fa71e10d57d80a/LICENSE — anthropics/claude-agent-sdk-python LICENSE
[61] https://github.com/anthropics/claude-agent-sdk-python/blob/68db221ebe29c1d82b0001ae80fa71e10d57d80a/src/claude_agent_sdk/_internal/transport/subprocess_cli.py — anthropics/claude-agent-sdk-python src/claude_agent_sdk/_internal/transport/subprocess_cli.py
[62] https://github.com/anthropics/claude-agent-sdk-python/blob/68db221ebe29c1d82b0001ae80fa71e10d57d80a/tests/test_transport.py — anthropics/claude-agent-sdk-python tests/test_transport.py
[64] https://github.com/anthropics/claude-code/blob/1c229fcd1e1e4e452e29a8f116b45fe4cfe2c528/LICENSE.md — anthropics/claude-code LICENSE.md
[65] https://github.com/anthropics/claude-code/blob/1c229fcd1e1e4e452e29a8f116b45fe4cfe2c528/CHANGELOG.md — anthropics/claude-code CHANGELOG.md
[66] https://halv.ai/blog/halv-swe-rebench-astra-42-pairs — Halv interim benchmark technical report (September 30, 2026)
