# ADT-ADK Object Type Implementation Workflow

Comprehensive workflow for implementing a new ADK object type with full stack support.

## Usage

```bash
/adt-adk <object_type>
```

**Example:** `/adt-adk TABL` (implement table object type)

## Prerequisites

- Understanding of SAP ADT REST API for the object type
- Access to SAP system for endpoint discovery and testing
- Familiarity with abapify package structure

## Workflow Steps

### Step 1: Understand Object Type Semantics

**Goal:** Fully understand the ABAP object type before implementation.

**Actions:**

1. Research the object type in SAP documentation
2. Identify ADT endpoint(s) for the object type:
   - Discovery: `GET /sap/bc/adt/discovery` - find available endpoints
   - Object URI pattern: `/sap/bc/adt/{area}/{object_name}`
3. Document object semantics:
   - Object lifecycle (create, read, update, delete, activate)
   - Object relationships (parent package, dependencies, includes)
   - Object-specific actions (release, check, transport)
4. Identify if it's a repository object (transportable) or runtime object

**Output:** Object type analysis document with:

- ADT endpoint(s)
- Supported operations (CRUD + actions)
- Object relationships
- Transport behavior

### Step 2: Create/Update ADT Schema

**Invoke:** `/adt-schema <schema_name>`

**Goal:** Type-safe XML parsing for the object type.

**Actions:**

1. Capture sample XML responses from SAP:
   - GET single object
   - GET list/collection
   - POST create request/response
   - PUT update request/response
2. Check if XSD exists in SAP SDK or create manual schema
3. Generate schema using ts-xsd:
   ```bash
   npx nx run adt-schemas-xsd:generate
   ```
4. Export schema from `adt-schemas-xsd/src/schemas/index.ts`
5. **MANDATORY:** Create test scenario in `adt-schemas-xsd/tests/scenarios/`

**Output:**

- Schema in `adt-schemas-xsd/src/schemas/generated/` or `manual/`
- Test scenario with real SAP XML fixture
- Exported from index.ts

### Step 3: Create/Update ADT Contract

**Invoke:** `/adt-contract <contract_name>`

**Goal:** Type-safe API contract definition.

**Actions:**

1. Create contract in `adt-contracts/src/adt/{area}/`:

   ```typescript
   import { contract } from '../../base';
   import { mySchema } from '@abapify/adt-schemas-xsd';

   export const myObject = {
     get: (name: string) =>
       contract({
         method: 'GET',
         path: `/sap/bc/adt/{area}/${name}`,
         headers: { Accept: 'application/xml' },
         responses: { 200: mySchema },
       }),
     // ... other operations
   };
   ```

2. Export from area index and main index
3. **MANDATORY:** Create test scenario in `adt-contracts/tests/contracts/`

**Output:**

- Contract in `adt-contracts/src/adt/{area}/`
- Test scenario with contract validation
- Exported from index.ts

### Step 4: Create/Update Client Service (if needed)

**Goal:** Business logic layer for complex operations.

**When needed:**

- Multi-step operations (create + activate + transport)
- Complex error handling
- Caching or optimization
- Cross-object coordination

**Actions:**

1. Create service in `adt-client-v2/src/services/{area}/`:

   ```typescript
   export class MyObjectService {
     constructor(private client: AdtClient) {}

     async get(name: string): Promise<MyObject> {
       const contract = myObjectContract.get(name);
       return this.client.execute(contract);
     }
     // ... other methods
   }
   ```

2. Register service in client factory
3. Add tests for service methods

**Output:**

- Service class in `adt-client-v2/src/services/`
- Service registration in client
- Unit tests

### Step 5: Implement ADK Object Model

**Goal:** High-level object abstraction with lazy loading and cross-references.

**Location:** `adk-v2/src/objects/{category}/{object_type}/`

**Files to create:**

1. `{type}.model.ts` - Main ADK object class
2. `{type}.types.ts` - TypeScript interfaces
3. `index.ts` - Exports

