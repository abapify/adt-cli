---
title: '@abapify/adt-codegen'
description: Hook-based code generation toolkit for SAP ADT APIs.
---

# `@abapify/adt-codegen`

Hook-based code generator used to bootstrap collections, schemas, TypeScript
types, and contracts from SAP's ADT discovery/OpenAPI artifacts. Ships a CLI
(`adt-codegen`) and a pluggable framework.

## Install

```bash
bun add -D @abapify/adt-codegen
```

## Public API

```ts
export { CodegenFramework } from '@abapify/adt-codegen';
export { definePlugin } from '@abapify/adt-codegen';
export { defineConfig, defineAdtConfig } from '@abapify/adt-codegen';
export { defineFilters } from '@abapify/adt-codegen';
export { ConsoleLogger, type Logger } from '@abapify/adt-codegen';

// Built-in plugins
export {
  workspaceSplitterPlugin,
  extractCollectionsPlugin,
  extractCollections,
  bootstrapSchemasPlugin,
  bootstrapSchemas,
  generateTypesPlugin,
} from '@abapify/adt-codegen';

export type {
  ExtractCollectionsOptions,
  CollectionData,
  BootstrapSchemasOptions,
  SchemaInfo,
} from '@abapify/adt-codegen';
```

## Usage

```bash
adt-codegen run --config codegen.config.ts
```

## Dependencies

- Consumed mainly by build scripts in `packages/adt-contracts`,
  `packages/adt-schemas`, and `e2e/adt-codegen`.

## Overview

The `adt-codegen` framework uses a **hook-based architecture** inspired by unplugin.

## Key Concepts

### 1. **Plugins Declare Hooks**

```typescript
export const myPlugin = definePlugin({
  name: 'my-plugin',

  hooks: {
    workspace(ws) {
      // Called for each workspace
    },

    collection(coll) {
      // Called for each collection
    },

    finalize(ctx) {
      // Called once at the end
    },
  },
});
```

### 2. **Framework Orchestrates**

The framework:

- Checks which hooks are registered
- Only iterates if hooks exist
- Calls hooks in order: `discovery` → `workspace` → `collection` → `templateLink` → `finalize`

### 3. **Simple Configuration**

```typescript
export default {
  discovery: {
    path: './discovery.xml',
  },
  output: {
    baseDir: './generated',
  },
  plugins: [
    workspaceSplitterPlugin,
    extractCollectionsPlugin,
    generateTypesPlugin,
  ],
};
```

## Available Hooks

| Hook           | Called            | Context                            |
| -------------- | ----------------- | ---------------------------------- |
| `discovery`    | Once at start     | Parsed discovery XML               |
| `workspace`    | Per workspace     | Workspace data + helpers           |
| `collection`   | Per collection    | Collection data + parent workspace |
| `templateLink` | Per template link | Link data + parent collection      |
| `finalize`     | Once at end       | All workspaces + global data       |

## Context Objects

### WorkspaceContext

```typescript
{
  title: string;
  folderName: string;
  dir: string;
  xml: any;
  data: Record<string, any>;  // Shared between plugins
  artifacts: Artifact[];       // Files to write
  logger: Logger;
  writeFile(name, content): Promise<void>;
}
```

### CollectionContext

```typescript
{
  href: string;
  title: string;
  accepts: string[];
  category: { term: string; scheme: string };
  templateLinks: TemplateLink[];
  workspace: WorkspaceContext;  // Parent
  data: Record<string, any>;
  logger: Logger;
}
```

## Built-in Plugins

### 1. workspace-splitter

Writes `workspace.xml` for each workspace.

**Hook:** `workspace`

### 2. extract-collections

Extracts collection metadata and writes `collections.json`.

**Hooks:** `workspace`, `collection`, `finalize`

### 3. generate-types

Generates TypeScript types from collections.

**Hook:** `collection`, `finalize`

## Example Output

```
generated/workspaces/
├── abap-cross-trace/
│   ├── workspace.xml           # From workspace-splitter
│   ├── collections.json        # From extract-collections
│   ├── traces.types.ts         # From generate-types
│   ├── activations.types.ts
│   └── components.types.ts
├── dictionary/
│   ├── workspace.xml
│   ├── collections.json
│   └── *.types.ts
└── ...
```

## Creating Custom Plugins

```typescript
import { definePlugin } from '@abapify/adt-codegen';

export const myCustomPlugin = definePlugin({
  name: 'my-custom-plugin',

  hooks: {
    collection(coll) {
      // Access parent workspace
      const ws = coll.workspace;

      // Store data for other plugins
      ws.data.myData = { ... };

      // Add artifacts to write
      ws.artifacts.push({
        file: 'my-file.ts',
        content: '...'
      });

      // Log progress
      coll.logger.info('Processing collection');
    }
  }
});
```

## Benefits

✅ **Simple config** - Just list plugins  
✅ **Automatic orchestration** - Framework handles iteration  
✅ **Composable** - Plugins share data via context  
✅ **Efficient** - Only iterates if hooks exist  
✅ **Type-safe** - Full TypeScript support  
✅ **Extensible** - Easy to add new plugins

## Next Steps

Potential new plugins:

- `generate-openapi` - Convert to OpenAPI specs
- `generate-client` - Generate TypeScript client
- `validate-endpoints` - Validate against live SAP system
- `generate-docs` - Generate documentation

## See also

- [`ts-xsd`](./ts-xsd), [`adt-schemas`](./adt-schemas),
  [`adt-contracts`](./adt-contracts)
