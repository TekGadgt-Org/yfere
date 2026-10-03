# Decision services for yfere: TypeSafe/Jev and OpenAI Decisions API

As of 2026-10-02. Prepared by an AI research agent for Ryan McGovern; not human-reviewed. Planning/research only. No inference API calls, credentials, installs, implementation, external publication, or changes to effective planning documents were made.

## Recommendation

**ADOPT Jev-first implementation through the already-planned internal `DecisionService`; ADAPT the documentation to make its portability requirements explicit; DEFER a Decisions API adapter.** These are complementary choices, not three competing architectures.

The relevant public OpenAI announcement is dated **September 29, 2026**, not October 2. It describes Decisions API as a **limited preview**, powered by GPT-6 Luna, for questions with predefined possible answers used in classification, routing, and next-action selection. The announcement text is available as an embedded OpenAI Developers post in OpenAI's community forum; this is announcement evidence, not an endpoint specification.[O1] Public documentation inspection did not establish an implementable Decisions contract.[O2–O5]

Jev has a public typed decision contract that can be mapped to yfere's current requirements.[T1–T4] That supports implementing its adapter first, not a claim that Jev is more accurate, faster, cheaper than Decisions, or proven useful for yfere. Keep fixed/deterministic/recorded alternatives and the existing evaluation gates. No head-to-head performance evidence was collected.

The smallest useful boundary already exists: `DecisionService.evaluate(request, signal): Promise<DecisionResponse>`, with SDK/wire details confined to an internal adapter.[L1 §Provider and replay contracts; L2 §Provider and TypeSafe transport boundaries] Do not add a plugin system, generic hosted-agent framework, provider marketplace, or placeholder OpenAI implementation.

## 1. Evidence, dates, and limits

Labels used below:

- **Documented:** inspected first-party documentation; not live-service verification.
- **Announcement:** official account's announcement text, with the retrieval caveat below.
- **Local contract:** yfere's effective planning requirement, not an implemented capability.
- **Unknown:** not established by the retrieved public material; not proof the service lacks it.
- **Recommendation/inference:** this report's proposed action, not a vendor guarantee.

### OpenAI provenance

[O1] is an October 1, 2026 forum reply by VeitB embedding an `@OpenAIDevs` post displayed as September 29, 2026, 6:34 PM. The displayed time's timezone was not established; the calendar date is the relevant verified announcement date. Browser DOM inspection recovered the exact originating post handle. Direct X extraction returned unavailable and direct browser navigation failed; the readable evidence is the official-account embed preserved on the OpenAI-hosted community page. The forum reply author's observation about sparse docs and other members' comparisons with Jev are **not** treated as OpenAI product commitments. Neither forum hosting nor a forum title establishes employee authorship.

The official-account embed supports the limited-preview status and narrow use cases above. It does **not** disclose an endpoint, executable model identifier for this API, request/response schema, access procedure, candidate limits, pricing, confidence semantics, auth requirements, retention, or guarantees. A community-linked unofficial guide was excluded from product evidence.

On October 2, public discovery covered the OpenAI developer hub and API routing indexes; full guide and endpoint-reference indexes; the developer blog index; and the September 2026 changelog entries.[O2–O5] A Google query restricted to `site:openai.com "Decisions API"` encountered an automated-traffic block and supplied no search evidence; the conclusion relies on the directly retrieved official sources instead. The guide/reference indexes have no Decisions entry. This is a bounded negative finding, **not** a claim that no private preview documentation exists or that search covers every OpenAI page. No preview signup, contact, account lookup, or inference endpoint probing was attempted.

The September 22 changelog separately documents GPT-6 Luna in Responses/Chat Completions.[O5] Do not transfer those endpoints, model pricing, reasoning controls, structured-output behavior, or general OpenAI data policies into Decisions API by analogy. Naming the underlying model does not define a new API's contract.

### TypeSafe provenance and freshness

