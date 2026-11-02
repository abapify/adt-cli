# @abapify/adt-plugin-gcts

[![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-plugin-gcts)](https://www.npmjs.com/package/@abapify/adt-plugin-gcts)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/abapify/adt-cli/blob/main/LICENSE)

gCTS (git-enabled CTS) plugin for adt-cli — repository, commit, pull/push operations on SAP gCTS.

## Install

```bash
npm install @abapify/adt-plugin-gcts
```

## Usage

```ts
import '@abapify/adt-plugin-gcts';
import { getFormatPlugin } from '@abapify/adt-plugin';

const gcts = getFormatPlugin('gcts')!;
```

## Features

- gCTS / ABAP File Formats (AFF) serialization
- Registers itself as the `gcts` format plugin

## Documentation

**[adt-cli.netlify.app/sdk/packages/adt-plugin-gcts](https://adt-cli.netlify.app/sdk/packages/adt-plugin-gcts)**

---

Part of [**abapify**](https://github.com/abapify/adt-cli) — open, typed tooling for SAP ABAP Development Tools (ADT): CLI, MCP server, and SDK.
