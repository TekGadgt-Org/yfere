# yfere browser-use support boundary

Status: architecture/planning only. No browser-use dependency is installed, no browser was launched, no credential was used, and no external site was contacted by yfere. This document records a future integration boundary; it does not authorize implementation or live-browser testing.

Decision date: 2026-10-02 UTC

## 1. Executive decision

Browser-use support is a standalone yfere capability/integration owned by yfere. It is not evidence that yfere should adopt, emulate, or become compatible with another agent harness, and browser-use's agent loop does not replace yfere orchestration.

Preferred initial seam: a yfere-owned, provider-neutral `BrowserCapabilityProvider` contract whose first implementation is a version-pinned browser-use tool adapter running out of process as a short-lived child process (or an equivalent narrowly scoped local adapter). The adapter receives a validated capability request and returns a validated event/result stream. It does not receive yfere's provider credentials, decision state, unrestricted filesystem paths, or unrestricted task prompt. Yfere remains authoritative for assignment, grants, approvals, budgets, cancellation, receipts, and terminal state.

The adapter must expose browser primitives and observations, not a second autonomous orchestration system:

- create/close an isolated browser session;
- navigate only to policy-allowed origins;
- inspect page state and take screenshots;
- click, type, select, scroll, wait, and extract bounded data;
- download into a run-owned download directory;
- upload only a run-owned input artifact explicitly granted to the action;
- optionally collect a trace/recording when explicitly enabled;
- report each requested action, policy decision, approval decision, result, artifact, and uncertainty.

The initial contract must not expose a general browser-use `Agent.run()` loop to yfere as an opaque worker. If a future product mode uses browser-use's loop, it is a separate execution mode with the same yfere grant, approval, isolation, receipt, cancellation, and redaction controls.

## 2. Evidence snapshot: official browser-use source

The source was inspected from the official repository at:

- Repository: https://github.com/browser-use/browser-use
- Recorded commit: `ebafaa11571dcb1a928a2b971d2f5d5eb15f3c29`
- Commit subject: `docs: clarify optional Anthropic tool defaults (#5980)`
- Commit timestamp reported by git: `2026-10-02T13:15:04-07:00`
- Source tree was checked out detached at this SHA; no package installation occurred.

The SHA is the compatibility evidence for this document. The branch tip is mutable; an upgrade is not approved merely because `main` changed.

Source-observed facts at that SHA:

1. `pyproject.toml` declares Python `>=3.11,<4.0`, package version `0.13.10`, and a large dependency surface including `cdp-use`, `mcp`, `browser-harness`, `browser-use-sdk`, LLM clients, and `posthog`. This is a substantial Python/browser runtime boundary, not a reason to change yfere's Node.js core.
2. `browser_use/browser/session.py` defines an event-driven `BrowserSession` over CDP with local and cloud modes, session IDs, allowed/prohibited domains, downloads, tracing/recording, storage state, proxy settings, and a stop lifecycle. It also exposes direct CDP/Playwright-level operations; yfere must not treat those internal objects as its public contract.
3. `browser_use/browser/profile.py` contains profile, user-data, download, proxy, permissions, storage-state, security, domain, and deterministic-rendering settings. It includes flags that can weaken browser security (`disable_security`); yfere must never enable such a mode through an ordinary grant and must make any exceptional test-only use impossible in production configuration.
4. `browser_use/browser/views.py` defines structured tab/page/browser state and `BrowserError`, including `URLNotAllowedError`, state errors, and recent browser events. These are useful adapter inputs but must be normalized to yfere error and receipt types.
5. `browser_use/telemetry/service.py` enables anonymized PostHog telemetry by default unless configuration disables it, persists/derives a device identifier, and sends events to `https://eu.i.posthog.com`. Yfere's boundary must explicitly disable or separately approve upstream telemetry and must not assume that browser-use's anonymization satisfies yfere's no-secret/no-private-content contract.
6. The repository includes security and integration tests for domain filtering, private-IP blocking, upload containment, download filename sanitization, sensitive data, profile copying, screenshots, traces, browser sessions, cancellation/stop paths, and cloud-browser behavior. These tests are evidence of covered mechanisms, not evidence that yfere's policy is enforced by browser-use.
7. The repository's MCP integration exposes browser tools such as navigation, state, and screenshots. MCP is a plausible transport shape, but a stock MCP server is not itself the yfere security boundary: yfere must own tool allowlisting, origin policy, artifact paths, approval, and cancellation around it.
8. The README and `LICENSE` identify the open-source library as MIT licensed. The README separately describes optional Browser Use Cloud, hosted models, hosted browsers, and service Terms/Privacy Policy. Open-source MIT licensing does not grant permission to use hosted services, transfer data to them, or accept their terms on behalf of a yfere project.

