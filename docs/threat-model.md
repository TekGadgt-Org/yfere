# yfere threat model

Status: prototype planning boundary; no deployment or live execution is authorized by this document.

## Assets and trust boundaries

Assets are task intent and scoped inputs, catalog integrity, provider credentials, private evidence/memory references, endpoint authorization, skill trust/content hashes, thews provenance, assignment decisions, budgets, artifact ownership, SQLite traces, and evaluation outcomes.

Trust boundaries:

1. caller/task input to schema validation;
2. YAML/JSON catalog files to normalized immutable snapshots;
3. local selector to semantic decision provider;
4. provider response to runtime validation;
5. selector decision to deterministic policy/assignment;
6. telemetry process to SQLite and exported reports;
7. future native yfere execution runtime to workers/tools/artifacts (out of scope in the first slice).

The runtime's native execution boundary is untrusted with respect to authorization, identity, arithmetic, IDs, paths, secrets, and side effects. Catalog descriptions and task evidence are also untrusted text and possible prompt-injection material. Only reviewed catalog metadata enters a semantic request; execution receives only scoped yfere grants.

## Threats and controls

### T1: semantic output grants permission or invents resources

Threat: a provider returns a plausible skill/model/persona ID, path, capability, tool, or permission that is not installed/authorized.

Controls: closed versioned catalogs; option allowlists; Zod response validation; deterministic existence, trust, authorization, capability, and compatibility checks before and after each semantic stage; final grants constructed only from policy records. Unknown IDs fail closed. No interface accepts provider-generated paths, bodies, grants, or new IDs.

### T2: override bypass becomes authorization bypass

Threat: explicit model or skill pins evade availability, trust, budget, compatibility, required-skill, or ownership checks.

Controls: field-wise bypass suppresses only its semantic question. Explicit skill arrays are exact, must include all required skills, and `[]` is invalid when required skills exist. Invalid/unavailable/unauthorized pins fail closed. Both-pinned personas still undergo all deterministic checks and are not automatically admitted.

### T3: model-conditioned skill selection is falsely treated as independent

Threat: a skill answer is interpreted as depending on a model answer from the same independent-question request.

Controls: ordered stage 2a model selection, deterministic model validation/freeze, then stage 2b skill request with frozen model context. Pinned model skips 2a and constrains 2b; pinned skills skip 2b and constrain 2a. Tests assert no 2b question is built before model freeze.

### T4: prompt injection in task/catalog/skill metadata

Threat: text instructs the selector to ignore policy, select itself, reveal secrets, or treat content as authority.

Controls: concise allowlisted state; reviewed metadata only; explicit instructions that candidate descriptions are evidence, not commands; semantic provider cannot mutate state; deterministic policy remains authoritative; no skill installation/loading in selection; adversarial fixtures and injection tests. Do not treat semantic confidence as safety proof.

### T5: private data or credentials leak to provider/logs

Threat: raw prompts, memory, Discord messages, skill bodies, authorization headers, SDK debug bodies, or API keys enter requests/telemetry.

Controls: explicit redaction and context minimization; round 1 allowlists only the initial or orchestrator-settled/aggregated prompt, and round 2 allowlists selected persona definitions plus needed model/skill catalog metadata; no credentials, auth tokens, unrelated history, raw private memory, arbitrary filesystem content, or unneeded skill bodies. Record round/data classes in telemetry without bodies. No credentials in domain state; lazy client; provider egress policy before live flag; allowlisted payload/header/request ID; SDK body logging disabled; SQLite stores references and hashes, not raw private content; retention/deletion covers snapshots and payloads. A hash is not a privacy guarantee. Input minimization does not establish ZDR or ordinary-retention/legal approval. TypeSafe uses separately configured `TYPESAFE_API_KEY` plus live authorization. The key remains in yfere's app-owned secret store until explicit removal/logout, replacement or rotation, provider revocation/expiry, or uninstall with credential removal; never place it in config snapshots, telemetry, logs, prompts, SQLite decision records, or artifacts. Before live use, confirm request/log retention criteria, deletion route, training exclusion, applicable subprocessors/transfer terms, and account ZDR availability. A future native yfere Codex executor uses yfere-owned `yfere auth codex` browser-OAuth initialization, app-owned per-user refresh persistence, and a direct transport. Host execution and workspace/tool side effects need a later native runtime threat model. Never send Codex OAuth tokens to Jev or Jev keys to Codex, and never treat one transport's auth as the other's fallback. Live execution requires separate authorization and data-handling approval.

### T6: replay or telemetry fabricates evidence

