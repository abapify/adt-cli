# adt-contracts

**SAP ADT REST API Contracts** - Type-safe API contracts using `speci` + `ts-xsd` schemas.

Part of the **ADT Toolkit** - see [main README](../../README.md) for architecture overview.

## What is it?

This package is the **contract layer** between `adt-client` and `adt-schemas`. It provides declarative REST API contracts for SAP ADT (ABAP Development Tools) endpoints.

```
┌─────────────────────────────────────────────────────────────────┐
│                      adt-client                               │
│              (HTTP Client + Request Execution)                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      adt-contracts (this package)                │
│         (REST API Contracts using speci + ts-xsd)                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     adt-schemas                              │
│        (TypeScript schemas from SAP XSD definitions)             │
└─────────────────────────────────────────────────────────────────┘
```

Contracts are pure data structures that define:

- **Endpoint URLs** - REST paths
- **HTTP methods** - GET, POST, PUT, DELETE
- **Request/Response schemas** - Using `ts-xsd` generated from SAP XSD definitions
- **Content-Types** - SAP vendor-specific media types

## Installation

```bash
bun add adt-contracts
```

## Usage

### With speci client

```typescript
import { adtContract } from 'adt-contracts';
import { createClient } from 'speci/rest';

const client = createClient(adtContract, {
  baseUrl: 'https://sap-server.example.com/sap/bc/adt',
  adapter: myAdapter,
});

// Full type inference from XSD schemas!
const transport = await client.cts.getTransportRequests();
const classInfo = await client.oo.getClass('ZCL_MY_CLASS');
```

### Individual contracts

```typescript
import { ctsContract, atcContract, ooContract } from 'adt-contracts';

// Use specific contracts
const cts = createClient(ctsContract, config);
const atc = createClient(atcContract, config);
```

## Available Contracts

| Contract       | Description                           |
| -------------- | ------------------------------------- |
| `coreContract` | Core ADT object operations            |
| `ctsContract`  | Change and Transport System           |
| `atcContract`  | ABAP Test Cockpit                     |
| `ooContract`   | Object-Oriented (classes, interfaces) |

## Architecture

```
adt-contracts (this package)
    ├── speci contracts (endpoint definitions)
    └── adt-schemas (ts-xsd schemas)
            └── ts-xsd (XSD → TypeScript)
```

**Contracts are pure data** - no HTTP client, no business logic. Use with any `speci`-compatible adapter.

## Adding New Contracts

1. Ensure schema exists in `adt-schemas`
2. Create contract file in `src/adt/<feature>/index.ts`
3. Define endpoints using `adtHttp.get/post/put/delete`
4. Export from `src/adt/index.ts`

```typescript
import { adtHttp } from '../../base';
import { mySchema } from 'adt-schemas';

export const myContract = {
  getResource: (id: string) =>
    adtHttp.get(`/my/endpoint/${id}`, {
      responses: { 200: mySchema },
      headers: { Accept: 'application/vnd.sap.adt.my.v1+xml' },
    }),
};
```

## License

MIT
