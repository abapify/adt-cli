# CI/CD Setup Documentation

## Overview

The abapify-js monorepo uses GitHub Actions for continuous integration and deployment, with NX as the build system orchestrator. This document outlines the complete CI/CD setup and configuration.

## Architecture

### Build System

- **NX Monorepo**: Manages multiple packages with intelligent caching and task orchestration
- **TypeScript**: Primary language with strict type checking
- **Vitest**: Testing framework with unified configuration
- **ESLint**: Code linting with centralized configuration
- **tsdown**: Build tool for TypeScript packages

### CI/CD Pipeline

- **GitHub Actions**: Primary CI/CD platform
- **NX Cloud**: Distributed task execution and caching
- **Node.js 22**: Runtime environment

## Configuration Files

### GitHub Actions Workflow (`.github/workflows/ci.yml`)

```yaml
name: CI
on:
  push:
    branches:
      - main
  pull_request:

permissions:
  actions: read
  contents: read

jobs:
  main:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v3
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - uses: nrwl/nx-set-shas@v4
      - name: Print Environment Info
        run: npx nx report
        shell: bash
      - run: npx nx format:check
      - run: npx nx affected -t lint test build e2e-ci --verbose=false --parallel=3
      - run: npx nx-cloud fix-ci
        if: always()
```

**Key Features**:

- **Parallel Execution**: Limited to 3 concurrent tasks to prevent EventEmitter memory leaks
- **Affected Detection**: Only runs tasks for changed packages
- **NX Cloud Integration**: Distributed caching and task execution
- **Format Checking**: Ensures consistent code formatting

### NX Configuration (`nx.json`)

```json
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "defaultBase": "main",
  "nxCloudId": "689f2325a9081eb8eb04b58d",
  "plugins": [
    {
      "plugin": "@nx/js/typescript",
      "options": {
        "typecheck": { "targetName": "typecheck" },
        "build": { "targetName": "build", "configName": "tsconfig.lib.json" }
      }
    },
    {
      "plugin": "@nx/rollup/plugin",
      "options": { "buildTargetName": "build" }
    },
    {
      "plugin": "@nx/eslint/plugin",
      "options": { "targetName": "lint" }
    },
    {
      "plugin": "@nx/vite/plugin",
      "options": {
        "buildTargetName": "build",
        "previewTargetName": "preview",
        "testTargetName": "test",
        "serveTargetName": "serve",
        "serveStaticTargetName": "serve-static"
      }
    }
  ],
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"]
    },
    "@nx/vite:test": {
      "cache": true,
      "inputs": ["default", "^default"],
      "options": {
        "run": true
      }
    },
    "nx-release-publish": {
      "dependsOn": ["build", "test"]
    }
  }
}
```

**Key Features**:

- **Plugin-Based Architecture**: Automatic target inference
- **Build Dependencies**: `^build` ensures upstream packages build first
- **Caching Strategy**: Intelligent caching based on inputs
- **Release Management**: Automated versioning and publishing

### Base ESLint Configuration (`eslint.config.js`)

```javascript
import nx from '@nx/eslint-plugin';
import jsoncParser from 'jsonc-eslint-parser';

export default [
  {
    files: ['**/*.json'],
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          ignoredFiles: [
            '{projectRoot}/*.config.{js,ts,mjs,mts,cjs,cts}',
            '{projectRoot}/**/eslint.config.{js,ts,mjs,mts,cjs,cts}',
            '{projectRoot}/**/vitest.config.{js,ts,mjs,mts,cjs,cts}',
            '{projectRoot}/**/vite.config.{js,ts,mjs,mts,cjs,cts}',
          ],
        },
      ],
    },
    languageOptions: {
      parser: jsoncParser,
    },
  },
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/vite.config.*.timestamp*',
      '**/vitest.config.*.timestamp*',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?js$'],
          depConstraints: [
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
    },
  },
];
```

**Key Features**:

- **Centralized Configuration**: Single source of truth for linting rules
- **Dependency Checks**: Prevents incorrect dependencies while ignoring config files
- **Module Boundaries**: Enforces architectural constraints
- **JSON Support**: Handles package.json and other JSON files

### Base Vitest Configuration (`vitest.base.config.mts`)