The September 18 local audit was used to locate sources, not as the current external state. Current TypeSafe Markdown references were fetched directly on October 2. Initial extraction silently clipped several documents; direct public documentation GETs recovered the complete API, models, confidence, introduction, SDK options, and retry references. The DPA extraction was also partial; browser inspection recovered its retention clause. None of these documentation GETs invoked the inference service.

Two prior audit discrepancies are no longer present in the current HTTP reference: Choice criteria now explicitly permit structured descriptions, and the inspected response examples now use `jev-1.13.0` rather than `jev-latest`.[T1; L5 §Changed/stale assumptions] Do not rewrite historical evidence, widen yfere's conservative string-only question contract automatically, or treat corrected examples as live alias-resolution proof.

## 2. Fact/unknown matrix

Every Decisions “unknown” below means unavailable in the announcement plus the bounded documentation inspection described above.[O1–O5] Jev entries are documented contracts unless marked otherwise. The final column is yfere policy/recommendation, not a promised vendor feature.

| Dimension | TypeSafe/Jev: verified documentation and limits | OpenAI Decisions API: public evidence | Consequence for yfere |
| --- | --- | --- | --- |
| Decision problem representation | `state`, `model`, and named `questions`; Choice, Noul, and Score primitives. Question IDs correlate answers but do not carry inference meaning.[T1] | Announcement describes questions and possible answers. Exact input types and primitive equivalence unknown.[O1] | Keep yfere-owned typed questions; put full meaning in instructions/state. Do not invent a Decisions request body. |
| Candidate/action catalogs | Choice takes caller-defined option IDs/descriptions, returns one winner and option probabilities; maximum 255 options.[T1] | Predefined possible answers announced; stable-ID mapping, limits, ordering and multi-select unknown.[O1] | Closed local catalogs remain authoritative. Stage-one roster ranking requires a genuine complete distribution, not just a winning label. |
| Objectives and constraints | Instructions/criteria express semantic rubrics; atomic judgments are composed in code.[T1,T4] No inspected contract establishes a hard-constraint solver. | No objective/constraint schema or feasibility guarantee established. | Deterministic eligibility, budget arithmetic, authorization, cardinality and joint reconciliation stay outside both adapters. |
| Confidence and abstention | Choice/Score confidence is computed from the returned distribution; Noul returns a probability without separate confidence.[T3] | Confidence, calibrated probabilities, refusal, explicit no-match and abstention contracts unknown. | Preserve `none`, policy thresholds and typed failures. Never equate confidence with permission or task-success probability. A missing distribution is not a zero distribution. |
| Structured output and validation | HTTP reference defines typed answers, matching question keys, usage and errors.[T1] SDK types are not a substitute for yfere runtime validation.[L1] | Selection use case announced; JSON schema, completeness, malformed-output and error guarantees unknown. | Exact correlation, known IDs, finite normalized probabilities and winner consistency remain mandatory. Reject untranslatable output. |
| Multi-stage dependencies | Questions within one call are evaluated independently against the same state.[T4] | Batching, cross-question dependencies, statefulness and sequencing support unknown. | Preserve persona stage → selected-persona model substage 2a → model freeze → skill substage 2b. No same-request answer dependency. |
| Latency controls | Vendor describes parallel question evaluation with little added latency.[T4] SDK timeout is per attempt, defaults to 10,000 ms, and does not impose a total retry budget.[T5] | “Real-time” positioning, not a numeric latency guarantee; timeout/cancel/batch/SLA details unknown.[O1] | One yfere logical deadline, cancellation and bounded physical attempts. Existing p95 ≤2 s target is unmeasured, not established by either vendor.[L3] |
| Cost and service limits | Current model page lists $0.042/M input tokens, free output, 64k total context and 32k state-plus-longest-question; quotas explicitly may change.[T2] | Decisions pricing, billing unit, rate/context limits and spend controls unknown. | No numerical cost comparison is supportable. Keep the approved Jev spend ceiling; account charges and retry costs require live evidence. |
| Offline fixtures and replay | Custom fetch is documented for tests.[T5] This does not supply local Jev inference or a vendor deterministic replay guarantee. | Offline execution, export/replay and request determinism unknown. | Replay is local yfere validation over retained snapshots/responses, not fresh inference. Network/key-free fixtures remain available regardless of vendor access. |
| Version pinning | `jev-1.13.0` is documented; moving aliases currently point there, and pinning the version is recommended.[T2] | Announcement names GPT-6 Luna; Decisions model selectors, snapshots and compatibility commitments unknown. | Record requested and returned identity verbatim; pin SDK and contract hashes. Do not infer a Decisions version from another API. |
| Telemetry | API supplies model/answers/token usage.[T1] Inspected SDK source exposes optional `x-typesafe-request-id` via `withResponse()`.[T7] Provider billing/timing are not in the inspected result contract. | Request IDs, usage, billing, timings and trace export unknown. | Local elapsed time, call/attempt IDs and snapshot references are yfere-owned. Missing vendor metadata stays unknown; never count batch usage once per question. |
| Privacy/data handling | TypeSafe states no training on customer requests/responses; enterprise ZDR is offered. DPA retention is purpose/law-based, not a universal fixed period.[T2,T8,T9] | Decisions-specific retention, deletion, training use, residency and ZDR entitlement not established. | Input approval is not account-data approval. Preserve minimized two-round inputs and separately verify applicable account terms before live use. |
| Authentication/access | Bearer API key documented; client supports explicit key or `TYPESAFE_API_KEY`.[T1,T5] Actual account entitlement was not tested. | Limited preview announced; access eligibility, onboarding and Decisions auth contract unknown.[O1] | Do not assume Codex OAuth authorizes Decisions or reuse Jev credentials. No new credential flow or live preflight is justified yet. |
| Evaluation tooling | Official index offers consistency/classification/skill-suggestion cookbooks and jaggedness guidance.[T10] No yfere validation follows from their presence. | Decisions-specific evaluation integration, fixtures, calibration reports and benchmarks unknown. | Use existing local matched fixture arms and held-out tests first; no hosted eval dependency or asserted head-to-head win. |
| Provider lock-in | Published wire/primitives are TypeSafe-specific.[T1] **Inference:** pinning, recorded responses and an adapter limit transport lock-in but not semantic migration costs. | Mapping cost is unknown without the response contract. Announcement-level task overlap is not API compatibility.[O1] | Keep policy, catalogs, persistence and execution provider-neutral; accept that a future incompatible ranking contract may require reviewed schema/policy changes. |

