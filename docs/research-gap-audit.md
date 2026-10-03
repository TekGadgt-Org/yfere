# yfere research-gap audit

AI-generated for Ryan McGovern; not yet human-reviewed. Audit date: 2026-09-18 UTC. Documentation/source inspection only: no inference, credentials, installations, implementation, or external publication.

## Verdict

**The current implementation plan needs correction before implementation, but its standalone, offline-first, two-stage direction remains sound.** The principal blockers are local policy contradictions and incomplete transport/evaluation contracts—not evidence of a newly incompatible Jev API. Keep persona Choice → selected-persona model/skill questions; do not silently substitute the older speculative-all-personas design.

Evidence labels below: **Documented** means the current vendor reference states it, not that the service was tested; **Source-observed** means inspected SDK/cookbook code; **Inference/recommendation** means this audit's conclusion; **Untested** means a hypothesis or live verification still required.

### Local material inspected in full

Root: `/srv/obsidian/vault/Research/Adaptive Multi-Model Agent Harness/`.

- Notes `00 - Index.md` through `07 - MVP Decision Telemetry.md`.
- `sources.json`, `source-manifest.json`, `verification/artifact-qa.json`, and `verification/skill_gate_probe.py` (read, not rerun).
- Plan: `/opt/hermes/workspace/yfere/.hermes/plans/2026-09-18_053427-yfere-implementation.md` (references below use its present line numbers).

Started with the supplied TypeSafe skill and followed its live-doc index and relevant SDK links.[1][2] Several web extractions omitted substantive text; direct public Markdown/raw-source GETs recovered it. Current docs are mutable; JS source references below are tag-pinned to `v0.6.0`, the version linked by the SDK landing page, not a claim that a package was installed or that the tag is an immutable commit.[4]

## 1. Verified current contracts

| Evidence | Current contract | Implementation consequence |
| --- | --- | --- |
| Documented | `POST https://api.typesafe.ai/v1/systemone`; bearer authentication; `state`, `model`, `questions` map; matching `answers` map, `model`, `usage.input_tokens` and `usage.output_tokens`.[3] | Separate wire schema from domain assignments. Correlate by question ID, never object iteration order. |
| Documented | Question IDs are not used in inference. Mixed questions evaluate independently against the same state.[3][17] | Put persona identity and complete question meaning in instructions/state. No question can consume another answer in that request. |
| Documented | Choice returns one highest-probability option, full normalized option probabilities, and confidence; maximum 255 options.[3][5] | Top-K is code policy, not native multi-select. Include any `none` sentinel within the option limit. |
| Documented | Choice/Score confidence is a distribution statistic; Noul has no separate confidence.[8] | Never interpret confidence as authorization, team utility, or measured task-success probability. Preserve primitive-specific answer types. |
| Documented | Current model is `jev-1.13.0`; both aliases point there at retrieval. Text inputs only; 64k total state/questions and 32k state plus longest question. Listed input price is $0.042/M tokens, output free; listed quotas are explicitly changeable.[7] | Pin evaluation model/config; bound both context budgets. Treat price as an estimate basis, quotas as current documentation, not an account SLA. |
| Documented/source-observed | JS SDK uses `@typesafe-ai/sdk`, Node 20+, `TypeSafeClient.systemOne(...)`. Constructor requires a key; custom `fetch` is supported.[4][14][15] | Lazy live-client creation. Offline core/replay must not construct a default credential-seeking client. |
| Source-observed | The inspected JS client parses a response and casts `parsed as T`; it does not runtime-validate returned answers/distributions. Extra request-variable properties are forwarded.[15][16] | Zod/runtime validation is mandatory at the adapter boundary. Construct an explicit allowlisted wire payload; do not spread domain objects containing private fields into it. |

**Untested:** actual account access, alias resolution, service schema edge cases, model accuracy/calibration, throughput, billing, and end-to-end latency. None is established by this audit.

## 2. Changed/stale assumptions and remaining documentation discrepancies