Relevant official documentation inspected by URL (not treated as a substitute for the pinned source):

- Browser parameters, including `permissions`, `accept_downloads`, local/remote mode, profiles: https://docs.browser-use.com/open-source/customize/browser/all-parameters
- MCP integration and tool examples: https://docs.browser-use.com/open-source/customize/integrations/mcp-server
- Terminal profiles/secrets documentation: https://docs.browser-use.com/open-source/browser-use-terminal
- Repository README at the recorded source: https://github.com/browser-use/browser-use/blob/ebafaa11571dcb1a928a2b971d2f5d5eb15f3c29/README.md
- License at the recorded source: https://github.com/browser-use/browser-use/blob/ebafaa11571dcb1a928a2b971d2f5d5eb15f3c29/LICENSE

## 3. Historical contract notes (non-normative evidence)

The capability/result semantics below preserve research evidence only. They are historical/non-normative; the sole effective enums, codes, schemas, and invariants are in `docs/decision-contracts.md` and its B0 freeze record.

### 3.1 Historical capability request notes (non-normative)

A request is scoped to one `runId`, `taskAttemptId`, assignment member, browser session ID, project policy version, and capability-grant ID. It contains only:

- an action kind from a closed allowlist;
- structured action arguments (origin, selector/reference, bounded text or redacted secret handle, wait condition, or artifact handle);
- an explicit deadline and resource limits;
- allowed-origin policy snapshot reference;
- workspace/download/upload artifact handles, never arbitrary paths;
- approval requirement and approval reference when the action is externally visible or destructive;
- browser-use package/source compatibility identity.

A request cannot introduce a new tool, origin, permission, path, credential, browser profile, or artifact owner. Page text, DOM text, URLs, and downloaded contents are untrusted observations and are never authority.

### 3.2 Historical capability result/event notes (non-normative)

Every event is correlated to the request and has a monotonic sequence number. It may contain redacted page metadata, bounded extraction data, screenshot/trace/download references, policy outcomes, and timing where observed. It must preserve `unknown` for missing timing, billing, delivery, or side-effect information.

A successful action means only that the adapter observed the requested browser-level result. It does not mean that an external site committed the requested mutation. Results for submissions, purchases, messages, account changes, uploads, or other externally visible operations must include a confirmation state: `not_attempted`, `attempted_unconfirmed`, `confirmed_by_observation`, or `unknown`.

Artifacts are referenced by yfere-owned opaque artifact IDs and content hashes. The adapter never returns a caller-selected destination path. Screenshots, traces, downloads, and recordings are separate artifact kinds with independent retention and redaction rules.

### 3.3 Historical grants and approvals notes (non-normative)

A capability grant is deterministic policy data, not a semantic model output. It binds project, run, task attempt, session, allowed actions, allowed origins, profile class, network mode, input/output artifact handles, resource ceilings, and expiry. A grant cannot be widened by page content, browser-use, or an agent response.

Human approval is required immediately before:

- sending or publishing content, submitting a form with external effect, purchasing, booking, deleting, changing account/security settings, or granting access;
- uploading an artifact or entering a credential/secret into a site;
- navigating to an origin outside the pre-approved allowlist;
- downloading or retaining sensitive material outside the declared run scope;
- using an existing authenticated profile or cloud browser profile;
- any action whose external outcome cannot be made deterministic and whose impact is material.

Approval is bound to an exact action summary, origin, artifact/recipient where known, risk class, and expiry. It does not approve later changed actions. Read-only navigation and extraction can be pre-granted within an allowlist, but an approval bypass is never inferred from confidence or a prior click.

## 4. Sequence and lifecycle