## 3. Options and disposition

### ADOPT — Jev first, with existing hermetic alternatives

Implement the planned Jev adapter only within its separately authorized phases. Its documented Choice distribution fits the current persona ranking input; independent-question semantics fit substage-local batching.[T1,T4] Retain fixed, deterministic and structured-fixture comparison arms. This is a readiness/risk decision, not vendor superiority. Live use still depends on authorization, approved data handling, exact contract checks and evidence that semantic selection earns its complexity.[L3]

**Reject the coupled variant:** Jev's current fit does not justify allowing SDK types, primitive wire names or account credentials to spread into selection policy.

### ADAPT — Preserve and sharpen the existing boundary, not build another abstraction

Phase 3 already defines the provider-neutral decision interface; Phase 6 adds Jev behind it.[L4] Keep that scope. The useful amendment is a written compatibility gate and an adapter-isolation test, not a provider framework. A static constructor/composition choice among the already-planned implementations is sufficient.

Keep decision service configuration separate from the task-agent/model provider interface. The effective initial task-agent scope is Codex, Claude Code, and OpenCode Go behind a static yfere-owned registry; Jev remains decision-only, and OpenAI Decisions remains deferred. A future Decisions integration would concern semantic selection, not replace yfere's native runtime or provider boundaries.[L1,L2]

### DEFER — Decisions support pending an inspectable contract