1. **Local design precedence, not an API change:** note 06 explicitly supersedes the single-request preference in notes 01 §5, 02 §3, and experiment E2. The plan correctly follows note 06. Treat those older recommendations as alternative experiment history, not concurrent requirements. Likewise, the older Discord/worker/memory demonstration in note 00 and note 01 §10 is superseded for the first slice by the plan's standalone scope.
2. **No demonstrated version/price migration since the local research:** the research's v1 endpoint, `jev-1.13.0`, price and context limits still match the retrieved references.[3][7] Nevertheless, reject preview fixtures: the migration guide replaces `document/prompts/responses/chosen/probability/expectation` with `state/questions/answers/choice/noul/score`, changes confidence computation, and says even early-v1 `document` requests now fail validation.[9]
3. **Criteria discrepancy persists:** HTTP docs narrow Choice descriptions to string/null and require instructions; primitive guidance allows objects/arrays, and the JS types additionally allow omitted/null instructions and null state.[3][5][16] Recommendation: require meaningful instructions and non-null state in yfere; use string descriptions initially. Structured criteria remain a deliberate adapter-contract test, not a reason to broaden all domain types blindly.
4. **Resolved-model discrepancy persists:** the models page promises a versioned response ID, while HTTP examples still return `jev-latest`.[7][3] Store requested model and verbatim returned model separately; never fabricate a resolved version from an alias table. Pin the request for evaluations and flag unexpected returned metadata.
5. **Do not transfer playground timing into the SDK schema:** the inspected HTTP/JS result contracts contain model, answers, and usage, not `evaluation_time_ms`.[3][12][13] Note 02's user-supplied playground field remains evidence about that supplied payload only. Provider timing is optional/unverified until a supported source is established.
6. **Cookbook limitations remain current:** its published run is on Jev 1.12, rendered 2026-07-31, with synthetic requests and first-response skill-loading outcomes. Its `suggest()` still gates the winner with `max(fits.values())`, not the winner's own fit.[18] Reported improvement is a vendor experiment, not proof of downstream yfere gains or a selected-item safety invariant.
7. **Local QA provenance is stale:** `verification/artifact-qa.json` reports the original six-note bundle; the manifest stops at citation 64 while the ledger includes the two amendment sources. It does not certify notes 06/07. This affects audit provenance, not the validity of the clarified design.

## 3. Two-stage and top-K assessment

**Documented fit:** constructing request B after request A is consistent with independent-question semantics; the supplied skill expressly allows a later request when earlier answers determine new state/options.[1][17] B can batch unresolved questions for selected personas. Fully pinned personas need no B questions; if all are pinned, skip B entirely.

**Unresolved internal dependency:** note 01 §6 chooses a model before choosing a skill using that model. Plan lines 166–168 instead permit model/skill questions in the same second request. Those independent questions cannot refer to “the model chosen by the other question.”[17]

Recommendation: preserve two dependent selection stages by making dynamic skill ranking depend only on the known task/persona/catalog, then deterministically reconcile model–skill compatibility. Pre-filter against a pinned model when present; for two dynamic fields, define whether an incompatible optional skill is dropped or the bounded replan is used. If semantic skill choice must see the actual dynamically selected model, explicitly approve sequential substeps/another request instead of pretending it fits one batch.

**Top-K remains an untested team-selection hypothesis.** A single Choice distribution ranks competing answers to one question; it does not establish independent usefulness or complementary coverage.[1][5] The fan-out claim that extra questions add little/no latency is vendor guidance, not a measured yfere budget guarantee.[6] No universal confidence threshold follows.

Keep the orchestrator's configured `K ∈ 1..4`, first fixtures K=3, but settle these before schemas/tests:

- Is K an exact experimental roster size or a cap? Distinguish requested K, effective roster, and running worker count. The plan's simple-task/no-extra-worker fixture cannot prove adaptive staffing if the selector always emits three agents.
- What happens with fewer eligible personas, all negligible tail probabilities, or a `none` winner? A `none` option must not be discarded merely to fill K. Recommendation: typed no-match abstention, no silent backfill; label any exact-K padding policy explicitly as experimental.
- Do mandatory personas consume K slots or extend the roster? Recommendation: reserve their slots, deduplicate, and fail if mandatory roles exceed the cap; retain raw ranking separately from the final policy-adjusted roster.
- Define stable ties, distribution-key equality, finite probabilities, sum tolerance, and winner/argmax consistency. Do not silently renormalize malformed results. A deterministic tie-break can differ from a tied provider winner; log that policy distinction.
- Define empty/single-candidate behavior and oversized catalogs before transport. Do not merge probabilities from separate Choice chunks as though they were one normalized distribution.

