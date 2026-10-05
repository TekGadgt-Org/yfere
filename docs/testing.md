# Testing yfere

Run these commands from the repository root. They are the verification recipe for the exact Phase 5 successor. The install is offline and uses the checked-in pnpm lockfile; no provider, credential, or network call is required.

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
pnpm test
```

The focused files cover the offline core/config CLI, catalogs, recorded decisions, policy, and Phase 5 selection respectively. The full command runs all five files. Test totals are intentionally not hard-coded here: Vitest's exact count is the evidence for the checked-out successor and can change with a test-only change.

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

After the documentation-only commit, confirm the worktree is clean and record the commit/tree/parent in the handoff:

```sh
git status --short
git rev-parse HEAD^{tree}
git rev-parse HEAD^
```

A clean result has no output from `git status --short`. The commit must have the accepted Phase 5 implementation commit `b07dd75bf0221d0bc83d77c7d197464d1d99030d` as its parent (or preserve that exact implementation as the parent in the successor history). No source, test, dependency, lockfile, configuration, or generated-build files are part of this documentation change.
