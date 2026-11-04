---
title: '@abapify/adt-plugin'
description: Plugin interfaces (Format + CLI-command) and registry.
---

# `@abapify/adt-plugin`

Plugin contracts shared across the abapify toolkit:

- **Format plugins** — serialize/deserialize ABAP objects to a repository
  layout (e.g. abapGit, gCTS). Registered into the global `FormatPlugin`
  registry.
- **CLI command plugins** — declarative command extensions consumed by
  [`adt-cli`](./adt-cli).

## Install

```bash
bun add @abapify/adt-plugin
```

## Public API

```ts
// Format plugin types
export type {
  AbapObjectType,
  FormatOptionValue,
  ImportContext,
  ImportResult,
  ExportContext,
  ExportOptions,
  ExportResult,
  FileTree,
  AdtPlugin,
  AdtPluginDefinition,
} from '@abapify/adt-plugin';

// CLI command plugin types
export type {
  CliOption,
  CliArgument,
  CliContext,
  CliLogger,
  CliCommandPlugin,
} from '@abapify/adt-plugin';

// Factory & registry
export {
  createPlugin,
  registerFormatPlugin,
  getFormatPlugin,
} from '@abapify/adt-plugin';
```

## Usage

```ts
import { createPlugin } from '@abapify/adt-plugin';

export const myPlugin = createPlugin({
  name: 'myFormat',
  version: '1.0.0',
  description: 'My format plugin',
  registry: {/* handlers */},
  format: {/* serialize/deserialize */},
});
```

## Dependencies

- Consumed by every plugin package:
  [`adt-plugin-abapgit`](./adt-plugin-abapgit),
  [`adt-plugin-gcts`](./adt-plugin-gcts),
  [`adt-plugin-gcts-cli`](./adt-plugin-gcts-cli),
  domain CLI plugins.

## Overview

This package defines the **plugin contract** for serializing ADK objects to various formats (abapGit, etc.). Plugins implement this interface to provide format-specific serialization.

**Key principle:** Plugins only handle serialization format. They receive ADK objects and produce files - no ADT client logic.

## API

### Pure tree materialization

Flow-style consumers need to calculate repository changes before touching the
filesystem. A `FormatPlugin` exposes the optional pure materialization
capability. Obtain one through `requireFormatPlugin` (not `createPlugin`, which
returns an `AdtPlugin`):

```typescript
import { requireFormatPlugin } from '@abapify/adt-plugin';

const formatPlugin = requireFormatPlugin('abapGit');
const result = await formatPlugin.materialize?.({
  object: adkObject,
  objectType: 'CLAS',
  packagePath: ['ZROOT', 'ZROOT_FEATURE'],
  sources: {
    main: historicalMainSource,
    definitions: historicalLocalDefinitions,
  },
  formatOptions: { folderLogic: 'prefix' },
});
```

When `sources` is present it is authoritative. A handler emits only those
components and must not read mutable source through the ADK object. The result
contains deterministic repository-relative files with `source` or `metadata`
roles; the caller owns validation and filesystem reconciliation.

### `createPlugin(definition)`

Factory function to create a validated plugin instance.

### `AdtPlugin` Interface

```typescript
interface AdtPlugin {
  readonly name: string;
  readonly version: string;
  readonly description: string;

  readonly registry: {
    isSupported(type: AbapObjectType): boolean;
    getSupportedTypes(): AbapObjectType[];
  };

  readonly format: {
    import(object, targetPath, context): Promise<ImportResult>;
    export?(sourcePath, type, name): Promise<ExportResult>;
  };

  readonly hooks?: {
    afterImport?(targetPath: string): Promise<void>;
    beforeExport?(sourcePath: string): Promise<void>;
  };
}
```

## Terminology

- **Import** (to Git): ADK object → serialized files (SAP → file system)
- **Export** (from Git): serialized files → ADK object (file system → SAP)