## 4. Override semantics: one blocking contradiction

Plan line 34 and test line 285 say `skills: []` attaches none, while the same policy retains required/default skills deterministically. Note 01 §6 says required skills can never be removed. These statements cannot all mean “final attached skill list.”

Recommendation for the spec owner, preserving the explicit-empty decision:

- Omitted/`auto`: deterministic required/default set plus at most one selected dynamic addition.
- Explicit list, including `[]`: exact pinned final set; no skill question. An explicit list may replace defaults, but must include all required skills. Therefore `[]` is valid only for personas without required skills; otherwise return a typed configuration error, not silent augmentation/removal.
- Pinned model only: suppress model question and constrain skill candidates to that endpoint. Pinned skills only: suppress skill question and constrain model candidates to the full pinned bundle. Both: no semantic questions, but all deterministic checks still apply.
- A model/skill pin does not itself force persona admission. Specify mandatory-persona policy separately. An invalid/unavailable pin fails closed; do not substitute another value without explicit fallback authority and a trace.

These are proposed yfere semantics, not TypeSafe features. They need explicit adoption in the plan and contracts, not an implicit implementation choice.

## 5. Telemetry and transport amendments

**Documented/source-observed:** JS retry defaults are two retries after the initial attempt, retryable 408/429/5xx plus connection/timeouts, and 10,000 ms timeout **per attempt**, with no total retry budget. `AbortSignal` covers requests and pending retries; partial retry settings inherit defaults.[10][11][14] Plan line 257 (“retries outside … total deadline budget”) should say all attempts and backoff consume the same outer deadline/budget.

Recommendation: give one layer retry ownership; the simplest observable adapter sets SDK `retry.maxRetries=0` and manages bounded attempts under one shared deadline. If SDK retries remain enabled, instrument the injected transport to capture physical attempts. Distinguish retry, replan, and worker attempt IDs; a provider retry must not reset the one-replan allowance.

The SDK's `.withResponse()` exposes parsed data, HTTP response, and optional request ID from `x-typesafe-request-id`.[19] Define an allowlist of retained headers rather than logging everything. Explicitly set SDK log level: `debug` includes unredacted bodies, and environment variables can otherwise change logging, base URL, and default model.[14]

Minimum telemetry contract recommendation:

- `run → selection-stage → logical provider call → physical attempts → question answers → resolved assignment`; separate override/policy events and downstream outcome references.
- Record per-call usage once, not once per question/persona. Record unknown attempt usage/billing as unknown; a final successful response is not evidence of aggregate retry charges. Separate local estimated cost and provider-confirmed billing.
- Capture request model, returned model, SDK version, policy/question/catalog versions, raw validated distribution, provider winner, final selections, excluded IDs/reasons, bypasses and fallback/replan cause.
- Use client wall-clock decision duration separately from any optional provider timing; distinguish aggregate worker duration, wall-clock task duration, total tokens and peak context.
- Start minimal persisted decision events with the first executable selector, not only Phase 7. Phase 7 can add fuller SQLite/replay reporting.
- Retain replayable sanitized fixtures/snapshots under a defined retention/access policy. If necessary context was deleted/redacted, mark a trace non-replayable rather than claiming hashes reconstruct it. Outcomes absent before execution stay absent, not synthetic successes.

## 6. No-key path and evaluation-order correction

**Offline development is feasible as a yfere design, not local Jev inference.** The live constructor requires an API key, but custom fetch is explicitly supported for tests.[14][15] No service request is needed for domain/policy tests or saved-response replay.

Amend the plan's opening gate and Phase 6 prerequisite: credentials gate only explicitly authorized live tests—not SDK adapter development or mocked contract tests. Default execution selects a fixture/rule provider and never constructs a live client. Mock SDK tests can use a clearly synthetic key with a fetch stub that cannot reach the network; missing fixtures fail closed. Key presence alone is not authorization: require an explicit live flag plus approval, and keep default CI network-denied. Fixtures must label synthetic, documented-example, and genuinely recorded-live provenance separately. Cookbook cache replay with a placeholder key is not itself an egress guard.[18]

