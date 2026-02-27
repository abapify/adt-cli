# ADT Schema Creation Workflow

Create type-safe ADT schemas from XSD or manual definitions.

## Fundamental Concepts

### What is ts-xsd?

**ts-xsd is XSD schema written in TypeScript** - it's not just a code generator, it's a complete type system that mirrors XSD semantics:

- **Full type inference** - TypeScript infers exact types from schema definition
- **Round-trip capability** - `parse(xml) → object` and `build(object) → xml`
- **XSD semantics** - Supports sequences, choices, attributes, extensions, includes
- **Compile-time safety** - Type errors caught at build time, not runtime

```typescript
// Schema definition IS the type definition
const schema = {
  elements: {
    Person: {
      sequence: [
        { name: 'name', type: 'string' },
        { name: 'age', type: 'number' },
      ],
    },
  },
} as const;

// TypeScript infers: { name: string; age: number }
type Person = InferXsd<typeof schema, 'Person'>;
```

### What is speci?

**speci** is the schema factory that adds parse/build methods to ts-xsd schemas:

- Wraps raw schema definition with runtime functionality
- Provides `schema.parse(xml)` and `schema.build(obj)` methods
- Requires specific type structure for inference to work
- All ADT schemas MUST be speci-compatible

```typescript
import schema from '../../speci';

// speci wraps the definition and adds parse/build
export default schema({
  ns: 'http://www.sap.com/adt/...',
  root: 'MyRoot',
  elements: {
    /* ... */
  },
} as const); // as const is REQUIRED for type inference!
```

### Why `as const`?

Without `as const`, TypeScript widens literal types:

```typescript
// WITHOUT as const - types are widened
const bad = { name: 'foo', type: 'string' }; // type: { name: string; type: string }

// WITH as const - literal types preserved
const good = { name: 'foo', type: 'string' } as const; // type: { name: 'foo'; type: 'string' }
```

speci needs literal types to infer the correct TypeScript types from schema definitions.

## Usage

```bash
/adt-schema <schema_name>
```

**Example:** `/adt-schema transportmanagment`

## Prerequisites

- Sample XML from SAP system
- XSD file (if available from SAP SDK)

## Workflow Steps

### Step 1: Capture Sample XML

**Goal:** Get real XML responses from SAP for the endpoint.

**Actions:**

1. Use ADT CLI to fetch sample data:
   ```bash
   npx adt fetch /sap/bc/adt/{endpoint} --raw > sample.xml
   ```
2. Capture multiple variants:
   - Single object response
   - Collection/list response
   - Create request body
   - Update request body
   - Error responses
3. Save samples to `adt-schemas-xsd/tests/scenarios/fixtures/`

**Output:** XML sample files for testing

### Step 2: Determine Schema Source

**Decision tree:**

1. **XSD exists in SAP SDK?**
   - Yes → Use generated schema (Step 3a)
   - No → Check XML format

2. **XML format?**
   - Standard ADT XML → Create manual schema (Step 3b)
   - ABAP XML (`asx:abap`) → Create ABAP XML schema (Step 3c)

### Step 3a: Generate Schema from XSD

**When:** XSD file available in SAP SDK.

**Actions:**

1. Download XSD to `.xsd/model/`:
   ```bash
   npx nx run adt-schemas-xsd:download
   ```
2. Add schema to `tsxsd.config.ts`:
   ```typescript
   const schemas = {
     // ... existing
     myschema: { root: 'MyRootElement' },
   };
   ```
3. Generate:
   ```bash
   npx nx run adt-schemas-xsd:generate
   ```
4. Verify generated file in `src/schemas/generated/sap/`

#### 🚨 CRITICAL: Never Modify Generated Files

**Generated schemas are READ-ONLY.** If a generated schema is incorrect:

1. **NEVER edit files in `src/schemas/generated/`** - changes will be overwritten
2. **Fix the generator** in `ts-xsd/src/codegen/` instead
3. **Requires user confirmation** before modifying ts-xsd generator
4. **Full ts-xsd test coverage required** - all existing tests must pass
5. Regenerate: `npx nx run adt-schemas-xsd:generate`

```bash
# If generator change needed:
# 1. Get user confirmation
# 2. Modify ts-xsd/src/codegen/
# 3. Run full ts-xsd tests: npx nx test ts-xsd
# 4. Regenerate schemas: npx nx run adt-schemas-xsd:generate
# 5. Run schema tests: npx nx test adt-schemas-xsd
```

### Step 3b: Create Manual Schema (Standard ADT XML)

**When:** No XSD, standard ADT XML format.

**Location:** `adt-schemas-xsd/src/schemas/manual/`

**Pattern:**

