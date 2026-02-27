# Contributing to adt-plugin-abapgit

This guide explains how to add support for new ABAP object types and maintain existing handlers.

## Before You Start

**Read this carefully.** The architecture may seem over-engineered at first, but each decision exists for good reasons. Contributors often want to "simplify" by:

- ❌ Writing XML manually instead of using XSD schemas
- ❌ Implementing ADT client calls in handlers
- ❌ Handling file I/O directly in handlers
- ❌ Skipping type generation and using `any`

**Don't do these things.** This document explains why.

---

## Architecture Overview

### XSD Schema Hierarchy

The XSD schemas use a layered architecture with inheritance:

```
xsd/
├── abapgit.xsd          # Root element: <abapGit version="..." serializer="...">
├── asx.xsd              # SAP ABAP XML envelope: <asx:abap><asx:values>...</asx:values></asx:abap>
├── types/               # Reusable type definitions
│   ├── vseointerf.xsd   # VseoInterfType for interfaces
│   ├── vseoclass.xsd    # VseoClassType for classes
│   ├── dd01v.xsd        # DD01V for domains
│   └── ...
└── {type}.xsd           # Object-specific schemas (intf.xsd, clas.xsd, etc.)
```

**Key concept:** Object schemas use `xs:redefine` to extend `AbapValuesType` with object-specific elements. This ensures proper XML structure validation.

### Generated Code Structure

After running `npx nx codegen adt-plugin-abapgit`:

```
src/schemas/generated/
├── index.ts             # Main entry - typed AbapGitSchema instances
├── schemas/
│   ├── index.ts         # Raw schema exports
│   ├── intf.ts          # Raw schema literal with `as const`
│   ├── clas.ts
│   └── ...
└── types/
    ├── index.ts         # Type exports with aliases
    ├── intf.ts          # AbapGitType, AbapValuesType, VseoInterfType
    ├── clas.ts
    └── ...
```

### Type Inference System

The codegen produces **two type levels** for each schema:

1. **`AbapGitType`** - Full XML structure including envelope
2. **`AbapValuesType`** - Inner values wrapper (what handlers return from `toAbapGit()`)

```typescript
// Generated types/intf.ts
export interface AbapGitType {
  abap: AbapType; // asx:abap envelope
  version: string; // abapGit attributes
  serializer: string;
  serializer_version: string;
}

export interface AbapValuesType {
  VSEOINTERF?: VseoInterfType; // Object-specific content
}

export interface VseoInterfType {
  CLSNAME: string;
  LANGU?: string;
  DESCRIPT?: string;
  // ... all fields from XSD
}
```

The `abapGitSchema<TFull, TValues>()` wrapper provides both types:

```typescript
// Usage in handler
import { intf } from '../../../schemas/generated';

// intf._type → AbapGitType (full XML)
// intf._values → AbapValuesType (handler return type)
// intf.parse(xml) → AbapGitType
// intf.build(data) → string
```

---

## Adding a New Object Type

### Step 1: Create Type Definition (if needed)

If your object uses a new SAP structure, create the type XSD first.

**Location:** `xsd/types/{typename}.xsd`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!--
  {TYPENAME} Type Definition

  Defines the {TYPENAME} structure used in {type}.xsd
-->
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           targetNamespace="http://www.sap.com/abapxml"
           xmlns:asx="http://www.sap.com/abapxml"
           elementFormDefault="unqualified">

  <xs:complexType name="{TypeName}Type">
    <xs:sequence>
      <xs:element name="FIELD1" type="xs:string"/>
      <xs:element name="FIELD2" type="xs:string" minOccurs="0"/>
      <!-- Add all fields from SAP structure -->
    </xs:sequence>
  </xs:complexType>

</xs:schema>
```

### Step 2: Create the Object Schema

**Location:** `xsd/{type}.xsd`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!--
  abapGit {TYPE} ({Description}) Schema

  Defines {STRUCTNAME} structure for *.{type}.xml files.

  Uses xs:redefine to extend AbapValuesType with {TYPE}-specific elements.
  This ensures {STRUCTNAME} can only appear inside asx:values, not as root.
-->
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           targetNamespace="http://www.sap.com/abapxml"
           xmlns:asx="http://www.sap.com/abapxml"
           elementFormDefault="unqualified">

  <!-- Include types (brought into asx namespace) -->
  <xs:include schemaLocation="types/{typename}.xsd"/>

  <!-- Redefine AbapValuesType to include {TYPE}-specific elements -->
  <xs:redefine schemaLocation="asx.xsd">
    <xs:complexType name="AbapValuesType">
      <xs:complexContent>
        <xs:extension base="asx:AbapValuesType">
          <xs:sequence>
            <xs:element name="{STRUCTNAME}" type="asx:{TypeName}Type" minOccurs="0"/>
          </xs:sequence>
        </xs:extension>
      </xs:complexContent>
    </xs:complexType>
  </xs:redefine>

  <!-- Import abapGit root element -->
  <xs:import schemaLocation="abapgit.xsd"/>

</xs:schema>
```

