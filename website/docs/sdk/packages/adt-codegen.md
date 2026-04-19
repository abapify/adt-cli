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

## See also

- [`ts-xsd`](./ts-xsd), [`adt-schemas`](./adt-schemas),
  [`adt-contracts`](./adt-contracts)
