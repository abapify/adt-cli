---
title: '@abapify/adt-cli'
description: The `adt` CLI binary and programmatic service API.
---

# `@abapify/adt-cli`

Provides the `adt` binary — the user-facing entry point for the abapify
toolkit. Commands are thin wrappers over **services** that expose the same
business logic programmatically (consumed by [`adt-mcp`](./adt-mcp) and
workspace tests).

See the [CLI reference](../../cli/overview) for commands.

## Install

```bash
bun add -g @abapify/adt-cli   # or: npm i -g @abapify/adt-cli
adt --help
```

## Public API

```ts
// Bin: adt, adt-all
export * from '@abapify/adt-cli';          // -> lib/cli, lib/plugins

// Programmatic services
export {
  ImportService,
  type ObjectImportOptions,
  type PackageImportOptions,
  type TransportImportOptions,
  type ImportResult,
} from '@abapify/adt-cli';

// Checkin (E08)
export {
  CheckinService,
  type CheckinOptions, type CheckinResult,
  type ChangePlan, type ChangePlanEntry, type ChangeAction,
  type DependencyTier,
  type ApplyResult, type ApplyTierResult,
  buildPlan, classifyTier, flattenPlanObjects,
  diffObject, applyPlan,
} from '@abapify/adt-cli';
```

## Usage

```bash
# CLI
adt auth login --config adt.config.ts
adt import transport DEVK900001 ./src --format abapgit

# Programmatic
import { ImportService } from '@abapify/adt-cli';
const result = await new ImportService().importTransport({
  transportNumber: 'DEVK900001',
  outputPath: './src',
  format: 'abapgit',
});
```

## Dependencies

Workspace: `adk`, `adt-auth`, `adt-client`, `adt-config`, `adt-locks`,
`adt-plugin`, `adt-plugin-abapgit`, `adt-plugin-gcts`, `adt-plugin-gcts-cli`,
`adt-rfc`, `adt-tui`, and the domain CLI plugins
(`adt-atc`, `adt-aunit`, `adt-diff`, `adt-export`).

## See also

- Package internals: [`packages/adt-cli/AGENTS.md`](https://github.com/abapify/adt-cli/blob/main/packages/adt-cli/AGENTS.md)
- [CLI reference](../../cli/overview)
- [`adt-mcp`](./adt-mcp) — reuses the CLI services
