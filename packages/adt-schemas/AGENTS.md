# adt-schemas - AI Agent Guide

## Package Overview

**Type-safe SAP ADT schemas** with pre-generated TypeScript interfaces and optimal tree-shaking.

| Feature               | Description                          |
| --------------------- | ------------------------------------ |
| **204+ interfaces**   | Pre-generated, no runtime inference  |
| **Shared types**      | `AdtObject`, `LinkType` defined once |
| **Tree-shakeable**    | Import only what you need            |
| **speci integration** | Works with REST contracts            |

## 🚨 Critical Rules

### 1. NEVER Edit Generated Files

Generated files are in `src/schemas/generated/`:

- `schemas/sap/*.ts` - SAP official schemas
- `schemas/custom/*.ts` - Custom schemas
- `types/index.ts` - TypeScript interfaces
- `index.ts` - Typed schema exports

**If a generated schema is incorrect:**

1. Fix the generator in `ts-xsd/src/codegen/`
2. Rebuild: `npx nx build ts-xsd`
3. Regenerate: `npx nx run adt-schemas:generate`

### 2. Custom Schemas Require `as const`

```typescript
// ✅ CORRECT - type inference works
export default {
  $xmlns: { ... },
  element: [...],
  complexType: [...],
} as const;

// ❌ WRONG - type inference fails
export default {
  $xmlns: { ... },
  element: [...],
};
```

### 3. Every Schema Needs Tests

**No exceptions.** When adding/modifying a schema:

1. Add real SAP XML fixture to `tests/scenarios/fixtures/`
2. Create scenario class in `tests/scenarios/`
3. Register in `tests/scenarios/index.ts`
4. Run: `npx nx test adt-schemas`

## Architecture

```
src/
├── index.ts              # Main exports
├── speci.ts              # typed() wrapper factory
└── schemas/
    ├── index.ts          # Re-exports from generated
    └── generated/
        ├── index.ts      # Typed schema exports (18 schemas)
        ├── schemas/
        │   ├── sap/      # SAP official (23 files)
        │   └── custom/   # Custom (9 files)
        └── types/
            └── index.ts  # 204 TypeScript interfaces
```

### Generation Pipeline

```
XSD Files (.xsd/model/)
    ↓ ts-xsd parseXsd
Schema Objects
    ↓ generateSchemaLiteral
Schema Literals (as const)
    ↓ generateInterfaces
TypeScript Interfaces
    ↓ typed() wrapper
Typed Schemas (parse/build)
```

## Key Files

| File                                   | Purpose                      |
| -------------------------------------- | ---------------------------- |
| `src/speci.ts`                         | `typed<T>()` wrapper factory |
| `src/schemas/generated/index.ts`       | Typed schema exports         |
| `src/schemas/generated/types/index.ts` | 204 TypeScript interfaces    |
| `scripts/generate*.ts`                 | Generation scripts           |

## Schema Structure (W3C Format)

```typescript
// Generated schema literal
export default {
  $xmlns: {
    adtcore: "http://www.sap.com/adt/core",
    class: "http://www.sap.com/adt/oo/classes",
  },
  $imports: [adtcore, abapoo, abapsource],  // Linked schemas
  targetNamespace: "http://www.sap.com/adt/oo/classes",
  element: [
    { name: "abapClass", type: "class:AbapClass" },
  ],
  complexType: [{
    name: "AbapClass",
    complexContent: {
      extension: {
        base: "abapoo:AbapOoObject",
        sequence: { element: [...] },
        attribute: [...],
      }
    }
  }],
} as const;
```

### Type Resolution

- `$imports` links schemas for cross-schema type resolution
- `base: "abapoo:AbapOoObject"` resolves to `AbapOoObject` interface
- Namespace prefixes are stripped during resolution

## Common Tasks

### Adding a New SAP Schema

1. **Add XSD** to `.xsd/model/sap/`
2. **Update config** in generation script
3. **Generate**: `npx nx run adt-schemas:generate`
4. **Add typed wrapper** in `generated/index.ts`:
   ```typescript
   import _newschema from './schemas/sap/newschema';
   import type { NewSchemaType } from './types';
   export const newschema = typed<NewSchemaType>(_newschema);
   ```
5. **Add test scenario** (mandatory)

### Adding a Custom Schema (ABAP XML)

1. **Create schema** in `src/schemas/generated/schemas/custom/`:
   ```typescript
   export default {
     $xmlns: { asx: "http://www.sap.com/abapxml" },
     targetNamespace: "http://www.sap.com/abapxml",
     element: [{ name: "abap", type: "Abap" }],
     complexType: [{
       name: "Abap",
       sequence: { element: [...] },
       attribute: [{ name: "version", type: "xs:string" }],
     }],
   } as const;  // CRITICAL!
   ```
2. **Add type** to `types/index.ts`
3. **Add typed wrapper** in `generated/index.ts`
4. **Add test scenario** (mandatory)

### Regenerating All Schemas

```bash
# Full pipeline
npx nx run adt-schemas:generate

# Individual steps
npx nx run adt-schemas:download   # Download XSD
npx nx run adt-schemas:codegen    # Generate literals
npx nx run adt-schemas:types      # Generate interfaces
```

## Testing

```bash
# Run all tests
npx nx test adt-schemas

# Run specific test
npx vitest run tests/scenarios.test.ts
```

### Test Scenario Template

```typescript
// tests/scenarios/myschema.ts
import { expect } from 'vitest';
import { Scenario, type SchemaType } from './base/scenario';
import { mySchema } from '../../src/schemas/index';

export class MySchemaScenario extends Scenario<typeof mySchema> {
  readonly schema = mySchema;
  readonly fixtures = ['myschema.xml'];

  validateParsed(data: SchemaType<typeof mySchema>): void {
    expect(data.name).toBe('expected');
    expect(data.nested?.child).toBeDefined();
  }

  validateBuilt(xml: string): void {
    expect(xml).toContain('xmlns:ns="http://...');
  }
}
```

## Common Mistakes

| Mistake                 | Consequence             | Prevention                |
| ----------------------- | ----------------------- | ------------------------- |
| Editing generated files | Lost on regeneration    | Fix generator instead     |
| Missing `as const`      | Type inference fails    | Always add `as const`     |
| No test scenario        | Regressions undetected  | Add test for every schema |
| Wrong namespace prefix  | Parse/build fails       | Check SAP XSD             |
| Missing `$imports`      | Cross-schema types fail | Link all dependencies     |

## Type Hierarchy

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

## Dependencies

- `@abapify/ts-xsd` - Core XSD parser and type inference
- `speci` - REST contract library (peer)

## Reference

- [README.md](./README.md) - Full package documentation
- [ts-xsd](../ts-xsd/README.md) - Core library
- [SAP ADT Documentation](https://help.sap.com/docs/)
