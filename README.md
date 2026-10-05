# yfere offline core, deterministic catalogs, and recorded decisions

This repository currently contains four implemented offline slices:

- An offline, fail-closed core that validates closed runtime configuration, classifies synthetic inputs, renders a redacted effective configuration, and exposes no provider, authentication, or network transport.
- Phase 2 deterministic domain catalogs for versioned personas, model endpoints, skills, and Thew evidence. Catalog loading validates, normalizes, and freezes data without opening a live runtime.
- A Phase 3 recorded-decision service for deterministic replay from bounded, app-owned fixture files or copied bytes. It validates the complete fixture set before publication and performs no live provider call.
- A Phase 4 policy engine for pure, deterministic eligibility and team reconciliation from trusted catalogs and explicit policy inputs. It returns detached, deeply frozen results and performs no live selection or execution.

The implementation is standalone and offline. It does not provide provider transport or authentication, live Jev, browser execution, SQLite persistence, unrestricted network access, or real-project mutation. The approved future task-agent provider registry is codex, claude-code, and opencode-go; those provider transports and live orchestration remain planned.

Requirements: Node 20+ and pnpm 9.15.5.

## Phase 2 catalogs

A catalog document is JSON or YAML with a closed schema and one of four document kinds:

- `personas`: persona definitions, including capability and skill references and workspace/review policy.
- `models`: model endpoint descriptions, availability/authorization state, modalities, limits, cost, and operational evidence references.
- `skills`: versioned skill metadata, content hash, trust, prerequisites, side-effect class, conflicts, and artifact formats.
- `thews`: Thew evidence records connecting a metric and rubric to a subject, value, uncertainty, provenance, and validity status.

Parsing rejects malformed input, duplicate JSON keys, unknown fields, unsupported formats, secret-shaped values, and unsafe or private repository references. Normalization is deterministic: records and references are validated, dangling or duplicate references fail closed, and document order does not affect the result. Snapshots are deep-frozen. Their canonical JSON identity uses recursively sorted object keys and stable array/record ordering; `snapshotId` is the SHA-256 digest of that canonical identity (without the `snapshotId` field). The canonical aggregate is limited to 8,000,000 bytes; individual source documents and document/record/node/depth limits are also bounded.

The public Phase 2 API is exported from `src/domain/index.ts`:

- `CATALOG_SCHEMA_VERSION`, `CANONICALIZATION_VERSION`, and `OFFLINE_POLICY_VERSION`
- `personaDefinitionSchema`, `modelEndpointSchema`, `skillDefinitionSchema`, `thewEvidenceSchema`, `catalogDocumentSchema`, and `catalogSchemas`
- `parseCatalogDocument`, `normalizeCatalogDocuments`, `loadCatalogSnapshot`, and `canonicalizeCatalog`
- `CatalogValidationError`
- Types `CatalogDocument`, `CatalogSnapshot`, `CatalogSource`, `DocumentKind`, `PersonaDefinition`, `ModelEndpoint`, `SkillDefinition`, and `ThewEvidence`

For example, application code can load a checked-in source and use the resulting immutable snapshot:

    import { loadCatalogSnapshot } from './dist/domain/index.js';

    const jsonText = JSON.stringify({
      kind: 'skills', version: '1.0.0', records: [{
        id: 'review-skill', version: '1.0.0',
        contentHash: '0000000000000000000000000000000000000000000000000000000000000000',
        trust: 'reviewed', description: 'A documented review skill',
        positiveExamples: ['Review the change'], negativeExamples: [],
        requiredCapabilities: [], requiredTools: [], prerequisites: [],
        sideEffectClass: 'none', conflicts: [], instructionTokenEstimate: 10,
        artifactFormats: ['markdown'],
      }],
    });
    const yamlText = `kind: models
    version: 1.0.0
    records: []`;

    const snapshot = loadCatalogSnapshot([
      { source: 'catalog/skills.json', format: 'json', text: jsonText },
      { source: 'catalog/models.yaml', format: 'yaml', text: yamlText },
    ]);
    console.log(snapshot.snapshotId, snapshot.skills.length);

`parseCatalogDocument(text, format, source)` is useful when a single document must be inspected before normalization. `normalizeCatalogDocuments(documents)` accepts already parsed documents. `canonicalizeCatalog(snapshotWithoutId)` returns the canonical JSON used for identity checks.

