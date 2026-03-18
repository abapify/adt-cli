---
name: add-object-type
description: Add a new ABAP object type with full ADK model and abapGit serialization support. USE WHEN adding a new ABAP type (PROG, FUGR, TABL, DOMA, DTEL, MSAG, etc.), ADK support, or abapGit handler. Trigger words - new object type, add object type, support PROG, add abapGit handler.
---

# Add a New ABAP Object Type

This skill guides adding full support for a new ABAP object type. It covers all layers: ADT endpoint (schema + contract + fixture), ADK model, and abapGit serialization handler.

## Overview of All Layers

```
ABAP Object Type (e.g., PROG/P, FUGR/F, TABL/DT)
    ↓
adt-schemas    Schema literal + typed wrapper
adt-contracts  Contract (CRUD or simple GET) for the ADT endpoint
adt-fixtures   XML fixture for tests
    ↓
adk            ADK kind constant + object model class
    ↓
adt-plugin-abapgit   abapGit schema literal + TypeScript types + handler
```

---

## Step 1: Gather Object Type Information

Before writing code, gather details about the object type from live system or research.

> **Tip:** For undocumented object types, use `$adt-reverse-engineering` first to systematically discover endpoint details, XML structure, and content-types via live system discovery, open source projects, and Sourcegraph code search.

### Information to collect

| Item                     | Example (for PROG)                                 | Where to find                 |
| ------------------------ | -------------------------------------------------- | ----------------------------- |
| ADT object type          | `PROG/P`                                           | SAP ADT documentation         |
| ADT endpoint path        | `/sap/bc/adt/programs/programs`                    | Live system or community      |
| ADT content-type         | `application/vnd.sap.adt.programs.programs.v2+xml` | Live system response headers  |
| ADT XML namespace        | `http://www.sap.com/adt/programs`                  | Live system XML               |
| ADT root element         | `abapProgram`                                      | Live system XML               |
| abapGit serializer       | `LCL_OBJECT_PROG`                                  | abapGit source                |
| abapGit main table       | `TRDIR`                                            | abapGit source                |
| abapGit structure fields | `NAME, SECU, EDTX, ...`                            | SAP DDIC / abapGit XML sample |
| Has source code          | Yes (`.abap` file)                                 | abapGit repo samples          |

### Option A: Live System Available

```bash
# Capture the ADT XML response:
# GET /sap/bc/adt/{path}/{objectname}
# → save to tmp/response.xml

# Capture a real abapGit XML file:
# Check a .prog.xml file from a real abapGit repository
```

### Option B: No Live System — Web Research

1. **ADT endpoint details:**
   - SAP Help Portal: https://help.sap.com/docs/abap-cloud/abap-development-tools-user-guide
   - Search GitHub for `sap/bc/adt/{path}` to find client implementations
   - Look at `packages/adt-schemas/src/schemas/generated/schemas/sap/` for existing patterns

2. **abapGit serializer and schema:**
   - abapGit repository: https://github.com/abapGit/abapGit
   - Look in `src/objects/` for the relevant handler class (`ZCL_ABAPGIT_OBJECT_{TYPE}`)
   - Find `.abap` or `.xml` sample files in abapGit test fixtures
   - Search abapGit issues/PRs for the object type

3. **SAP DDIC table structure:**
   - abapGit XML files reveal the exact fields used
   - SAP community/SE11 screenshots often available online

---

## Step 2: Create the ADT Schema and Contract

Follow the full **$add-endpoint** skill for this step. Here is a summary specific to object types:

> **Rules:** See [xsd-best-practices](../../rules/adt/xsd-best-practices.md) for XSD validity, [file-lifecycle](../../rules/development/file-lifecycle.md) for generated vs hand-maintained files, and [adt-ddic-mapping](../../rules/adt/adt-ddic-mapping.md) for DDIC object specifics.

### Schema (adt-schemas)

Create `packages/adt-schemas/src/schemas/generated/schemas/sap/{schemaName}.ts`:

