---
title: '@abapify/adt-export'
description: Export / round-trip / activate CLI commands.
---

# `@abapify/adt-export`

Export local abapGit/gCTS files back to SAP (checkin) and related round-trip
helpers. Exposes three CLI commands (`export`, `roundtrip`, `activate`) plus
`FileTree` abstractions reused across plugins.

## Install

```bash
bun add @abapify/adt-export
```

```ts
// adt.config.ts
export default {
  commands: [
    '@abapify/adt-export/commands/export',
    '@abapify/adt-export/commands/roundtrip',
    '@abapify/adt-export/commands/activate',
  ],
};
```

## Public API

```ts
export { exportCommand } from '@abapify/adt-export';
export {
  createFileTree, FsFileTree, MemoryFileTree, FilteredFileTree,
  findAbapGitRoot, resolveFilesRelativeToRoot,
} from '@abapify/adt-export';
export type {
  FileTree, ExportResult, ExportObjectResult, ExportOptions,
} from '@abapify/adt-export';
```

## Usage

```bash
adt export ./src --transport DEVK900001
adt activate ZCL_DEMO
```

## Dependencies

- `@abapify/adk`, `@abapify/adt-client`, `@abapify/adt-plugin-abapgit`,
  `@abapify/adt-locks`.

## See also

- [`adt-diff`](./adt-diff), [`adt-plugin-abapgit`](./adt-plugin-abapgit)
