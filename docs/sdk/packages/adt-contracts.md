---
title: '@abapify/adt-contracts'
description: speci-based ADT REST API contract descriptors.
---

# `@abapify/adt-contracts`

Type-safe descriptors for the full SAP ADT REST surface (plus gCTS and FLP).
Contracts wrap [`@abapify/adt-schemas`](./adt-schemas) with
[`@abapify/speci`](./speci) HTTP verbs. The consuming
[`adt-client`](./adt-client) turns the `adtContract` tree into a callable
client.

See the [Contracts catalog](../contracts/overview) for the per-namespace
reference.

## Install

```bash
bun add @abapify/adt-contracts
```

## Public API

```ts
// Base utilities (client creation, types)
export * from '@abapify/adt-contracts/base';

// Every ADT namespace (cts, atc, oo, ddic, …) and the aggregated tree
export * from '@abapify/adt-contracts';

// Notable exports:
export { adtContract, type AdtContract, type AdtClientType } from '@abapify/adt-contracts';
```

## Usage

```ts
import { adtContract, type AdtContract } from '@abapify/adt-contracts';

// Descriptors are plain objects — inspect a contract:
const transportGet = adtContract.cts.transportrequests.get('DEVK900001');
console.log(transportGet.method, transportGet.path);
```

Contracts are normally invoked through [`adt-client`](./adt-client).

## Dependencies

- `@abapify/speci`, `@abapify/adt-schemas`
- Consumed by [`adt-client`](./adt-client), [`adk`](./adk),
  [`adt-cli`](./adt-cli) services, [`adt-mcp`](./adt-mcp).

## See also

- Package internals: [`packages/adt-contracts/AGENTS.md`](https://github.com/abapify/adt-cli/blob/main/packages/adt-contracts/AGENTS.md)
- [Contract namespaces](../contracts/overview)
