# Initial yfere task-agent provider contracts — 2026-10-02

Prepared by Ryan's AI research agent; not yet human-reviewed. Research and proposed amendments only. This report does not change effective planning documents or authorize implementation, installation, authentication, inference, purchases, or publication.

## 1. Decision and evidence boundary

The initial task-agent providers are **Codex, Claude Code, and OpenCode Go**. That scope is settled. Jev remains the separate initial persona/model/skill decision service; OpenAI Decisions remains deferred. `max_agents: 3` limits selected agents, not provider slots. Several assignments can use the same provider.

Recommended boundaries:

1. **Codex:** retain yfere-owned browser OAuth, protected refresh storage, and direct inference. Current OpenAI documentation now supplies an explicit public-client registration and ChatGPT-plan Responses route: use that contract rather than impersonating Codex or copying another app's login. [O1–O6]
2. **Claude Code:** supervise the unmodified, version-pinned native Claude Code application with its own authentication. Use print-mode structured output, not a yfere HTTP client holding Claude subscription OAuth. Native runtime execution is a deliberate provider-specific exception to the older blanket rejection of external harness adapters; it does not replace yfere's orchestration or authorization authority. [C1–C4]
3. **OpenCode Go:** use a direct documented Go endpoint adapter, with an independent API key and yfere-owned tool loop. Do not add the OpenCode CLI/server merely to transport model requests. Its local session runtime would introduce a second tool, permission, persistence, and retry authority without being necessary for Go access. [G1–G8]

These are engineering recommendations supported by published contracts, not a legal opinion or proof of account eligibility. No credentials, installed provider runtimes, login flows, catalog/inference endpoints, or accounts were accessed. Public documentation, release metadata, and public source files were read. No live interoperability, billing, cancellation, auth, or revocation test was performed.

### Source dates and pins

Research date: October 2, 2026; live terminal time confirmed `2026-10-02T21:40:52Z` during collection. Documentation collection continued later that evening. This is a retrieval-time snapshot, not a claim about commits published after retrieval or the whole day's final state.

| Surface | Evidence identity | Limitation |
| --- | --- | --- |
| Claude Code distribution | Official releases API reported **v2.1.288**, published **2026-10-02T20:19:57Z**; immutable release flag true [C10] | Binary was not downloaded or run; recommend this as the initial candidate pin, subject to conformance/security acceptance |
| Claude documentation | Official `.md` pages retrieved October 2, 2026 [C1–C9, C11–C12] | Rolling documents with no uniform publication date; feature thresholds below are documentation claims, not test results |
| OpenCode source/docs | `108b988a08227df45417f27905a4d6b27ad49b6d`, committed **2026-10-02T20:56:07Z** [G0] | Pinned `dev` snapshot, not a release pin and not necessarily the deployed Go service revision |
| OpenCode policies | Terms effective **August 15, 2026**; privacy policy effective **March 6, 2026**, at the same pin [G9–G10] | Actual checkout/account-specific agreements were not accessed |
| OpenAI direct-auth documentation | Current official SIWC OSS pages retrieved October 2, 2026 [O1–O6] | Explicitly preview-limited; do not substitute ordinary API assumptions |
| Codex repository reference | `66561d03012edb96e4ea87513cb10dea4c909986`, committed **2026-10-02T21:40:39Z** [O7] | Reference identity only; this report's recommended direct transport is grounded in official SIWC docs, not app-server equivalence |

Initial extraction returned partial/stale text and unavailable Markdown extraction results. Direct public HTTPS reads of official `.md` and pinned raw repository files supplied the load-bearing evidence. Large SDK/reference outputs were searched and paged for relevant definitions. Local directory inspection found no Git repository at the workspace root; no branch/commit or diff claim is made.

## 2. Claude Code: native application, not borrowed OAuth

### 2.1 Authentication and policy facts

Documented: Pro/Max and team subscription users sign in through Claude's own browser flow. Console users can use API billing; supported cloud-provider paths also exist. Initial browser launch can fall back to a copied login URL and a code pasted into the native terminal when the callback cannot reach an SSH/container/WSL session. `claude auth login`, `claude auth logout`, and `claude auth status` are CLI commands. Status defaults to JSON and returns exit 0 for logged in, 1 otherwise. Login is an explicit operator operation, never an inference preflight side effect. [C2–C3]

Important distinction: Console authentication is not synonymous with a static API key. Since v2.1.242, native Console login may create a refreshable OAuth Anthropic profile rather than an API key; the legacy key-creation path remains. Subscription OAuth and Console OAuth have different account/billing contexts. Keyless Console profiles live outside `CLAUDE_CONFIG_DIR`; configuration-directory separation alone does not isolate them. [C2]

Documented legal boundary: the legal/compliance page distinguishes running the unmodified Claude Code binary, with users signing in themselves, from third-party collection or intermediation of Claude.ai credentials. It states conditions for offering Claude Code in products, including Commercial Terms, preserving built-in authentication methods, and direct user billing rather than reselling/intermediating usage. Pro/Max advertised limits assume ordinary individual usage. Developer products interacting directly with Claude should use API keys or supported cloud credentials. [C1]

**Recommendation:** yfere's auth UX opens/delegates to native Claude Code, using its selected native configuration context. It never supplies its own Claude.ai OAuth screen, reads or imports token files, copies a token into its secret store, intercepts an auth callback, or replays subscription credentials in HTTP. Do not disguise yfere as Claude Code. Do not disable native login methods to force a billing choice. Selecting a user-requested connection for one invocation is different from modifying or restricting the application itself.

**Unresolved:** confirm the actual account agreement, intended automation volume, and any distributed/hosted yfere business model before live use. A native subprocess is the supported architectural direction, not blanket approval of all uses. The fetched consumer-terms material in supporting research was region-specific and is not evidence of Ryan's applicable US agreement; this report relies on the product-specific official policy and explicitly leaves account acceptance open. [C1]

### 2.2 Lifecycle, storage, and preflight

