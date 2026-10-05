# Current capabilities

This document describes the implemented offline runtime. The normative planning material is linked rather than copied: [architecture](architecture.md) and [decision contracts](decision-contracts.md). Claims here are limited to the code and public package exports in the accepted Phase 5 implementation.

## Offline core and configuration CLI

The configuration parser accepts JSON and YAML and produces a validated, redacted effective configuration. Unknown keys, scoped overrides, unbounded values, and implicit raw capture are rejected. `pnpm start -- --config examples/synthetic.json` is the current CLI path; it does not load catalogs or select agents. Network state is denied by default.

## Phase 2 catalogs

The implemented catalog API lives in `src/domain/index.ts`: schemas for personas, model endpoints, skills, Thew evidence, and catalog documents; `parseCatalogDocument`; `normalizeCatalogDocuments`; `loadCatalogSnapshot`; `canonicalizeCatalog`; schema/version constants; `CatalogValidationError`; and the associated types. It is covered by the catalog suite but is not a declared package export in the current `package.json`.

Catalog sources are JSON or YAML. Validation is closed and bounded: malformed data, unknown fields, duplicate IDs/references, unsafe/private references, secret-shaped values, unsupported formats, and invalid relationships fail closed. Normalization is deterministic and returns deeply frozen snapshots. Canonical identity uses stable key/record ordering and SHA-256; limits prevent unbounded source, record, node, depth, and aggregate input.

The catalog layer is an in-process library. It does not fetch sources, provide a catalog command, or open a runtime.

## Phase 3 recorded decisions

`yfere/decisions` exports `RecordedDecisionService`, `responseHash`, `fixtureHash`, decision and answer schemas, canonicalization/hash helpers, replay limits, `DecisionServiceError`, and related types. The service accepts an app-owned fixture file path or copied `Uint8Array`/`Buffer` bytes, validates the complete fixture set before publication, and returns detached replay responses.

Replay is exact and offline. It correlates the request identity and state/question/catalog/policy/provider-contract/SDK/fixture bindings; mismatches are `NON_REPLAYABLE`. Raw input, fixture count, canonical state, fixture, aggregate, depth, node, key, and question sizes are bounded. Cancellation, deadlines, invalid decisions, and budget exhaustion are typed errors. This reduced MVP intentionally uses native JSON duplicate-key last-member-wins behavior and does not include live provider calls, persistence, or a proof engine.

## Phase 4 policy

`yfere/policy` exports closed policy/candidate contracts, `evaluateEligibility`, and `reconcileTeam`. The pure functions validate trusted catalog choices and apply availability/authorization, capability, required-skill, trust, prerequisite/conflict, model compatibility, context, workspace, side-effect, artifact ownership, review-independence, and budget rules. Results are detached and deeply frozen; exclusions use stable codes and deterministic ordering. Unknown values remain unknown and fail closed where policy requires known values.

Policy does not select semantic winners, call providers, read credentials, access the network, mutate files, persist records, or perform fallback/backfill.

## Phase 5 selection

`yfere/selection` exports selector contracts and errors, `normalizeSelectorInput`, `buildDecisionRequest`, `selectRoster`, and `select`. The pipeline normalizes closed input, computes hard-eligible personas, performs the persona stage, then resolves models (2a) and skills conditioned on each frozen model (2b). It re-applies deterministic policy before producing a detached accepted roster or typed abstention/failure and exposes redacted decision traces.

Field-wise pins bypass only the corresponding inference: valid pins remain subject to all hard validation and compatibility checks. A model pin constrains skill choices; explicit skill arrays are exact and may suppress skill inference; invalid, unavailable, unauthorized, incompatible, or unknown IDs fail closed. The generation/replan inputs preserve an explicitly bounded replan lineage; no implicit loop is created. Selection accepts recorded/deterministic `DecisionService` answers only and never creates a live client, uses network access, persists decisions, or executes agents.

## Not implemented

Provider transport/authentication, live Jev, task-agent execution, browser execution, SQLite or other persistence, telemetry, unrestricted network integrations, catalog CLI commands, fallback/backfill, and mutation of real projects are outside this implementation. Future architecture notes must not be read as runtime availability.
