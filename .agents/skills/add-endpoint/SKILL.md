---
name: add-endpoint
description: Add a new ADT endpoint call (schema + contract + fixture). USE WHEN the user wants to add support for a new SAP ADT REST endpoint, add a new schema, or add a new API contract. Trigger words - new endpoint, add endpoint, new schema, add contract, support endpoint, SAP ADT API.
---

# Add a New ADT Endpoint

This skill guides adding support for a new SAP ADT REST endpoint. It covers schema definition, contract creation, fixture registration, and integration into the contract index.

## Overview of the Layers

```
SAP ADT endpoint (HTTP)
    ↓
adt-schemas    packages/adt-schemas/src/schemas/generated/
               • Schema literal (TypeScript `as const` object from XSD)
               • Typed wrapper in typed.ts
    ↓
adt-contracts  packages/adt-contracts/src/
               • generated/schemas.ts   (toSpeciSchema wrapper)
               • adt/{module}/{file}.ts  (contract definition)
               • adt/{module}/index.ts  (module exports + aggregate)
    ↓
adt-fixtures   packages/adt-fixtures/src/
               • fixtures/{module}/{name}.xml  (real SAP XML sample)
               • fixtures/registry.ts          (path registration)
```

---

## Step 1: Gather Endpoint Information

Before writing any code, obtain the endpoint's HTTP details and XML payload structure.

> **Tip:** If the endpoint is undocumented or you need to research it first, use `$adt-reverse-engineering` for systematic discovery via live system, open source projects, and Sourcegraph code search.

### Option A: Live System Available

If you have a running SAP system connection:

1. Make a real HTTP request to the endpoint and capture the response XML:
   ```bash
   # Example using curl or adt-cli:
   # GET /sap/bc/adt/{path}/{objectname}
   ```
2. Save the raw response to `tmp/` for reference (see [tmp-folder-testing](../../rules/development/tmp-folder-testing.md)):
   ```bash
   # adt get ZOBJECT_NAME -o tmp/response.xml
   ```
3. Use the actual XML to design the schema and write the fixture.

### Option B: No Live System — Web Research

If no system connection is available, research the endpoint:

1. **Search SAP ADT documentation and community resources:**
   - SAP Help Portal: https://help.sap.com/docs/abap-cloud/abap-development-tools-user-guide
   - abapGit source (has XSD/schema reference implementations): https://github.com/abapGit/abapGit
   - SAP ADT API examples: search GitHub for `sap/bc/adt/{your-path}`
   - Eclipse ADT plugin source: https://github.com/SAP/abap-adt-api

2. **Search for XSD schema definitions:**
   - Look in the existing XSD files under `packages/adt-schemas/` for similar patterns
   - Search the abapGit repository for matching serializer names or object types

3. **Look at similar existing schemas** in `packages/adt-schemas/src/schemas/generated/schemas/sap/` for structural patterns.

4. **Construct a representative XML fixture** based on research, clearly marked as synthesized:
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <!-- Source: GET /sap/bc/adt/{your-path}/{name} -->
   <!-- Note: Synthesized from documentation/research - verify against live system -->
   ```

---

## Step 2: Create the Schema in adt-schemas

Schemas live in `packages/adt-schemas/src/schemas/generated/schemas/`.

### 2a: Add the schema literal

Create `packages/adt-schemas/src/schemas/generated/schemas/sap/{schemaName}.ts`:

> **Note on the `Source:` comment:** Existing generated files reference `xsd/sap/{name}.xsd` pointing to XSD sources in `packages/adt-schemas/.xsd/`. For manually created schemas (derived from a live system response or research), use a descriptive comment instead.

```typescript
/**
 * Schema for {description}
 *
 * Manually created — derived from live system response / research
 * Reference: GET /sap/bc/adt/{your-path}
 */

// Import dependencies (only schemas you actually use)
import adtcore from './adtcore';

