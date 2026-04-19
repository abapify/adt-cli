---
title: ADT Contracts
sidebar_position: 1
---

# ADT Contracts Catalog

`client.adt.*` is a tree of typed REST contracts. Each leaf is a declarative
descriptor: HTTP verb + path + schemas for request/response. Invoking
`client.adt.<ns>.<method>(...)` produces an `HttpAdapter`-driven request,
parses the response through an [`@abapify/adt-schemas`](../packages/adt-schemas)
schema, and hands you a fully-typed object.

## Pipeline

```text
SAP XSD (W3C)
     ↓ ts-xsd
adt-schemas/generated   ← TypedSchema with parse() / build()
     ↓ @abapify/adt-contracts
adtContract.<ns>.*      ← speci descriptors (method, path, headers, body, responses)
     ↓ @abapify/adt-client
client.adt.<ns>.*       ← inferred, callable methods
```

## Worked example — `oo.classes`

```ts
import { createAdtClient } from '@abapify/adt-client';

const client = createAdtClient({
  baseUrl: 'https://sap.example.com',
  username: 'USER',
  password: 'pass',
  client: '100',
});

// GET a class (typed via adt-schemas → adtcore/class)
const result = await client.adt.oo.classes.get('ZCL_DEMO');
console.log(result.abapClass?.name, result.abapClass?.description);

// Create a class (POST), body typed against the same schema
await client.adt.oo.classes.post({
  abapClass: { name: 'ZCL_NEW', description: 'hello', language: 'EN' },
});
```

The `get`/`post`/`put`/`delete` methods — and the body/response payload
shapes — come from
[`packages/adt-contracts/src/adt/oo/classes.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-contracts/src/adt/oo/classes.ts).

## Namespaces

| Namespace          | URL root                                   | Page                                    |
| ------------------ | ------------------------------------------ | --------------------------------------- |
| `discovery`        | `/sap/bc/adt/discovery`                    | [Discovery](./discovery)                |
| `core.http`        | `/sap/bc/adt/core/http/...`                | [Core HTTP](./core-http)                |
| `cts`              | `/sap/bc/adt/cts/...`                      | [CTS](./cts)                            |
| `atc`              | `/sap/bc/adt/atc/...`                      | [ATC](./atc)                            |
| `aunit`            | `/sap/bc/adt/abapunit/...`                 | [AUnit](./aunit)                        |
| `oo`               | `/sap/bc/adt/oo/...`                       | [OO](./oo)                              |
| `packages`         | `/sap/bc/adt/packages/...`                 | [Packages](./packages)                  |
| `programs`         | `/sap/bc/adt/programs/...`                 | [Programs](./programs)                  |
| `ddic`             | `/sap/bc/adt/ddic/...`                     | [DDIC](./ddic)                          |
| `functions`        | `/sap/bc/adt/functions/...`                | [Functions](./functions)                |
| `system`           | `/sap/bc/adt/system/...`                   | [System](./system)                      |
| `repository`       | `/sap/bc/adt/repository/...`               | [Repository](./repository)              |
| `bo`               | `/sap/bc/adt/bo/...`                       | [Business Objects](./bo)                |
| `businessservices` | `/sap/bc/adt/businessservices/...`         | [Business Services](./businessservices) |
| `datapreview`      | `/sap/bc/adt/datapreview`                  | [Data Preview](./datapreview)           |
| `checkruns`        | `/sap/bc/adt/checkruns`                    | [Check Runs](./checkruns)               |
| `activation`       | `/sap/bc/adt/activation`                   | [Activation](./activation)              |
| `runtime.traces`   | `/sap/bc/adt/runtime/traces/...`           | [Runtime / Traces](./runtime-traces)    |
| `gcts`             | `/sap/bc/cts_abapvcs/...`                  | [gCTS](./gcts)                          |
| `flp`              | `/sap/opu/odata/UI2/PAGE_BUILDER_PERS/...` | [FLP](./uifsa)                          |
| `enhancements`     | `/sap/bc/adt/enhancements/...`             | [Enhancements](./enhancements)          |

## See also

- [Packages overview](../packages/overview)
- Package internals: [`adt-contracts/AGENTS.md`](https://github.com/abapify/adt-cli/blob/main/packages/adt-contracts/AGENTS.md)