| Operation | Documented surface | yfere recommendation / limitation |
| --- | --- | --- |
| Runtime identity | `claude --version`; init `claude_code_version` [C3,C5] | Pin executable path/version and distribution digest; reject unexpected changes rather than updating inside a task |
| Auth status | `claude auth status`; `authMethod` includes `none`, `claude.ai`, `oauth_token`, `api_key`, `api_key_helper`, `third_party`; `configDirectory` documented from v2.1.268 [C3] | Allowlist status fields; never persist raw account/status output. Separate credential-present from provider entitlement, reachability, model access, and policy acceptance |
| Interactive setup | Native `auth login`, optionally `--console`, `--email`, `--sso` [C3] | Run only on an explicit separately authorized operator path. Never start a browser during scheduled preflight; never ingest a pasted code into task/model context |
| Native storage | macOS Keychain, with documented file fallback; Linux `.credentials.json` mode 0600; Windows user-profile ACL inheritance [C2] | Claude owns reading/refresh/write. A dedicated Claude configuration context is recommended; yfere stores only an opaque connection reference |
| Directory isolation | `CLAUDE_CONFIG_DIR` isolates subscription login/API-key state and settings/history, including the macOS Keychain identity [C2] | Use the same context for status/login/run/logout; account for the separate keyless Console profile store. Do not claim cryptographic or process isolation from a directory alone |
| Refresh/expiry | Native subscription/profile handling; failed profile refresh requires sign-in again [C2] | Report `reauth_required`; do not fall back to an ambient key or another account |
| Logout | `auth logout` / native `/logout`; keyless Console logout is documented to remove and revoke the credential it created [C2,C3] | Stop owned work first. Delegate logout and report native status. Do not claim every logout revokes every token, API key, or remote session |
| Rotation/revocation | Account/provider-specific; native long-lived `setup-token` is documented for scripts [C2] | Do not harvest `setup-token`. API-key replacement/revocation is an operator/native Console action. Local removal and confirmed remote revocation remain separate states |

Environment inheritance is a billing and security hazard. In print mode, `ANTHROPIC_API_KEY` overrides subscription login when present. Custom auth tokens, helpers, provider selection, profiles, base URLs, and proxy settings also affect the credential/route actually used. Use an allowlisted launch environment, not `...process.env`; preserve the operator-selected native method without importing Hermes, Codex, Go, or Jev secrets. Reject conflicts and unapproved endpoints rather than silently resolving them. Native managed settings remain authoritative and can reject the launch. [C2,C9]

### 2.3 Automation surface and semantics

Recommended first seam: one owned native process per active worker invocation, prompt over bounded stdin, arguments as an argv array (no shell interpolation), `-p --output-format stream-json --verbose --include-partial-messages`. Prefer a single task input over streaming-input queues initially. This is a recommended composition of documented flags, not an exercised invocation. [C3–C4]

| Concern | Documented contract | Required adapter treatment |
| --- | --- | --- |
| Output | `text`, `json`, NDJSON `stream-json`; schema output via `--json-schema`, result in `structured_output` [C3,C4] | Bound bytes/line length, validate runtime schema; never treat schema success as task acceptance |
| Initialization | `system/init`: session ID, model, tools, MCP servers, runtime version, permission mode, plugins; hooks/plugin startup events may precede it [C4,C5] | Do not require init to be the first line; reject unexpected execution surfaces before dispatch wherever enforceable, not only after an event reports them |
| Session identity | `--session-id` requires UUID; `--resume` accepts ID/name/transcript path; `--fork-session`; `--no-session-persistence` forbids resume [C3,C4] | Persist exact opaque session binding to user/connection/workspace/attempt. Use explicit ID, never global `--continue` or user-supplied transcript path |
| Resume | Native history, compaction and current configuration; cross-project ID lookup from v2.1.223 [C3,C4] | Resume is new authorized execution, not read-only replay. Recheck grants and workspace; refuse foreign/missing sessions. Do not enable interrupted-turn replay automatically |
| Tools | `--tools` controls built-in availability, not MCP; `--allowedTools` auto-approves rather than creating an exclusive list; `--disallowedTools` denies/removes; special EndConversation behavior exists [C3] | Translate grants into availability AND permissions. Never assume a narrow allow list removes all other tools |
| Unattended approvals | `--permission-prompts none` (v2.1.259+) denies unresolved prompts; hooks/mode/rules still act first [C4] | Explicit deterministic mode, no auto-classifier authority or bypass-permissions. A denial is not successful execution |
| Turn/spend limits | `--max-turns`, `--max-budget-usd`; subagent spend is included in cap behavior from v2.1.217 [C3] | Add yfere outer deadline/resource caps. Native turns, tokens, money and selected-agent count are different limits |
| Cancellation | SIGTERM exits 143 without a final result for the unfinished turn, terminates active Bash process trees, runs SessionEnd hooks; SIGINT ends the turn instead [C4] | Supervisor owns bounded terminate/kill/reap. Keep cancellation and cleanup/effect uncertainty distinct; do not infer rollback |
| Errors | Invalid flags use stderr; in-run failures can use stdout result. Result subtypes include `success`, `error_max_turns`, `error_max_budget_usd`, `error_during_execution`, `error_max_structured_output_retries` [C4,C5] | Read both exit and final-result semantics, including `is_error`, stop/terminal reason, denials. EOF/exit 0 alone is insufficient |
| Retry | `system/api_retry`; some helper-auth retries lack events. `CLAUDE_CODE_MAX_RETRIES` defaults to 10; watchdog can retry capacity errors indefinitely [C4,C9] | Disable watchdog and request zero native API retries, then test the pinned runtime. Do not claim every physical request is observable; no outer worker replay |

Configuration isolation is essential. Plain `-p` loads project hooks and MCP without interactive trust prompts. `--bare` suppresses discovery but also skips OAuth/keychain; it is **not** the subscription-safe isolation shortcut. Current CLI documents `--safe-mode` retaining normal auth while suppressing customizations, and `--restricted` (v2.1.248+) restricting settings and command-capable tools. Managed policy still applies, including some hooks; `--settings` does not erase omitted inherited fields. [C3,C4,C7]

Recommended narrow first profile: isolated task workspace, native auth context, reviewed safe/restricted startup, explicit built-in tool set, no plugins/skills/agents/connectors/Chrome/remote control/cloud dispatch, and no uncontrolled MCP. Test exact flag composition at v2.1.288; do not assert it is already conformant. Initially deny arbitrary Bash and external effects unless the host boundary can enforce the grant. An approved Bash command is not confined merely by `cwd`. Use independent filesystem/process/egress enforcement. For exact-operation effects, either a reviewed native hook/permission bridge or yfere-controlled tool endpoint must validate the exact one-use grant before execution; otherwise advertise that capability as unsupported. A post-execution tool event cannot serve as permission. [C3,C4,C7]