1. `yfere` validates the assignment, project policy, browser capability grant, origin rules, artifact handles, risk class, and resource limits. It records a redacted `browser.requested` event.
2. The provider performs a local preflight: pinned browser-use identity, Python/runtime compatibility, browser executable availability, telemetry setting, network mode, clean per-run directories, and no forbidden credential/profile inputs. Failure is typed before launch.
3. Yfere creates a fresh session/profile by default. A reusable profile or cloud profile requires an explicit grant and human approval; cookies, storage state, extensions, and local browser profiles are never shared between projects or runs by default.
4. Yfere launches the adapter as an owned child process with a bounded environment, IPC channel, CPU/memory/time limits, and run-scoped directories. No raw prompt or yfere provider credential is placed in the environment.
5. The adapter starts browser-use in the selected local/remote mode and emits `session.started` with opaque IDs and effective non-secret policy. It must reject unexpected effective domains, proxy modes, permissions, downloads paths, storage state, or telemetry settings.
6. For each action, yfere validates the closed action schema and policy. It records `action.requested`. If approval is required, execution pauses in `approval.required`; only the matching approval resumes it.
7. The adapter executes one bounded primitive and emits progress/observation events. Browser/page content is treated as untrusted input. Origin redirects, downloads, popups, uploads, and new tabs are rechecked against policy, not trusted because the initial URL was allowed.
8. Yfere commits an artifact only after containment, size/type, malware/content policy, and ownership checks. It emits `artifact.created` or `artifact.rejected` with an opaque reference. No screenshot, trace, download, DOM dump, or receipt may contain secrets or unrestricted page content by default.
9. On success, failure, cancellation, timeout, browser crash, or uncertain external result, yfere stops accepting actions, requests adapter/browser shutdown, waits briefly, then kills/reaps the entire owned process tree and closes the session. Cleanup is idempotent and independently recorded.
10. Yfere emits a terminal `browser.completed`, `browser.failed`, `browser.cancelled`, or `browser.uncertain` receipt. The assignment and run remain immutable; a recovery/retry is a new browser attempt with a new session/profile and explicit lineage.

Cancellation precedence is: explicit user/system cancellation, then outer deadline, then provider retry policy. Cancellation must propagate through IPC, browser-use, CDP/browser, and owned children. A late adapter result cannot turn a cancelled or timed-out run into success.

## 5. Historical failure taxonomy and receipt notes (non-normative)

The legacy names below are retained for evidence. They conform to the sole normative contract as follows: `BROWSER_CONFIG_INVALID`/`BROWSER_VERSION_MISMATCH` -> `config_invalid`/`version_mismatch`; `BROWSER_UNAVAILABLE` -> `unavailable`; `BROWSER_START_FAILED` -> `unavailable` (with `details.phase=start`); `BROWSER_POLICY_DENIED` -> `policy_denied`; `BROWSER_APPROVAL_REQUIRED` -> `approval_required`; `BROWSER_APPROVAL_EXPIRED` -> `approval_expired`; `BROWSER_PROFILE_DENIED` -> `profile_denied`; `BROWSER_ARTIFACT_DENIED` -> `artifact_denied`; `BROWSER_ACTION_INVALID` -> `action_invalid`; `BROWSER_NAVIGATION_FAILED` -> `navigation_failed`; `BROWSER_TIMEOUT` -> `timeout`; `BROWSER_CANCELLED` -> `cancellation`; `BROWSER_CRASHED` -> `crash`; `BROWSER_PROTOCOL_ERROR` -> `protocol`; `BROWSER_SECRET_DETECTED` -> `secret_detection`; `BROWSER_EXTERNAL_UNCONFIRMED` -> `external_unconfirmed`; `BROWSER_CLEANUP_UNCERTAIN` -> `cleanup_uncertain`; `BROWSER_RESOURCE_EXCEEDED` -> `resource_limit`. No `BROWSER_*` name is normative or unmatched.



