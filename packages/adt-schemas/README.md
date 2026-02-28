# @abapify/adt-schemas

[![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-schemas)](https://www.npmjs.com/package/@abapify/adt-schemas)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue)](../../LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6)](https://www.typescriptlang.org/)

**Type-safe SAP ADT schemas** generated from official XSD definitions with **shared types** and **optimal tree-shaking**.

## Overview

This package provides TypeScript schemas for SAP ADT (ABAP Development Tools) REST APIs, auto-generated from SAP's official XSD schema definitions using [@abapify/ts-xsd](../ts-xsd/README.md).

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

## Installation

```bash
npm install @abapify/adt-schemas
# or
bun add @abapify/adt-schemas
```

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

## Development

### Regenerate Schemas

```bash
# Full regeneration pipeline
npx nx run adt-schemas:generate

# Individual steps
npx nx run adt-schemas:download   # Download XSD files
npx nx run adt-schemas:codegen    # Generate schema literals
npx nx run adt-schemas:types      # Generate TypeScript interfaces
```

### Add New Schema

1. Add XSD to `.xsd/model/sap/` or create custom schema
2. Update generation config
3. Run `npx nx run adt-schemas:generate`
4. Add typed wrapper in `generated/index.ts`
5. **Add test scenario** (mandatory)

### Testing

```bash
# Run all tests
npx nx test adt-schemas

# Run specific test
npx vitest run tests/scenarios.test.ts
```

Every schema **must** have a test scenario with real SAP XML fixtures.

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

- **[@abapify/ts-xsd](../ts-xsd)** - Core XSD parser and type inference
- **[speci](../speci)** - REST contract library

## License

MIT