export default {
  $xmlns: {
    adtcore: 'http://www.sap.com/adt/core',
    xsd: 'http://www.w3.org/2001/XMLSchema',
    myns: 'http://www.sap.com/adt/my-namespace', // ← your namespace
  },
  $imports: [adtcore],
  targetNamespace: 'http://www.sap.com/adt/my-namespace',
  attributeFormDefault: 'qualified',
  elementFormDefault: 'qualified',
  element: [
    {
      name: 'myRootElement', // ← root element name (camelCase)
      type: 'myns:MyRootType',
    },
  ],
  complexType: [
    {
      name: 'MyRootType',
      complexContent: {
        extension: {
          base: 'adtcore:AdtMainObject', // ← extend appropriate base type
          sequence: {
            element: [
              {
                name: 'myChild',
                type: 'xsd:string',
                minOccurs: '0',
              },
            ],
          },
          attribute: [
            {
              name: 'myAttr',
              type: 'xsd:string',
            },
          ],
        },
      },
    },
  ],
} as const;
```

**Key rules for schema literals:**

> See [xsd-best-practices](../../rules/adt/xsd-best-practices.md) for XSD validity rules and edge cases.

- Must end with `} as const`
- One root element per schema document
- Use `$imports` for schemas you depend on (adtcore, abapoo, abapsource, etc.)
- Names follow XSD conventions: `complexType` names are PascalCase
- Look at existing schemas (e.g. `interfaces.ts`, `packagesV1.ts`) for common base types
- Existing schemas were auto-generated from XSD sources in `packages/adt-schemas/.xsd/`; manually created schemas should be documented accordingly (see [file-lifecycle](../../rules/development/file-lifecycle.md))

### 2b: Add the typed wrapper in typed.ts

Edit `packages/adt-schemas/src/schemas/generated/typed.ts` and add your schema:

```typescript
// Add the type import at the top with other imports:
import type { MySchemaNameSchema } from './types/sap/mySchemaName.types';

// Add the raw schema import and typed export in the SAP schemas section:
import _mySchemaName from './schemas/sap/mySchemaName';
export const mySchemaName: TypedSchema<MySchemaNameSchema> =
  typedSchema<MySchemaNameSchema>(_mySchemaName);
```

> **Note on types**: The `types/` files are auto-generated from XSD schemas by the codegen tool. For manually created schemas, you can either:
>
> - Run `npx nx build adt-schemas` to trigger codegen (if XSD source exists)
> - Or manually create a minimal types file at `packages/adt-schemas/src/schemas/generated/types/sap/mySchemaName.types.ts` following the pattern of existing types files.

---

## Step 3: Add the Schema to adt-contracts

Edit `packages/adt-contracts/src/generated/schemas.ts` to add the `toSpeciSchema` wrapper:

```typescript
// Add in alphabetical order with existing entries:
export const mySchemaName = toSpeciSchema(adtSchemas.mySchemaName);
```

This wraps the typed schema to make it speci-compatible (adds `_infer` property for response type inference).

---

## Step 4: Create the Contract

Contracts live in `packages/adt-contracts/src/adt/{module}/`. Choose the appropriate module or create a new one.

### Simple GET contract (non-CRUD, like packages):

Create `packages/adt-contracts/src/adt/{module}/{name}.ts`:

```typescript
/**
 * ADT {Module} - {Description} Contract
 *
 * Endpoint: /sap/bc/adt/{your-path}
 * {description of what this endpoint does}
 */

import { http } from '../../base';
import { mySchemaName, type InferTypedSchema } from '../../schemas';

/**
 * Response type for consumers (ADK, etc.)
 */
export type MyObjectResponse = InferTypedSchema<typeof mySchemaName>;

export const myObjectContract = {
  /**
   * Get {object description}
   *
   * @param name - Object name (will be URL-encoded)
   * @returns {what is returned}
   *
   * Note: SAP ADT URLs use lowercase object names (ABAP objects are case-insensitive
   * in URLs, and SAP conventionally normalizes to lowercase in the URL path).
   */
  get: (name: string) =>
    http.get(
      `/sap/bc/adt/{your-path}/${encodeURIComponent(name.toLowerCase())}`,
      {
        responses: { 200: mySchemaName },
        headers: { Accept: 'application/vnd.sap.adt.{mimetype}.v1+xml' },
      },
    ),
};