```typescript
/**
 * Schema for {description}
 *
 * Manually created — derived from live system response / research
 * Reference: GET /sap/bc/adt/{your-path}
 * (XSD source files for adt-schemas live in packages/adt-schemas/.xsd/)
 */

import adtcore from './adtcore';
import abapsource from './abapsource';

export default {
  $xmlns: {
    adtcore: 'http://www.sap.com/adt/core',
    abapsource: 'http://www.sap.com/adt/abapsource',
    xsd: 'http://www.w3.org/2001/XMLSchema',
    prog: 'http://www.sap.com/adt/programs', // ← your namespace
  },
  $imports: [adtcore, abapsource],
  targetNamespace: 'http://www.sap.com/adt/programs',
  attributeFormDefault: 'qualified',
  elementFormDefault: 'qualified',
  element: [
    {
      name: 'abapProgram', // ← root element name
      type: 'prog:AbapProgram',
    },
  ],
  complexType: [
    {
      name: 'AbapProgram',
      complexContent: {
        extension: {
          base: 'abapsource:AbapSourceMainObject',
          attribute: [
            {
              name: 'programType',
              type: 'xsd:string',
            },
          ],
        },
      },
    },
  ],
} as const;
```

Then add to `packages/adt-schemas/src/schemas/generated/typed.ts`:

```typescript
import type { AbapProgramSchema } from './types/sap/abapProgram.types';
import _abapProgram from './schemas/sap/abapProgram';
export const abapProgram: TypedSchema<AbapProgramSchema> =
  typedSchema<AbapProgramSchema>(_abapProgram);
```

And add to `packages/adt-contracts/src/generated/schemas.ts`:

```typescript
export const abapProgram = toSpeciSchema(adtSchemas.abapProgram);
```

### Contract (adt-contracts)

Create `packages/adt-contracts/src/adt/{module}/{name}.ts`:

```typescript
/**
 * ADT Programs Contract
 * Endpoint: /sap/bc/adt/programs/programs
 */

import { crud } from '../../base';
import { abapProgram, type InferTypedSchema } from '../../schemas';

export type ProgramResponse = InferTypedSchema<typeof abapProgram>;

export const programsContract = crud({
  basePath: '/sap/bc/adt/programs/programs',
  schema: abapProgram,
  contentType: 'application/vnd.sap.adt.programs.programs.v2+xml',
  sources: ['main'] as const,
});

export type ProgramsContract = typeof programsContract;
```

Register in the module index (create new module or add to existing).

### Fixture (adt-fixtures)

Create `packages/adt-fixtures/src/fixtures/{module}/{name}.xml` and register in `registry.ts`.

---

## Step 3: Add ADK Kind

Edit `packages/adk/src/base/kinds.ts` to add the new kind constant:

```typescript
// Repository Objects — add new repository (ABAP) object types here.
// CTS objects (transport, tasks) go in a different section.
export const Package = 'Package' as const;
export const Class = 'Class' as const;
export const Interface = 'Interface' as const;
export const Program = 'Program' as const; // ← add your kind here, alphabetically

// Update the AdkKind union type:
export type AdkKind =
  | typeof TransportRequest
  | typeof TransportTask
  | typeof Package
  | typeof Class
  | typeof Interface
  | typeof Program; // ← add here
// ...
```

---

## Step 4: Create the ADK Object Model

Create the directory and files for the new object type:

```
packages/adk/src/objects/repository/{typeLower}/
├── {typeLower}.model.ts   ← ADK class
├── {typeLower}.types.ts   ← Type definitions
└── index.ts               ← Re-exports
```

### {typeLower}.types.ts

```typescript
/**
 * PROG - ABAP Program
 * Type definitions
 */

// Source types for this object (if it has multiple includes)
export type ProgramIncludeType = 'main';
// For objects with multiple includes, add more types:
// export type ClassIncludeType = 'main' | 'definitions' | 'implementations' | 'testclasses';
```

### {typeLower}.model.ts