### 2.4 Attribution, usage and privacy

Record requested model, init model, assistant response model, and per-model result attribution separately. Full IDs can pin better than aliases; aliases move by provider/version. `modelUsage` can report optional `canonicalModel`, `provider`, and `costBasis`; absence stays unknown. Retired-model remapping and automatic fallback exist; merely omitting `--fallback-model` is not proof that the assigned model served. Check current native fallback controls and returned identity; if strict model eligibility cannot be enforced before execution, that model/profile is ineligible for strict assignments. No model substitution may silently mutate the frozen yfere assignment. [C5,C12]

`total_cost_usd` and `modelUsage.*.costUSD` are client-side estimates, not bills or remaining subscription credit. `usage` covers the main loop; `modelUsage` includes subagents and query-pipeline auxiliaries but not all helper calls, such as the permission classifier. Deduplicate per-step messages by message ID. Output-token counts on early assistant messages can be placeholders. Since v2.1.277, resumed/forked sessions restore earlier cumulative spend: adding successive result totals double-counts. Budget caps exclude restored spend, so yfere must enforce its own attempt budget. Crash totals can be zeroed; preserve partial/unknown rather than claiming free execution. [C5,C6]

Native local transcripts contain plaintext task/tool content; redacted yfere receipts do not sanitize native storage. Consumer training follows the account's improvement preference; commercial training exclusion has opt-in exceptions. Documented standard retention is 30 days in the relevant non-training/commercial cases, versus five years for consumer improvement-enabled data; qualified ZDR is not assumed. Native local cleanup has its own settings/exceptions. These are source claims, not verified account settings. [C8]

Recommended telemetry baseline: disable nonessential traffic, error reporting and feedback submission; do not enable raw-body/prompt/tool OpenTelemetry or debug files. Marketplace auto-install and WebFetch checks have separate controls; disabling telemetry is not a no-network guarantee. Keep approved authentication/inference egress distinct from tool/browser egress. Output parsers allowlist safe fields; no credential, authorization URL/code, native token file, environment dump, account PII, raw stderr or transcript enters prompts, catalogs, decision state, fixtures, SQLite snapshots, telemetry, receipts or artifacts. [C8,C9]

## 3. OpenCode Go: direct inference adapter

### 3.1 Access, economics, traffic, and policy

Documented acquisition: sign into OpenCode Console, subscribe, and copy an API key; `/connect` configures the OpenCode application but is not required for a direct client. Only one workspace member can subscribe. Published plans are Go $10/month and Go Plus $40/month. Included usage uses model-dependent dollar allowances across 5-hour/weekly/monthly windows (20%/50%/100%); advertised request counts are estimates, not quotas. As one example, GLM-5.3-Flash lists input/output/cache-read rates of $0.15/$0.50/$0.03 per million tokens and monthly Go/Plus allowances of $60/$180. Limits and catalog can change. Optional “Use balance” draws Zen credit beyond limits; yfere must not enable or assume it. [G1]

Go explicitly supports other coding agents producing comparable coding traffic. It requests a distinctive client user agent and a stable `x-opencode-session` per conversation. Recommendation: `User-Agent: yfere/<version>` and opaque yfere conversation ID on every related request, retry and auxiliary coding request; no user identity, key, prompt or path in that ID. Do not mimic an approved client. The header assists routing/caching, not authorization, idempotency, or a documented durable transcript service. General research/writing tasks in yfere's existing evaluation families are not automatically eligible Go traffic. Deterministic task-family admission must constrain Go to coding-agent use. [G1]

**Important unresolved terms tension:** the pinned Terms of Use, effective August 15, 2026, restrict service use to the customer's internal use, prohibit account/limit circumvention, and include a broad prohibition on programmatic extraction of data/output. The Go docs simultaneously publish APIs and invite other coding agents. This is not resolved by choosing the CLI instead of HTTP. Recommend account/vendor clarification of authorized coding-agent automation and intended internal versus third-party use before live Go authorization; do not treat an open-source software license as a hosted-inference entitlement. This report does not contact the vendor or decide the legal interpretation. [G1,G9]

### 3.2 Exact protocol families and catalog

Go is not one universally interchangeable OpenAI endpoint. The following IDs are the complete endpoint-table snapshot in the pinned documentation, not a guaranteed future or account-available list. [G1]

| Protocol / documented endpoint | Model IDs in pinned endpoint table |
| --- | --- |
| Chat Completions — `https://opencode.ai/zen/go/v1/chat/completions` | `glm-5.3-flash`, `glm-5.3`, `glm-5.2`, `kimi-k3`, `kimi-k2.7-code`, `kimi-k2.6`, `longcat-2.0`, `longcat-2.5-preview-free`, `deepseek-v4.1-flash`, `deepseek-v4-pro`, `deepseek-v4-flash`, `deepseek-v4-flash-vision-exp`, `mimo-v2.6-flash`, `mimo-v2.6-pro`, `mimo-v2.5`, `mimo-v2.5-pro`, `hy4-preview`, `hy3`, `space-bunny-free` |
| Anthropic Messages — `https://opencode.ai/zen/go/v1/messages` | `minimax-m3`, `minimax-m2.7`, `qwen3.8-max`, `qwen3.8-flash`, `qwen3.7-plus` |
| OpenAI Responses — `https://opencode.ai/zen/go/v1/responses` | `grok-4.7`, `grok-4.6`, `gpt-6-luna`, `gpt-5.6-luna`, `muse-spark-1.3-contributor`, `muse-spark-1.2-contributor` |

Implementation corroboration: pinned routes select `oa-compat`, `anthropic`, and `openai` format handlers with the `lite` model list. Chat/Responses parse bearer authorization; Messages parses `x-api-key`. All read `body.model` and streaming choice. The CLI config prefix `opencode-go/` is not part of the HTTP model ID. These compatible families do not establish full feature parity with every upstream API or every model. [G1–G2]