No adapter stub, endpoint guess, new SDK dependency, disabled “supported” provider flag, preview credential collection, or production fallback to Decisions. Revisit when the evidence checklist in §6 can be completed. General availability is not an automatic prerequisite, but a stable inspectable contract and explicit approval are; a preview label alone is neither an integration contract nor proof of unsuitability.

### REJECT — Replace Jev now, wait for Decisions before building, or assume equivalence

Replacement has no demonstrated contract fit or measured advantage. Waiting would unnecessarily block the network-free selector/replay work already specified. The underlying Luna model's other interfaces do not prove Decisions behavior. Do not use an ordinary structured-output request and label it “Decisions API.” If independently authorized later, such a comparison belongs to the existing conventional structured-output baseline, not a new compatibility claim.

## 4. Smallest boundary and preserved selection contract

This is a recommendation to retain existing yfere ownership, not a new wire schema.[L1,L2,L4]

1. **Selection owns question construction.** It supplies eligible IDs and approved minimal state for one logical call. Round 1 carries the settled prompt and closed question definitions; round 2 carries selected persona definitions and needed model/skill catalog metadata. The adapter does not fetch memory, read arbitrary files or enrich the request.
2. **The adapter owns translation and transport only.** Keep `evaluate(request, signal)`; translate allowlisted fields to the documented vendor shape and translate responses back, validate, and return one response or typed error. Shared deadline/attempt policy remains authoritative. For Jev, use `retry: { maxRetries: 0 }` when yfere owns retries; do not confuse this with a top-level SDK option.[T5,T6]
3. **The core requires honest ranking evidence.** Current Choice responses require the full offered-option distribution and consistent winner. A hypothetical winner-only provider cannot be adapted by inventing one-hot probabilities, converting rank to probability, or copying generated “confidence” into a calibrated field. Treat it as incompatible with the current ranking lane until a separately reviewed contract/policy change—not a reason to weaken validation now.
4. **The pipeline owns dependencies.** Stage 1 selects personas. Stage 2a handles only dynamic models, validates and freezes them. Stage 2b selects dynamic skills against those frozen models. Batching is allowed only within a substage. Two semantic stages do not promise exactly two physical requests: retries and ordered 2a/2b remain explicit.
5. **Overrides and permissions do not move.** Pinned models skip 2a; exact skill pins skip 2b and constrain model eligibility; both pins skip semantic stage-two work. Required skills, explicit empty arrays, no-match/no-backfill, independent project/skill/retry limits and one-replan maximum remain deterministic.[L1,L2]
6. **Persistence stays vendor-neutral but provenance-rich.** Keep raw validated distributions distinct from policy-adjusted selections; retain provider, requested/returned model, SDK/contract and snapshot hashes, attempts, unknown usage and fixture provenance. Replay never opens a network connection or loads credentials.[L1]

No compatibility promise can guarantee zero future schema changes without a second vendor's contract. This seam protects the core from HTTP/SDK/auth churn; it does not erase semantic incompatibility. Avoid a speculative generic capability registry. A future adapter can be admitted by explicit review and static contract tests. The current `providerMode` closed union need not gain an OpenAI value until an implementation is supported.

## 5. Explicit implementation-plan impacts for synthesis

Only this report is written. These are proposed downstream amendments, not edits already applied.