### Security and privacy boundary

Catalog inputs are treated as untrusted. Credentials, credential-shaped fields and values, known-host private repository references, local/private paths, SSH/file URLs, and private-key material fail closed. Diagnostics use fixed, sanitized paths and source labels rather than reflecting hostile content; raw sensitive values are not emitted. Hostile accessors/proxies and unsupported serialization values are isolated and normalized into `CatalogValidationError` results instead of escaping attacker-controlled exceptions.

## Configuration CLI

The CLI remains the bootstrap configuration path; there is no catalog CLI command. Configuration is JSON or YAML. Overrides are global only; unknown keys, profile/provider/persona scopes, unbounded values, and implicit raw capture fail closed. CLI output is redacted and contains no secret values.

    pnpm install --frozen-lockfile
    pnpm typecheck
    pnpm test
    pnpm build
    pnpm start -- --config examples/synthetic.json

## Phase 3 recorded-decision replay

`RecordedDecisionService` provides deterministic, offline replay of previously recorded decision responses. Construct it with either a filesystem path or a `Uint8Array`/`Buffer` containing a JSON array of fixtures. The service copies byte inputs, validates the entire fixture set atomically, and returns detached response values so caller mutation cannot alter later replay.

The Phase 3 MVP deliberately accepts files or copied bytes rather than arbitrary live JavaScript object graphs or JSON strings. Admission applies these boundaries:

- Raw input is capped at 32,000,000 bytes before parsing.
- UTF-8 decoding is fatal, followed by native `JSON.parse`.
- Native duplicate-member behavior is last-member-wins; duplicate-member rejection is deferred hardening for this app-owned offline boundary.
- Fixtures use closed request, response, question, answer, provenance, version, and digest schemas.
- Dynamic identifiers are nonempty and limited to 256 UTF-16 code units. Literal `__proto__`, `constructor`, and `prototype` identifiers remain data and are preserved safely.
- A set may contain at most 1,024 fixtures. Canonical limits include 4,000,000 bytes per fixture, 16,000,000 bytes in aggregate, 1,000,000 bytes of state, depth 128, 100,000 nodes, and 10,000 object keys.
- Replay requires the exact tuple identity and exact state, question, provider-contract, SDK, response, fixture, and fixture-version bindings. A mismatch returns `NON_REPLAYABLE` rather than falling through to live evaluation.
- Cancellation, deadlines, and retry budgets fail with typed `DecisionServiceError` results.

The public package surfaces are the package root and `yfere/decisions`. They export `RecordedDecisionService`, fixture and manifest hash helpers, schemas, limits, canonicalization helpers, `DecisionServiceError`, and the associated TypeScript types. Internal replay modules, admission hooks, and test hooks are not exported.

Phase 3 remains fixture-only and offline. It does not contact Jev or any task-agent provider, authenticate credentials, access the network, execute browser automation, persist telemetry, or mutate a project.

## Current status and roadmap

Implemented: the offline configuration core; Phase 2 deterministic catalog parsing and normalization; Phase 3 bounded recorded-decision replay with retained equality/+1 boundary, replay-binding, collision, ownership, atomicity, deadline, retry, and export regression coverage; and Phase 4 pure deterministic eligibility and team reconciliation.

Planned, not implemented: provider transport/authentication, live Jev-backed selection, task-agent execution, browser execution, SQLite persistence, unrestricted network integrations, catalog CLI tooling, and mutation of real projects. No command or API for those future slices should be inferred from this README.

## Phase 4 policy engine

The public `yfere/policy` surface provides closed, pure, deterministic eligibility and team reconciliation. It validates persona/model/skill requirements, endpoint availability and authorization, model compatibility, workspace and side-effect policy, finite shared reservations, exclusive artifact ownership, and independent review relations. Results are detached and deeply frozen; exclusions use a closed stable code set and are sorted by stable IDs. Unknown reservations remain unknown and fail closed only when the policy requires known values. No provider, network, credentials, filesystem mutation, semantic selection, fallback, or backfill is performed.

Phase 5 will add ranking, semantic selection, dynamic skill/model questions, sequencing, assignment freeze, and replan behavior. Phase 9 remains responsible for execution, credentials, tools, artifact materialization, runtime review enforcement, and deployment.