Discovery is documented at `https://opencode.ai/zen/go/v1/models`. It was **not called** here. The source first attempts an inference proxy; the fallback supplies only `id`, `object`, `created`, `owned_by`, filtering `alpha-` entries. Discovery therefore cannot be assumed to supply endpoint family, prices, context window, tool guarantees or data policy. [G3]

Recommendation: freeze a reviewed catalog snapshot containing `provider=opencode-go`, exact ID, protocol family, approved origin, capability evidence, data-policy evidence/expiry, price basis/version and last validation. Live discovery may mark availability and propose changes; it must never automatically admit new models or change a frozen assignment. Unknown/changed models fail closed. Develop protocol-specific codecs/fixtures for all three families; enable only reviewed model/family combinations after conformance. A single Chat Completions model can be the first smoke lane, not an assertion that the other families do not exist or permission to route their IDs through Chat Completions.

### 3.3 Why direct HTTP, not the CLI

| Criterion | Direct Go adapter (recommended) | OpenCode CLI / server |
| --- | --- | --- |
| Lifecycle | yfere owns request, task loop and resources | `run` invokes a session runtime; `serve` adds server lifecycle/auth [G4,G5] |
| Tool execution/policy | yfere supplies schemas, validates complete calls and executes authorized tools | OpenCode executes tools. JSON `tool_use` events describe completed/error tools, not pre-execution permission handoff [G4] |
| Workspace | yfere controls every local tool and artifact | `--dir` chooses runtime context; still requires independent containment and policy translation [G4] |
| Streaming | Family-specific SSE/text/tool fragments; no execution on partial arguments | `run --format json` emits selected events; text appears when a part ends, not necessarily token deltas. Server SSE is richer [G4,G5] |
| Continuity | yfere persists approved conversation projection and stable header | Native create/resume/fork, its own persisted history and compaction [G4,G5] |
| Cancellation | Abort HTTP, stop dispatch, reap yfere tools; remote billing/termination may remain unknown | Server documents `/session/:id/abort`. Killing an attached viewer alone is not proven cancellation [G5,G7] |
| Usage/identity | Preserve wire fields per family; map missing counts/cost to unknown | Step-finish carries usage/cost; assistant metadata carries model/provider. CLI JSON omits assistant metadata updates, requiring additional retrieval for reliable identity [G4,G6] |
| Retry | One yfere retry owner; SDK automatic retries off | Session policy independently retries, with five retries at this pin; SDK defaults to zero below that layer [G7,G8] |
| Operational scope | One key store and HTTPS transport; no foreign runtime config or plugins | Additional auth file, config/plugin discovery, session DB, server permissions and sharing surfaces [G4,G5] |

The direct adapter is more protocol work, but it is the smaller authority boundary for this standalone harness. Claude is intentionally different because native Claude authentication constrains its transport; that does not justify importing a second runtime for Go.

### 3.4 Key lifecycle, data handling, and errors

Use a separately acquired Go key in yfere's own protected store; do not read OpenCode/Hermes auth files. Catalog/config contains only an opaque connection reference. Native Console Keys UI supports create/copy/delete; pinned key removal marks the key deleted, scoped to the workspace and caller/admin ownership. Recommend rotation as provision replacement → explicit safe validation → atomic local switch → operator revoke old key. No automatic key generation or account mutation. Local logout removes yfere's copy and blocks requests; remote deletion and subscription cancellation are distinct. Revocation propagation and outstanding-request behavior are untested. [G11,G12]

Source privacy claims are model-specific: the pinned table lists zero-day/no-training for many models, 30-day retention for Grok/GPT Luna, training permitted/non-ZDR for Muse Contributor, and a DeepSeek ZDR agreement valid through **October 31, 2026**, renewed monthly. Exclude training-enabled models from private-code eligibility unless explicitly approved; expiry invalidates a ZDR claim until reverified. OpenCode's March 6 privacy policy says prompts pass upstream and are not stored by OpenCode; it separately describes account/payment/device data processing and rights requests. That is not blanket upstream ZDR or proof of this account's terms. [G1,G10]

Normalize HTTP auth/policy/rate/overload/timeout/invalid-body failures plus family-specific stream failures. Preserve only allowlisted status, provider code, request ID, bounded Retry-After and redacted diagnostics. Partial stream/EOF without family terminal evidence is not success. Keep malformed/unsupported tool arguments inert. Cancellation closes local work, not a guarantee of remote compute cessation or no charge. The Go source's `GoUsageLimitError` handling is implementation evidence, not a permanent public error schema; unknown bodies map conservatively, not via fabricated reset times or automatic Zen fallback. [G2,G8]

## 4. Codex anchor: preserve the independent native yfere lane

Current official OpenAI SIWC documentation explicitly describes open-source/locally hosted public clients obtaining permission to use ChatGPT plans. It is separate from copying Codex's credential store. Paid or remotely hosted apps have a separate interest/access path. Eligibility for yfere's eventual distribution must be confirmed before live OAuth; offline adapter work need not wait. [O1]

Documented first registration uses `dynamic_agent_client`, a stable opaque host ID, yfere's real app name, PKCE S256, state and nonce. The callback supplies an issued client ID; yfere persists that registration and validates the ID token and granted `chatgpt.tokens.use.direct` scope before inference. Callback is loopback `127.0.0.1`, with exact path/URI checks. Tokens belong in protected, atomically written per-registration storage; refresh rotation must be serialized. Logout attempts remote refresh-session revocation and clears local tokens; network failure must be reported as revocation unconfirmed. [O2,O3]

Inference uses public `POST https://api.openai.com/v1/responses`, with `store:false`, `stream:true`; do not use ChatGPT backend-api endpoints. Account-specific model listing and permission checks precede admission. HTTP history is client-supplied; `previous_response_id` is unsupported in this flow. Ordinary Responses features cannot be assumed: the preview excludes fields including `max_output_tokens`, `max_tool_calls`, `background`, `conversation`, and hosted tool families. Function/custom tools have documented namespace/additional-tools requirements. yfere must own local tool execution, output limits/deadlines, and session reconstruction rather than copying app-server `thread/resume` into a direct HTTP contract. [O4,O6]

