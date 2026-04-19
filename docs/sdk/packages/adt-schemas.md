---
title: '@abapify/adt-schemas'
description: W3C XSD-generated TypedSchemas for SAP ADT XML.
---

# `@abapify/adt-schemas`

Pre-generated TypedSchemas for the entire SAP ADT XML surface (200+ types).
Each schema exposes `parse(xml)` / `build(data)` with static type inference.
Generated from SAP's published XSDs plus a small `custom/` extension layer.

:::caution Generated
Files under `src/schemas/generated/` are emitted from XSDs. Never edit them
by hand — fix the XSD or the generator. See the package `AGENTS.md`.
:::

## Install

```bash
bun add @abapify/adt-schemas
```

## Public API

```ts
// All schemas
export * from '@abapify/adt-schemas';  // adtcore, atom, classes, interfaces, …

// Re-exported from ts-xsd
export { typedSchema, parseXml, buildXml } from '@abapify/adt-schemas';
export type {
  TypedSchema, InferTypedSchema, SchemaLike, InferSchema,
} from '@abapify/adt-schemas';
```

## Usage

```ts
import { atom, adtcore } from '@abapify/adt-schemas';

const data = atom.parse(xmlString);   // typed
const xml  = atom.build(data);

import type { InferTypedSchema } from '@abapify/adt-schemas';
type AtomData = InferTypedSchema<typeof atom>;
```

## Dependencies

- `@abapify/ts-xsd`
- Consumed by [`adt-contracts`](./adt-contracts), [`adt-client`](./adt-client),
  [`adk`](./adk), [`adt-plugin-abapgit`](./adt-plugin-abapgit).

## See also

- Package internals: [`packages/adt-schemas/AGENTS.md`](https://github.com/abapify/adt-cli/blob/main/packages/adt-schemas/AGENTS.md)
- [`ts-xsd`](./ts-xsd), [Contracts catalog](../contracts/overview)