**⚠️ CRITICAL: Use Response Types from adt-client-v2**

**NEVER** create manual interfaces for API response types. **ALWAYS** import the response type from `@abapify/adt-client-v2`:

```typescript
// ❌ WRONG - Manual interface duplicates schema definition
export interface MyObjectXml {
  name: string;
  description?: string;
  // ... manually typed fields that will drift from contract
}

// ❌ WRONG - Importing directly from schema (bypasses contract)
import type { InferXsd } from 'ts-xsd';
import { mySchema } from 'adt-schemas-xsd';
export type MyObjectData = InferXsd<typeof mySchema>;

// ❌ WRONG - Using speci internals (implementation detail)
import type { InferSuccessResponse } from 'speci/rest';
export type MyObjectData = InferSuccessResponse<...>;

// ❌ WRONG - Importing directly from adt-contracts (adds extra dependency)
import type { MyObjectResponse } from 'adt-contracts';
export type MyObjectData = MyObjectResponse;

// ✅ CORRECT - Import from adt-client-v2 (re-exports contract types)
import type { MyObjectResponse } from '@abapify/adt-client-v2';
export type MyObjectData = MyObjectResponse;
```

**Why adt-client-v2 is the import source:**

- **Single dependency:** ADK only depends on `adt-client-v2`, not `adt-contracts` directly
- **Clean layering:** `adt-client-v2` re-exports contract types for consumers
- **Contract is still source of truth:** Types originate from contract, but flow through client
- **Simpler dependency graph:** ADK → client → contracts → schemas

**Dependency Architecture:**

```
adt-schemas-xsd (schema definitions)
       ↓
adt-contracts (API contracts, exports response types)
       ↓
adt-client-v2 (HTTP client, RE-EXPORTS contract types)
       ↓
adk-v2 (imports types from client only)
```

**Pattern:**

```typescript
// {type}.model.ts
import { AdkObject } from '../../../base/model';
import { MyObjectKind } from '../../../base/kinds';
import type { MyObjectResponse } from '@abapify/adt-client-v2';

// Type alias for clarity (optional but recommended)
export type MyObjectData = MyObjectResponse;

export class AdkMyObject extends AdkObject<typeof MyObjectKind, MyObjectData> {
  readonly kind = MyObjectKind;

  get objectUri(): string {
    return `/sap/bc/adt/{area}/${encodeURIComponent(this.name)}`;
  }

  // Properties from schema
  get description(): string {
    return this.dataSync.description;
  }

  // Lazy-loaded relationships
  async getRelated(): Promise<AdkRelated[]> {
    return this.lazy('related', async () => {
      // Load via service
    });
  }

  // CRUD operations
  async load(): Promise<this> {
    const data = await this.ctx.services.myObject.get(this.name);
    this.setData(data);
    return this;
  }

  // Actions
  async activate(): Promise<void> {
    /* ... */
  }
}
```

**Cross-object references:**

- Use `AdkContext` for accessing other object types
- Implement lazy loading for relationships
- Use `lazy()` helper for caching

**Output:**

- ADK object model with full type safety
- Lazy-loaded relationships
- CRUD + action methods
- Exported from objects index

### Step 6: Implement CLI Commands

**Invoke:** `/adt-command <object_type>`

**Goal:** Full CRUD cycle + actions via command line.

See `/adt-command` workflow for detailed implementation guide.

**Quick summary:**

- Location: `adt-cli/src/lib/commands/{area}/`
- Uses `getAdtClientV2()` for client
- Uses router + pages for display
- Full CRUD: get, list, create, update, delete + actions

### Step 7: Implement CLI Display Pages

**Invoke:** `/adt-page <object_type>`

**Goal:** Rich terminal display for object information.

See `/adt-page` workflow for detailed implementation guide.

**Quick summary:**

- Location: `adt-cli/src/lib/ui/pages/{type}.ts`
- Self-registering via `definePage()`
- Uses ADK for data fetching
- Component-based rendering

