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
  createFileTree,
  FsFileTree,
  MemoryFileTree,
  FilteredFileTree,
  findAbapGitRoot,
  resolveFilesRelativeToRoot,
} from '@abapify/adt-export';
export type {
  FileTree,
  ExportResult,
  ExportObjectResult,
  ExportOptions,
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

## Options

| Option                      | Description                                             | Default                   |
| --------------------------- | ------------------------------------------------------- | ------------------------- |
| `-s, --source <path>`       | Source directory containing serialized files            | `.`                       |
| `-f, --format <format>`     | Format plugin: `abapgit`, `@abapify/adt-plugin-abapgit` | `abapgit`                 |
| `-t, --transport <request>` | Transport request for changes                           | (required unless dry-run) |
| `-p, --package <package>`   | Target package for new objects                          |                           |
| `--types <types>`           | Filter by object types (comma-separated)                |                           |
| `--dry-run`                 | Validate without saving to SAP                          | `false`                   |
| `--no-activate`             | Save inactive (skip activation)                         | `false`                   |

## Architecture

This plugin follows the two-generator pattern:

1. **FileTree** (provided by CLI) → yields files to format plugin
2. **Format Plugin** → yields ADK objects ready to deploy

The export command:

1. Creates a FileTree from the source directory
2. Calls the format plugin's `export(fileTree)` generator
3. For each yielded ADK object:
   - Filters by type if specified
   - Saves inactive (unless dry run)
4. Bulk activates all objects (unless `--no-activate`)

## Why a Separate Plugin?

Export functionality can modify your SAP system. By making it an explicit opt-in plugin:

- Users must consciously add it to their config
- No accidental deployments from typos
- Clear separation of read-only vs write operations
- Easier to audit which projects have deploy capabilities

## Supported Formats

- **abapgit** / `@abapify/adt-plugin-abapgit` - abapGit format (`.abap` + `.xml` files)

## See also

- [`adt-diff`](./adt-diff), [`adt-plugin-abapgit`](./adt-plugin-abapgit)
