---
title: gCTS / AFF format plugin
sidebar_position: 2
---

# gCTS / AFF format plugin

Package: [`@abapify/adt-plugin-gcts`](../sdk/packages/adt-plugin-gcts) ·
format names: `gcts`, `aff`

Serializes ABAP objects to the [SAP abap-file-formats](https://github.com/SAP/abap-file-formats)
layout used by gCTS (git-enabled CTS) and SAP's official AFF tooling. Metadata
is emitted as **JSON**, and CDS artifacts use SAP's `.asddls` / `.asdcls`
extensions rather than abapGit's `.acds`.

## When to use it

- Your SAP system uses **gCTS** as the delivery mechanism and you need its
  exact on-disk layout.
- You want compatibility with SAP's own AFF tooling (`abap-file-formats`
  community).
- You prefer JSON metadata (easier to diff, no XML tooling required).

For the abapGit-native layout, use
[`@abapify/adt-plugin-abapgit`](./abapgit-format).

## Installation

```bash
bun add @abapify/adt-plugin-gcts
```

Self-registers on import. Select via `--format gcts` (or the alias `aff`).

```bash
bunx adt import package --format gcts ZMY_PKG ./out
```

Both names resolve to the same plugin.

## Filename convention

| Object | Metadata            | Source                                                            |
| ------ | ------------------- | ----------------------------------------------------------------- |
| CLAS   | `<name>.clas.json`  | `<name>.clas.abap` (+ `.locals_def.abap`, `.testclasses.abap`, …) |
| INTF   | `<name>.intf.json`  | `<name>.intf.abap`                                                |
| PROG   | `<name>.prog.json`  | `<name>.prog.abap`                                                |
| FUGR   | `<name>.fugr.json`  | — (function modules handled under the group)                      |
| DOMA   | `<name>.doma.json`  | —                                                                 |
| DTEL   | `<name>.dtel.json`  | —                                                                 |
| TABL   | `<name>.tabl.json`  | —                                                                 |
| TTYP   | `<name>.ttyp.json`  | —                                                                 |
| DEVC   | `package.devc.json` | —                                                                 |
| DDLS   | `<name>.ddls.json`  | `<name>.ddls.asddls`                                              |
| DCLS   | `<name>.dcls.json`  | `<name>.dcls.asdcls`                                              |

Namespace-qualified names (e.g., `/ABAPIFY/ZFOO`) are encoded as **bracket
folders** — `(abapify)/zfoo.clas.json` — matching the AFF rules.

## Differences vs abapgit plugin

| Concern           | `abapgit`           | `gcts` / `aff`                     |
| ----------------- | ------------------- | ---------------------------------- |
| Metadata format   | XML (XSD-validated) | JSON                               |
| CDS source suffix | `.acds`             | `.asddls` / `.asdcls`              |
| Namespace folders | `#namespace#`       | `(namespace)` bracket folders      |
| Package file      | `package.devc.xml`  | `package.devc.json`                |
| Ecosystem         | open-source abapGit | SAP gCTS / `SAP/abap-file-formats` |

## Current status

v0.1 covers the **SAP → disk** direction (import / checkout). Export back to
SAP is on the roadmap — track progress in
[`docs/roadmap/epics/e06-gcts-format-plugin.md`](https://github.com/abapify/adt-cli/blob/main/docs/roadmap/epics/e06-gcts-format-plugin).

## Internals

Structure mirrors the abapgit plugin (handler per object type, auto-registered
via `createHandler`) but schemas are JSON Schema literals instead of XSDs. Each
handler produces a typed JSON object matching the AFF metadata spec and,
optionally, source text files.

See the package [AGENTS.md](https://github.com/abapify/adt-cli/blob/main/packages/adt-plugin-gcts/AGENTS)
for handler conventions.

## Extending

Adding a new object type follows the same pattern as the abapgit plugin —
create a handler and register it. The JSON shape is defined by the AFF
specification; check the upstream
[`SAP/abap-file-formats`](https://github.com/SAP/abap-file-formats) repo for
the current schema of the type you're adding.

See [writing a format plugin](./writing-format-plugin).

## Troubleshooting

- **Missing `.asddls` output** — CDS sources are only emitted for DDLS/DCLS
  objects; make sure the server returned source (`get_source` call succeeded).
- **Bracket folders wrong case** — AFF rules require lowercase inside brackets;
  the plugin normalizes, but custom extensions must do the same.