```typescript
// src/schemas/manual/myschema.ts
import schema from '../../speci';

export default schema({
  ns: 'http://www.sap.com/adt/myarea',
  prefix: 'myprefix',
  root: 'MyRootElement',
  include: [
    /* imported schemas */
  ],
  elements: {
    MyRootElement: {
      sequence: [
        { name: 'child1', type: 'string' },
        { name: 'child2', type: 'Child2Type' },
      ],
      attributes: [{ name: 'attr1', type: 'string' }],
    },
    Child2Type: {
      sequence: [
        /* ... */
      ],
    },
  },
} as const); // CRITICAL: as const for type inference
```

### Step 3c: Create ABAP XML Schema

**When:** XML uses `asx:abap` envelope format.

**Key rules:**

1. **ALWAYS use `as const`** - Critical for TypeScript type inference
2. **Element names WITHOUT namespace prefix** - Use `'abap'`, not `'asx:abap'`
3. **Root element content is parsed directly** - No wrapper in result

**Pattern:**

```typescript
// src/schemas/manual/myabapschema.ts
import schema from '../../speci';

export default schema({
  ns: 'http://www.sap.com/abapxml',
  prefix: 'asx',
  root: 'abap', // WITHOUT prefix!
  elements: {
    abap: {
      sequence: [{ name: 'values', type: 'values' }],
      attributes: [{ name: 'version', type: 'string' }],
    },
    values: {
      sequence: [{ name: 'DATA', type: 'DATA' }],
    },
    DATA: {
      sequence: [
        { name: 'FIELD1', type: 'string' },
        { name: 'FIELD2', type: 'number' },
      ],
    },
  },
} as const); // CRITICAL!
```

### Step 4: Export Schema

**Actions:**

1. Add export to `src/schemas/index.ts`:

   ```typescript
   // For generated schemas - usually auto-exported
   export * from './generated/sap';

   // For manual schemas
   export { default as myschema } from './manual/myschema';
   ```

### Step 5: Create Test Scenario (MANDATORY)

**Location:** `adt-schemas-xsd/tests/scenarios/`

#### 🚨 CRITICAL: Tests Must Be Fully Typed

**All tests must have full type checking** - not just runtime assertions:

1. **TypeScript must compile** - `tsc --noEmit` must pass
2. **No `any` types** - all variables must be properly typed
3. **Type inference verified** - accessing properties validates schema correctness
4. **SchemaType<S> required** - use the type helper for parsed data

**Pattern:**

```typescript
// tests/scenarios/myschema.ts
import { expect } from 'vitest';
import { Scenario, type SchemaType } from './base/scenario';
import { myschema } from '../../src/schemas/index';

export class MySchemaScenario extends Scenario<typeof myschema> {
  readonly schema = myschema;
  readonly fixtures = ['myschema.xml']; // In fixtures/ folder

  validateParsed(data: SchemaType<typeof myschema>): void {
    // Type-safe assertions - TypeScript validates property access!
    // If schema is wrong, this won't compile
    expect(data.someField).toBeDefined();
    expect(data.nested?.child).toBe('expected');

    // ❌ This would cause compile error if 'wrongField' not in schema:
    // expect(data.wrongField).toBeDefined();
  }

  validateBuilt(xml: string): void {
    expect(xml).toContain('xmlns:');
    expect(xml).toContain('<MyRootElement');
  }
}
```

**Register scenario:**

```typescript
// tests/scenarios/index.ts
import { MySchemaScenario } from './myschema';
export const SCENARIOS = [...existing, new MySchemaScenario()];
```

### Step 6: Run Tests AND Type Check

```bash
# Run tests
npx nx test adt-schemas-xsd

# ALSO run type check - MANDATORY
npx tsc --noEmit -p packages/adt-schemas-xsd
```

**Verify:**

- Schema parses sample XML correctly
- **Type check passes** (compile-time verification)
- Type inference works (accessing wrong properties = compile error)
- Round-trip (parse → build → parse) produces same result

## Checklist

- [ ] Sample XML captured from SAP
- [ ] Schema created (generated or manual)
- [ ] `as const` used for type inference
- [ ] Exported from index.ts
- [ ] Test scenario created with fixture
- [ ] Tests passing: `npx nx test adt-schemas-xsd`
- [ ] **Type check passing: `npx tsc --noEmit`**
- [ ] Round-trip verified (parse → build → parse)

## Output

- Schema file in `adt-schemas-xsd/src/schemas/`
- Test scenario in `adt-schemas-xsd/tests/scenarios/`
- Fixture file in `adt-schemas-xsd/tests/scenarios/fixtures/`

## Related

- `/adt-adk` - Full object type implementation
- `/adt-contract` - Contract creation (uses schema)
