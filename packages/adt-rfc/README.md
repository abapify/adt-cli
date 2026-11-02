# @abapify/adt-rfc

[![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-rfc)](https://www.npmjs.com/package/@abapify/adt-rfc)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/abapify/adt-cli/blob/main/LICENSE)

SAP RFC transport for @abapify — SOAP-over-HTTP RFC implementation (/sap/bc/soap/rfc).

## Install

```bash
npm install @abapify/adt-rfc
```

## Usage

```ts
import { createAdtClient } from '@abapify/adt-client';
import { createRfcClient } from '@abapify/adt-rfc';

const adt = createAdtClient({
  baseUrl: 'https://my.sap.example.com',
  username: 'DEVELOPER',
  password: '…',
  client: '100',
});

const rfc = createRfcClient({
  fetch: (url, opts) => adt.fetch(url, opts),
  client: '100',
});

const resp = await rfc.call('STFC_CONNECTION', { REQUTEXT: 'hello' });
console.log(resp.ECHOTEXT); // → "hello"
console.log(resp.RESPTEXT); // → "SAP R/3 Rel. 7.55 Sysid: TRL …"
```

## Features

- RFC calls over SOAP-over-HTTP (`/sap/bc/soap/rfc`)
- Reuses the ADT client session
- Typed parameter mapping and RFC error handling

## Documentation

**[adt-cli.netlify.app/sdk/packages/adt-rfc](https://adt-cli.netlify.app/sdk/packages/adt-rfc)**

---

Part of [**abapify**](https://github.com/abapify/adt-cli) — open, typed tooling for SAP ABAP Development Tools (ADT): CLI, MCP server, and SDK.