```typescript
/**
 * PROG - ABAP Program
 *
 * ADK object for ABAP programs (PROG).
 */

import { AdkMainObject } from '../../../base/model';
import { Program as ProgramKind } from '../../../base/kinds';
import { getGlobalContext } from '../../../base/global-context';
import type { AdkContext } from '../../../base/context';

// Import response type from ADT integration layer
import type { ProgramResponse } from '../../../base/adt';

/**
 * Program data type - unwrap from root element
 */
export type ProgramXml = ProgramResponse['abapProgram'];

/**
 * ADK Program object
 */
export class AdkProgram extends AdkMainObject<typeof ProgramKind, ProgramXml> {
  static readonly kind = ProgramKind;
  readonly kind = AdkProgram.kind;

  // ADT object URI
  get objectUri(): string {
    return `/sap/bc/adt/programs/programs/${encodeURIComponent(this.name.toLowerCase())}`;
  }

  // Source code access
  async getSource(): Promise<string> {
    return this.lazy('source', async () => {
      return this.crudContract.source.main.get(this.name);
    });
  }

  // ============================================
  // CRUD contract config - enables save()
  // ============================================

  protected override get wrapperKey() {
    return 'abapProgram';
  }
  // Note: `any` return type is intentional here — this is an established pattern
  // in the ADK codebase (see clas.model.ts, intf.model.ts). The base class defines
  // crudContract as `any` to support different contract structures per object type.
  protected override get crudContract(): any {
    return this.ctx.client.adt.programs.programs; // ← your module path
  }

  // ============================================
  // Static Factory Method
  // ============================================

  static async get(name: string, ctx?: AdkContext): Promise<AdkProgram> {
    const context = ctx ?? getGlobalContext();
    return new AdkProgram(context, name).load();
  }
}

// Self-register with ADK registry
import { registerObjectType } from '../../../base/registry';
registerObjectType('PROG', ProgramKind, AdkProgram);
```

**For objects with source code**, also implement the save lifecycle methods:

```typescript
  // ============================================
  // Source Save Lifecycle (required for source-based objects)
  // ============================================

  /**
   * Save pending source (set via _pendingSource)
   * Used by export workflow after deserialization from abapGit
   */
  protected override async savePendingSources(options?: {
    lockHandle?: string;
    transport?: string;
  }): Promise<void> {
    const pendingSource = (this as unknown as { _pendingSource?: string })
      ._pendingSource;
    if (!pendingSource) return;

    await this.saveMainSource(pendingSource, options);

    // Clear pending source after save
    delete (this as unknown as { _pendingSource?: string })._pendingSource;
  }

  /**
   * Pre-lock comparison: check if pending source matches SAP
   * If identical, sets _unchanged = true so save() skips locking and PUT
   */
  protected override async checkPendingSourcesUnchanged(): Promise<void> {
    const pendingSource = (this as unknown as { _pendingSource?: string })
      ._pendingSource;
    if (!pendingSource) return;

    try {
      const currentSource = await this.getSource();
      if (this.normalizeSource(currentSource) === this.normalizeSource(pendingSource)) {
        this._unchanged = true;
        delete (this as unknown as { _pendingSource?: string })._pendingSource;
      }
    } catch {
      // Source doesn't exist on SAP (404) — needs saving
    }
  }

  private normalizeSource(source: string): string {
    return source.replace(/\s+$/gm, '').trimEnd();
  }

  protected override hasPendingSources(): boolean {
    return !!(this as unknown as { _pendingSource?: string })._pendingSource;
  }
```

**IMPORTANT:** Both `savePendingSources()` AND `checkPendingSourcesUnchanged()` must be implemented.

> See [adk-save-logic](../../rules/adt/adk-save-logic.md) for edge cases around upsert, lock failures (405), and 422 "already exists" handling.

- `checkPendingSourcesUnchanged()` runs **before** lock — compares pending source with SAP, sets `_unchanged = true` if identical
- `savePendingSources()` runs **after** lock — does the actual PUT
- Without `checkPendingSourcesUnchanged()`, unchanged objects will still be locked and PUT unnecessarily
- See `AdkClass` (clas.model.ts) for multi-include example, `AdkInterface` (intf.model.ts) for single-source example

