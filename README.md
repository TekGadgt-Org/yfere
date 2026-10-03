# yfere offline bootstrap

This slice is an offline, fail-closed core. It validates closed runtime configuration, classifies synthetic inputs, renders a redacted effective configuration, and exposes no provider/auth/network transport. The approved future provider registry is codex, claude-code, and opencode-go; transports are intentionally not implemented.

Requirements: Node 20+ and pnpm 9.15.5.

Persistence is intentionally not opened in this offline bootstrap; the approved future persistence boundary is SQLite, to be introduced with the runtime/persistence slice rather than pulled into this no-provider core.

Commands:

    pnpm install --frozen-lockfile
    pnpm typecheck
    pnpm test
    pnpm build
    pnpm start -- --config examples/synthetic.json

Configuration is JSON or YAML. Overrides are global only; unknown keys, profile/provider/persona scopes, unbounded values, and implicit raw capture fail closed. CLI output is redacted and contains no secret values.