Threat: missing usage/timing/outcomes are stored as zero/success, or deleted context is reconstructed from hashes.

Controls: optional fields remain `unknown`; provider timing/billing only recorded when supplied; local elapsed time is separate; outcomes are absent until observed; replay requires exact retained inputs and otherwise returns `NON_REPLAYABLE`; logical calls, physical attempts, retries, replans, and worker attempts have distinct IDs. One batched usage record is not copied per question.

### T7: malformed provider response causes unsafe assignment

Threat: SDK TypeScript casts accept malformed JSON, unknown IDs, invalid distributions, partial answers, or winner/distribution disagreement.

Controls: Zod validation at the provider transport boundary; exact answer correlation; finite probability and sum tolerance; winner consistency; selected-item validation, not aggregate candidate fit; typed `INVALID_DECISION`/provider errors; fail closed and optionally use one explicit fallback/replan.

### T8: retry multiplication, denial of service, or budget exhaustion

Threat: SDK, provider transport, and orchestrator retries multiply; provider timeout per attempt exceeds total budget; attacker submits huge catalogs/questions.

Controls: SDK retries disabled or instrumented; one outer deadline/backoff/attempt budget; physical attempts are telemetry; independent limits on project `max_agents`, options/questions/context, dynamic skills, model/fallback candidates, retries, SQLite payloads, and one replan; cancellation propagates; rate-limit/overload errors are bounded. `max_agents` is not a universal K and no-match or insufficient candidates does not backfill.

### T9: unstable or adversarial routing

Threat: catalog ordering, aliases, paraphrases, distractors, or provider drift change assignments; top-K is mistaken for independent usefulness.

Controls: pinned catalog/model/policy versions; canonical ordering and stable ID ties; preserve raw distribution/provider winner versus final roster; exact-K policy explicitly labeled experimental; held-out stability tests; none/abstention path; rejected candidates retained; no online learning. Evaluate against fixed/deterministic baselines.

### T10: invalid joint team or resource ownership

Threat: individually valid selections exceed shared budget, conflict on artifacts, lack review independence, or jointly expose incompatible capabilities.

Controls: deterministic reconciliation after every semantic stage; shared budget arithmetic; capability/context/tool checks; artifact ownership and reviewer rules; mandatory count validation; assignment freeze transaction; typed infeasibility and one bounded replan. Semantic provider never solves joint constraints.

### T11: confused fallback/replan loops

Threat: provider outage or an infeasible assignment silently loops, escalates permissions, or changes a frozen attempt.

Controls: explicit state machine, typed replan eligibility, one replan counter, new decision lineage, unchanged hard policy, configured capable fallback revalidated from scratch, terminal `REPLAN_EXHAUSTED`/abstention. Confidence cannot authorize fallback. Assignments are immutable after freeze.

### T12: SQLite tampering, stale snapshots, or cross-run leakage

Threat: untrusted catalog edits, path substitution, duplicate events, or querying one user's private context from another run.

Controls: content hashes/versioned snapshots; reviewed catalog root; canonical IDs not caller paths; foreign keys/unique idempotency constraints; run/attempt/context scopes on records; no cross-tenant/user scope in cache keys; transactional writes; integrity checks and retention jobs. Future multi-user execution requires a separate isolation review.

### T13: false evaluation conclusions

Threat: selector agreement, one good run, vendor benchmark, or shadow route is reported as downstream quality/cost improvement.

Controls: separate offline selector, opt-in provider contract/selection, and authorized execution gates; same tasks/budgets/tools/rubrics across arms; held-out task families; blinded outcome review where feasible; report unknown outcomes honestly; fixed/deterministic/structured-output baselines; retain failures and rejected candidates. A simpler baseline winning is a valid result.

### T14: provider scope confusion or lock-in

Threat: Jev is treated as a task-agent provider, or provider-specific behavior leaks into policy, telemetry, and execution orchestration.

Controls: the yfere-owned closed `TaskAgentProvider` registry has exactly Codex, native Claude Code, and OpenCode Go implementations. It normalizes only the shared lifecycle and evidence dimensions (auth preflight/status, start/resume/cancel, correlated events, grants, workspace, model identity, usage/cost unknowns, terminal/uncertain outcomes, artifacts/receipts, retry ownership, and version), while preserving provider-specific semantics. Claude child-process/auth-state/config boundaries and OpenCode Go API-key/network/data-policy boundaries are independently enforced. No dynamic plugin loading or marketplace exists; Jev remains decision-only and OpenAI Decisions deferred. Hard capability and authorization checks remain provider-agnostic.