**Notes:**

- The `wrapperKey` matches the root element name in the schema (e.g., `abapProgram`)
- The `crudContract` path must match where you registered the contract in `adtContract` (e.g., `ctx.client.adt.programs.programs`)
- `registerObjectType('PROG', ...)` uses the 4-letter ABAP type code (not the full `PROG/P`)

### index.ts

```typescript
export { AdkProgram } from './program.model';
export type { ProgramXml } from './program.model';
export type { ProgramIncludeType } from './program.types';
```

### Update `packages/adk/src/base/adt.ts`

This file is the ADT integration layer bridge. ADK object models import response types from here (via `../../../base/adt`) rather than directly from `@abapify/adt-client`. Add the response type re-export:

```typescript
// Import raw type from adt-client:
import type { ProgramResponse as _ProgramResponse } from '@abapify/adt-client';

// When to use Extract vs direct re-export:
//
// USE Extract when the schema has multiple root elements and the contract response
// type is a union (e.g., ClassResponse = { abapClass } | { abapClassInclude }).
// Each ADK object only uses one variant of the union.
//   → export type ProgramResponse = Extract<_ProgramResponse, { abapProgram: unknown }>;
//
// USE direct re-export when the schema has a single root element and the response
// type is NOT a union (e.g., InterfaceResponse = { abapInterface }).
//   → export type { ProgramResponse } from '@abapify/adt-client';
//
// To check: look at what crud() generates for your contract and see if the inferred
// response type is a union or a single object type.

// Example - use whichever form is correct for your contract:
export type ProgramResponse = Extract<
  _ProgramResponse,
  { abapProgram: unknown }
>;
// OR:
// export type { ProgramResponse } from '@abapify/adt-client';
```

Then in the model file, import as:

```typescript
import type { ProgramResponse } from '../../../base/adt';
```

### Update the ADK index

Edit `packages/adk/src/index.ts` to export the new object:

```typescript
export { AdkProgram } from './objects/repository/prog';
export type { ProgramXml } from './objects/repository/prog';
```

### Update `packages/adk/src/base/kinds.ts` KindToObject mapping

```typescript
export type AdkObjectForKind<K extends AdkKind> = K extends typeof Class
  ? AdkClass
  : K extends typeof Interface
    ? AdkInterface
    : K extends typeof Package
      ? AdkPackage
      : K extends typeof Program
        ? AdkProgram // ← add
        : AdkObject;
```

---

## Step 5: Create the abapGit Schema

The abapGit schema captures the structure of the XML file that abapGit writes for this object type.

### 5a: Research the abapGit XML format

Find out what fields the abapGit serializer writes. Resources:

- **abapGit repository**: https://github.com/abapGit/abapGit — look in `src/objects/` for `ZCL_ABAPGIT_OBJECT_{TYPE}.clas.abap`
- Look for `CREATE_VSEO*`, `ZIF_ABAPGIT_OBJECT~DESERIALIZE`, or `SERIALIZE` methods
- Look at `.xml` files in abapGit test repositories
- Search for `{TYPE}` in abapGit's `docs/` directory

A typical abapGit XML looks like:

```xml
<?xml version="1.0" encoding="utf-8"?>
<asx:abap xmlns:asx="http://www.sap.com/abapxml" version="1.0">
 <asx:values>
  <TRDIR>
   <NAME>ZTEST_PROGRAM</NAME>
   <SECU>S</SECU>
   <EDTX>X</EDTX>
   <SUBC>1</SUBC>
   <APPL/>
  </TRDIR>
 </asx:values>
</asx:abap>
```

### 5b: Create the abapGit schema literal

Create `packages/adt-plugin-abapgit/src/schemas/generated/schemas/{type}.ts`:

