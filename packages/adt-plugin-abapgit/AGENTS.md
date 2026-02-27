# AI Agent Guidelines for adt-plugin-abapgit

## Quick Reference

**Package purpose:** Serialize ABAP objects to abapGit-compatible XML/ABAP files.

**Key constraint:** This plugin does NOT implement ADT client features. It only consumes ADK objects.

## Architecture Overview

### XSD Design Principles (CRITICAL)

> **Mantra:** "Global elements create roots. Global types create reuse."

**Core Rules:**

- ✅ ONE root element per document schema (`abapGit`)
- ✅ Reuse via `xs:complexType`, NOT via elements
- ✅ Payload types are TYPES ONLY (never global elements)
- ❌ NO `xs:redefine` or `xs:override`
- ❌ NO substitution groups
- ❌ NO abstract elements

### XSD Schema Hierarchy

```
xsd/
├── asx.xsd              # ASX envelope (structural types only, xs:any for payload)
├── abapgit.xsd          # AbapGitRootType (TYPE ONLY - no element!)
├── types/               # Reusable SAP structure TYPES
│   ├── vseointerf.xsd   # VseoInterfType (no element!)
│   ├── vseoclass.xsd    # VseoClassType (no element!)
│   └── ...
└── {type}.xsd           # Concrete document schemas (ONE root each)
```

### Generated Code Structure

```
src/schemas/generated/
├── index.ts             # Typed AbapGitSchema instances (auto-generated)
├── schemas/             # Raw schema literals
└── types/               # TypeScript interfaces
```

### Type Inference

Each schema provides **two type levels**:

- `schema._type` → Full `AbapGitType` (XML envelope + content)
- `schema._values` → `AbapValuesType` (what `toAbapGit()` returns)

```typescript
import { intf } from '../../../schemas/generated';

// Handler's toAbapGit return type is inferred from intf._values
toAbapGit: (obj) => ({
  VSEOINTERF: {           // ← Autocomplete works
    CLSNAME: obj.name,    // ← Type checking on fields
  },
}),
```

## Architecture Rules (CRITICAL)

### 1. XSD Schemas Are Mandatory

**NEVER** create XML handling without XSD schema:

```bash
# Correct workflow for new object type
1. Create xsd/types/{typename}.xsd - TYPE ONLY (no element!)
2. Create xsd/{type}.xsd - concrete schema with ONE root element
3. Add to ts-xsd.config.ts schemas array
4. Run: npx nx codegen adt-plugin-abapgit
5. Import generated schema in handler
```

**Why:** XSD enables external validation with `xmllint`, provides formal contract, generates type-safe parser/builder.

### 2. XSD Template for New Object Types

**Step 1:** Create payload type in `xsd/types/{typename}.xsd` (TYPE ONLY):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <!-- TYPE ONLY - no element declaration! -->
  <xs:complexType name="{TypeName}Type">
    <xs:all>
      <xs:element name="FIELD1" type="xs:string"/>
      <xs:element name="FIELD2" type="xs:string" minOccurs="0"/>
    </xs:all>
  </xs:complexType>
</xs:schema>
```

**Step 2:** Create concrete document schema in `xsd/{type}.xsd`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           xmlns:asx="http://www.sap.com/abapxml"
           elementFormDefault="unqualified">

  <!-- Import ASX namespace -->
  <xs:import namespace="http://www.sap.com/abapxml" schemaLocation="asx.xsd"/>

  <!-- Include reusable types -->
  <xs:include schemaLocation="abapgit.xsd"/>
  <xs:include schemaLocation="types/{typename}.xsd"/>

  <!-- Object-specific values type -->
  <xs:complexType name="{Type}ValuesType">
    <xs:sequence>
      <xs:element name="{STRUCTNAME}" type="{TypeName}Type" minOccurs="0"/>
    </xs:sequence>
  </xs:complexType>

  <!-- Object-specific ABAP envelope -->
  <xs:complexType name="{Type}AbapType">
    <xs:sequence>
      <xs:element name="values" type="{Type}ValuesType"/>
    </xs:sequence>
    <xs:attribute name="version" type="xs:string" default="1.0"/>
  </xs:complexType>

  <!-- THE ONLY ROOT ELEMENT -->
  <xs:element name="abapGit">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="abap" type="{Type}AbapType"/>
      </xs:sequence>
      <xs:attribute name="version" type="xs:string" use="required"/>
      <xs:attribute name="serializer" type="xs:string" use="required"/>
      <xs:attribute name="serializer_version" type="xs:string" use="required"/>
    </xs:complexType>
  </xs:element>

</xs:schema>
```