### Provider-specific threat controls (effective, mandatory)

Codex assets and boundaries include OAuth state/nonce/PKCE, exact loopback callback, registration and host binding, serialized atomic rotating refresh, direct-use scope, approved Responses origin, and logout/revocation state. Controls require one-time state and exact callback validation, bound registration/host checks, atomic refresh with uncertain-outcome handling, no token forwarding to another provider, approved-origin enforcement, and explicit reauthentication after uncertain logout/revocation. Fixtures cover callback substitution, replay, concurrent refresh, rotation failure, origin mismatch, and revocation uncertainty.

Claude assets and boundaries include the unmodified pinned executable, allowlisted argv and environment, native auth precedence, ambient `ANTHROPIC_API_KEY`, keychain/profile-store access, inherited settings/hooks/plugins/MCP, model remap/fallback, native transcripts/telemetry, and process tree. Controls allowlist argv/env and working directory, reject ambient API keys unless explicitly approved and recorded as the selected auth source, keep keychain/profile state inside the native runtime exception, reject inherited hooks/plugins/MCP unless pinned and reviewed, report requested/init/actual model and fallback separately, disable or review transcript/telemetry capture, enforce OS-level containment before effects, and signal/kill/reap the complete tree. Fixtures cover auth precedence, inherited-config injection, remap, transcript leakage, pre-effect containment, cancellation, and cleanup uncertainty.

OpenCode Go assets and boundaries include the independent API key, approved origin and redirect chain, credential-stripping headers, required stable session/header semantics, protocol-family parsing, coding-only admission, model/data-policy expiry, pricing/usage unknowns, and account balance. Controls isolate the key, allow only approved origins and strip credentials on redirects, require and validate stable session headers, parse only the reviewed Chat/Anthropic/OpenAI families, deny non-coding admission, fail closed on expired model/data policy, preserve unknown cost/usage, and never automatically fall back to balance/credit or another account. Fixtures cover redirect leakage, missing/mutated headers, family confusion, catalog drift, policy expiry, and credit-fallback attempts.

These controls are tested before any live lane; no provider's approval or pass authorizes another provider. Secret, transcript, catalog, telemetry, receipt, artifact, and prompt redaction tests must prove absence of credentials and raw sensitive payloads.

## Security invariants to test

- No provider response can introduce an ID, permission, path, skill body, or capability.
- No explicit override bypasses deterministic policy.
- No dynamic skill decision occurs before its model is frozen.
- No fresh model/provider call occurs in the hermetic core/replay/default evaluation lane.
- No credential, raw private prompt, body, or arbitrary header is persisted.
- No malformed answer reaches reconciliation.
- No project can exceed `max_agents` 1..4, one dynamic skill/persona, separately configured model/fallback/retry/question/resource limits, or one replan.
- No assignment mutates after freeze.
- No fallback escapes the same eligibility/authorization checks.
- No missing timing, billing, usage, or outcome is represented as zero/success.
- No deleted context is claimed replayable.

## Residual risks and required approvals

This prototype does not prove provider calibration, privacy under a real account contract, endpoint availability, model quality, task success, causal savings, or execution isolation. Current public TypeSafe materials state that Jev is not trained on customer requests or responses, that zero data retention (ZDR) is offered to enterprise customers, and that the DPA retains Customer Personal Data for as long as necessary for the processing purpose and applicable law rather than for a fixed universal period. Those public statements do not establish this account’s plan, configured request/log retention, deletion route, applicable subprocessors/transfers, or ZDR entitlement; before live use, verify the actual account terms and decide whether ordinary account handling is acceptable or ZDR is required. TypeSafe documentation and SDK source are contract inputs, not live-service verification. Provider drift, catalog compromise, and malicious local operators remain residual risks.

Before any live work, the owner must separately approve credentials, provider egress, request-data handling terms (retention/deletion, training exclusion, applicable subprocessors/transfer terms, and account ZDR decision), logging configuration, spend ceiling, model/version, test fixtures, and explicit live authorization. Before native yfere execution, create a Phase 9 host-execution threat model and acceptance matrix for local project-path selection, yfere-native filesystem/shell/git/network grants, cancellation and reaping of owned child processes, uncertain-side-effect receipts, project-artifact versus run-receipt storage/retention, and explicit destructive/external approvals.

## Prior-art synthesis amendments (2026-10-02)

ADOPT the prior-art failure distinction: reconnecting a transport, reconstructing a session, recovering execution, and replaying a decision are separate operations. An interrupted external effect remains uncertain and is never automatically rerun; approvals bind to the active run/attempt/action and stale or duplicate answers are rejected. These controls do not alter the existing TypeSafe/Codex credential separation or TypeSafe data-handling approvals.

