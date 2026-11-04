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
export * from '@abapify/adt-schemas'; // adtcore, atom, classes, interfaces, …

// Re-exported from ts-xsd
export { typedSchema, parseXml, buildXml } from '@abapify/adt-schemas';
export type {
  TypedSchema,
  InferTypedSchema,
  SchemaLike,
  InferSchema,
} from '@abapify/adt-schemas';
```

## Usage

```ts
import { atom, adtcore } from '@abapify/adt-schemas';

const data = atom.parse(xmlString); // typed
const xml = atom.build(data);

import type { InferTypedSchema } from '@abapify/adt-schemas';
type AtomData = InferTypedSchema<typeof atom>;
```

## Dependencies

- `@abapify/ts-xsd`
- Consumed by [`adt-contracts`](./adt-contracts), [`adt-client`](./adt-client),
  [`adk`](./adk), [`adt-plugin-abapgit`](./adt-plugin-abapgit).

## Overview

This package provides TypeScript schemas for SAP ADT (ABAP Development Tools) REST APIs, auto-generated from SAP's official XSD schema definitions using [@abapify/ts-xsd](https://github.com/abapify/adt-cli/blob/main/packages/ts-xsd/README.md).

### Key Features

- **204+ TypeScript interfaces** - Pre-generated, no runtime inference overhead
- **Shared types across schemas** - `AdtObject`, `LinkType`, etc. are defined once
- **Optimal bundling** - Tree-shakeable, import only what you need
- **Full type safety** - Compile-time validation of XML parsing/building
- **speci integration** - Works directly with REST contract definitions

### Architecture Highlights

```
XSD Files (SAP Official)
    ↓ ts-xsd codegen
Schema Literals (as const)
    ↓ interface generator
TypeScript Interfaces (204 types)
    ↓ typed() wrapper
Typed Schemas (parse/build)
```

**Single source of truth**: All type definitions flow from XSD → TypeScript, eliminating manual type maintenance.

## Quick Start

### Parse ADT XML

```typescript
import { classes, type AbapClass } from '@abapify/adt-schemas';

// Parse XML to typed object
const xml = await fetch('/sap/bc/adt/oo/classes/zcl_my_class').then((r) =>
  r.text(),
);
const data = classes.parse(xml);

// Full type safety - TypeScript knows all properties
console.log(data.name); // string
console.log(data.category); // 'generalObjectType' | 'exceptionClass' | ...
console.log(data.include?.[0]); // AbapClassInclude | undefined
```

### Build ADT XML

```typescript
import { classes } from '@abapify/adt-schemas';

const xml = classes.build({
  name: 'ZCL_MY_CLASS',
  type: 'CLAS/OC',
  category: 'generalObjectType',
  final: false,
  abstract: false,
});
```

### Use with speci Contracts

```typescript
import { classes, configurations } from '@abapify/adt-schemas';
import { http } from 'speci/rest';

const adtContracts = {
  getClass: (name: string) =>
    http.get(`/sap/bc/adt/oo/classes/${name}`, {
      responses: { 200: classes },
    }),

  getConfigurations: () =>
    http.get(
      '/sap/bc/adt/cts/transportrequests/searchconfiguration/configurations',
      {
        responses: { 200: configurations },
      },
    ),
};
```

## Available Schemas

### Core Schemas

| Schema       | Type               | Description                          |
| ------------ | ------------------ | ------------------------------------ |
| `adtcore`    | `AdtObject`        | Core ADT object types                |
| `atom`       | `LinkType`         | Atom feed format (links, categories) |
| `abapsource` | `AbapSourceObject` | ABAP source code structures          |
| `abapoo`     | `AbapOoObject`     | ABAP OO base types                   |

### Repository Objects

| Schema       | Type            | Description               |
| ------------ | --------------- | ------------------------- |
| `classes`    | `AbapClass`     | ABAP class metadata       |
| `interfaces` | `AbapInterface` | ABAP interface metadata   |
| `packagesV1` | `Package`       | Package/devclass metadata |

### Transport Management

| Schema                     | Type             | Description                        |
| -------------------------- | ---------------- | ---------------------------------- |
| `transportfind`            | `Abap`           | Transport search (ABAP XML format) |
| `transportmanagmentCreate` | `RootType`       | Transport creation                 |
| `configurations`           | `Configurations` | Search configurations              |
| `configuration`            | `Configuration`  | Single configuration               |

### ATC (ABAP Test Cockpit)

| Schema        | Type               | Description         |
| ------------- | ------------------ | ------------------- |
| `atc`         | `AtcWorklist`      | ATC main schema     |
| `atcworklist` | `AtcWorklist`      | ATC worklist        |
| `atcresult`   | `AtcWorklist`      | ATC results         |
| `checklist`   | `CheckMessageList` | Check message lists |
| `quickfixes`  | `AtcQuickfixes`    | ATC quickfixes      |

### Debugging & Tracing

| Schema     | Type          | Description          |
| ---------- | ------------- | -------------------- |
| `logpoint` | `AdtLogpoint` | Logpoint definitions |
| `traces`   | `Traces`      | Trace data           |

### Templates

| Schema                 | Type                | Description             |
| ---------------------- | ------------------- | ----------------------- |
| `templatelink`         | `LinkType`          | Template links          |
| `templatelinkExtended` | `TemplateLinksType` | Extended template links |

## Type System

### Pre-generated Interfaces

All types are pre-generated as TypeScript interfaces, avoiding runtime inference overhead:

```typescript
// Import types directly
import type {
  AbapClass,
  AbapInterface,
  AdtObject,
  AdtObjectReference,
  LinkType,
} from '@abapify/adt-schemas';