Require `response.completed` for inference success; failed/incomplete/interrupted streams remain distinct. Plan-usage errors can arrive after streaming starts, including usage-limit errors. Preserve credentials on transient unavailability; no silent billing-path switch or looping OAuth. Usage tokens and model attribution may be available; actual subscription-dollar allocation remains unknown unless separately evidenced. None of this turns response completion into accepted task work. [O3–O6]

## 5. Minimal common contract — proposal for the normative documents

This section is a **yfere design proposal**, not an upstream interface claim. Move the accepted form into `docs/decision-contracts.md` as the single normative task-provider contract; keep this report explanatory. Freeze its version/hash before adapter implementation. Do not conflate it with `DecisionService` or `BrowserCapabilityProvider`.

### 5.1 Small registry and interface

Closed initial provider IDs: `codex | claude-code | opencode-go`. Statically registered implementations only; no marketplace or dynamic module paths from catalogs.

Proposed operations:

- `preflight(connectionRef, endpointSnapshot, executionProfile, mode, signal) -> PreflightReport`
- `start(WorkerRequest, signal) -> WorkerHandle`
- `resume(ResumeRequest, signal) -> WorkerHandle | Unsupported`
- `events(WorkerHandle, signal) -> AsyncIterable<TaskAgentEvent>`
- `cancel(WorkerHandle, reason, cleanupDeadline) -> CancellationReceipt`

`WorkerRequest` binds run/task/task-attempt/worker-attempt/member IDs, frozen assignment and catalog hashes, scoped input handles, workspace grant, capability grants, separate limits, outer deadline, tool-policy version, expected provider/runtime identity, and opaque connection reference. Credentials are resolved only inside the correct transport boundary, never serialized in this request.

`PreflightReport` keeps independent checks: runtime available/version matched, local credential state, auth method selected, remote validation status, model/capability availability, policy/data terms accepted, workspace/egress/process containment, resume support. Suggested auth states: `missing | configured_unverified | authenticated | expired | revoked | reauth_required | blocked | unknown`. Include safe evidence source/time. Local mode must not spawn login, refresh remote state, make inference or assume a stored key works. A native auth-status subprocess is a separately bounded probe, not promised side-effect-free/offline; deny network where required and report inconclusive. Live mode requires separate authorization.

### 5.2 Contract matrix

| Contract dimension | Codex direct yfere lane | Claude Code native lane | OpenCode Go direct lane |
| --- | --- | --- | --- |
| Auth owner | yfere registration/token lifecycle [O2,O3] | native Claude application; yfere never owns subscription tokens [C1,C2] | yfere independent API-key store [G1,G11] |
| Agent/tool loop owner | yfere | Claude inner loop; yfere supervisor and grant enforcement | yfere |
| Start | new yfere attempt + streamed Responses [O4] | native `-p`, pinned argv/environment [C3,C4] | selected protocol request + yfere loop [G1,G2] |
| Resume | reconstruct approved local history; no HTTP previous-response continuity [O6] | native session ID, persistence required [C3,C4] | reconstruct local history; stable header is not transcript storage [G1,G3] |
| Cancel | abort request and owned tools; remote outcome may be unknown | signal/kill/reap native process tree; final result may be absent [C4] | abort request and owned tools; no assumed remote cancel API |
| Events | Responses lifecycle/tool stream + yfere receipts [O4,O6] | NDJSON native messages; init/retry/denial/result [C4,C5] | protocol-discriminated SSE + yfere receipts [G2] |
| Grants | deterministic tool dispatcher | compiled tool availability/permission policy plus independent containment; unsupported exact approval fails closed [C3,C7] | deterministic tool dispatcher |
| Workspace | yfere-scoped tools and isolation | cwd/file rules alone inadequate, including native auth-state separation [C2,C7] | yfere-scoped tools and isolation |
| Model identity | requested slug vs returned response model; account catalog [O4] | requested/init/actual per-model, helpers/fallback distinguished [C5,C12] | requested ID vs returned ID; serving upstream identity unknown unless supplied |
| Usage/cost | wire usage; subscription cash allocation unknown | estimates, per-turn vs cumulative and helper gaps [C5,C6] | family-specific wire usage; price snapshot estimate separate from subscription allowance/bill |
| Terminal | stream terminal AND local loop/work acceptance | result semantics + observed process exit + cleanup; task acceptance separate | stream terminal AND local loop/work acceptance |
| Retry owner | yfere transport, SDK retries off | native internal mechanisms explicitly bounded/observed where possible; no outer task replay [C4,C9] | yfere transport; no OpenCode CLI retry layer |
| Version | auth/preview contract and client parser version; source pin | executable version/digest, launch-profile hash, protocol capabilities | route/source evidence pin, protocol codec version, reviewed dynamic catalog hash |

Rows without a source marker describe recommended yfere behavior or an explicitly unverified/unsupported guarantee, not upstream promises.

### 5.3 Event, outcome, usage and receipt rules

Every normalized event has yfere `eventId`, `runId`, `taskAttemptId`, `workerAttemptId`, `memberId`, `provider`, `providerSessionRef?`, `logicalCallId?`, `physicalAttemptId?`, per-attempt monotonic `sequence`, time and redacted payload. Never invent an upstream sequence or physical-attempt count; native retries may be incompletely observable. Deduplicate known upstream IDs; reject cross-attempt correlation. Bounded unknown benign metadata can be ignored, but unknown control/tool/final variants cannot become authorization or success.

Minimal event union: `worker.started`, `text.delta`, `tool.proposed`, `tool.started`, `tool.completed`, `permission.denied`, `usage.observed`, `retry.observed`, `model.observed`, `worker.terminal`. Claude tool observations must identify whether they are proposal-time or after execution; do not fabricate `tool.proposed` from a completed event.

Terminal status: `completed | failed | cancelled | timed_out | crashed | uncertain`. Separately record `acceptance: passed | failed | not_checked`, `cleanup: complete | failed | uncertain`, and `observedEffect: not_attempted | attempted_unconfirmed | confirmed_by_observation | unknown`. A completed model answer is not task acceptance; cancellation does not roll back writes; missing usage never becomes zero.

