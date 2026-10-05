# yfere

Yfere is an offline TypeScript core for deterministic catalogs, recorded decision replay, policy evaluation, and two-stage persona/model/skill selection. It validates bounded inputs and freezes results; it does not execute agents or call providers.

## Implemented capabilities

- Offline configuration parsing and redacted effective-configuration rendering (JSON/YAML).
- Phase 2 deterministic catalogs for personas, model endpoints, skills, and Thew evidence, including validation, normalization, canonical identity, limits, and frozen snapshots.
- Phase 3 bounded recorded-decision replay from fixture files or copied bytes, with exact request/response binding and typed failures.
- Phase 4 pure policy eligibility and team reconciliation over trusted catalogs and explicit policy inputs.
- Phase 5 pure, detached two-stage selection: persona roster first, then model and model-conditioned skill choices, with deterministic policy re-checks, pins, traces, and assignment IDs.

Detailed behavior is in [Current capabilities](docs/current-capabilities.md). The repository's longer architectural and contract decisions remain in [architecture](docs/architecture.md) and [decision contracts](docs/decision-contracts.md).

## Prerequisites and quick start

Node.js 20 or newer and pnpm 9.15.5 are required.

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
pnpm start -- --config examples/synthetic.json
```

The CLI prints a redacted effective configuration. Configuration is the current bootstrap surface; there is no catalog or live-selection CLI.

## Package API

The package exports the implemented APIs from the package root and these subpaths:

- `yfere` — decisions, policy, selection, and shared exports.
- `yfere/decisions` — recorded replay, schemas, canonicalization, hashes, and typed errors.
- `yfere/policy` — eligibility and team reconciliation contracts and functions.
- `yfere/selection` — selector contracts, normalization, decision-request construction, and `selectRoster`/`select`.

After `pnpm build`, a compact selection call can use the exported `selectRoster` function with a normalized catalog, task policy, settled prompt, and recorded or deterministic answers. See [Current capabilities](docs/current-capabilities.md) for the boundaries and inputs; [Testing](docs/testing.md) contains package import smoke checks.

## Offline boundary and current limitations

All implemented paths are offline and fail closed. This repository does not provide live Jev/provider transport or authentication, task-agent execution, browser execution, persistence, telemetry, unrestricted network access, catalog CLI tooling, or real-project mutation. The provider names `codex`, `claude-code`, and `opencode-go` describe a future registry only; their transports are not implemented here. Phase 5 accepts recorded answers through its selection API and does not construct a live client, persist decisions, or perform fallback/backfill.

## Testing

The complete verification recipe, including frozen install, focused suites, package and CLI smoke checks, link/path checks, diff checks, and clean-tree checks, is in [Testing](docs/testing.md). The normal suite is:

```sh
pnpm typecheck && pnpm build && pnpm test
```

This project is private and currently version `0.1.0`; its package exports and scripts are defined in `package.json`.