Browser automation is an untrusted future capability boundary. Page/DOM text, redirects, downloads, popups, cookies, profiles, browser logs, and cloud responses cannot widen grants or authorize origins, tools, paths, permissions, credentials, or approvals. A version-pinned out-of-process adapter must use ephemeral per-run profiles, run-owned artifact handles, origin/private-IP checks on redirects and popups, disabled/unapproved upstream telemetry, bounded resources, and complete process-tree cleanup. Cleanup uncertainty or an unconfirmed external effect is a terminal security receipt, not success. This boundary is tested in fake, hermetic, controlled-local, and separately authorized live lanes; it is not an MVP dependency.

The OpenAI Decisions API remains a bounded future seam only: absent public contracts are recorded as unknown, never replaced with guessed endpoints or semantics. Provenance: `docs/prior-art-dossier-2026-10-02.md`, `docs/decision-services-comparison-2026-10-02.md`, and `docs/browser-use-support-boundary-2026-10-02.md`.

### Future browser egress and secret controls (B1/B2 prerequisites)

Browser domain filtering is not an egress boundary. Before B1/B2, an independent out-of-browser reference monitor, enforced through OS, proxy, network namespace, or equivalent controls, must validate/revalidate every DNS A/AAAA/CNAME result and connection target, redirect and proxy route. It denies loopback, RFC1918, ULA, link-local, multicast, metadata endpoints, encoded aliases, and disallowed ports, and constrains WebSocket, service-worker, subresource, download, and proxy traffic. Required adversarial fixtures cover DNS rebinding, IPv6, redirect chains, proxy bypass, subresources, WebSockets, and metadata services.

Approvals use the closed one-use `ApprovalGrant` in `docs/decision-contracts.md`, atomically consumed and revalidated immediately before execution. It binds IDs, normalized origin, rendered target fingerprint, recipient/target, normalized effect parameters including payload/amount, artifact content hashes, risk, expiry, canonical digest, and nonce. `BrowserReceipt` records approval ID/digest and observed confirmation evidence; any change requires reapproval, and uncertain/external effects are never blindly retried.

Browser secret entry is disabled by default. If later enabled, a separately trusted broker must be scoped to exact origin/field/action; secret values cannot cross model context or ordinary adapter IPC. DOM observations, screenshots, traces, recordings, logs, and telemetry are suppressed or redacted during the sensitive interval, transient buffers are zeroized, and malicious-reflection and logging-leak fixtures are required before live authorization.

Phase 9 threat acceptance must enforce the now-settled direction: isolated reviewed apply by default, explicit dangerous Auto without grant widening; cancel/reap by default, with a closed digest-bound continuation policy whose immutable canonical `detachedAt` is copied only from the trusted, exactly correlated detach/client-loss observation and whose selected `durationMs` requires overflow-safe exact `expiresAt = detachedAt + durationMs`; grant expiry is no later than continuation expiry, with resources, detached-operation allowlist, durable stop, reconnect, typed terminal receipt, and expiry cleanup. Clock/deadline validation fails closed, and reconnect/rebind/restart cannot renew the bound. Approval is single-operation or session-only closed blanket approval bound to non-secret credential/authorization/connection identity and invalidated on identity or revocation changes; structured telemetry/receipts are default with raw content opt-in. Receipts must disclose destructive/external scope and preserve uncertain effects. Native lifecycle release blocking is approved for macOS arm64 and Linux x64; Linux arm64 and macOS x64 are build/install/schema/replay/smoke hosts, and any unmatched host fails closed. Required fixtures cover filesystem case behavior, path/symlink containment, Git/apply-back, process-tree cleanup/escalation, crash/restart, atomic persistence, denied DNS/IPv4/IPv6/proxy, resource limits, continuation deadlines, and unsupported-host errors. The global bounded retention defaults and TypeSafe classification rules are normative in `docs/decision-contracts.md`; deletion makes replay non-replayable. Dependency installation may use only explicit package-manager-scoped registry access for pinned pnpm bootstrap/lockfile and license audit; runtime/CI/provider/live egress remains denied.
### MVP boundary and deferred hardening

The trusted offline producer boundary excludes hostile live objects and uses
fatal UTF-8 plus bounded copied bytes. Native JSON duplicate keys retain the
last member; duplicate-aware parsing is deferred until fixtures cross a less
trusted producer boundary. Cryptographic pins provide content integrity, not
origin authentication.