Usage measurements carry quantity or `unknown`, unit, scope (`request | turn | invocation | session_cumulative`), source, completeness and accumulation/reset identity. Preserve native counters by name; do not add reasoning/cache breakdowns twice. Cost is `reported_estimate | calculated_estimate | authoritative_charge | unknown`, with currency and price-basis version. Subscription fee, token list-price estimate, Go allowance consumption, and incremental charge are distinct metrics. Record helper-usage gaps rather than claiming complete spend.

Artifact receipts are created by yfere from contained filesystem observations, not provider narrative: scoped handle, content hash, baseline/change manifest, ownership, observed verification and retention reference. Do not copy native session directories, `.credentials.json`, auth files, raw environment or provider logs into a receipt. Raw task output may live only in separately approved protected artifact storage; telemetry retains redacted handles. Resume restoration and transport reconnection cannot replay mutations. Uncertain external effects require reconciliation, not blind retry.

Retry priority is cancel → deadline → allowed physical retry. Direct adapters disable library retries and own bounded attempts under one deadline. Claude gets bounded internal retries and an outer kill deadline; exact internal attempt/spend visibility is a capability, not a universal guarantee. `CLAUDE_CODE_MAX_RETRIES=0` is a candidate documented configuration, not proof that all auth refresh, structured-output recovery or auxiliary calls disappear. If the assignment requires stricter guarantees than the native runtime can demonstrate, preflight returns incompatible. A wrapper must never re-run the whole Claude task on transport failure. Model/provider fallback requires the existing explicit, at-most-one typed replan and new lineage, never account cycling or hidden substitutions.

## 6. Exact proposed plan amendments

These are instructions for the already-created planning amendment task, not edits performed by this report. Current anchors were read from local files. Preserve the existing browser remediation and Ryan-owned Phase 9 choices.

### A. `docs/architecture.md`

Replace the Codex-only sentence in **Provider and TypeSafe transport boundaries**, and the worker-auth description in **Scope and invariants**, with:

> The initial task-agent provider set is Codex, Claude Code and OpenCode Go behind a small statically registered yfere-owned `TaskAgentProvider`. Codex uses yfere-owned browser OAuth and direct public Responses transport; Claude uses an unmodified pinned native Claude Code process with its own auth state; OpenCode Go uses an independent yfere-stored API key and direct protocol-specific Go endpoints. Jev remains decision-only. No task-provider credentials enter selection state or cross transports. All three adapters belong to initial implementation scope; their live authorization gates remain independent.

Add ownership: `src/task-agents/provider.ts`, `registry.ts`, `events.ts`, `preflight.ts`; implementations `codex/`, `claude-code/`, `opencode-go/`; shared yfere `execution/` policy/tool/workspace/receipt authority. Claude-specific process/config/auth handling stays in its adapter. Direct-provider tool loops may share yfere execution code; Claude is not forced through a fake HTTP/tool-call equivalence. No selector imports provider binaries, credential resolution, or browser modules.

Replace blanket “reject external harness adapters” language with a bounded exception for the approved native Claude Code task-provider adapter; keep broad harness compatibility, OpenCode CLI adoption, plugins, remote sidecars and marketplace scope deferred. `max_agents` stays project cardinality, not a provider allocation.

### B. `docs/decision-contracts.md`

Replace **Provider and replay contracts** Codex-only scope/auth paragraphs with the common interface and matrix-derived provider-specific constraints in Section 5. Make this document the single normative task-provider contract, with version/hash. Extend Endpoint metadata with protocol-family discriminator, execution owner, auth-reference kind, capability evidence, model/data/price snapshot and expiry; never key material. Add worker-event/receipt/preflight and usage-scope schemas rather than reusing `DecisionResponse`.

Keep current `DecisionService` retry semantics intact. Qualify the task-provider retry rule for native Claude, documenting bounded but not necessarily fully observable internal work. Distinguish local authentication configuration from remote entitlement. Direct Codex HTTP resume means local reconstruction; Claude resume means native session execution; Go header means conversation routing identity. Preserve no-network read-only decision replay.

### C. `docs/evaluation-protocol.md`

Add Section 7 below as named test lanes and per-provider report columns. Separate inference completion, worker cleanup and independently verified accepted output. Preserve all approved quality/cost/context gates; unknown costs cannot prove savings. Compare matched supported coding tasks across providers; exclude general noncoding Go traffic pending explicit terms permission. Report native Claude tool/context differences rather than attributing them solely to model routing.

### D. `docs/threat-model.md`

Add native Claude child process, native credential files/keychain/profile store, inherited settings/hooks/plugins/MCP, model remap, native transcripts and telemetry as separate trust boundaries. Require grant enforcement before effects and OS-level containment rather than `cwd`/tool-name assumptions. Add Go origin/header/key boundaries, coding-only admission, model-dependent retention/training and policy-expiry gates. Protect Codex OAuth state/nonce/PKCE, registration/host binding, atomic rotating refresh and logout uncertainty. No credential crosses Codex/Claude/Go/Jev/Decisions/browser-use/secret-broker boundaries. Preserve independent browser egress reference monitor and exact one-use browser approvals.

### E. `docs/planning-readiness.md`

Update **Effective MVP scope**, **Settled decisions**, **Unresolved Ryan decisions**, **Phase gates**, checklist, and synthesis paragraphs wherever they claim sole Codex scope or reject all product adapters. Add separate `codex`, `claude-code`, `opencode-go` preflight/live gates, including account-data terms. Local contracts/mocks and selector work must not wait for provisioning. Do not mark live-ready based on a green mock or stored credential.

### F. `.hermes/plans/2026-09-18_053427-yfere-implementation.md`

Update planning boundary, architecture opening, decision 11, repository layout and endpoint schema to the three-provider set. Phase 2 includes three provider IDs and protocol/execution capabilities. Phase 3 remains decision-service work, with no implication that task providers are Jev transports. Add hermetic task-provider schema/parser/preflight fixtures alongside offline work. Phase 6 stays independently gated Jev. Phase 8 adds matched provider evaluation design. Phase 9/Gate C constructs the common execution core and **all three initial adapters**, first with fakes/controlled projects, then separately authorized per-provider live acceptance. Replace “multi-provider credentials” as a deferred feature with separately gated initial-provider provisioning; do not defer Claude/Go implementations out of initial scope. Browser B0/B1/B2 remain later milestones with their current security gates.

### G. `docs/prior-art-synthesis-2026-10-02.md` and archive