| Effective document / section | Proposed bounded impact | What must not change |
| --- | --- | --- |
| `docs/architecture.md`, Provider and TypeSafe transport boundaries | State that the existing decision-service seam is also the future review point for alternative decision services; Decisions remains deferred. | Module ownership, native harness, exactly three initial task-agent providers (Codex, Claude Code, OpenCode Go), Jev decision-only role, no plugins. |
| `docs/decision-contracts.md`, Provider and replay contracts | Add full-distribution compatibility/no-fabrication rule for future providers; explicitly distinguish transport interchangeability from semantic equivalence. | Current question/answer union and runtime checks; ordered 2a/2b; typed errors; no new speculative endpoint or provider enum. |
| Implementation plan Phase 3 | Add an adapter-isolation/contract-conformance assertion using existing recorded and deterministic implementations; ensure core imports no vendor SDK. | No extra abstraction phase, runtime registry or new provider implementation. |
| Implementation plan Phase 6 | Continue Jev mock-first contract tests; refresh pinned SDK/model/reference evidence at implementation time. Current docs resolve two historical reference inconsistencies noted in §1. | Live authorization/account handling prerequisites; no Decisions credentials or network calls. |
| `docs/evaluation-protocol.md` | Record Decisions as a deferred challenger, not an enabled arm. Make future admission conditional on the same response and privacy invariants; never manufacture probabilities to qualify. | Existing arms, Gate A/B/C separation, budgets and targets; no claim of measured gains. |
| `docs/threat-model.md`, T5/T6/T14 | Add concise risk that same-vendor naming can lead to credential, data-policy or confidence-semantic assumptions across distinct APIs. | Separate egress/auth approval, minimized state, no confidence-as-permission. |
| `docs/planning-readiness.md` and plan deferred list | Record the public-contract evidence gap and §6 re-entry checklist; explicitly say it does not block Jev-first hermetic work. | Ryan's outstanding private-data terms remain separate from approved ordinary handling; the four Phase 9 policy directions plus host matrix and bounded retention policy are settled in the normative contract. |

Acceptance for these amendments: current selector fixtures and policy semantics do not need to change; no new live lane is enabled; future integration ownership is clear; missing provider evidence is visible rather than silently normalized. Broader consistency cleanup belongs to the downstream synthesis/review, not this comparison.

## 6. Decisions re-entry checklist and unresolved questions

Before proposing an implementation, obtain official, version-identifiable evidence for:

- Exact endpoint, SDK support, input/answer/error contracts, option limits, response correlation, batching and cancellation/deadline behavior.
- Complete probabilities/rankings and their semantics—or an explicit reviewed proposal for how a different answer representation would alter yfere's ranking policy. Refusals, invalid outputs and no-match must fail closed.
- Preview/account access, auth scopes and credential lifecycle. No assumed reuse of Codex subscription/OAuth.
- Pricing units, limits, usage/billing visibility, model identity/version controls and deprecation expectations.
- Actual applicable request/log retention, deletion, training handling, residency/subprocessor terms and ZDR eligibility. No approval inferred from general platform policy.
- Authorized mock-contract fixtures first, then separately approved live comparison under the same held-out task/catalog/policy inputs as Jev. Confirm two-stage sequencing, order sensitivity, abstention coverage, injection resistance, tail latency and total attempt cost. Keep execution-quality claims behind the native execution gate.

Ryan's ordinary-account-versus-enterprise-ZDR decision for TypeSafe remains open; this report does not decide it. Whether to seek Decisions preview access is also not assumed. No evidence found here justifies changing the settled two-stage design or Jev-first MVP.

## Source register

All external sources below were retrieved on **2026-10-02 UTC**. Mutable reference pages have no publication date established unless stated. URLs are exact source handles; local references identify the effective documents read during this run.

### OpenAI-only product evidence

- **[O1] Official-account announcement via OpenAI-hosted embed.** `https://community.openai.com/t/devday-2026-announcements-and-developer-resources/1402006/15` — reply dated October 1, 2026; embedded `@OpenAIDevs` announcement dated September 29, 2026. Originating link recovered from the live DOM: `https://x.com/OpenAIDevs/status/2105003318917697873?s=20`. Direct X unavailable in extraction/browser. Only the official-account embed is used for product claims, not forum-member speculation.
- **[O2] Official API guides index.** `https://developers.openai.com/api/docs/llms.txt` — full index inspected; no Decisions entry.
- **[O3] Official API endpoint-reference index.** `https://developers.openai.com/api/reference/llms.txt` — full index inspected; no Decisions group/schema. Browser fallback also inspected `https://developers.openai.com/api/reference/overview` after extraction rate limiting.
- **[O4] Official developer blog index.** `https://developers.openai.com/blog/llms.txt` — no Decisions post in retrieved index. Discovery also followed `https://developers.openai.com/llms.txt` and `https://developers.openai.com/api/llms.txt`.
- **[O5] Official API changelog.** `https://developers.openai.com/api/docs/changelog.md` — inspected September 2026 entries, including September 22 Luna release and September 29 DevDay-related changes; no Decisions implementation contract there. These neighboring products are not substitutes for Decisions documentation.

