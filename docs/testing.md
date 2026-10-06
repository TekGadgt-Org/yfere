# Testing yfere

Run these commands from the repository root. They are the verification recipe for the currently implemented Phase 1–6 surface. The install is offline and uses the checked-in pnpm lockfile; no provider, credential, or network call is required.

## Install and static checks

```sh
pnpm install --offline --frozen-lockfile
pnpm typecheck
pnpm build
```

`pnpm build` writes the normal TypeScript build output under `dist/`. Do not commit generated output unless the repository policy explicitly requires it.

## Focused and full suites

Each implementation slice has one focused Vitest file:

```sh
pnpm exec vitest run tests/core.test.ts
pnpm exec vitest run tests/catalog.test.ts
pnpm exec vitest run tests/decisions.test.ts
pnpm exec vitest run tests/policy.test.ts
pnpm exec vitest run tests/selection.test.ts
pnpm exec vitest run tests/typesafe-jev.test.ts
pnpm test
```

The focused files cover the offline core/config CLI, catalogs, recorded decisions, policy, Phase 5 selection, and the Phase 6 injected TypeSafe transport respectively. The TypeSafe lane is hermetic and must not be changed into a live-provider test. Test totals are intentionally not hard-coded here: Vitest's exact count is the evidence for the checked-out successor and can change with a test-only change.

## Built-package import smoke checks

Build first, then verify the package root and every declared subpath export:

```sh
node -e "Promise.all(['yfere','yfere/decisions','yfere/policy','yfere/selection'].map(s=>import(s))).then(m=>{if(m.length!==4||m.some(x=>!x))process.exit(1); console.log('package imports: ok')})"
```

The four names must remain aligned with `package.json` `exports`. This checks the built `dist/` targets, not TypeScript source imports.

## CLI synthetic-config smoke test

```sh
pnpm start -- --config examples/synthetic.json
```

The command must complete successfully and print JSON containing the redacted effective configuration. It must not contact a provider or expose secret values.

## Documentation, diff, and tree checks

Check every local Markdown link in the README and the two current docs, and verify the documented target files exist:

```sh
node -e "const fs=require('node:fs'); const path=require('node:path'); const files=['README.md','docs/current-capabilities.md','docs/testing.md']; const missing=[]; for(const f of files){const s=fs.readFileSync(f,'utf8'); for(const m of s.matchAll(/\\]\(([^)#]+)(?:#[^)]+)?\\)/g)){const t=m[1]; if(!/^(https?:|#)/.test(t)&&!fs.existsSync(path.resolve(path.dirname(f),t))) missing.push(f+' -> '+t)}} if(missing.length){console.error(missing.join('\\n'));process.exit(1)} console.log('documentation links: ok')"
git diff --check
```

Before publication, confirm the worktree is clean and record the commit, tree, parent, and merge base in the handoff:

```sh
git status --short
git rev-parse HEAD
git rev-parse HEAD^{tree}
git rev-parse HEAD^
git merge-base HEAD origin/main
```

A clean result has no output from `git status --short`. Record the exact identities rather than assuming a historical phase commit remains the direct parent after later implementation and documentation successors.

## TypeSafe hermetic matrix

`tests/typesafe-jev.test.ts` is intentionally offline. Provider calls are supplied by an injected mock transport only. The TypeSafe adapter is tested at construction and evaluation boundaries, including provider-mode selection, pinned/alias model identity, correlated all-and-only answer mapping, choice and score distributions, shared response admission/hash checks, fixed status/error mapping, retry cap and zero SDK retries, deadline races against non-cooperative calls and backoff, cancellation precedence, sanitized request metadata, and zero-egress construction. The public barrels expose neither System One projector/wire types nor credential-bearing transport objects.

No test in this phase authorizes an endpoint, reads credentials, discovers models, emits telemetry, persists data, mutates a project, or performs a live network request. Those capabilities remain explicitly out of scope.
