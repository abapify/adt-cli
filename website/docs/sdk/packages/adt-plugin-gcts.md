---
title: '@abapify/adt-plugin-gcts'
description: gCTS / AFF format plugin.
---

# `@abapify/adt-plugin-gcts`

FormatPlugin implementing the gCTS / AFF (ABAP File Format) on-disk layout.
Self-registers on import.

## Install

```bash
bun add @abapify/adt-plugin-gcts
```

## Public API

```ts
export { gctsFormatPlugin } from '@abapify/adt-plugin-gcts';
export { gctsPlugin, GctsPlugin, default } from '@abapify/adt-plugin-gcts';

export {
  getHandler,
  getSupportedTypes,
  isSupported,
  createHandler,
} from '@abapify/adt-plugin-gcts';
```

## Usage

```bash
adt export --format gcts ./src --transport DEVK900001
```

## Dependencies

- `@abapify/adt-plugin`, `@abapify/adk`

## Why a single plugin for both gCTS and AFF?

gCTS (git-enabled CTS) and AFF (`SAP/abap-file-formats`) use the same
on-disk layout: JSON metadata, AFF-specific extensions, `(ns)` bracket
namespace folders. A single `--format gcts` (alias: `--format aff`) serves
both communities. The open question on naming is tracked in
`docs/roadmap/epics/e06-gcts-format-plugin.md`.

## Filename conventions

| Object | Metadata            | Source                                                            |
| ------ | ------------------- | ----------------------------------------------------------------- |
| CLAS   | `<name>.clas.json`  | `<name>.clas.abap` (+ `.locals_def.abap`, `.testclasses.abap`, …) |
| INTF   | `<name>.intf.json`  | `<name>.intf.abap`                                                |
| PROG   | `<name>.prog.json`  | `<name>.prog.abap`                                                |
| FUGR   | `<name>.fugr.json`  | — (FM files handled separately)                                   |
| DOMA   | `<name>.doma.json`  | —                                                                 |
| DTEL   | `<name>.dtel.json`  | —                                                                 |
| TABL   | `<name>.tabl.json`  | —                                                                 |
| TTYP   | `<name>.ttyp.json`  | —                                                                 |
| DEVC   | `package.devc.json` | —                                                                 |
| DDLS   | `<name>.ddls.json`  | `<name>.ddls.asddls`                                              |
| DCLS   | `<name>.dcls.json`  | `<name>.dcls.asdcls`                                              |

vs abapGit: metadata is **JSON** (not XML) and CDS uses **`.asddls` /
`.asdcls`** (not `.acds`).

## Architecture

This plugin is a peer of `@abapify/adt-plugin-abapgit`:

- `FormatPlugin` (declarative contract) is in `src/lib/format/gcts-format.ts`
- `AdtPlugin` (higher-level import behaviour) is in `src/lib/gcts-plugin.ts`
- Per-object-type handlers live in `src/lib/handlers/objects/` and
  auto-register through the `createHandler` factory in `handlers/base.ts`

See [`AGENTS.md`](https://github.com/abapify/adt-cli/blob/main/packages/adt-plugin-gcts/AGENTS.md) for internal conventions.

## See also

- [`adt-plugin-abapgit`](./adt-plugin-abapgit), [`adt-plugin-gcts-cli`](./adt-plugin-gcts-cli)
- [gCTS contracts](../contracts/gcts)