| Code | Meaning | Retry/replan policy |
| --- | --- | --- |
| `BROWSER_CONFIG_INVALID` | Unsupported adapter/source/runtime or malformed grant | No automatic retry; fix configuration |
| `BROWSER_VERSION_MISMATCH` | Pinned browser-use/API contract or browser binary mismatch | No retry; compatibility review |
| `BROWSER_UNAVAILABLE` | Python, browser executable, CDP, adapter, or cloud endpoint unavailable | Bounded retry only if policy says so |
| `BROWSER_START_FAILED` | Session/profile could not be created safely | New isolated attempt only; never reuse partial profile |
| `BROWSER_POLICY_DENIED` | Origin, action, permission, redirect, popup, file, or network rule denied | Terminal unless a new grant/approval is issued |
| `BROWSER_APPROVAL_REQUIRED` | Action is blocked pending matching human approval | Pause; no implicit continuation |
| `BROWSER_APPROVAL_EXPIRED` | Approval missing, stale, or mismatched | Terminal; request a new approval |
| `BROWSER_PROFILE_DENIED` | Credential, cookie, storage-state, extension, or profile isolation violation | Terminal; never fall back to a broader profile |
| `BROWSER_ARTIFACT_DENIED` | Upload/download/screenshot/trace violates containment, type, size, ownership, or redaction policy | Terminal for that artifact |
| `BROWSER_ACTION_INVALID` | Closed action schema, selector, argument, or resource limit invalid | No retry without a new validated action |
| `BROWSER_NAVIGATION_FAILED` | Navigation/readiness/network failure | Bounded retry only for idempotent read-only actions |
| `BROWSER_TIMEOUT` | Action or session exceeded its deadline | No retry for external effects; read-only retry only if explicitly safe |
| `BROWSER_CANCELLED` | Cancellation won before completion | Terminal; cleanup must still be verified |
| `BROWSER_CRASHED` | Browser/page/adapter process exited or CDP lost | New isolated attempt only if action is idempotent |
| `BROWSER_PROTOCOL_ERROR` | Adapter/MCP/CDP response malformed or incompatible | Terminal and compatibility signal |
| `BROWSER_SECRET_DETECTED` | Secret or credential material appeared in a forbidden request/log/artifact | Fail closed; security incident receipt |
| `BROWSER_EXTERNAL_UNCONFIRMED` | External mutation may have happened but cannot be verified | Never blind retry; require human reconciliation |
| `BROWSER_CLEANUP_UNCERTAIN` | Process/profile/browser cleanup could not be proven | Terminal security failure; quarantine run scope |
| `BROWSER_RESOURCE_EXCEEDED` | CPU, memory, bytes, tabs, downloads, actions, or wall-clock ceiling exceeded | Terminal; no silent truncation |

Errors exposed to agents are safe summaries with code and next action. Raw browser logs, headers, cookies, storage state, credentials, and page bodies stay outside decision state and ordinary telemetry. Receipts distinguish `failed before effect`, `effect unknown`, and `effect confirmed`; they never describe an unobserved external outcome as success.

## 6. Isolation and security requirements

- Profiles: one ephemeral user-data directory per run by default, with restrictive permissions and guaranteed cleanup. Never use `Browser.from_system_chrome()` or an operator's existing profile in the default lane. Cloud profile IDs are sensitive handles and require separate approval.
- Cookies/storage/credentials: no import/export across projects or runs by default. Secret entry must use a yfere-approved secret handle or human-mediated UI path; secret values never enter prompts, events, traces, screenshots, fixtures, SQLite, artifacts, or model context.
- Workspace: browser downloads, uploads, traces, videos, and screenshots use run-owned directories or artifact stores selected by yfere. Resolve and verify containment before and after every file operation; reject symlinks, traversal, unexpected filenames, and oversized or unsupported content.
- Network: deterministic allow/deny policy checks initial navigation, redirects, subresources where enforceable, popups, downloads, uploads, proxy use, and private/local IP targets. Default is network-denied in hermetic tests and an explicit origin allowlist in live tests. Browser-use's `allowed_domains`/`prohibited_domains` is defense in depth, not the sole enforcement layer.
- Browser permissions: deny camera, microphone, geolocation, notifications, clipboard, downloads, and other permissions unless a grant explicitly enables them. Never enable browser-use security-disabling flags in production.
- Prompt/telemetry: page content is untrusted and bounded. Do not send full DOM, cookies, headers, credentials, arbitrary local files, or traces to an LLM or telemetry service. Browser-use upstream telemetry must be disabled or proven to meet yfere's policy before any live launch.
- Resource limits: cap sessions, tabs, actions, navigation depth, page bytes, download/upload bytes, screenshot/trace sizes, CPU, memory, child processes, and wall-clock time independently. Exceeding a limit is a typed terminal outcome.
- Process cleanup: track the complete process group/tree, not only the adapter PID. Verify browser children and temporary profiles are gone or quarantine them; cleanup failure is not success.