### 3. Handler Template

```typescript
/**
 * {TYPE} object handler for abapGit format
 */

import { Adk{Type} } from '../adk';
import { mytype } from '../../../schemas/generated';
import { createHandler } from '../base';

export const {type}Handler = createHandler(Adk{Type}, {
  schema: mytype,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_{TYPE}',
  serializer_version: 'v1.0.0',

  // Return type inferred from schema._values
  toAbapGit: (obj) => ({
    {STRUCTNAME}: {
      FIELD1: obj.name ?? '',
      FIELD2: obj.description ?? '',
    },
  }),

  // Optional: for objects with source code
  getSource: (obj) => obj.getSource(),
});
```

### 4. Handlers Only Define Mappings

Handlers should contain:

- ✅ `toAbapGit()` - data mapping (return type inferred from schema)
- ✅ `getSource()` / `getSources()` - source file definitions
- ✅ `xmlFileName` - custom filename (if needed)

Handlers should NOT contain:

- ❌ File system operations
- ❌ ADT client calls
- ❌ XML string building
- ❌ Promise handling for sources (factory does this)

### 5. Import Conventions

**Internal imports (within package):** Use extensionless paths

```typescript
import { createHandler } from '../base';
import { intf } from '../../../schemas/generated';
```

**ADK imports:** Use local re-export module

```typescript
// Correct
import { AdkClass, type ClassIncludeType } from '../adk';

// Wrong - don't import directly from @abapify/adk in handlers
import { AdkClass } from '@abapify/adk';
```

### 6. Test File Imports

Test files (`tests/**/*.test.ts`) need `.ts` extensions for Node.js native runner:

```typescript
import { createHandler } from '../../src/lib/handlers/base.ts';
```

## File Locations

| Purpose           | Location                        |
| ----------------- | ------------------------------- |
| XSD schemas       | `xsd/*.xsd`                     |
| Type definitions  | `xsd/types/*.xsd`               |
| Generated schemas | `src/schemas/generated/`        |
| Handler base      | `src/lib/handlers/base.ts`      |
| Object handlers   | `src/lib/handlers/objects/*.ts` |
| ADK re-exports    | `src/lib/handlers/adk.ts`       |
| Handler registry  | `src/lib/handlers/registry.ts`  |
| Schema tests      | `tests/schemas/*.test.ts`       |
| Handler tests     | `tests/handlers/*.test.ts`      |
| XML fixtures      | `tests/fixtures/`               |

## Common Tasks

### Adding New Object Type

1. Create `xsd/types/{typename}.xsd` - payload TYPE ONLY (no element!)
2. Create `xsd/{type}.xsd` - concrete document schema with ONE root element
3. Add to `ts-xsd.config.ts` schemas array
4. Run `npx nx codegen adt-plugin-abapgit`
5. Create `src/lib/handlers/objects/{type}.ts`
6. Add export to `src/lib/handlers/registry.ts`
7. Add ADK type to `src/lib/handlers/adk.ts` if needed
8. Add test fixtures and schema test

### Modifying Handler

1. Check if change affects `toAbapGit()` mapping
2. If XML structure changes, update XSD first, then regenerate
3. Run tests: `npx nx test adt-plugin-abapgit`
4. Run build: `npx nx build adt-plugin-abapgit`

### Debugging XML Issues

```bash
# Validate XML against schema
xmllint --schema xsd/intf.xsd tests/fixtures/intf/example.intf.xml --noout

# Check generated types match XSD
npx nx codegen adt-plugin-abapgit
```

## Anti-Patterns to Avoid

| Don't                       | Do Instead                     |
| --------------------------- | ------------------------------ |
| Manual XML strings          | Use schema `.build()`          |
| `fs.writeFile` in handler   | Return from `ctx.createFile()` |
| `adtClient.getSource()`     | Use `obj.getSource()` from ADK |
| Skip XSD for "simple" types | Always create XSD first        |
| `as any` type assertions    | Fix types at source            |
| Hand-write AbapGitSchema    | Use codegen to generate        |

## Build Commands

```bash
npx nx codegen adt-plugin-abapgit  # Generate schemas and types
npx nx build adt-plugin-abapgit    # Build package
npx nx test adt-plugin-abapgit     # Run tests
```
