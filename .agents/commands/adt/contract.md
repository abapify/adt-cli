# ADT Contract Creation Workflow

Create type-safe ADT REST API contracts.

## Fundamental Concepts

### What are ADT Contracts?

**Contracts are type-safe API definitions** that describe ADT REST endpoints:

- **Method** - HTTP method (GET, POST, PUT, DELETE)
- **Path** - URL pattern with parameters
- **Headers** - Accept, Content-Type
- **Query** - URL query parameters
- **Body** - Request body schema (for POST/PUT)
- **Responses** - Response schemas per status code

### Type Safety Requirements

**Contracts use speci-compatible schemas** for full type inference:

```typescript
import { contract } from '../../base';
import { mySchema } from '@abapify/adt-schemas-xsd';

// Contract definition with full type safety
export const myResource = {
  get: (id: string) =>
    contract({
      method: 'GET',
      path: `/sap/bc/adt/area/${id}`,
      headers: { Accept: 'application/xml' },
      responses: {
        200: mySchema, // Schema provides response type
      },
    }),
};

// When executed, response is fully typed:
// const result = await client.execute(myResource.get('ID'));
// result is typed as InferXsd<typeof mySchema, 'RootElement'>
```

### Contract Testing Philosophy

**Tests validate contract definitions, not HTTP calls:**

- Contracts are plain objects describing endpoints
- No mocks needed - test the definition directly
- Type safety verified at compile time
- If test file compiles, types are correct

```typescript
// Contract returns a descriptor object
const contract = myResource.get('ID123');

// Test the definition directly - no HTTP involved
expect(contract.method).toBe('GET');
expect(contract.path).toBe('/sap/bc/adt/area/ID123');
expect(contract.responses[200]).toBe(mySchema);
```

## Usage

```bash
/adt-contract <contract_name>
```

**Example:** `/adt-contract transportrequests`

## Prerequisites

- Schema created via `/adt-schema` workflow
- Understanding of ADT endpoint structure

## Workflow Steps

### Step 1: Identify Endpoint Structure

**Goal:** Map ADT REST API to contract operations.

**Actions:**

1. Discover endpoint via ADT discovery:
   ```bash
   npx adt discovery
   ```
2. Document endpoint details:
   - Base path: `/sap/bc/adt/{area}/{resource}`
   - Supported methods: GET, POST, PUT, DELETE
   - Query parameters
   - Request/response content types

**Common patterns:**
| Operation | Method | Path | Content-Type |
|-----------|--------|------|--------------|
| Get single | GET | `/{resource}/{id}` | application/xml |
| List | GET | `/{resource}` | application/xml |
| Create | POST | `/{resource}` | application/xml |
| Update | PUT | `/{resource}/{id}` | application/xml |
| Delete | DELETE | `/{resource}/{id}` | - |
| Action | POST | `/{resource}/{id}/{action}` | varies |

### Step 2: Create Contract File

**Location:** `adt-contracts/src/adt/{area}/{resource}.ts`

**Pattern:**

```typescript
// src/adt/{area}/{resource}.ts
import { contract } from '../../base';
import { mySchema, myListSchema } from '@abapify/adt-schemas-xsd';

/**
 * {Resource} Contract
 *
 * Endpoint: /sap/bc/adt/{area}/{resource}
 */
export const myResource = {
  /**
   * Get single {resource}
   */
  get: (id: string) =>
    contract({
      method: 'GET',
      path: `/sap/bc/adt/{area}/${id}`,
      headers: {
        Accept: 'application/xml',
      },
      responses: {
        200: mySchema,
      },
    }),

  /**
   * List {resources}
   */
  list: (params?: { package?: string; user?: string }) =>
    contract({
      method: 'GET',
      path: '/sap/bc/adt/{area}',
      headers: {
        Accept: 'application/xml',
      },
      query: params,
      responses: {
        200: myListSchema,
      },
    }),

  /**
   * Create {resource}
   */
  create: () =>
    contract({
      method: 'POST',
      path: '/sap/bc/adt/{area}',
      headers: {
        Accept: 'application/xml',
        'Content-Type': 'application/xml',
      },
      body: mySchema,
      responses: {
        200: mySchema,
        201: mySchema,
      },
    }),

  /**
   * Update {resource}
   */
  update: (id: string) =>
    contract({
      method: 'PUT',
      path: `/sap/bc/adt/{area}/${id}`,
      headers: {
        Accept: 'application/xml',
        'Content-Type': 'application/xml',
      },
      body: mySchema,
      responses: {
        200: mySchema,
      },
    }),

  /**
   * Delete {resource}
   */
  delete: (id: string) =>
    contract({
      method: 'DELETE',
      path: `/sap/bc/adt/{area}/${id}`,
      responses: {
        200: undefined,
        204: undefined,
      },
    }),
};
```