```typescript
/**
 * Auto-generated schema from XSD
 *
 * DO NOT EDIT - Generated by ts-xsd codegen
 * Source: abapgit/{type}.xsd
 */

export default {
  $xmlns: {
    xs: 'http://www.w3.org/2001/XMLSchema',
    asx: 'http://www.sap.com/abapxml',
  },
  targetNamespace: 'http://www.sap.com/abapxml',
  elementFormDefault: 'unqualified',
  element: [
    {
      name: 'abapGit',
      complexType: {
        sequence: {
          element: [
            {
              ref: 'asx:abap',
            },
          ],
        },
        attribute: [
          {
            name: 'version',
            type: 'xs:string',
            use: 'required',
          },
          {
            name: 'serializer',
            type: 'xs:string',
            use: 'required',
          },
          {
            name: 'serializer_version',
            type: 'xs:string',
            use: 'required',
          },
        ],
      },
    },
    {
      name: 'Schema',
      abstract: true,
    },
    {
      name: 'abap',
      type: 'asx:AbapType',
    },
  ],
  complexType: [
    {
      name: 'AbapValuesType',
      all: {
        element: [
          {
            name: 'TRDIR', // ← main SAP table
            type: 'asx:TrdirType',
            minOccurs: '0',
          },
        ],
      },
    },
    {
      name: 'TrdirType', // ← table structure type
      all: {
        element: [
          {
            name: 'NAME',
            type: 'xs:string',
          },
          {
            name: 'SECU',
            type: 'xs:string',
            minOccurs: '0',
          },
          {
            name: 'EDTX',
            type: 'xs:string',
            minOccurs: '0',
          },
          {
            name: 'SUBC',
            type: 'xs:string',
            minOccurs: '0',
          },
          // Add all relevant fields from abapGit XML
        ],
      },
    },
    {
      name: 'AbapType',
      sequence: {
        element: [
          {
            name: 'values',
            type: 'asx:AbapValuesType',
          },
        ],
      },
      attribute: [
        {
          name: 'version',
          type: 'xs:string',
          default: '1.0',
        },
      ],
    },
  ],
} as const;
```

**Pattern rules for abapGit schemas (follow existing schemas like `intf.ts`, `dtel.ts`):**

- All fields optional (`minOccurs: '0'`) except primary key field
- Use `asx:` prefix for types in the `AbapValuesType` and type definitions
- Structure name matches SAP DDIC table/structure name (e.g., `TRDIR`, `VSEOCLASS`, `DD04V`)

### 5c: Create TypeScript types for the abapGit schema

Create `packages/adt-plugin-abapgit/src/schemas/generated/types/{type}.ts`:

```typescript
/**
 * Auto-generated TypeScript interfaces from XSD
 * DO NOT EDIT - Generated by ts-xsd codegen
 * Source: abapgit/{type}.xsd
 * Mode: Flattened
 */

export type ProgSchema =
  | {
      abapGit: {
        abap: {
          values: {
            TRDIR?: {
              NAME: string;
              SECU?: string;
              EDTX?: string;
              SUBC?: string;
              ABAP_LANGUAGE_VERSION?: string;
            };
          };
          version?: string;
        };
        version: string;
        serializer: string;
        serializer_version: string;
      };
    }
  | {
      abap: {
        values: {
          TRDIR?: {
            NAME: string;
            SECU?: string;
            EDTX?: string;
            SUBC?: string;
            ABAP_LANGUAGE_VERSION?: string;
          };
        };
        version?: string;
      };
    };
```

**Pattern:** The type is always a union of two variants:

1. `{ abapGit: { abap: { values: ... }, version, serializer, serializer_version } }` — full document
2. `{ abap: { values: ... } }` — inner abap fragment

### 5d: Register the schema in the abapGit index

Edit `packages/adt-plugin-abapgit/src/schemas/generated/index.ts`:

```typescript
// Add raw schema import
import _prog from './schemas/prog';

// Add type imports
import type { ProgSchema as _ProgSchema } from './types/prog';

// Add extraction type
type ProgAbapGitType = Extract<_ProgSchema, { abapGit: unknown }>;

// Add schema export
export const prog = abapGitSchema<
  ProgAbapGitType,
  ProgAbapGitType['abapGit']['abap']['values']
>(_prog);
```

---