## 7. Comparison of integration forms

| Form | Benefits | Costs/risks | Decision |
| --- | --- | --- | --- |
| Tool adapter over a yfere-owned child process | Small stable contract; preserves the provider-neutral three-provider yfere core; isolates Python/browser crashes and dependencies; easy network-denied mocks; explicit lifecycle and cleanup | IPC/protocol work; per-run startup overhead; must harden process and artifact boundaries | Preferred initial seam |
| Capability provider with a long-lived sidecar/service | Warm browser pools, better throughput, centralized policy/observability | Larger trust boundary; cross-run profile/session leakage risk; harder tenant isolation, upgrades, and cleanup; service operations and auth surface | Later only if measured startup cost justifies it |
| Direct Python library embedding | Richest browser-use API and fewer IPC translations | Couples yfere to Python/runtime/dependency lifecycle; crash/secret/path boundary becomes in-process; hard to guarantee cleanup and version isolation; invites use of internal classes | Reject for initial seam |
| Stock MCP server/tool integration | Existing tool vocabulary and ecosystem; useful exploratory transport | Stock MCP does not provide yfere grants, approval, path containment, secret redaction, or process policy; tool drift and server lifecycle ambiguity | Consider as an adapter transport, never as the boundary |
| Browser-use autonomous `Agent` loop | Fast path to broad task behavior | Competes with yfere orchestration, provider neutrality, budgets, approval and deterministic receipts; opaque retries/side effects; harder replay | Explicitly out of scope for initial contract |

A sidecar can become a deployment optimization behind the same provider contract only after an isolation review and evidence that startup overhead materially affects approved workloads. It must not change the public grant, receipt, approval, or redaction semantics.

## 8. Test and verification matrix

| Lane | Browser/network | Credentials | Required evidence |
| --- | --- | --- | --- |
| Contract/unit | No browser; fake adapter and schema fixtures | None | Closed actions/grants, unknown preservation, error mapping, approval matching, receipt state machine |
| Hermetic adapter | Mock browser-use process; network denied | None | IPC framing, malformed events, cancellation, deadline, child cleanup, artifact containment, no secret persistence |
| Local controlled browser | Local fixture pages only; no external network | Synthetic/no-auth profile | Navigation, redirects, popups, downloads, uploads, screenshots, traces, private-IP denial, profile isolation, resource limits |
| Browser-use compatibility | Pinned source/runtime and controlled fixture pages | None or synthetic | Source/API smoke contract, effective configuration, package/browser version identity, upstream test evidence recorded by SHA |
| Security adversarial | Fixture pages designed for prompt injection, traversal, redirects, secret reflection, download filename attacks | Synthetic secrets only | Fail-closed policy, redaction, no secret in model/telemetry/artifacts, no path escape |
| Authorized live read-only | Explicit human authorization; exact origin allowlist | Dedicated test account only | Real navigation/extraction behavior, observed timing, failures, provider/cloud data handling, spend and retention evidence |
| Authorized live external effect | Separate approval per test/action; narrowly scoped account | Dedicated disposable account/artifacts | Approval receipts, idempotency, externally confirmed vs uncertain outcomes, reconciliation and cleanup |
| Upgrade certification | New pinned browser-use SHA in isolated environment | None for offline; separate approval for live | Dependency/license diff, contract tests, security suite, source review, rollback decision |

Default CI runs contract, hermetic, local controlled, and security lanes with network denied. Live-browser lanes never run because a key or browser binary happens to exist; they require explicit flags, authorization, approved data handling, and a separate test target. No test fixture contains real cookies, tokens, credentials, customer prompts, or real downloaded private content.

## 9. Approval matrix