### TypeSafe primary sources

- **[T1] System One HTTP API reference.** `https://docs.typesafe.ai/api.md` — complete Markdown recovered by direct public GET; request/response primitives, authentication, option limits, error statuses.
- **[T2] Models.** `https://docs.typesafe.ai/models.md` — complete Markdown; model pinning, aliases, price/context/limits and no-training statement. Prices are vendor-listed, not account billing verification.
- **[T3] Confidence.** `https://docs.typesafe.ai/confidence.md` — complete Markdown; primitive-specific distribution statistics and threshold guidance.
- **[T4] Introduction.** `https://docs.typesafe.ai/introduction.md` — independent parallel questions and code-composed atomic judgments; latency language is a vendor claim.
- **[T5] JavaScript client configuration.** `https://docs.typesafe.ai/sdk/javascript/api/interfaces/TypeSafeClientConfig.md` — explicit key, custom fetch, logging, per-attempt timeout and nested retry options.
- **[T6] Retry policy.** `https://docs.typesafe.ai/sdk/javascript/api/interfaces/RetryPolicy.md` — retry defaults, status sets and disabling retries.
- **[T7] SDK source and landing page.** `https://raw.githubusercontent.com/typesafe-ai/typesafe-sdk-js/v0.6.0/src/api-promise.ts` — inspected request-ID/withResponse implementation. Version tag is the one linked from `https://docs.typesafe.ai/sdk/javascript.md`; not a package installation or latest-release claim.
- **[T8] Legal index.** `https://docs.typesafe.ai/legal.md` — links governing documents and states enterprise ZDR offering.
- **[T9] Data Processing Addendum.** `https://typesafe.ai/legal/data-processing` — page reports last updated April 24, 2026; browser recovered Schedule I §8 purpose/law-based retention. Account-specific applicability/handling not verified; this is source reporting, not legal advice.
- **[T10] Documentation index.** `https://docs.typesafe.ai/llms.txt` — evaluation/cookbook discovery evidence only, not independent replication of their findings.

### Local planning sources

- **[L1]** `docs/decision-contracts.md` — runtime schema outlines, deterministic semantics, provider/replay and auth contracts.
- **[L2]** `docs/architecture.md` — selection flow, module ownership, provider separation, data minimization, roster/override semantics.
- **[L3]** `docs/evaluation-protocol.md` — arms, gates, fixture coverage, approved unmeasured targets and simpler-baseline rule.
- **[L4]** `.hermes/plans/2026-09-18_053427-yfere-implementation.md` — existing phases and decision-service seam.
- **[L5]** `docs/research-gap-audit.md` and `docs/audit-sources.json` — historical September 18 evidence used for discovery, not substituted for current contracts.
- **[L6]** `docs/threat-model.md` — T3/T5/T6/T14 and live/native execution authorization requirements.
- **[L7]** `docs/planning-readiness.md` — settled decisions, unresolved Ryan decisions and separately gated implementation/live/native work.

## Verification boundary

This is a public-document and local-plan comparison, not an executed service evaluation. The requested matrix, four disposition categories, option analysis, preserved selection semantics, plan impacts and source register are included. External retrieval failures were recovered where possible with direct Markdown GETs or browser inspection; direct X remained unavailable and its embed-only provenance is explicit. No unsupported Decisions contract or performance result is supplied. The unresolved result is specific to OpenAI Decisions: announcement evidence exists, but public integration contracts sufficient to implement a conforming yfere adapter were not found in the inspected sources; it does not reopen the settled Phase 9 direction.
