# @abapify/adt-plugin-gcts

**Status:** v0.1 (E06 — SAP → disk direction)

Serializes ABAP objects to **gCTS / AFF** layout (`SAP/abap-file-formats`):
JSON metadata files (`<name>.<type>.json`) alongside source files
(`<name>.<type>.abap`, `.asddls`, `.asdcls`).

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

## Usage

Install and import — the plugin self-registers:

```ts
import '@abapify/adt-plugin-gcts';
import { getFormatPlugin } from '@abapify/adt-plugin';

const gcts = getFormatPlugin('gcts')!;
```

Via the CLI (after E06 wiring):

```bash
bunx adt import package --format gcts ZMYPKG ./out
```

The SAP → disk direction is fully supported in v0.1. disk → SAP (adt-cli's
`export` command) is deferred — see the epic's "Open questions".

## Architecture

This plugin is a peer of `@abapify/adt-plugin-abapgit`:

- `FormatPlugin` (declarative contract) is in `src/lib/format/gcts-format.ts`
- `AdtPlugin` (higher-level import behaviour) is in `src/lib/gcts-plugin.ts`
- Per-object-type handlers live in `src/lib/handlers/objects/` and
  auto-register through the `createHandler` factory in `handlers/base.ts`

See [`AGENTS.md`](./AGENTS.md) for internal conventions.