// Use in your code
function processClass(cls: AbapClass) {
  console.log(cls.name);
  console.log(cls.superClassRef?.name);
  cls.include?.forEach((inc) => console.log(inc.includeType));
}
```

### Shared Types

Types are shared across schemas - `AdtObject` is defined once and reused:

```typescript
// All these extend AdtObject
interface AbapSourceObject extends AdtObject { ... }
interface AbapOoObject extends AbapSourceMainObject { ... }
interface AbapClass extends AbapOoObject { ... }
interface AbapInterface extends AbapOoObject { ... }
```

### Type Hierarchy

```
AdtObject
├── AdtMainObject
│   └── AbapSourceMainObject
│       └── AbapOoObject
│           ├── AbapClass
│           └── AbapInterface
└── AbapSourceObject
    └── AbapClassInclude
```

## Schema Structure

Each schema is a W3C-compliant XSD representation with linked imports:

```typescript
// Generated schema literal (classes.ts)
export default {
  $xmlns: {
    adtcore: "http://www.sap.com/adt/core",
    abapoo: "http://www.sap.com/adt/oo",
    class: "http://www.sap.com/adt/oo/classes",
  },
  $imports: [adtcore, abapoo, abapsource],  // Linked schemas
  targetNamespace: "http://www.sap.com/adt/oo/classes",
  element: [
    { name: "abapClass", type: "class:AbapClass" },
  ],
  complexType: [
    {
      name: "AbapClass",
      complexContent: {
        extension: {
          base: "abapoo:AbapOoObject",  // Type inheritance
          sequence: { element: [...] },
          attribute: [...],
        }
      }
    }
  ],
} as const;
```

### Cross-Schema Type Resolution

The `$imports` array enables cross-schema type resolution:

```typescript
// classes schema imports adtcore, abapoo, abapsource
// Type "adtcore:AdtObjectReference" resolves to AdtObjectReference interface
// Type "abapoo:AbapOoObject" resolves to AbapOoObject interface
```

## Architecture

```
@abapify/adt-schemas
├── src/
│   ├── index.ts              # Main exports
│   ├── speci.ts              # typed() wrapper factory
│   └── schemas/
│       ├── index.ts          # Re-exports from generated
│       └── generated/
│           ├── index.ts      # Typed schema exports
│           ├── schemas/
│           │   ├── sap/      # SAP official schemas (23 files)
│           │   └── custom/   # Custom schemas (9 files)
│           └── types/
│               └── index.ts  # 204 TypeScript interfaces
```

### Generation Pipeline

```
1. Download XSD     → .xsd/model/*.xsd
2. Parse XSD        → Schema objects (ts-xsd)
3. Generate Literal → schemas/sap/*.ts (as const)
4. Generate Types   → types/index.ts (interfaces)
5. Wrap with typed()→ index.ts (parse/build methods)
```

## Custom Schemas (ABAP XML Format)

Some SAP endpoints return ABAP XML format (`asx:abap` envelope) without official XSD. Create manual schemas in `src/schemas/generated/schemas/custom/`:

```typescript
// schemas/custom/transportfind.ts
export default {
  $xmlns: { asx: 'http://www.sap.com/abapxml' },
  targetNamespace: 'http://www.sap.com/abapxml',
  element: [{ name: 'abap', type: 'Abap' }],
  complexType: [
    {
      name: 'Abap',
      sequence: {
        element: [{ name: 'values', type: 'Values' }],
      },
      attribute: [{ name: 'version', type: 'xs:string' }],
    },
  ],
  // ... more types
} as const; // CRITICAL: 'as const' required!
```

### Key Points

1. **`as const`** - Required for type inference
2. **Element names without prefix** - Use `'abap'`, not `'asx:abap'`
3. **Add to typed index** - Register in `generated/index.ts`

## speci Integration

Schemas implement the `Serializable` interface for seamless speci integration:

```typescript
interface Serializable<T> {
  parse(raw: string): T;
  build?(data: T): string;
}
```

This enables automatic type inference in REST contracts:

```typescript
import { classes } from '@abapify/adt-schemas';

const contract = http.get('/sap/bc/adt/oo/classes/zcl_test', {
  responses: { 200: classes },
});

// Response type is automatically inferred as AbapClass
const response = await client.execute(contract);
console.log(response.data.name); // TypeScript knows this is string
```

## Related Packages

- **[@abapify/ts-xsd](https://github.com/abapify/adt-cli/blob/main/packages/ts-xsd)** - Core XSD parser and type inference
- **[speci](https://github.com/abapify/adt-cli/blob/main/packages/speci)** - REST contract library

## See also

- Package internals: [`packages/adt-schemas/AGENTS.md`](https://github.com/abapify/adt-cli/blob/main/packages/adt-schemas/AGENTS.md)
- [`ts-xsd`](./ts-xsd), [Contracts catalog](../contracts/overview)