```typescript
import { defineConfig } from 'vitest/config';

export function createVitestConfig(config: any = {}) {
  return defineConfig({
    test: {
      watch: false,
      globals: true,
      environment: 'node',
      include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      exclude: ['node_modules/**', 'dist/**'],
      reporters: ['default'],
      passWithNoTests: true,
      coverage: {
        enabled: false,
      },
      ...config.test,
    },
    ...config,
  });
}
```

**Key Features**:

- **Non-Interactive Mode**: `watch: false` prevents hanging in CI
- **Pass Without Tests**: `passWithNoTests: true` allows packages without tests
- **Consistent Patterns**: Standardized test file detection
- **Extensible**: Allows package-specific overrides

## Package Structure

### Standard Package Configuration

Each package follows this structure:

```
packages/[package-name]/
├── src/
│   ├── index.ts          # Main entry point
│   └── **/*.test.ts      # Test files
├── dist/                 # Build output
├── package.json          # Package metadata
├── tsconfig.lib.json     # TypeScript build config
├── vitest.config.mts     # Test configuration
└── eslint.config.js      # Linting configuration (extends base)
```

### Package.json Template

```json
{
  "name": "@abapify/[package-name]",
  "version": "0.0.1",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    "./package.json": "./package.json",
    ".": {
      "abapify": "./src/index.ts",
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsdown"
  },
  "dependencies": {},
  "devDependencies": {}
}
```

### TypeScript Configuration Template (`tsconfig.lib.json`)

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "baseUrl": ".",
    "rootDir": "src",
    "outDir": "dist",
    "tsBuildInfoFile": "dist/tsconfig.lib.tsbuildinfo",
    "emitDeclarationOnly": false,
    "types": ["node"],
    "lib": ["es2022", "dom"]
  },
  "include": ["src/**/*.ts"]
}
```

### Vitest Configuration Template (`vitest.config.mts`)

```typescript
import { createVitestConfig } from '../../vitest.base.config.mjs';

export default createVitestConfig();
```

### ESLint Configuration Template (`eslint.config.js`)

```javascript
import baseConfig from '../../eslint.config.js';

export default [...baseConfig];
```

## Task Execution Flow

### Build Dependencies

```
^build → build → test
```

1. **^build**: Upstream dependencies are built first
2. **build**: Current package is built
3. **test**: Tests run after build completes

### CI Pipeline Flow

```
checkout → setup → install → format-check → affected-tasks → fix-ci
```

1. **Checkout**: Repository code with full history
2. **Setup**: Node.js 22 with npm cache
3. **Install**: Dependencies via `npm ci`
4. **Format Check**: Code formatting validation
5. **Affected Tasks**: Lint, test, build for changed packages (max 3 parallel)
6. **Fix CI**: NX Cloud cleanup and reporting

## Troubleshooting

### Common Issues

1. **EventEmitter Memory Leak**
   - **Symptom**: `MaxListenersExceededWarning` in CI logs
   - **Solution**: Reduce `--parallel` value in CI workflow

2. **Test Hanging**
   - **Symptom**: Tests don't complete, show "press q to quit"
   - **Solution**: Ensure `watch: false` in vitest config

3. **Module Resolution Errors**
   - **Symptom**: Cannot resolve package imports
   - **Solution**: Verify package.json exports match build output

4. **Dependency Check Failures**
   - **Symptom**: ESLint errors about missing dependencies
   - **Solution**: Add to `ignoredFiles` in dependency-checks rule

### Performance Optimization

- **NX Cloud**: Distributed caching reduces build times
- **Affected Detection**: Only processes changed packages
- **Parallel Execution**: Limited to prevent resource exhaustion
- **Build Caching**: Intelligent caching based on file changes

## Maintenance

### Regular Tasks

- Monitor CI performance and adjust parallelism if needed
- Update Node.js version in workflow when LTS changes
- Review and update dependency versions quarterly
- Ensure new packages follow established patterns

### Adding New Packages

1. Create package directory structure
2. Copy template configurations
3. Update package.json with correct name and dependencies
4. Ensure exports match build output
5. Test locally before committing

### Updating Dependencies

1. Use `nx migrate` for NX-related updates
2. Test changes locally with `nx run-many --target=test --all`
3. Verify CI pipeline passes before merging
4. Update documentation if configuration changes

## Security

- **Permissions**: Minimal required permissions in GitHub Actions
- **Dependencies**: Regular security audits via `npm audit`
- **Secrets**: No secrets required for current CI setup
- **Access Control**: Repository-level access controls