## Step 6: Create the abapGit Handler

Create `packages/adt-plugin-abapgit/src/lib/handlers/objects/{type}.ts`:

```typescript
/**
 * Program (PROG) object handler for abapGit format
 */

import { AdkProgram } from '../adk';
import { prog } from '../../../schemas/generated';
import { createHandler } from '../base';

export const programHandler = createHandler(AdkProgram, {
  schema: prog,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_PROG', // ← from abapGit source
  serializer_version: 'v1.0.0',

  // SAP → Git: Map ADK object to abapGit values
  toAbapGit: (prog) => ({
    TRDIR: {
      NAME: prog.name ?? '',
      SECU: 'S',
      EDTX: 'X',
      SUBC: '1',
    },
  }),

  // Single source file
  getSource: (prog) => prog.getSource(),

  // Git → SAP: Map abapGit values to ADK data
  fromAbapGit: ({ TRDIR }) => ({
    name: (TRDIR?.NAME ?? '').toUpperCase(),
    type: 'PROG/P', // ← full ADT type code
    description: undefined, // TRDIR has no description field
  }),

  // Git → SAP: Set source files on ADK object
  // Note: `_pendingSource` and `_pendingSources` are not declared on the public
  // ADK interface - they are implementation details for deferred source saving
  // (used by the export/deploy workflow). The `as unknown as` double cast is
  // the established pattern in this codebase (see clas.ts, intf.ts handlers).
  setSources: (prog, sources) => {
    if (sources.main) {
      (prog as unknown as { _pendingSource: string })._pendingSource =
        sources.main;
    }
  },
});
```

**For objects with multiple source files (like CLAS):**

```typescript
// Multiple sources - use getSources instead of getSource
getSources: (obj) =>
  obj.includes.map((inc) => ({
    suffix: SUFFIX_MAP[inc.includeType],
    content: obj.getIncludeSource(inc.includeType),
  })),

// And map suffixes during deserialization
suffixToSourceKey: {
  'locals_def': 'definitions',
  'locals_imp': 'implementations',
  'testclasses': 'testclasses',
  'macros': 'macros',
},

setSources: (obj, sources) => {
  (obj as unknown as { _pendingSources: Record<string, string> })._pendingSources = sources;
  if (sources.main) {
    (obj as unknown as { _pendingSource: string })._pendingSource = sources.main;
  }
},
```

**For objects without source (like DEVC):**

- Do not provide `getSource` or `getSources`
- `setSources` is not needed
- Only XML file will be serialized

### Register handler in the handlers index

Edit `packages/adt-plugin-abapgit/src/lib/handlers/objects/index.ts`:

```typescript
// Add the import (side effect: auto-registers on import)
export * from './clas';
export * from './devc';
export * from './doma';
export * from './dtel';
export * from './intf';
export * from './prog'; // ← add here
```

---

## Step 7: Update adk.ts re-exports in abapGit plugin

Edit `packages/adt-plugin-abapgit/src/lib/handlers/adk.ts` to re-export the new ADK class:

```typescript
// Add export
export { AdkProgram } from '@abapify/adk';
```

---

## Step 8: Build and Verify

> Follow the verification checklist in [after-changes](../../rules/verification/after-changes.md).

```bash
# Build all affected packages in dependency order
bunx nx build adt-schemas adt-contracts adk adt-plugin-abapgit adt-fixtures

# Full type check, tests, lint
bunx nx typecheck
bunx nx test adt-schemas adt-contracts adk adt-plugin-abapgit
bunx nx lint
```

### Quick smoke tests

**Schema parsing test:**

```typescript
// packages/adt-fixtures tests
import { fixtures } from '@abapify/adt-fixtures';
import { abapProgram } from '@abapify/adt-schemas';

const xml = await fixtures.programs.program.load();
const data = abapProgram.parse(xml);
expect(data.abapProgram?.['adtcore:name']).toBe('ZTEST_PROGRAM');
```

**abapGit handler test:**

