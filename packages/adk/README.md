# @abapify/adk

[![npm](https://img.shields.io/npm/v/%40abapify%2Fadk)](https://www.npmjs.com/package/@abapify/adk)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/abapify/adt-cli/blob/main/LICENSE)

ABAP Development Kit — typed object model for ABAP Repository objects (classes, interfaces, programs, tables, …) with ADT XML serialization.

## Install

```bash
npm install @abapify/adk
```

## Usage

```ts
import { createAdtClient } from '@abapify/adt-client';
import { createAdk } from '@abapify/adk';

const client = createAdtClient({ baseUrl, username, password, client: '100' });
const adk = createAdk(client);

const klass = await adk.getClass('ZCL_DEMO');
await klass.save({ transport: 'DEVK900001' });
```

## Features

- Typed object model for classes, interfaces, programs, DDIC, packages, …
- Lock-aware save / upsert orchestration
- ADT XML (de)serialization via `@abapify/adt-schemas`

## Documentation

**[adt-cli.netlify.app/sdk/packages/adk](https://adt-cli.netlify.app/sdk/packages/adk)**

---

Part of [**abapify**](https://github.com/abapify/adt-cli) — open, typed tooling for SAP ABAP Development Tools (ADT): CLI, MCP server, and SDK.