Add a dated provider amendment superseding older Codex-only and Claude-adapter rejection recommendations. Preserve historical research as historical, not a conflicting authority. Include this report in `yfere-final-planning-docs.zip`; the downstream task specifies an expected 13 entries unless another approved addition changes that manifest. Verify actual listing, `unzip -t`, and byte identity there. This research task does not edit or rebuild the archive.

## 7. Test and acceptance lanes (proposed; not run here)

| Lane | Scope and credential policy | Required evidence |
| --- | --- | --- |
| P0 — closed contracts | No binaries, credentials or network | Three static providers; ordered selector/pins unchanged; capability/task-family/data-policy hard filters; unknowns preserved; provider count not agent count |
| P1 — wire fixtures | Synthetic/documented fixtures labeled honestly; no network | Responses/Claude NDJSON/Go three-family framing; split UTF-8/SSE/JSON; malformed, oversized, truncated and unknown frames; duplicate/cross-attempt IDs; partial tools stay inert; EOF never implies completion |
| P2 — auth/preflight mocks | Synthetic secret handles, never plausible real keys | Missing/expired/revoked/unverified distinctions; no auto-login or provider calls; wrong origin/credential rejected; account switch; auth-source precedence; native profile-store exception; independent logout |
| P3 — fake native runtime | Owned test subprocess only, no Claude install | Version mismatch; hook-before-init; stdout errors; result/exit disagreement; SIGTERM 143 without result; ignored signals; child escape/reap uncertainty; concurrent session collision; corrupt/foreign resume; no secret/log leakage |
| P4 — protocol/model/usage | No provider calls | Go family/ID routing and stable session/user-agent across auxiliary requests/retries; catalog drift; expired privacy claim; Claude aliases/remaps; cumulative resumed costs and crash zeroing; unknown upstream identity/billing; no metric double-counting |
| P5 — controlled local execution | Explicit host-execution authorization, isolated fixture project, fake model paths | Read/edit/test artifact outcomes; symlink/path escape; config injection; grant before effect; credential-store unreadability from tools; denied network; cancellation racing approvals/tools/results; task acceptance independent of narrative |
| P6 — native runtime conformance | Separately approved installation/version pin; network denied and synthetic auth | Native help/version/flag support, startup configuration isolation, auth-status behavior, parsing and policy load failures. Do not label a mock as native conformance |
| P7 — authorized live read-only | Separate authorization and real credential per provider; approved terms, origin, model, tiny spend/deadline budget | Actual auth/model access, streaming/usage fields, stable Go headers, required native Claude controls. No one provider's green test authorizes another |
| P8 — authorized live coding/cancel/resume | Controlled repo and exact permitted effects; independently approved | Tool calls, bounded stop/reap, resume without mutation replay, artifacts verified by tools, unknown charges retained, no automatic overage/model/billing fallback |
| P9 — matched evaluation | Held-out supported tasks, equivalent grants and resource policy | Per-task pairing; failures and denials included; model/runtime/tool profile/catalog hashes; selector and worker overhead; quality floor and cost/context gates only on observed data |

Specific auth fixtures: Codex wrong state/nonce/issuer/audience/client/host registration, missing direct-use scope, refresh rotation race, late stream limit error, and unconfirmed logout revocation. Claude ambient API-key override, unavailable keychain/profile, unsupported flag, changed managed settings, inherited MCP/hook, no bare-mode subscription auth, permission denial despite exit 0, background work at final result, silent internal retry gap, and native model fallback. Go 401/403/429/5xx, HTML/nonstandard error, limit-window error, key removal, no implicit Zen credits, redirect credential stripping, missing session header on an auxiliary call, and model-list responses with no capability/pricing metadata.

Resume tests must show that restoration does not prove whether a prior external action happened. No automatic retry is permitted after unknown effects. Live revocation/rotation and billing checks are account mutations or spend-bearing actions and require their own approval, not merely read-only smoke authorization.

## 8. Narrow decisions and unresolved evidence

No further decision is needed about including all three providers or about recommending direct Go versus native Claude. The following block the relevant live lanes, not research completion or credential-free implementation:

1. **Claude account/use approval:** Ryan selects the native account/billing context and confirms permitted automation and data handling. Recommend dedicated native context, no subscription token export, no automatic credit spend, and no hosted/resold usage assumption. Keyless Console isolation needs explicit handling.
2. **Go account/terms clarification:** confirm coding-agent automation under the applicable account agreement in light of the programmatic-output restriction, internal-use limitation, and Go's explicit third-party client documentation. Recommend no noncoding traffic, no resale, no limit circumvention and no automatic balance overage pending clarification.
3. **Data classes:** decide whether private repository data requires ZDR/no training or permits specified retention. Recommend excluding Contributor training models and expiring DeepSeek ZDR eligibility after October 31 without revalidation. Claude consumer privacy choice and native transcript retention are independently checked.
4. **Existing Phase 9 choices (historical wording superseded):** workspace isolation/apply-back, detach/stop policy, exact-operation approval breadth, and artifact/receipt/raw-output retention were previously described as Ryan-owned open choices. The effective closure settles the four directions and, as of October 3, 2026, the host matrix and bounded global retention caps/schedules in `docs/decision-contracts.md`; future host expansion or scoped overrides require review. Provider inclusion does not reopen or erase the closure.
5. **OpenAI deployment eligibility:** confirm OSS/local-host SIWC preview eligibility for the intended yfere delivery model; paid/remote-host use is not automatically covered. Do not reuse Codex's registered client or auth store to avoid this prerequisite.

Unverified technical points: actual installed-binary compatibility, effective native sandbox/config combination, complete physical retry visibility, Go model-level tool/stream quirks, deployed routing revision, account catalogs/rate windows, remote cancellation finality/billing, revocation propagation and actual account data terms. Each has a fixture or separately authorized live gate above. No claimed provider test pass is inferred from documentation.

## 9. Primary-source register

All URLs below are public source handles, retrieved October 2, 2026. Claude/OpenAI pages are rolling documentation unless stated; Go file URLs are immutable commit references. Markdown variants were used where available.

### Claude / Anthropic