```typescript
import { prog } from '@abapify/adt-plugin-abapgit/schemas/generated';
import { getHandler } from '@abapify/adt-plugin-abapgit/lib/handlers/base';

const handler = getHandler('PROG');
expect(handler).toBeDefined();
```

---

## Common Object Type Reference

| ABAP Type | ADT Path                        | abapGit Serializer | Main Table   |
| --------- | ------------------------------- | ------------------ | ------------ |
| `CLAS/OC` | `/sap/bc/adt/oo/classes`        | `LCL_OBJECT_CLAS`  | `VSEOCLASS`  |
| `INTF/OI` | `/sap/bc/adt/oo/interfaces`     | `LCL_OBJECT_INTF`  | `VSEOINTERF` |
| `DEVC/K`  | `/sap/bc/adt/packages`          | `LCL_OBJECT_DEVC`  | `DEVC`       |
| `DTEL/DE` | `/sap/bc/adt/ddic/dataelements` | `LCL_OBJECT_DTEL`  | `DD04V`      |
| `DOMA/DO` | `/sap/bc/adt/ddic/domains`      | `LCL_OBJECT_DOMA`  | `DD01V`      |
| `PROG/P`  | `/sap/bc/adt/programs/programs` | `LCL_OBJECT_PROG`  | `TRDIR`      |
| `FUGR/F`  | `/sap/bc/adt/functions/groups`  | `LCL_OBJECT_FUGR`  | `ENLFDIR`    |
| `TABL/DT` | `/sap/bc/adt/ddic/tables`       | `LCL_OBJECT_TABL`  | `DD02V`      |
| `MSAG/E`  | `/sap/bc/adt/messageclass`      | `LCL_OBJECT_MSAG`  | `T100A`      |

---

## Checklist

### ADT Endpoint Layer

- [ ] Endpoint details gathered (live system or web research)
- [ ] Schema literal created in `adt-schemas/src/schemas/generated/schemas/sap/`
- [ ] Typed wrapper added to `adt-schemas/src/schemas/generated/typed.ts`
- [ ] `toSpeciSchema` export added to `adt-contracts/src/generated/schemas.ts`
- [ ] Contract created in `adt-contracts/src/adt/{module}/`
- [ ] Module index updated (or new module added to main `adt/index.ts`)
- [ ] Fixture XML created in `adt-fixtures/src/fixtures/{module}/`
- [ ] Fixture registered in `adt-fixtures/src/fixtures/registry.ts`

### ADK Layer

- [ ] Kind constant added to `adk/src/base/kinds.ts`
- [ ] `AdkKind` union type updated in `kinds.ts`
- [ ] `AdkObjectForKind` mapping updated in `kinds.ts`
- [ ] Object model created in `adk/src/objects/repository/{type}/`
- [ ] Object exported from `adk/src/index.ts`
- [ ] `adk/src/base/adt.ts` exports the response type
- [ ] (Source objects) `savePendingSources()` implemented
- [ ] (Source objects) `checkPendingSourcesUnchanged()` implemented for skip-unchanged support
- [ ] (Source objects) `hasPendingSources()` implemented

### abapGit Layer

- [ ] abapGit schema literal created in `adt-plugin-abapgit/src/schemas/generated/schemas/{type}.ts`
- [ ] TypeScript types created in `adt-plugin-abapgit/src/schemas/generated/types/{type}.ts`
- [ ] Schema registered in `adt-plugin-abapgit/src/schemas/generated/index.ts`
- [ ] Handler created in `adt-plugin-abapgit/src/lib/handlers/objects/{type}.ts`
- [ ] Handler exported from `adt-plugin-abapgit/src/lib/handlers/objects/index.ts`
- [ ] ADK re-export added to `adt-plugin-abapgit/src/lib/handlers/adk.ts`

### Verification

- [ ] `bunx nx build adt-schemas adt-contracts adk adt-plugin-abapgit adt-fixtures` passes
- [ ] `bunx nx typecheck` passes
- [ ] `bunx nx test adt-schemas adt-contracts adk adt-plugin-abapgit` passes
- [ ] `bunx nx lint` passes
