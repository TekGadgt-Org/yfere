# yfere offline core and deterministic catalogs

This repository currently contains two implemented offline slices:

- An offline, fail-closed core that validates closed runtime configuration, classifies synthetic inputs, renders a redacted effective configuration, and exposes no provider, authentication, or network transport.
- Phase 2 deterministic domain catalogs for versioned personas, model endpoints, skills, and Thew evidence. Catalog loading validates, normalizes, and freezes data without opening a live runtime.

The implementation is standalone and offline. It does not provide provider transport or authentication, live Jev, browser execution, SQLite persistence, unrestricted network access, or real-project mutation. The approved future provider registry is codex, claude-code, and opencode-go; provider transports and the runtime/decision slices remain planned.

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

## Current status and roadmap

Implemented: the offline configuration core and Phase 2 catalog parsing, closed-schema validation, deterministic normalization, immutable snapshots, canonical identity, and fail-closed input policy.

Planned, not implemented: provider transport/authentication, live Jev and runtime/decision execution, browser execution, SQLite persistence, unrestricted network integrations, catalog CLI tooling, and mutation of real projects. No command or API for those future slices should be inferred from this README.
