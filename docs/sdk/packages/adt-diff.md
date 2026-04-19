---
title: '@abapify/adt-diff'
description: Diff CLI plugin — compare local abapGit files vs SAP remote source.
---

# `@abapify/adt-diff`

CLI command plugin that compares a local abapGit working tree against the live
SAP remote source of the same objects. Works with any type supported by
[`adt-plugin-abapgit`](./adt-plugin-abapgit). Also exposes a utility for
converting TABL XML back to CDS DDL.

## Install

```bash
bun add @abapify/adt-diff
```

```ts
// adt.config.ts
export default { commands: ['@abapify/adt-diff/commands/diff'] };
```

## Public API

```ts
export { diffCommand } from '@abapify/adt-diff';
export {
  buildCdsDdl, tablXmlToCdsDdl, parseTablXml,
  type DD02VData, type DD03PData,
} from '@abapify/adt-diff';
```

## Usage

```bash
adt diff ./src/zcl_demo.clas.abap
```

## Dependencies

- `@abapify/adk`, `@abapify/adt-contracts`, `@abapify/adt-plugin-abapgit`