export type MyObjectContract = typeof myObjectContract;
```

### Full CRUD contract (like classes, interfaces):

```typescript
/**
 * ADT {Module} Contract
 *
 * Endpoint: /sap/bc/adt/{your-path}
 */

import { crud } from '../../base';
import { mySchemaName, type InferTypedSchema } from '../../schemas';

export type MyObjectResponse = InferTypedSchema<typeof mySchemaName>;

/**
 * Full CRUD operations for {object type}
 *
 * Includes: get, post, put, delete, lock, unlock, objectstructure
 * Sources: source.main.get/put
 */
export const myObjectContract = crud({
  basePath: '/sap/bc/adt/{your-path}',
  schema: mySchemaName,
  contentType: 'application/vnd.sap.adt.{mimetype}.v1+xml',
  sources: ['main'] as const,
  // For objects with multiple includes:
  // includes: ['definitions', 'implementations', 'macros'] as const,
});

export type MyObjectContractType = typeof myObjectContract;
```

### Create or update the module index

If adding to an existing module (e.g., `oo`), edit `packages/adt-contracts/src/adt/{module}/index.ts`:

```typescript
// Re-export new contract
export {
  myObjectContract,
  type MyObjectContractType,
  type MyObjectResponse,
} from './myObject';

// Import for aggregated contract
import { myObjectContract } from './myObject';

// Update the module interface:
export interface OoContract {
  classes: typeof classesContract;
  interfaces: typeof interfacesContract;
  myObject: typeof myObjectContract; // ← add here
}

// Update the module aggregate:
export const ooContract: OoContract = {
  classes: classesContract,
  interfaces: interfacesContract,
  myObject: myObjectContract, // ← add here
};
```

If creating a new module, also register it in `packages/adt-contracts/src/adt/index.ts`:

```typescript
// Add export
export * from './myModule';

// Import for aggregate
import { myModuleContract, type MyModuleContract } from './myModule';

// Add to AdtContract interface
export interface AdtContract {
  // ... existing modules ...
  myModule: MyModuleContract;
}

// Add to adtContract object
export const adtContract: AdtContract = {
  // ... existing modules ...
  myModule: myModuleContract,
};
```

---

## Step 5: Add a Fixture

Fixtures are real (or representative) SAP XML responses used in tests.

### 5a: Create the fixture file

Create `packages/adt-fixtures/src/fixtures/{module}/{name}.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!-- Source: GET /sap/bc/adt/{your-path}/{name} -->
<myns:myRootElement
        xmlns:myns="http://www.sap.com/adt/my-namespace"
        xmlns:adtcore="http://www.sap.com/adt/core"
        myns:myAttr="someValue"
        adtcore:name="ZTEST_OBJECT"
        adtcore:type="MYTYPE/OC"
        adtcore:description="Test object for fixtures">
    <adtcore:packageRef
            adtcore:uri="/sap/bc/adt/packages/%24tmp"
            adtcore:type="DEVC/K"
            adtcore:name="$TMP" />
</myns:myRootElement>
```

**Tips for realistic fixtures:**

- Use `ZTEST_` or `$TMP` names (standard test object convention in SAP)
- Include all namespace declarations (`xmlns:`)
- Match the exact XML structure the schema expects
- Include representative values (not empty)

### 5b: Register the fixture

Edit `packages/adt-fixtures/src/fixtures/registry.ts`:

```typescript
export const registry = {
  // ... existing entries ...
  myModule: {
    myObject: 'myModule/myObject.xml',
  },
  // Or add to existing group:
  oo: {
    class: 'oo/class.xml',
    interface: 'oo/interface.xml',
    myObject: 'oo/myObject.xml', // ← add here
  },
} as const;
```

---

## Step 6: Build and Verify

> Follow the verification checklist in [after-changes](../../rules/verification/after-changes.md).

```bash
# Build affected packages in dependency order
bunx nx build adt-schemas
bunx nx build adt-contracts
bunx nx build adt-fixtures

