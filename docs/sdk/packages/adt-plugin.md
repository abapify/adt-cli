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
  AbapObjectType, FormatOptionValue,
  ImportContext, ImportResult,
  ExportContext, ExportOptions, ExportResult,
  FileTree,
  AdtPlugin, AdtPluginDefinition,
} from '@abapify/adt-plugin';

// CLI command plugin types
export type {
  CliOption, CliArgument, CliContext, CliLogger, CliCommandPlugin,
} from '@abapify/adt-plugin';

// Factory & registry
export { createPlugin, registerFormatPlugin, getFormatPlugin } from '@abapify/adt-plugin';
```

## Usage

```ts
import { createPlugin } from '@abapify/adt-plugin';

export const myPlugin = createPlugin({
  name: 'myFormat', version: '1.0.0',
  description: 'My format plugin',
  registry: { /* handlers */ },
  format:   { /* serialize/deserialize */ },
});
```

## Dependencies

- Consumed by every plugin package:
  [`adt-plugin-abapgit`](./adt-plugin-abapgit),
  [`adt-plugin-gcts`](./adt-plugin-gcts),
  [`adt-plugin-gcts-cli`](./adt-plugin-gcts-cli),
  domain CLI plugins.