| Operation | Default | Required authority |
| --- | --- | --- |
| Build/test mock adapter | Allowed in hermetic workspace | Normal development authorization; no network |
| Launch local browser on fixture pages | Opt-in test lane | Test authorization; network denied except fixture server |
| Read allowed public origin | Denied until project grant | Project grant; human approval if origin is not pre-approved |
| Reuse authenticated/local/cloud profile | Denied | Explicit project grant plus human approval and isolation review |
| Type a non-secret value | Grant-scoped | Project grant; approval if it is externally visible or consequential |
| Enter/use a secret | Denied by default | Dedicated secret capability plus just-in-time human approval; value never exposed to yfere state |
| Upload file | Denied by default | Exact artifact grant, destination/origin grant, and human approval |
| Download/retain file | Grant-scoped | Contained run artifact grant; human approval for sensitive or out-of-scope data |
| Submit/publish/purchase/delete/account change | Denied by default | Just-in-time human approval for exact action and target |
| Enable camera/mic/geolocation/clipboard/notifications | Denied | Explicit capability grant plus human approval and test/live lane approval |
| Use Browser Use Cloud/hosted model/browser | Denied | Provider/service approval, data-handling/terms approval, spend ceiling, and human authorization |
| Enable upstream telemetry | Denied | Privacy/security approval after event allowlist review |
| Upgrade browser-use SHA | Denied in production pin | Source/dependency/license/security review and compatibility certification |
| Kill/reap a browser session | Always authorized by yfere | System lifecycle authority; receipt of cleanup outcome required |

## 10. Dependency, licensing, and upgrade policy

The open-source browser-use library at the recorded SHA is MIT licensed, so distribution/embedding must retain the copyright and license notice and preserve all applicable notices for transitive dependencies. This is not a blanket approval for browser-use Cloud, hosted browsers, hosted models, proxy/CAPTCHA services, or any service terms linked by the README. Those are separate vendor/service and data-transfer decisions.

The preferred adapter should pin:

- browser-use source/package version and exact commit or immutable package digest;
- Python version and lockfile, browser binary/channel/version, CDP protocol compatibility, and adapter protocol version;
- all yfere adapter dependencies and license/notice inventory;
- effective browser-use telemetry configuration and cloud/local mode;
- a compatibility contract hash recorded in receipts, without secrets.

An upgrade is a reviewed migration: inspect source/docs/tests/license at the new SHA, diff security-sensitive defaults and dependency graph, run offline contract/security/local-browser lanes, then run separately authorized live lanes if behavior changed. Keep the prior pin available for rollback. Never silently track `main`, a floating package range, or an unrecorded browser auto-update.

## 11. Historical proposed amendments (non-normative)

The material in this section records prior planning proposals and implementation rationale only. It does not amend the effective contract; B0/B1/B2 use `docs/decision-contracts.md` and its immutable freeze record.

These are proposed edits for a future planning reconciliation. This task intentionally does not edit the six effective planning documents.

Reconciliation supersedes that historical sentence: the effective normative contract is now `docs/decision-contracts.md` version 1. This report remains supporting evidence and implementation rationale; B0 freezes the contract/hash, and B1/B2 consume only the accepted version/hash.

Before B1/B2, yfere requires an independent out-of-browser egress reference monitor enforced through OS/proxy/network-namespace or equivalent controls. It validates/revalidates DNS A/AAAA/CNAME results and connection targets, redirects and proxy routes; denies loopback, RFC1918, ULA, link-local, multicast, metadata endpoints, encoded aliases, and disallowed ports; and constrains WebSocket, service-worker, subresource, download, and proxy traffic. The fixture suite includes DNS rebinding, IPv6, redirect-chain, proxy-bypass, subresource, WebSocket, and metadata-service cases.

The effective approval is the closed one-use `ApprovalGrant` defined in `docs/decision-contracts.md`, bound to approval/project/run/attempt/session/grant/action IDs, normalized origin, rendered target fingerprint, recipient/target, normalized effect parameters including payload/amount, artifact content hashes, risk, expiry, canonical digest, and nonce. It is atomically consumed and revalidated immediately before execution; any target/page/effect change requires reapproval. `BrowserReceipt` records approval ID/digest and observed confirmation evidence. Secret entry is disabled by default; any future enablement requires a separately trusted exact-origin/field/action broker, no model/ordinary-IPC exposure, sensitive capture suppression/redaction, zeroization, and malicious-reflection/logging-leak fixtures.