### Step 3: Export Contract

**Actions:**

1. Create/update area index `src/adt/{area}/index.ts`:

   ```typescript
   import { myResource } from './myresource';

   export const areaContract = {
     myResource,
     // ... other resources
   };

   export type AreaContract = typeof areaContract;
   ```

2. Export from main index `src/adt/index.ts`:
   ```typescript
   export { areaContract } from './{area}';
   ```

### Step 4: Create Test Scenario (MANDATORY)

**Location:** `adt-contracts/tests/contracts/{area}.ts`

#### 🚨 CRITICAL: Tests Must Be Fully Typed

**All tests must have full type checking** - not just runtime assertions:

1. **TypeScript must compile** - `tsc --noEmit` must pass
2. **No `any` types** - all variables must be properly typed
3. **Schema references verified** - TypeScript validates schema compatibility
4. **ContractOperation type required** - use the type helper

**Pattern:**

```typescript
// tests/contracts/{area}.ts
import { ContractScenario, type ContractOperation } from './base';
import { myResource } from '../../src/adt/{area}/myresource';
import { mySchema, myListSchema } from '@abapify/adt-schemas-xsd';
import { fixtures } from 'adt-fixtures';

export class MyResourceScenario extends ContractScenario {
  readonly name = 'My Resource';

  // ContractOperation[] ensures type safety
  readonly operations: ContractOperation[] = [
    {
      name: 'get single',
      contract: () => myResource.get('ID123'),
      method: 'GET',
      path: '/sap/bc/adt/{area}/ID123',
      headers: { Accept: 'application/xml' },
      response: {
        status: 200,
        schema: mySchema, // TypeScript validates this is a valid schema
        fixture: fixtures.myresource?.single, // Optional
      },
    },
    {
      name: 'list',
      contract: () => myResource.list({ package: 'ZTEST' }),
      method: 'GET',
      path: '/sap/bc/adt/{area}',
      headers: { Accept: 'application/xml' },
      query: { package: 'ZTEST' },
      response: {
        status: 200,
        schema: myListSchema,
      },
    },
    {
      name: 'create',
      contract: () => myResource.create(),
      method: 'POST',
      path: '/sap/bc/adt/{area}',
      headers: {
        Accept: 'application/xml',
        'Content-Type': 'application/xml',
      },
      body: { schema: mySchema },
      response: { status: 200, schema: mySchema },
    },
    // ... more operations
  ];
}
```

**Register scenario:**

```typescript
// tests/contracts/index.ts
import { MyResourceScenario } from './{area}';
export const SCENARIOS = [...existing, new MyResourceScenario()];
```

### Step 5: Run Tests AND Type Check

```bash
# Run tests
npx nx test adt-contracts

# ALSO run type check - MANDATORY
npx tsc --noEmit -p packages/adt-contracts
```

**Verify:**

- Contract has correct method
- Contract has correct path
- Contract has correct headers
- Contract has correct query params (if any)
- Contract has body schema (for POST/PUT)
- Contract has response schema
- **Type check passes** (compile-time verification)

## Contract Patterns

### Path Parameters

```typescript
get: (id: string, subId?: string) =>
  contract({
    path: subId
      ? `/sap/bc/adt/area/${id}/sub/${subId}`
      : `/sap/bc/adt/area/${id}`,
    // ...
  });
```

### Query Parameters

```typescript
list: (params?: { package?: string; user?: string; maxResults?: number }) =>
  contract({
    query: params,
    // ...
  });
```

### Multiple Response Codes

```typescript
create: () =>
  contract({
    responses: {
      200: mySchema, // Success with body
      201: mySchema, // Created with body
      204: undefined, // Success no body
    },
  });
```

### Actions

```typescript
release: (id: string) =>
  contract({
    method: 'POST',
    path: `/sap/bc/adt/area/${id}/release`,
    headers: {
      Accept: 'application/xml',
    },
    responses: {
      200: releaseResultSchema,
    },
  });
```

## Checklist

- [ ] Endpoint structure documented
- [ ] Contract file created with all operations
- [ ] Schemas imported from `@abapify/adt-schemas-xsd`
- [ ] Exported from area index
- [ ] Exported from main index
- [ ] Test scenario created with ContractOperation[] type
- [ ] Tests passing: `npx nx test adt-contracts`
- [ ] **Type check passing: `npx tsc --noEmit`**

## Output

- Contract file in `adt-contracts/src/adt/{area}/`
- Test scenario in `adt-contracts/tests/contracts/`

## Related

- `/adt-schema` - Schema creation (prerequisite)
- `/adt-adk` - Full object type implementation
