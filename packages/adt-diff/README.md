# @abapify/adt-diff

Diff CLI plugin for [`adt-cli`](https://github.com/abapify/adt-cli). Compares
local abapGit-serialised files (`*.clas.xml`, `*.tabl.xml`, …) against the
current source in a connected SAP system and prints a coloured unified diff.
Any object type supported by `@abapify/adt-plugin-abapgit` can be compared.

[![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-diff.svg)](https://www.npmjs.com/package/@abapify/adt-diff)

## Install

```bash
npm i @abapify/adt-diff
# or
bun add @abapify/adt-diff
```

## Usage

Register the command in `adt.config.ts`:

```ts
// adt.config.ts
export default {
  commands: ['@abapify/adt-diff/commands/diff'],
};
```

Then diff one or more files, or scan the whole abapGit repo in the working
directory:

```bash
# Diff specific files
adt diff zcl_myclass.clas.xml ztab.tabl.xml

# Glob patterns
adt diff "*.tabl.xml" --context 5

# Scan the whole repo, ignoring unchanged objects
adt diff --package ZMY_PACKAGE

# Compare ADK-rendered source instead of raw XML (TABL only)
adt diff zmy_table.tabl.xml --source
```

The package also exposes a small TABL-to-CDS DDL utility that is independent
of the diff command:

```ts
import { tablXmlToCdsDdl, buildCdsDdl } from '@abapify/adt-diff';

const ddl = tablXmlToCdsDdl(xmlString);
```

## Role in the monorepo

- CLI plugin loaded by `@abapify/adt-cli`; it owns the `diff` command only.
- Uses `@abapify/adk` to render local XML back to source and
  `@abapify/adt-plugin-abapgit` to resolve filenames to ADT object URIs.
- Read-only: it never locks, writes, or imports objects. For round-tripping
  objects into and out of the system, see `@abapify/adt-export` and the
  relevant ADK save flow.

## Related

- [abapify/adt-cli monorepo](https://github.com/abapify/adt-cli)
- [Full docs](https://adt-cli.netlify.app)

## License

MIT