- [C1] https://code.claude.com/docs/en/legal-and-compliance.md — native binary offering conditions and subscription credential-use distinction.
- [C2] https://code.claude.com/docs/en/authentication.md — login, account methods, credential precedence/storage, Console profiles and native lifecycle.
- [C3] https://code.claude.com/docs/en/cli-reference.md — auth commands and runtime flags.
- [C4] https://code.claude.com/docs/en/headless.md — print mode, events, errors, retries, cancellation and unattended permissions.
- [C5] https://code.claude.com/docs/en/agent-sdk/typescript.md — SDKResultMessage, SDKSystemMessage, ModelUsage, optional/versioned fields and sandbox limitations; SDK reference is corroboration, not a claim that every SDK method is a CLI flag.
- [C6] https://code.claude.com/docs/en/agent-sdk/cost-tracking.md — cumulative cost/usage, estimates, resumed totals, crash and subagent accounting.
- [C7] https://code.claude.com/docs/en/security.md — workspace/Bash limits, trust and native security boundaries.
- [C8] https://code.claude.com/docs/en/data-usage.md — account-based training/retention, local plaintext transcripts, telemetry controls and exceptions.
- [C9] https://code.claude.com/docs/en/env-vars.md — retry watchdog/max retries, updates, authentication/egress variables and telemetry knobs.
- [C10] https://github.com/anthropics/claude-code/releases/tag/v2.1.288 — immutable release reported published October 2, 2026, 20:19:57 UTC; verified through https://api.github.com/repos/anthropics/claude-code/releases/latest at retrieval.
- [C11] https://code.claude.com/docs/en/settings.md — settings precedence and merge behavior (supporting research).
- [C12] https://code.claude.com/docs/en/model-config.md — aliases, version thresholds, fallback/remapping and print-mode billing caveats.

### OpenCode / Anomaly

- [G0] https://github.com/anomalyco/opencode/commit/108b988a08227df45417f27905a4d6b27ad49b6d — source snapshot, October 2, 2026, 20:56:07 UTC.
- [G1] https://github.com/anomalyco/opencode/blob/108b988a08227df45417f27905a4d6b27ad49b6d/packages/web/src/content/docs/go.mdx — access, plans/limits, coding traffic/header requirements, exact endpoint/model mapping and privacy table. Live documentation handle: https://opencode.ai/docs/go/.
- [G2] https://github.com/anomalyco/opencode/blob/108b988a08227df45417f27905a4d6b27ad49b6d/packages/console/app/src/routes/zen/go/v1/chat/completions.ts ; https://github.com/anomalyco/opencode/blob/108b988a08227df45417f27905a4d6b27ad49b6d/packages/console/app/src/routes/zen/go/v1/messages.ts ; https://github.com/anomalyco/opencode/blob/108b988a08227df45417f27905a4d6b27ad49b6d/packages/console/app/src/routes/zen/go/v1/responses.ts — protocol/auth dispatch.
- [G3] https://github.com/anomalyco/opencode/blob/108b988a08227df45417f27905a4d6b27ad49b6d/packages/console/app/src/routes/zen/go/v1/models.ts ; https://github.com/anomalyco/opencode/blob/108b988a08227df45417f27905a4d6b27ad49b6d/packages/console/app/src/routes/zen/util/modelsHandler.ts — proxy and metadata-limited fallback catalog.
- [G4] https://github.com/anomalyco/opencode/blob/108b988a08227df45417f27905a4d6b27ad49b6d/packages/opencode/src/cli/cmd/run.ts — CLI lifecycle, event filtering, completed-tool events, permission response and session handling.
- [G5] https://github.com/anomalyco/opencode/blob/108b988a08227df45417f27905a4d6b27ad49b6d/packages/web/src/content/docs/server.mdx — server API, local auth, sessions, abort and SSE.
- [G6] https://github.com/anomalyco/opencode/blob/108b988a08227df45417f27905a4d6b27ad49b6d/packages/schema/src/v1/session.ts — source schema for session/message model and usage (supporting research).
- [G7] https://github.com/anomalyco/opencode/blob/108b988a08227df45417f27905a4d6b27ad49b6d/packages/opencode/src/session/llm.ts — tool execution plumbing, AbortSignal and SDK retry default.
- [G8] https://github.com/anomalyco/opencode/blob/108b988a08227df45417f27905a4d6b27ad49b6d/packages/opencode/src/session/retry.ts — native retry policy and Go limit-error handling.
- [G9] https://github.com/anomalyco/opencode/blob/108b988a08227df45417f27905a4d6b27ad49b6d/packages/console/app/src/routes/legal/terms-of-service/index.tsx — hosted-service terms effective August 15, 2026; public handle https://opencode.ai/legal/terms-of-service.
- [G10] https://github.com/anomalyco/opencode/blob/108b988a08227df45417f27905a4d6b27ad49b6d/packages/console/app/src/routes/legal/privacy-policy/index.tsx — privacy policy effective March 6, 2026; public handle https://opencode.ai/legal/privacy-policy.
- [G11] https://github.com/anomalyco/opencode/blob/108b988a08227df45417f27905a4d6b27ad49b6d/packages/console/core/src/key.ts — key creation/list/removal and ownership checks.
- [G12] https://github.com/anomalyco/opencode/blob/108b988a08227df45417f27905a4d6b27ad49b6d/packages/console/app/src/routes/workspace/%5Bid%5D/keys/key-section.tsx — Keys UI (supporting research).

### OpenAI

- [O1] https://developers.openai.com/siwc/token-sharing-open-source.md — OSS/local-host eligibility, real app registration and host identity.
- [O2] https://developers.openai.com/siwc/token-sharing-open-source/sign-in.md — dynamic registration, PKCE/state/nonce, exact callback, validation, scopes and protected storage.
- [O3] https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions.md — refresh serialization, account separation, revocation and usage limits.
- [O4] https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference.md — public model catalog/Responses route and terminal-stream requirements.
- [O5] https://developers.openai.com/siwc/token-sharing-open-source/errors-and-recovery.md — admission/stream/refresh errors; no silent billing fallback.
- [O6] https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations.md — precise direct-HTTP fields/tools/history constraints versus app-server.
- [O7] https://github.com/openai/codex/commit/66561d03012edb96e4ea87513cb10dea4c909986 — reference revision only, not the source of the recommended SIWC wire contract.
