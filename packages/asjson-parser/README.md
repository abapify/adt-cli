# @abapify/asjson-parser

[![npm](https://img.shields.io/npm/v/%40abapify%2Fasjson-parser)](https://www.npmjs.com/package/@abapify/asjson-parser)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/abapify/adt-cli/blob/main/LICENSE)

Parser for SAP ABAP asJSON canonical format — maps ABAP asJSON payloads to/from plain JavaScript objects.

## Install

```bash
npm install @abapify/asjson-parser
```

## Usage

```ts
import { parse } from '@abapify/asjson-parser';

const data = parse(asjsonPayload); // ABAP asJSON → plain JS object
```

## Features

- Parses SAP asJSON canonical format (including references and heap)
- Maps ABAP payloads to plain JavaScript objects

## Documentation

**[adt-cli.netlify.app/sdk/packages/asjson-parser](https://adt-cli.netlify.app/sdk/packages/asjson-parser)**

---

Part of [**abapify**](https://github.com/abapify/adt-cli) — open, typed tooling for SAP ABAP Development Tools (ADT): CLI, MCP server, and SDK.