### `docs/architecture.md`

Add to the scope/invariants section:

> Future browser automation is a standalone yfere-owned capability integration, not a harness-compatibility requirement. The initial seam is a provider-neutral `BrowserCapabilityProvider` implemented by a version-pinned, out-of-process browser-use adapter. Browser-use's agent loop, Python runtime, MCP server, cloud services, profiles, credentials, and internal classes are not yfere orchestration or authorization authorities. Yfere owns grants, approvals, origin/network policy, artifact handles, cancellation/reaping, receipts, and uncertain-side-effect reporting.

Add a future module boundary after the provider transport list:

> `src/browser/capability-provider.ts` owns the stable browser capability contract; `src/browser/browser-use-adapter.ts` is a later pinned child-process adapter; `src/browser/policy.ts` owns origin/action/profile/artifact checks; `src/browser/receipts.ts` owns browser attempt and uncertain-effect receipts. These modules remain outside the selector MVP and do not import provider credentials into decision state.

Add to the Phase 9 implementation boundary:

> Browser support begins only after a separate host-execution gate and must use ephemeral per-run profiles, scoped workspace/artifact handles, explicit origin/network policy, just-in-time approval for destructive/external actions, bounded child-process/browser cleanup, and no upstream telemetry or secret material unless independently approved.

### `docs/decision-contracts.md`

Add normative contracts:

> `BrowserGrant`: `{ grantId, projectId, runId, taskAttemptId, sessionClass, actions, allowedOrigins, networkMode, profileMode, inputArtifactIds, outputArtifactPolicy, limits, approvalPolicy, expiresAt, policyVersion }`. It is deterministic policy data; semantic providers cannot create or widen it.
>
> `BrowserAction`: a closed action union for session, navigation, observation, interaction, upload, download, screenshot, trace, and close operations. Arguments contain opaque artifact/secret handles, never arbitrary paths or secret values.
>
> `BrowserReceipt`: `{ browserAttemptId, actionId, status, errorCode?, artifactRefs, observedEffect, cleanupStatus, adapterContractHash, sourceCommit, occurredAt }`. `observedEffect` must preserve `not_attempted | attempted_unconfirmed | confirmed_by_observation | unknown`; absent timing/billing/effect is `unknown`.

Add browser error codes from this document's taxonomy (at minimum policy denied, approval required/expired, profile denied, artifact denied, timeout, cancelled, crash, protocol error, external unconfirmed, and cleanup uncertain). Add an idempotency rule: external-effect actions are never automatically retried after `attempted_unconfirmed` or `unknown`.

### `docs/threat-model.md`

Add a browser subsection after the current host-execution boundary:

> Browser automation is an untrusted capability boundary. Page/DOM text, redirects, downloads, popups, cookies, storage state, browser logs, and cloud responses are untrusted data and cannot grant origins, tools, paths, permissions, credentials, or approvals. Controls require a yfere-owned child process, ephemeral per-run profile, origin and private-IP policy checked on redirects/popups/downloads, artifact containment and size/type limits, disabled upstream telemetry unless approved, secret redaction, explicit approval for external/destructive effects, and complete process-tree reaping. A failed cleanup or unconfirmed external effect is a terminal security receipt, not success.

Add security invariants:

> No run shares cookies/storage/profile state by default; no browser artifact escapes its run-owned scope; no page content widens a grant; no external-effect action is blindly retried after an uncertain result; no browser secret appears in prompts, telemetry, decision state, fixtures, traces, screenshots, or artifacts; browser cancellation kills/reaps all owned descendants.

### `docs/evaluation-protocol.md`

Add lanes after Gate C:

> Browser hermetic lane: fake adapter, network denied, synthetic pages/artifacts only; test protocol validation, policy, approval, isolation, redaction, cancellation, cleanup, and receipts.
>
> Browser controlled-local lane: pinned browser-use and local fixture pages only; test navigation, redirects, downloads/uploads, screenshots/traces, profile isolation, private-IP blocking, resource limits, and uncertain-effect handling.
>
> Browser live lane: separately authorized, disposable accounts/origins and dedicated credentials; never default CI. Measure only observed browser capability behavior and effect confirmation. Do not infer external success from an adapter return.

