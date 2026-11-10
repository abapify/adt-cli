# @abapify/adt-plugin-abapgit

[![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-plugin-abapgit)](https://www.npmjs.com/package/@abapify/adt-plugin-abapgit)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/abapify/adt-cli/blob/main/LICENSE)

abapGit serialization plugin for adt-cli — round-trips ADT objects to/from the abapGit on-disk format.

## Install

```bash
npm install @abapify/adt-plugin-abapgit
```

## Usage

```ts
import { abapgitFormatPlugin } from '@abapify/adt-plugin-abapgit';

const adkClass = {
  name: 'ZCL_EXAMPLE',
  description: 'Example class',
  originalLanguage: 'EN',
};
const source = 'CLASS zcl_example DEFINITION PUBLIC. ENDCLASS.';

const { files } = await abapgitFormatPlugin.materialize({
  object: adkClass,
  objectType: 'CLAS',
  packagePath: ['ZROOT'],
  sources: { main: source },
  formatOptions: { folderLogic: 'prefix' },
});
```

## Features

- Round-trips ADT objects to / from the abapGit on-disk format
- `prefix` and `full` folder logic
- Used by `adt checkout` / `adt checkin`

## Documentation

**[adt-cli.netlify.app/sdk/packages/adt-plugin-abapgit](https://adt-cli.netlify.app/sdk/packages/adt-plugin-abapgit)**

---

Part of [**abapify**](https://github.com/abapify/adt-cli) — open, typed tooling for SAP ABAP Development Tools (ADT): CLI, MCP server, and SDK.