### Step 8: Implement TUI Editor (for editable objects)

**Goal:** Interactive terminal UI for object editing.

**Location:** `adt-tui/src/pages/{area}/`

**Pattern:**

```typescript
// pages/{area}/{type}-editor.tsx
import { useState } from 'react';
import { Box, Text, TextInput } from 'ink';
import { useNavigation } from '../../lib/context';

export function MyObjectEditor({ obj }: { obj: AdkMyObject }) {
  const [description, setDescription] = useState(obj.description);
  const { navigate } = useNavigation();

  const save = async () => {
    await obj.update({ description });
    navigate('back');
  };

  return (
    <Box flexDirection="column">
      <Text>Edit {obj.name}</Text>
      <TextInput
        value={description}
        onChange={setDescription}
        placeholder="Description"
      />
      {/* More fields */}
    </Box>
  );
}
```

**Integration:**

- Register page in TUI routes
- Connect to ADK object for save operations
- Handle validation and errors

**Output:**

- TUI editor page
- Form components for object fields
- Save/cancel actions

### Step 9: Add abapGit Plugin Support (for repository objects)

**Goal:** Enable Git-based version control for the object type.

**Location:** `plugins/abapgit/src/objects/{type}/`

**Files to create:**

1. `{type}-handler.ts` - Serialization/deserialization
2. `{type}-files.ts` - File mapping

**Pattern:**

```typescript
// objects/{type}/{type}-handler.ts
import { ObjectHandler } from '../../lib/handler';
import { AdkMyObject } from '@abapify/adk-v2';

export class MyObjectHandler implements ObjectHandler {
  readonly objectType = 'MYOB';
  readonly fileExtension = 'myob';

  async serialize(obj: AdkMyObject): Promise<SerializedFiles> {
    return {
      [`${obj.name.toLowerCase()}.${this.fileExtension}.xml`]:
        this.buildMetadataXml(obj),
      // Additional files (source code, etc.)
    };
  }

  async deserialize(files: SerializedFiles): Promise<MyObjectData> {
    // Parse files back to object data
  }
}
```

**Register handler:**

```typescript
// objects/index.ts
import { MyObjectHandler } from './{type}/{type}-handler';
export const handlers = [
  // ... existing
  new MyObjectHandler(),
];
```

**Output:**

- Object handler for serialization
- File mapping for Git storage
- Round-trip tests

## Checklist

Before marking complete, verify:

- [ ] **Schema:** Created with test scenario, parses real SAP XML
- [ ] **Contract:** Created with test scenario, correct method/path/headers
- [ ] **Service:** Created if needed, handles business logic
- [ ] **ADK Model:** Full type safety, lazy loading, CRUD + actions
- [ ] **CLI Commands:** Full CRUD cycle, help text, examples
- [ ] **CLI Pages:** Display pages for view operations
- [ ] **TUI Editor:** Edit pages for modify operations (if applicable)
- [ ] **abapGit:** Handler for Git serialization (if repository object)
- [ ] **Tests:** All components have tests passing
- [ ] **Documentation:** README updated with new object type

## Package Dependencies

```
adt-schemas-xsd (schema definitions)
       ↓
adt-contracts (API contracts, exports response types)
       ↓
adt-client-v2 (HTTP client, RE-EXPORTS contract types for consumers)
       ↓
adk-v2 (model - ONLY depends on adt-client-v2)
       ↓
adt-cli (commands + pages)
       ↓
adt-tui (editor)
       ↓
plugins/abapgit (git support)
```

**Key insight:** `adt-client-v2` re-exports types from `adt-contracts` so that consumers like `adk-v2` only need a single dependency. This keeps the dependency graph clean and avoids diamond dependency issues.

## Related Workflows

- `/adt-schema` - Schema creation workflow
- `/adt-contract` - Contract creation workflow
- `/adt-command` - CLI command creation workflow
- `/adt-page` - CLI page creation workflow
- `/implement` - General implementation workflow
- `/build` - Execute implementation plan
