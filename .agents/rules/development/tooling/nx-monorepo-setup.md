---
trigger: model_decision
description: Nx monorepo setup rules - package creation workflow, config templates, plugin inference, import conventions.
---

# Nx Monorepo Setup Rules

> **See**: [`.agents/rules/development/tooling/nx-monorepo.md`](../../../.agents/rules/development/tooling/nx-monorepo.md) for complete Nx plugin inference system documentation.

## Quick Reference

### Core Commands

```bash
bunx nx build [package]           # Build (inferred from tsdown.config.ts)
bunx nx test [package]            # Test (inferred from vitest.config.ts)
bunx nx test:coverage [package]   # Test with coverage
bunx nx typecheck [package]       # Typecheck (inferred from tsconfig.json)
bunx nx lint [package]            # Lint (inferred from eslint config)
```

### Package Creation Workflow

**Step 1: Generate Base Package**

```bash
bunx nx g @nx/js:lib \
  --name=[library-name] \
  --directory=packages/[name] \
  --importPath=@abapify/[library-name] \
  --bundler=none \
  --unitTestRunner=none \
  --linter=eslint
```

**Step 2: Add Config Files (Plugins Will Infer Targets)**

Create these files and Nx plugins will automatically create build/test targets:

```
packages/[name]/
├── src/
│   └── index.ts
├── package.json
├── tsconfig.json
├── tsdown.config.ts      # ← nx-tsdown plugin detects → creates 'build' target
└── vitest.config.ts      # ← nx-vitest plugin detects → creates 'test' targets
```

**Step 3: Minimal project.json**

```json
{
  "name": "[package-name]",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "packages/[name]/src",
  "projectType": "library",
  "tags": ["type:library"],
  "targets": {
    "nx-release-publish": {
      "options": { "packageRoot": "dist/{projectRoot}" }
    }
  }
}
```

**That's it\!** Don't declare `build`, `test`, or `typecheck` targets - they're inferred automatically.

## Config File Templates

### tsdown.config.ts

```typescript
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
});
```

### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      all: true,
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    },
  },
});
```

**Important**: The root `vitest.config.ts` must include your package in the `projects` array for test targets to be inferred.

## Technology Stack

- **Language**: TypeScript (ES2015+, strict mode)
- **Build**: tsdown (via nx-tsdown plugin inference)
- **Testing**: Vitest (via nx-vitest plugin inference)
- **Linting**: ESLint (via @nx/eslint plugin)
- **Package Manager**: bun

## Plugin Package Creation

For packages in `packages/plugins/`:

```bash
bunx nx g @nx/js:lib \
  --name=custom-format \
  --directory=packages/plugins/custom-format \
  --importPath=@abapify/custom-format \
  --bundler=none \
  --unitTestRunner=none \
  --linter=eslint
```

Then add `tsdown.config.ts` and `vitest.config.ts` - targets will be inferred automatically.

## Common Mistakes

### ❌ DON'T: Declare build/test targets manually

```json
{
  "targets": {
    "build": {
      "executor": "@abapify/nx-tsdown:build" // ❌ NO SUCH EXECUTOR\!
    }
  }
}
```

### ✅ DO: Let plugins infer targets

Just create `tsdown.config.ts` and the nx-tsdown plugin will automatically create the `build` target.

### Verification

Check what targets were inferred:

```bash
bunx nx show project [package-name] --json | jq '.targets | keys'
```

You should see: `["build", "lint", "nx-release-publish", "test", "test:coverage", "test:watch", "typecheck"]`

## Import Rules

- **Cross-package**: `@abapify/[package-name]`
- **Internal files**: `../relative/path` (no extensions for TS files)
- **Workspace deps**: Use `workspace:*` (bun supports this protocol)

## File Organization

- **Source code**: `packages/[name]/src/`
- **Temporary files**: `tmp/` (never commit)
- **Build output**: `packages/[name]/dist/`
- **Tests**: Co-located with source (`*.test.ts`)