# Type check, test, lint
bunx nx typecheck
bunx nx test adt-schemas adt-contracts
bunx nx lint
```

### Quick smoke test (optional)

Add a minimal test alongside your contract to verify parsing works:

```typescript
// packages/adt-schemas/src/schemas/generated/schemas/sap/__tests__/mySchemaName.test.ts
import { describe, it, expect } from 'vitest';
import { fixtures } from '@abapify/adt-fixtures';
import { mySchemaName } from '../..';

describe('mySchemaName schema', () => {
  it('parses fixture XML', async () => {
    const xml = await fixtures.myModule.myObject.load();
    const data = mySchemaName.parse(xml);
    expect(data).toBeDefined();
    // Check a specific field:
    // expect(data.myRootElement?.['adtcore:name']).toBe('ZTEST_OBJECT');
  });
});
```

---

## Common Patterns Reference

### Base types to extend (from adtcore.ts)

| Base type                     | Purpose                                                    |
| ----------------------------- | ---------------------------------------------------------- |
| `adtcore:AdtObject`           | Any ADT object (name, type, description, version, links)   |
| `adtcore:AdtMainObject`       | Repository object (+ package, responsible, masterLanguage) |
| `abapoo:AbapOoObject`         | OO base (+ modeled, syntaxConfiguration)                   |
| `abapsource:AbapSourceObject` | Source-enabled object (+ sourceUri, fixPointArithmetic)    |

### Namespace URIs (for `$xmlns`)

| Prefix       | URI                                 |
| ------------ | ----------------------------------- |
| `adtcore`    | `http://www.sap.com/adt/core`       |
| `abapsource` | `http://www.sap.com/adt/abapsource` |
| `abapoo`     | `http://www.sap.com/adt/oo`         |
| `atom`       | `http://www.w3.org/2005/Atom`       |
| `xsd`        | `http://www.w3.org/2001/XMLSchema`  |

### Content-Type patterns for SAP ADT

```
application/vnd.sap.adt.oo.classes.v4+xml
application/vnd.sap.adt.oo.interfaces.v5+xml
application/vnd.sap.adt.packages.v1+xml
application/vnd.sap.adt.{object-type}.v{version}+xml
```

### URL patterns for SAP ADT

```
/sap/bc/adt/oo/classes/{name}          → OO classes
/sap/bc/adt/oo/interfaces/{name}       → OO interfaces
/sap/bc/adt/packages/{name}            → Packages
/sap/bc/adt/cts/transportrequests/{id} → Transport requests
/sap/bc/adt/programs/programs/{name}   → Programs
/sap/bc/adt/ddic/tables/{name}         → Database tables
/sap/bc/adt/ddic/domains/{name}        → Domains
/sap/bc/adt/ddic/dataelements/{name}   → Data elements
/sap/bc/adt/ddic/structures/{name}     → Structures
/sap/bc/adt/functions/groups/{name}    → Function groups
```

---

## Checklist

- [ ] Endpoint details gathered (live system or web research)
- [ ] Schema literal created in `adt-schemas/src/schemas/generated/schemas/sap/`
- [ ] Typed wrapper added to `adt-schemas/src/schemas/generated/typed.ts`
- [ ] `toSpeciSchema` export added to `adt-contracts/src/generated/schemas.ts`
- [ ] Contract created in `adt-contracts/src/adt/{module}/`
- [ ] Module index updated (or new module registered in main `adt/index.ts`)
- [ ] Fixture XML created in `adt-fixtures/src/fixtures/{module}/`
- [ ] Fixture registered in `adt-fixtures/src/fixtures/registry.ts`
- [ ] `bunx nx build adt-schemas adt-contracts adt-fixtures` passes
- [ ] `bunx nx typecheck` passes
- [ ] `bunx nx test adt-schemas adt-contracts` passes