**Evaluation gate deadlock:** Phase 8 requires accepted-task quality/cost gains before Phase 9, while real execution is deferred and worker attempts are initially only interfaces. Selection fixtures, shadow routes, and request timing cannot establish those task outcomes.

Recommendation: split gates:

1. Offline selector gate: schema/policy validity, deterministic replay, no-network behavior, privacy checks, and fixture coverage.
2. Opt-in Jev contract/selection gate: actual supported request shapes, failure behavior, selector quality/stability/overhead on approved labeled tasks.
3. Separately authorized thin execution experiment: execute matched routed and baseline assignments, then assess accepted-task quality and total cost. This supplies the evidence for expanding integration, not a prerequisite that fixtures are expected to satisfy.

Keep thresholds, objective priority, representative tasks, endpoint/spend limits and private-data egress approval as explicit unresolved human decisions. Vendor calibration/skill-load/latency claims do not settle them.[1][6][18]

## 7. Required plan amendments before coding

| Priority | Plan location | Amendment / acceptance evidence |
| --- | --- | --- |
| Blocking | §2.5; Phase 2/5 | Resolve explicit-empty versus required/default skills; test empty with and without required skills, partial/full pins, invalid pins. |
| Blocking | §4.3; Phase 5 | Freeze stage-two dependency/reconciliation policy; test independent choices that form an incompatible pair, all-pinned/empty-question bypass, mandatory-cap overflow, no-match and fewer-than-K candidates. |
| Blocking | Phase 8–9 gate | Separate selector evidence from executed-task outcome evidence; remove circular execution prerequisite. |
| Before adapter | §4.2; Phase 3/6 | Pin SDK contract, allowlist payload, validate runtime responses, define numeric tolerances, retry ownership/deadline and metadata availability. Add 408/5xx/abort/backoff and non-JSON-success fixtures alongside existing status cases. |
| Before first selector | §2.10; Phase 5/7 | Persist minimal events immediately; add call/attempt identity and no-double-charge tests; distinguish unavailable outcome/timing/billing fields. |
| Before any live work | Opening gate; §2.11; Phase 6 | Split mock versus live prerequisites; explicit live authorization beyond key presence; approved egress/logging/retention and spend controls. |

No plan or vault edits were made by this audit. The downstream specification should incorporate these corrections without reopening the agreed standalone stack, two-stage persona-first flow, closed catalogs, bounded replan, or deferred Discord/memory scope.

## Sources

[1] https://raw.githubusercontent.com/typesafe-ai/skills/main/skills/typesafe-ai/SKILL.md
[2] https://docs.typesafe.ai/llms.txt
[3] https://docs.typesafe.ai/api.md
[4] https://docs.typesafe.ai/sdk/javascript.md
[5] https://docs.typesafe.ai/primitives/choice.md
[6] https://docs.typesafe.ai/patterns/fan-out.md
[7] https://docs.typesafe.ai/models.md
[8] https://docs.typesafe.ai/confidence.md
[9] https://docs.typesafe.ai/migrating-to-v1.md
[10] https://docs.typesafe.ai/sdk/javascript/api/interfaces/RetryPolicy.md
[11] https://docs.typesafe.ai/sdk/javascript/api/interfaces/RequestOptions.md
[12] https://docs.typesafe.ai/sdk/javascript/api/interfaces/SystemOneResult.md
[13] https://docs.typesafe.ai/sdk/javascript/api/interfaces/Usage.md
[14] https://docs.typesafe.ai/sdk/javascript/api/interfaces/TypeSafeClientConfig.md
[15] https://raw.githubusercontent.com/typesafe-ai/typesafe-sdk-js/v0.6.0/src/client.ts
[16] https://raw.githubusercontent.com/typesafe-ai/typesafe-sdk-js/v0.6.0/src/types.ts
[17] https://docs.typesafe.ai/introduction.md
[18] https://docs.typesafe.ai/cookbooks/skill_suggestion.md
[19] https://raw.githubusercontent.com/typesafe-ai/typesafe-sdk-js/v0.6.0/src/api-promise.ts
