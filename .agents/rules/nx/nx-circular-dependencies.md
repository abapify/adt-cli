---
trigger: model_decision
description: Fix false circular dependencies in Nx caused by config files. Use .nxignore and ESLint ignores.
---

# Nx Circular Dependencies: Config File Exclusions

## Problem

Nx analyzes ALL TypeScript files for dependencies, including:

- `*.config.ts` (tsdown, vitest, vite, etc.)
- `scripts/` directory
- `e2e/` tests

Config files often import from parent projects (e.g., `../../tsdown.config.ts` for shared base config), which creates **false circular dependencies** in the project graph.

## Solution

Exclude non-runtime files from **both** Nx and ESLint analysis.

### 1. Create `.nxignore`

```gitignore
# Ignore scripts from Nx source file analysis
scripts/

# Ignore e2e tests at root level
e2e/

# Ignore all config files from dependency analysis
*.config.ts
*.config.js
*.config.mjs
**/*.config.ts
**/*.config.js
**/*.config.mjs
```

### 2. Update `eslint.config.mjs`

Add to the `ignores` array:

```javascript
{
  ignores: [
    '**/dist',
    // Exclude from dependency analysis
    'scripts/**',
    'e2e/**',
  ],
},
```

### 3. After Changes

Run `nx reset` in the workspace root to clear cached graph:

```bash
npx nx reset
```

Then restart ESLint server in your IDE.

## Why Two Files?

- **`.nxignore`**: Affects Nx project graph (build ordering, affected detection)
- **`eslint.config.mjs`**: Affects `@nx/enforce-module-boundaries` lint rule

Both use separate dependency analysis, so both need configuration.

## Common Patterns That Cause False Cycles

| Pattern                                               | Why It's False                      |
| ----------------------------------------------------- | ----------------------------------- |
| `tsdown.config.ts` importing `../../tsdown.config.ts` | Shared build config, not runtime    |
| `scripts/fetch-fixtures.ts` importing `@pkg/client`   | Dev tooling, not package dependency |
| `vitest.config.ts` importing test utilities           | Test config, not runtime            |

## Verification

After applying fixes, verify with:

```bash
npx nx reset
npx nx graph --file=tmp/graph.json
cat tmp/graph.json | jq '.graph.dependencies["your-package"]'
```

The root project should have `[]` (no dependencies) if scripts are properly excluded.