**Key points:**

- Use `xs:include` for type definitions (same namespace)
- Use `xs:redefine` to extend `AbapValuesType`
- Use `xs:import` for the abapGit root element

### Step 3: Register Schema in ts-xsd Config

**File:** `ts-xsd.config.ts`

```typescript
sources: {
  abapgit: {
    xsdDir: 'xsd',
    outputDir: 'src/schemas/generated/schemas',
    schemas: [
      'clas',
      'devc',
      'doma',
      'dtel',
      'intf',
      'mytype',  // ← Add your new type
    ],
  },
},
```

### Step 4: Generate TypeScript Types

```bash
npx nx codegen adt-plugin-abapgit
```

This generates:

- `src/schemas/generated/schemas/mytype.ts` - Raw schema literal
- `src/schemas/generated/types/mytype.ts` - TypeScript interfaces
- Updates `src/schemas/generated/index.ts` - Adds typed schema export

### Step 5: Create the Handler

**Location:** `src/lib/handlers/objects/{type}.ts`

```typescript
/**
 * {TYPE} ({Description}) object handler for abapGit format
 */

import { Adk{Type} } from '../adk';
import { mytype } from '../../../schemas/generated';
import { createHandler } from '../base';

export const {type}Handler = createHandler(Adk{Type}, {
  // Schema provides type inference for toAbapGit return value
  schema: mytype,

  // abapGit metadata
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_{TYPE}',
  serializer_version: 'v1.0.0',

  // Map ADK object → AbapValuesType (inner values)
  // Return type is inferred from schema._values
  toAbapGit: (obj) => ({
    {STRUCTNAME}: {
      FIELD1: obj.name ?? '',
      FIELD2: obj.description ?? '',
      // ... map all required fields
    },
  }),

  // Optional: For objects with source code
  getSource: (obj) => obj.getSource(),
});
```

**Type inference flow:**

1. `schema: mytype` → TypeScript knows `mytype._values` is `MytypeValuesType`
2. `toAbapGit` return type is automatically inferred as `MytypeValuesType`
3. IDE provides autocomplete for all valid fields
4. Compile-time error if you return wrong structure

### Step 6: Register the Handler

**File:** `src/lib/handlers/registry.ts`

```typescript
export { mytypeHandler } from './objects/mytype';
```

### Step 7: Add ADK Type to Re-exports (if needed)

**File:** `src/lib/handlers/adk.ts`

```typescript
// If using ADK class as value (not just type)
export { AdkMyType } from '@abapify/adk';

// If only using as type annotation
export type { AdkMyType } from '@abapify/adk';
```

### Step 8: Add Tests

**Fixtures:** `tests/fixtures/{type}/example.{type}.xml`

Add real abapGit XML files exported from SAP.

**Schema test:** `tests/schemas/{type}.test.ts`

```typescript
import { describe, it } from 'node:test';
import { runSchemaScenario } from './helpers.ts';

describe('{TYPE} Schema', () => {
  runSchemaScenario({
    name: '{TYPE}',
    xsdPath: 'xsd/{type}.xsd',
    fixtures: ['tests/fixtures/{type}/example.{type}.xml'],
    validate: (data) => {
      // Add assertions for parsed data
    },
  });
});
```

---

## Handler API Reference

### `createHandler(type, definition)`

Factory function that creates and auto-registers a handler.

**Parameters:**

| Parameter                       | Type                                 | Description                                  |
| ------------------------------- | ------------------------------------ | -------------------------------------------- |
| `type`                          | `string \| AdkClass`                 | Object type code (e.g., 'CLAS') or ADK class |
| `definition.schema`             | `AbapGitSchema`                      | Generated typed schema                       |
| `definition.version`            | `string`                             | abapGit version attribute                    |
| `definition.serializer`         | `string`                             | Serializer class name                        |
| `definition.serializer_version` | `string`                             | Serializer version                           |
| `definition.toAbapGit`          | `(obj) => TValues`                   | Maps ADK object to abapGit XML values        |
| `definition.getSource?`         | `(obj) => Promise<string>`           | Returns single source file content           |
| `definition.getSources?`        | `(obj) => Array<{suffix?, content}>` | Returns multiple source files                |
| `definition.xmlFileName?`       | `string`                             | Override default XML filename                |

### Type Inference

The `toAbapGit` function return type is **automatically inferred** from the schema:

```typescript
// schema._values is AbapValuesType from generated types
// toAbapGit must return exactly that type
toAbapGit: (obj) => ({
  VSEOINTERF: {        // ← IDE autocomplete works
    CLSNAME: obj.name, // ← Type checking on fields
    INVALID: 'x',      // ← Compile error: unknown field
  },
}),
```

---

## Common Patterns

### Objects Without Source Code (DTEL, DOMA, etc.)

```typescript
export const dtelHandler = createHandler('DTEL', {
  schema: dtel,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_DTEL',
  serializer_version: 'v1.0.0',

  toAbapGit: (obj) => ({
    DD04V: {
      ROLLNAME: obj.name ?? '',
      DDTEXT: obj.description ?? '',
    },
  }),
  // No getSource - only XML file generated
});
```

### Objects With Single Source (INTF, PROG, etc.)

```typescript
export const intfHandler = createHandler(AdkInterface, {
  schema: intf,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_INTF',
  serializer_version: 'v1.0.0',

  toAbapGit: (obj) => ({
    VSEOINTERF: {
      CLSNAME: obj.name ?? '',
      DESCRIPT: obj.description ?? '',
    },
  }),

  getSource: (obj) => obj.getSource(),
});
```

### Objects With Multiple Sources (CLAS)

```typescript
const SUFFIX_MAP: Record<ClassIncludeType, string | undefined> = {
  main: undefined,
  definitions: 'locals_def',
  implementations: 'locals_imp',
  testclasses: 'testclasses',
  macros: 'macros',
};

export const classHandler = createHandler(AdkClass, {
  schema: clas,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_CLAS',
  serializer_version: 'v1.0.0',

  toAbapGit: (obj) => ({
    VSEOCLASS: {
      /* ... */
    },
  }),

  getSources: (cls) =>
    cls.includes.map((inc) => ({
      suffix: SUFFIX_MAP[inc.includeType],
      content: cls.getIncludeSource(inc.includeType),
    })),
});
```

### Fixed Filename (DEVC)

```typescript
export const packageHandler = createHandler(AdkPackage, {
  schema: devc,
  xmlFileName: 'package.devc.xml', // Not '{name}.devc.xml'
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_DEVC',
  serializer_version: 'v1.0.0',

  toAbapGit: (pkg) => ({
    DEVC: {
      CTEXT: pkg.description ?? '',
    },
  }),
});
```

---

## Anti-Patterns (Don't Do This)

### ❌ Manual XML Building

```typescript
// WRONG - No validation, error-prone
toAbapGit: (obj) => `<CLSNAME>${obj.name}</CLSNAME>`;
```

```typescript
// CORRECT - Type-safe, validated
toAbapGit: (obj) => ({
  VSEOCLASS: {
    CLSNAME: obj.name ?? '',
  },
});
```

### ❌ ADT Client Calls in Handler

```typescript
// WRONG - Handler shouldn't know about ADT
getSource: async (obj) => {
  const source = await adtClient.getSource(obj.uri); // NO!
  return source;
};
```

```typescript
// CORRECT - Use ADK facade
getSource: (obj) => obj.getSource(); // ADK handles ADT calls
```

### ❌ Skipping XSD Schema

```typescript
// WRONG - No external validation possible
const mySchema = { parse: ..., build: ... };  // Hand-written
```

```typescript
// CORRECT - XSD as source of truth
// 1. Create xsd/mytype.xsd
// 2. Run codegen
// 3. Import generated schema
import { mytype } from '../../../schemas/generated';
```

---

## Checklist for New Object Types

- [ ] Type XSD created in `xsd/types/` (if new structure)
- [ ] Object XSD created in `xsd/` using `xs:redefine`
- [ ] Schema registered in `ts-xsd.config.ts`
- [ ] Codegen run: `npx nx codegen adt-plugin-abapgit`
- [ ] Handler created in `src/lib/handlers/objects/`
- [ ] Handler exported in `src/lib/handlers/registry.ts`
- [ ] ADK types added to `src/lib/handlers/adk.ts` (if needed)
- [ ] Test fixtures added in `tests/fixtures/`
- [ ] Schema tests added in `tests/schemas/`
- [ ] Build passes: `npx nx build adt-plugin-abapgit`
- [ ] Tests pass: `npx nx test adt-plugin-abapgit`
- [ ] XSD validates fixtures: `xmllint --schema xsd/{type}.xsd tests/fixtures/{type}/*.xml --noout`

---

## Build Commands

```bash
npx nx codegen adt-plugin-abapgit  # Generate schemas and types
npx nx build adt-plugin-abapgit    # Build package
npx nx test adt-plugin-abapgit     # Run tests
```

## Debugging

```bash
# Validate XML against schema
xmllint --schema xsd/intf.xsd tests/fixtures/intf/example.intf.xml --noout

# Check generated types match XSD
npx nx codegen adt-plugin-abapgit
```
