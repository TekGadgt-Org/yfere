# yfere prior-art synthesis — 2026-10-02

Status: reconciled planning package; planning only. No implementation, credentials, provider calls, browser launch, deployment, publication, or push occurred.

## Purpose and decision summary

The effective planning package has exactly three initial task-agent providers (Codex, Claude Code, and OpenCode Go), while Jev remains the initial decision lane and OpenAI Decisions deferred. Earlier Codex-first wording in this historical synthesis is superseded by the provider amendment below.

The governing rule is to import independently useful safety, evidence, and lifecycle patterns—not another product's identity, runtime, credentials, marketplace, deployment model, or orchestration loop.

## Reconciled dispositions

### ADOPT

- Distinguish transport reconnection, session reconstruction, execution recovery, and deterministic decision replay. One does not imply another.
- Bind approvals to the active operation/run/attempt/action; reject stale or duplicate answers; cancellation wins while approval is pending.
- Treat an interrupted or externally visible effect as `unknown`/uncertain unless independently confirmed. Never blindly rerun a mutation after an uncertain result.
- Preserve requested model, serving model, version, context, and cost attribution separately; never mutate a frozen assignment to repair attribution.
- Retain bounded, scoped artifacts and context references with explicit provenance, privacy, and non-replayable behavior.
- Keep logical decision calls, physical provider attempts, worker attempts, and browser attempts distinct and observable.

### ADAPT

- Keep the existing provider-neutral `DecisionService.evaluate(request, signal)` seam as the only future decision-service review point. Jev remains first; fixed, deterministic, recorded, and structured-fixture alternatives remain available.
- Require every future decision adapter to pass static request/response/error, runtime-validation, provenance, deadline, retry, privacy, and complete-ranking compatibility checks. A winner-only response cannot be converted into invented probabilities or confidence.
- Add browser automation as a future yfere-owned capability boundary, not as a task-agent provider or selector feature. The initial form is a version-pinned, out-of-process adapter behind a provider-neutral `BrowserCapabilityProvider`; yfere owns grants, origins, approvals, artifacts, cancellation/reaping, redaction, and receipts.

### REJECT

- Compatibility targets or external harness adapters (other than the narrowly approved unmodified pinned native Claude Code runtime with native auth; no token extraction/copy/replay).
- Treating Jev as a task-agent provider, replacing the initial three-provider scope, or importing external harness execution/auth/storage.
- Plugin marketplaces, speculative plugin registries, dynamic loading, broad provider implementations, generic hosted-agent frameworks, or a generic event platform.
- Browser-use direct Python embedding, its autonomous `Agent.run()` loop as yfere orchestration, stock MCP as the security boundary, shared profiles, unrestricted paths, or upstream telemetry as implicitly safe.
- Using an OpenAI model name, Responses/Chat Completions contract, announcement, or unrelated documentation to invent a Decisions API endpoint or schema.

### DEFER

- OpenAI Decisions API adapter and any `providerMode` value until official, version-identifiable request/response/error contracts, access/auth, limits/pricing, ranking/probability semantics, privacy terms, and approved fixtures exist. The limited-preview announcement is evidence of a product direction, not an implementation contract.
- Browser-use implementation and live browser work until the native execution gate and browser contract are accepted. Sequence: fake contract and grant tests; hermetic mock process with network denied and cleanup checks; pinned controlled-local browser fixtures; separately authorized live read-only/effect lanes.
- Browser transport choice (minimal JSON-over-stdio versus wrapped MCP), browser binary/runtime policy, secret-entry mechanism, artifact retention, cloud/hosted services, upstream telemetry, and a long-lived sidecar. These remain explicit future Ryan/product decisions.
- Discord, durable memory, online learning, deployment, publication, and other existing deferred phases.

## Effective-document amendments

The following files were updated, with a new `Prior-art synthesis amendments (2026-10-02)` section in each unless noted:

- `docs/architecture.md` — scope/invariants and implementation boundary: preserves standalone/three-provider/Jev boundaries; adds future browser capability seam and rejects compatibility/plugin scope.
- `docs/decision-contracts.md` — provider/replay contracts: adds lifecycle/evidence distinctions, no-fabrication rule for future decision services, bounded Decisions re-entry criteria, and future `BrowserGrant`/`BrowserReceipt` semantics.
- `docs/evaluation-protocol.md` — gates and arms: records Decisions as a deferred challenger and adds post-native browser B0/B1/B2 test lanes with observed-effect requirements.
- `docs/threat-model.md` — residual risks/security controls: adds lifecycle-failure distinctions and browser untrusted-boundary controls, while preserving credential and data-handling approvals.
- `docs/planning-readiness.md` — settled/deferred/readiness boundary: adds browser milestone/checklist, closes the four Phase 9 policy directions, and retains only host-acceptance and retention parameters as residual approvals.
- `.hermes/plans/2026-09-18_053427-yfere-implementation.md` — phase plan: adds bounded prior-art deltas, Decisions deferral, and browser Phase 9 sequencing.

No existing TypeSafe safety term, project `max_agents` limit, ordered persona → model freeze → skill selection, native runtime boundary, or authentication separation was weakened or silently re-decided.

## Browser-use milestone and acceptance boundary

Browser support is intentionally separate from harness prior-art conclusions. It begins only after native execution authorization and must be testable without live credentials or external sites:

1. B0: closed action/grant/receipt schemas, fake adapter, approval matching, unknown preservation, redaction, and no-network tests.
2. B1: pinned out-of-process adapter with network-denied/mock and controlled-local fixture lanes; verify IPC framing, process-tree cleanup, ephemeral profiles, redirect/private-IP policy, upload/download containment, resource limits, cancellation, and uncertain effects.
3. B2: separately authorized dedicated-account live lanes; verify only observed browser behavior, exact approvals, cleanup, data handling, and external-effect confirmation. Never infer external success from adapter return.

Browser-use's recorded source pin, Python/browser versions, dependency/license inventory, telemetry configuration, and adapter contract hash must be part of upgrade evidence. No part of this milestone authorizes installation, browser launch, cloud use, credentials, or upstream telemetry.

## Provider amendment and closure (2026-10-02)

The effective initial task-agent scope is exactly Codex, Claude Code, and OpenCode Go. This supersedes every earlier Codex-only MVP statement and any blanket rejection of the approved native Claude Code runtime. A small yfere-owned `TaskAgentProvider` contract and static registry cover auth preflight/status, start/resume/cancel, correlated events, grants, workspace, requested/serving model identity, usage/cost with unknowns, terminal/uncertain outcomes, artifacts/receipts, retry ownership, and version identity; provider-specific semantics are not flattened. `max_agents: 3` remains agent cardinality, not provider allocation.

Codex retains independent yfere browser OAuth and credential storage. Claude runs only the unmodified pinned native Claude Code runtime with native Claude auth state; yfere never extracts, copies, or replays subscription OAuth tokens in HTTP clients or other providers. OpenCode Go uses an independent API key and direct documented protocol-family endpoints, with dynamic catalog/model identity, session-header requirements, coding-only admission, pricing/usage and cancellation unknowns preserved. No credential crosses Codex, Claude, Go, Jev, OpenAI Decisions, browser-use, or secret-broker boundaries. Contracts, fakes, and auth-preflight mocks are initial implementation scope; live credentials and provider tests remain separately authorized.

Evaluation now requires per-provider mock/contract/auth-preflight lanes, controlled fixtures, process/cancellation ownership, model/usage attribution, fallback/replan behavior, and matched supported coding comparisons. Threat and readiness gates explicitly cover Claude child-process/native-auth boundaries and OpenCode Go key/network/data-policy terms. OpenAI Decisions remains deferred and Jev remains the separate decision service.


The following historical unresolved list is retained for provenance only; the Phase 9 items below were subsequently settled and must not be read as the current effective position:

1. Ryan's TypeSafe account request/log retention, deletion, training exclusion, subprocessors/transfers, and ordinary handling versus enterprise ZDR decision.
2. [SUPERSEDED BY THE 2026-10-02 CLOSURE BELOW] Ryan's Phase 9 native workspace path, filesystem/shell/git/network grants, child-process lifecycle, uncertain-side-effect receipt retention, artifact versus receipt retention, and destructive-effect approval policy.
3. Browser adapter transport, browser binary/runtime isolation, secret-entry support, screenshots/traces/download retention, and whether measured startup cost ever justifies a sidecar.
4. Whether and when OpenAI Decisions access becomes available with a contract adequate for complete ranking semantics and the existing safety/evaluation gates.

## Provenance

- `docs/prior-art-dossier-2026-10-02.md` — source-first harness prior-art evidence and dispositions.
- `docs/decision-services-comparison-2026-10-02.md` — Jev-first recommendation, bounded OpenAI Decisions unknowns, and re-entry checklist.
- `docs/browser-use-support-boundary-2026-10-02.md` — pinned browser-use source evidence and future capability boundary.
- `docs/research-gap-audit.md` and `docs/audit-sources.json` — historical audit materials retained for auditability.

## Package verification intent

The rebuilt `yfere-final-planning-docs.zip` contains the six effective planning documents, historical audit materials, all three 2026-10-02 reports, and this synthesis. Verification must confirm archive listing, successful extraction, and byte identity of every archived file against its source.

## Review-finding closure (2026-10-02 reconciliation)

| Review | Finding | Closure |
| --- | --- | --- |
| Product | Four Ryan decisions were implicit: workspace/apply-back, detach authority, approval breadth, and retention | Historical recommendations are superseded by the closure below: isolated reviewed apply-back with dangerous non-widening Auto; cancel/reap default with bounded continuation; single-operation or current-session blanket approval; structured telemetry/receipts default with raw opt-in. The approved host matrix and global bounded retention policy are now normative in `docs/decision-contracts.md`. |
| Maintainability | Browser action/provider/event/receipt/error semantics existed only in the support report | `docs/decision-contracts.md` now contains the sole normative version-1 contract; B0 freezes its hash and B1/B2 reference that hash. Architecture owns future modules and dependency direction. |
| Security | Browser origin filtering was not an egress boundary | Independent out-of-browser reference monitor is mandatory before B1/B2 with DNS, IP, redirect, proxy, subresource, WebSocket, service-worker, download, metadata, and bypass controls plus adversarial fixtures. |
| Security | Approval/receipt had a TOCTOU gap | Closed one-use `ApprovalGrant` is canonical, exact-effect bound, atomically consumed/revalidated immediately before execution, and recorded in `BrowserReceipt`; uncertain effects are never blindly retried. |
| Security | Secret-entry capture boundary was unresolved | Secret entry remains disabled by default; future enablement requires a trusted exact-origin/field/action broker, sensitive-interval suppression/redaction, zeroization, and malicious-reflection/logging-leak fixtures. |

### Effective Phase 9 closure (2026-10-03)

The historical recommendations above are superseded, not rewritten as original evidence. The effective policy is isolated reviewed apply-back by default with explicitly dangerous, non-widening Auto; cancel/reap by default with separately selected bounded continuation; single-operation or current-client-session closed blanket approval; and structured telemetry/receipts by default with raw content opt-in. The approved host matrix and global bounded retention policy are now normative in `docs/decision-contracts.md`; future expansion requires review.

The archive is rebuilt from exactly 13 expected ZIP member names: `docs/architecture.md`, `docs/decision-contracts.md`, `docs/evaluation-protocol.md`, `docs/threat-model.md`, `docs/planning-readiness.md`, `docs/initial-task-provider-contracts-2026-10-02.md`, `docs/prior-art-synthesis-2026-10-02.md`, `docs/browser-use-support-boundary-2026-10-02.md`, `docs/decision-services-comparison-2026-10-02.md`, `docs/prior-art-dossier-2026-10-02.md`, `docs/research-gap-audit.md`, `docs/audit-sources.json`, and `plan/2026-09-18_053427-yfere-implementation.md`. The final member is explicitly mapped to source `.hermes/plans/2026-09-18_053427-yfere-implementation.md`; all other member names map to the identically named source paths. Verification compares this exact member-name list, then checks `unzip -t` and byte identity for every explicit source-to-member mapping.
