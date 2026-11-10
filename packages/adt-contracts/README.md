# @abapify/adt-contracts

[![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-contracts)](https://www.npmjs.com/package/@abapify/adt-contracts)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/abapify/adt-cli/blob/main/LICENSE)

SAP ADT REST API contracts using speci + ts-xsd.

## Install

```bash
npm install @abapify/adt-contracts
```

## Usage

```ts
import { adtContract } from '@abapify/adt-contracts';
import { createClient, createFetchAdapter } from '@abapify/speci/rest';

const baseUrl = 'https://sap.example.com/sap/bc/adt';
const adapter = createFetchAdapter();

const client = createClient(adtContract, { baseUrl, adapter });
```

## Features

- Typed ADT REST contracts built with `speci` + `ts-xsd`
- Request / response types inferred from SAP XSD schemas
- Single source for the client, mock server, and proxy

## Documentation

**[adt-cli.netlify.app/sdk/packages/adt-contracts](https://adt-cli.netlify.app/sdk/packages/adt-contracts)**

---

Part of [**abapify**](https://github.com/abapify/adt-cli) — open, typed tooling for SAP ABAP Development Tools (ADT): CLI, MCP server, and SDK.
