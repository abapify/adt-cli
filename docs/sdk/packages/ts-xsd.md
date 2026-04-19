---
title: '@abapify/ts-xsd'
description: W3C XSD 1.1 parser, builder, and type inference.
---

# `@abapify/ts-xsd`

Foundation library. Parses W3C XML Schema (XSD 1.1) files into a 1:1 typed
AST, builds XSDs back, parses/builds XML **using** schema definitions, and
generates TypeScript literals + interfaces for downstream consumers.

:::caution
Follows the W3C XSD spec strictly — never invent properties. See the
package `AGENTS.md`.
:::

## Install

```bash
bun add @abapify/ts-xsd
```

## Public API

```ts
// XSD parse/build
export * from '@abapify/ts-xsd'; // xsd module

// Type inference
export type * from '@abapify/ts-xsd'; // infer module: InferSchema, InferElement, …

// Codegen
export * from '@abapify/ts-xsd'; // codegen: generateSchemaLiteral, generateInterfaces

// XML parse/build
export * from '@abapify/ts-xsd'; // xml: parseXml, buildXml, typedSchema

// Walker
export * from '@abapify/ts-xsd'; // walkElements, walkComplexTypes, findSubstitutes
```

## Usage

```ts
import { parseXsd, typedSchema, parseXml, buildXml } from '@abapify/ts-xsd';

const schema = parseXsd(xsdText);
const typed = typedSchema(schema);
const data = parseXml(typed, '<foo>…</foo>');
const xml = buildXml(typed, data);
```

## Dependencies

- `@xmldom/xmldom`
- Consumed by [`adt-schemas`](./adt-schemas) (the generated surface) and
  [`adt-codegen`](./adt-codegen).

## See also

- Package internals: [`packages/ts-xsd/AGENTS.md`](https://github.com/abapify/adt-cli/blob/main/packages/ts-xsd/AGENTS.md)
- [W3C XML Schema 1.1 spec](https://www.w3.org/TR/xmlschema11-1/)