Add to the fixture requirements: malicious page prompt injection, redirect to denied origin, private-IP target, traversal/symlink download, upload containment, secret reflection, browser crash, cancellation during navigation, external submission timeout, and cleanup uncertainty. Add browser-use SHA, adapter contract hash, browser binary identity, and license/dependency inventory to upgrade evidence.

### `docs/planning-readiness.md`

Add a settled boundary:

> Browser-use is a future standalone yfere capability integration. The initial seam is an out-of-process, version-pinned adapter behind a yfere-owned provider-neutral contract; direct Python embedding, stock MCP as a security boundary, and browser-use autonomous orchestration are not MVP assumptions.

Add unresolved Phase 9 decisions/checklist items:

> - [ ] Browser-use source/package SHA, Python/browser versions, dependency/license inventory, and telemetry configuration are pinned and reviewed.
> - [ ] Browser grant/action/receipt schemas and uncertain-external-effect semantics are accepted.
> - [ ] Profile/cookie/credential, workspace/artifact, origin/network, approval, cancellation, and cleanup policies are tested in hermetic and controlled-local lanes.
> - [ ] Any Browser Use Cloud, hosted model, proxy, CAPTCHA, or upstream telemetry use has separate terms, data-handling, spend, and human authorization.

No amendment should authorize live browser use, credentials, hosted services, or installation by itself.

## 12. Open decisions before implementation

1. Whether the first adapter transport is a minimal JSON-over-stdio protocol or a wrapped MCP process; the public capability contract must remain the same either way.
2. The exact browser binary/container policy and whether controlled-local fixtures run only against a checked-in fixture server or an approved isolated network namespace.
3. The approved secret-entry mechanism, if any, and whether live authenticated sessions are supported at all in the first release.
4. Retention and access policy for screenshots, traces, downloads, and uncertain-side-effect receipts.
5. Whether a long-lived sidecar is justified by measured startup cost after the short-lived adapter passes isolation and cleanup tests.
6. Account/service terms and data handling before any Browser Use Cloud, hosted browser, hosted model, proxy, CAPTCHA solver, or upstream telemetry path is enabled.

Until these decisions and the amendments are accepted, browser-use support remains a documented future boundary, not an implementation or live-test authorization.

## Sources

1. Official repository at recorded SHA: https://github.com/browser-use/browser-use/tree/ebafaa11571dcb1a928a2b971d2f5d5eb15f3c29
2. `pyproject.toml` at recorded SHA: https://github.com/browser-use/browser-use/blob/ebafaa11571dcb1a928a2b971d2f5d5eb15f3c29/pyproject.toml
3. `browser_use/browser/session.py` at recorded SHA: https://github.com/browser-use/browser-use/blob/ebafaa11571dcb1a928a2b971d2f5d5eb15f3c29/browser_use/browser/session.py
4. `browser_use/browser/profile.py` at recorded SHA: https://github.com/browser-use/browser-use/blob/ebafaa11571dcb1a928a2b971d2f5d5eb15f3c29/browser_use/browser/profile.py
5. `browser_use/browser/views.py` at recorded SHA: https://github.com/browser-use/browser-use/blob/ebafaa11571dcb1a928a2b971d2f5d5eb15f3c29/browser_use/browser/views.py
6. `browser_use/telemetry/service.py` at recorded SHA: https://github.com/browser-use/browser-use/blob/ebafaa11571dcb1a928a2b971d2f5d5eb15f3c29/browser_use/telemetry/service.py
7. License at recorded SHA: https://github.com/browser-use/browser-use/blob/ebafaa11571dcb1a928a2b971d2f5d5eb15f3c29/LICENSE
8. Browser parameters documentation: https://docs.browser-use.com/open-source/customize/browser/all-parameters
9. MCP integration documentation: https://docs.browser-use.com/open-source/customize/integrations/mcp-server
10. Browser-use terminal/profile documentation: https://docs.browser-use.com/open-source/browser-use-terminal
