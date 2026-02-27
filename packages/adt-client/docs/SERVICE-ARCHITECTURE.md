# ADT Client V2 - Service Layer Architecture

## Problem Statement

We need to separate **low-level HTTP client logic** (contracts, schemas) from **high-level business logic** (smart locking, ATC workflows, user detection).

**Current V1 approach:** Everything mixed together in service classes
**V2 Goal:** Clean separation of concerns

---

## Architecture Layers

```
┌─────────────────────────────────────────────┐
│  CLI / Application Layer                     │
│  (adt-cli commands)                          │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Service Layer (Business Logic)              │
│  - TransportService                          │
│  - AtcService                                │
│  - DeploymentService                         │
│  - DiscoveryService (optional wrapper)       │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Client Layer (Contract-based)               │
│  - adtClient.core.http.sessions.get()        │
│  - adtClient.transport.list()                │
│  - adtClient.atc.run()                       │
│  - adtClient.classes.create()                │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Adapter Layer (Session + HTTP)              │
│  - SessionManager                            │
│  - CookieStore, CsrfTokenManager             │
│  - HTTP fetch with auth                      │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  SAP ADT API (REST endpoints)                │
└─────────────────────────────────────────────┘
```

---

## Layer 1: Contracts (Low-Level Client)

**Purpose:** Pure HTTP/schema definitions - no business logic

**Location:** `adt-client/src/adt/`

**Characteristics:**

- ✅ Schema-driven using `speci` + `ts-xsd`
- ✅ One contract per SAP ADT service area
- ✅ Type-safe with automatic XML parsing/building
- ✅ 1:1 mapping to SAP ADT REST endpoints
- ❌ No business logic
- ❌ No multi-step workflows
- ❌ No conditional logic

**Example:**

```typescript
// adt-client/src/adt/cts/transports-contract.ts
export const transportsContract = createContract({
  list: (filters?: TransportFilters) =>
    adtHttp.get('/sap/bc/adt/cts/transportrequests', {
      query: filters,
      responses: { 200: TransportListSchema },
    }),

  get: (transportId: string) =>
    adtHttp.get(`/sap/bc/adt/cts/transportrequests/${transportId}`, {
      responses: { 200: TransportSchema },
    }),

  create: (data: TransportCreateData) =>
    adtHttp.post('/sap/bc/adt/cts/transportrequests', {
      body: data,
      bodySchema: TransportCreateSchema,
      responses: { 201: TransportSchema },
    }),
});
```

---

## Layer 2: Services (Business Logic)

**Purpose:** Orchestrate contracts with business logic

**Location:** `adt-client/src/services/`

**Characteristics:**

- ✅ Encapsulates multi-step workflows
- ✅ Handles conditional logic and error recovery
- ✅ Provides convenience methods
- ✅ Uses contracts internally
- ✅ Independently testable (mock the client)
- ❌ Does not make raw HTTP calls

**File Structure:**

```
adt-client/src/services/
├── transport-service.ts       # Transport business logic
├── atc-service.ts             # ATC workflow orchestration
├── deployment-service.ts      # Smart locking, CREATE/UPDATE logic
├── search-service.ts          # Search helpers
└── index.ts                   # Export all services
```

---

## Example: Transport Service

### Contract (Low-Level)

```typescript
// adt-client/src/adt/cts/transports-contract.ts
export const transportsContract = createContract({
  list: (filters?: TransportFilters) => adtHttp.get(...),
  get: (transportId: string) => adtHttp.get(...),
  create: (data: TransportCreateData) => adtHttp.post(...),
  getUserMetadata: () => adtHttp.get('/sap/bc/adt/discovery?...'),
});
```

### Service (Business Logic)

```typescript
// adt-client/src/services/transport-service.ts
import type { AdtClient } from '../client';

export class TransportService {
  constructor(private client: AdtClient) {}

  /**
   * Get current user from SAP metadata
   * (Business logic: caching, error handling)
   */
  private currentUserCache?: string;

  async getCurrentUser(): Promise<string> {
    if (this.currentUserCache) {
      return this.currentUserCache;
    }

    // Use contract to fetch metadata
    const metadata = await this.client.transport.getUserMetadata();

    // Business logic: extract user from complex response
    this.currentUserCache = this.extractUserFromMetadata(metadata);
    return this.currentUserCache;
  }

  /**
   * Create transport with automatic user detection
   * (Business logic: user detection + XML building)
   */
  async createWithAutoUser(
    options: TransportCreateOptions,
  ): Promise<Transport> {
    // Business logic: detect user if not provided
    const owner = options.owner || (await this.getCurrentUser());

    // Delegate to contract
    return this.client.transport.create({
      ...options,
      owner,
    });
  }

  /**
   * List user's transports (convenience method)
   */
  async listMine(): Promise<Transport[]> {
    const user = await this.getCurrentUser();
    return this.client.transport.list({ user });
  }

  // Helper methods (business logic)
  private extractUserFromMetadata(metadata: unknown): string {
    // Complex parsing logic
  }
}
```

---

## Example: ATC Service

### Contract (Low-Level)

```typescript
// adt-client/src/adt/atc/atc-contract.ts
export const atcContract = createContract({
  getCustomizing: () => adtHttp.get('/sap/bc/adt/atc/customizing', ...),

  createWorklist: (variant: string) =>
    adtHttp.post('/sap/bc/adt/atc/worklists?checkVariant=' + variant, ...),

  startRun: (worklistId: string, options: RunOptions) =>
    adtHttp.post(`/sap/bc/adt/atc/runs?worklistId=${worklistId}`, ...),

  getResults: (worklistId: string) =>
    adtHttp.get(`/sap/bc/adt/atc/worklists/${worklistId}`, ...),
});
```

### Service (Business Logic)

```typescript
// adt-client/src/services/atc-service.ts
import type { AdtClient } from '../client';

export class AtcService {
  constructor(private client: AdtClient) {}

  /**
   * Run ATC check with full workflow orchestration
   * (Business logic: 4-step workflow + polling)
   */
  async runCheck(options: AtcCheckOptions): Promise<AtcResult> {
    // Step 1: Get customizing
    const customizing = await this.client.atc.getCustomizing();

    // Step 2: Create worklist
    const worklistId = await this.client.atc.createWorklist(options.variant);

    // Step 3: Start run
    const runId = await this.client.atc.startRun(worklistId, {
      target: options.target,
      targetName: options.targetName,
    });

    // Step 4: Poll for results (business logic)
    return await this.pollForResults(worklistId, options.maxWaitTime || 60000);
  }

  /**
   * Poll for ATC results with timeout
   * (Business logic: polling loop + completion detection)
   */
  private async pollForResults(
    worklistId: string,
    maxWaitMs: number,
  ): Promise<AtcResult> {
    const startTime = Date.now();
    const pollInterval = 2000; // 2 seconds

    while (Date.now() - startTime < maxWaitMs) {
      const result = await this.client.atc.getResults(worklistId);

      // Business logic: check completion
      if (this.isComplete(result)) {
        return this.parseFindings(result);
      }

      await this.sleep(pollInterval);
    }

    throw new Error('ATC check timed out');
  }

  // Business logic helpers
  private isComplete(result: any): boolean {
    return result.objectSetIsComplete === true;
  }

  private parseFindings(result: any): AtcResult {
    // Complex parsing and prioritization logic
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

---

## Example: Deployment Service

```typescript
// adt-client/src/services/deployment-service.ts
import type { AdtClient } from '../client';

export class DeploymentService {
  constructor(private client: AdtClient) {}

  /**
   * Smart setSource with automatic CREATE/UPDATE detection
   * (Business logic: existence check, source compare, lock handling)
   */
  async setSource(
    objectUri: string,
    sourcePath: string,
    content: string,
    options: SetSourceOptions = {},
  ): Promise<SetSourceResult> {
    let lockHandle: string | undefined;

    try {
      // Business logic: Check if object exists
      const exists = await this.objectExists(objectUri);

      if (exists) {
        // Business logic: Compare source if requested
        if (options.compareSource) {
          const currentSource = await this.client.objects.getSource(
            objectUri,
            sourcePath,
          );
          if (currentSource === content) {
            return { action: 'skipped', reason: 'identical' };
          }
        }

        // Business logic: Lock object
        lockHandle = await this.client.locking.lock(objectUri);

        // Delegate to contract
        await this.client.objects.updateSource(
          objectUri,
          sourcePath,
          content,
          lockHandle,
        );

        return { action: 'updated' };
      } else {
        // Delegate to contract
        await this.client.objects.createSource(objectUri, sourcePath, content);

        return { action: 'created' };
      }
    } finally {
      // Business logic: Always unlock
      if (lockHandle) {
        await this.client.locking.unlock(objectUri, lockHandle);
      }
    }
  }

  // Business logic helper
  private async objectExists(objectUri: string): Promise<boolean> {
    try {
      await this.client.objects.getMetadata(objectUri);
      return true;
    } catch {
      return false;
    }
  }
}
```

---

## Usage in CLI

```typescript
// adt-cli/src/lib/commands/transport/create.ts
import { createAdtClient } from '@abapify/adt-client';
import { TransportService } from '@abapify/adt-client/services';

export const transportCreateCommand = new Command('create').action(
  async (options) => {
    // Create low-level client
    const adtClient = createAdtClient({
      baseUrl: session.basicAuth.host,
      username: session.basicAuth.username,
      password: session.basicAuth.password,
    });

    // Create service with business logic
    const transportService = new TransportService(adtClient);

    // Use service (automatic user detection!)
    const transport = await transportService.createWithAutoUser({
      description: options.description,
      type: 'K',
    });

    console.log(`✅ Transport created: ${transport.number}`);
  },
);
```

---

## Benefits of This Architecture

### ✅ **Clear Separation of Concerns**

- Contracts = "what the API does"
- Services = "how to use it effectively"

### ✅ **Easy to Test**

- **Contracts:** Mock HTTP with `speci`
- **Services:** Mock the client interface

### ✅ **Gradual Migration**

- Can implement contracts first
- Add services as needed
- CLI can use either directly

### ✅ **Reusable Business Logic**

- Services can be used by CLI, tests, or other tools
- No duplication

### ✅ **Type Safety End-to-End**

- Schemas enforce structure
- TypeScript catches errors at compile time

### ✅ **Easy to Maintain**

- Contracts map 1:1 to SAP docs
- Services document business rules
- Changes isolated to appropriate layer

---

## Migration Path

### Phase 1: Contracts Only

```typescript
// CLI uses contracts directly (simple operations)
const discovery = await adtClient.discovery.getDiscovery();
```

### Phase 2: Add Services for Complex Operations

```typescript
// CLI uses services (complex workflows)
const transportService = new TransportService(adtClient);
const transport = await transportService.createWithAutoUser({ ... });
```

### Phase 3: Remove V1

```typescript
// Delete adt-client v1 entirely
// All logic migrated to v2 contracts + services
```

---

## File Organization

```
packages/
├── adt-client/
│   ├── src/
│   │   ├── adt/                     # Contracts (grouped by SAP path)
│   │   │   ├── core/
│   │   │   │   └── http/
│   │   │   │       ├── sessions-contract.ts
│   │   │   │       └── sessions-schema.ts
│   │   │   ├── cts/
│   │   │   │   ├── transports-contract.ts
│   │   │   │   └── transports-schema.ts
│   │   │   ├── atc/
│   │   │   │   ├── atc-contract.ts
│   │   │   │   └── atc-schema.ts
│   │   │   └── oo/
│   │   │       └── classes/
│   │   │           ├── classes-contract.ts
│   │   │           └── classes-schema.ts
│   │   ├── services/                # Business logic
│   │   │   ├── transport-service.ts
│   │   │   ├── atc-service.ts
│   │   │   ├── deployment-service.ts
│   │   │   └── index.ts
│   │   ├── adapter.ts               # HTTP + session
│   │   ├── session.ts               # Session management
│   │   ├── contract.ts              # Main contract aggregator
│   │   └── index.ts                 # Public API
│   └── SERVICE-ARCHITECTURE.md      # This file
└── adt-cli/
    └── src/lib/commands/
        ├── transport/
        │   ├── create.ts            # Uses TransportService
        │   └── list.ts              # Uses contracts directly
        └── atc.ts                   # Uses AtcService
```

---

## Testing Strategy

### Unit Tests: Contracts

```typescript
// Mock HTTP responses
const mockAdapter = createMockAdapter();
mockAdapter.mockResponse('/sap/bc/adt/cts/transportrequests', {
  status: 200,
  body: '<transport>...</transport>',
});

const client = createAdtClient({ adapter: mockAdapter });
const transports = await client.transport.list();
```

### Unit Tests: Services

```typescript
// Mock the client
const mockClient = {
  transport: {
    list: jest.fn().mockResolvedValue([...]),
    create: jest.fn().mockResolvedValue({...}),
  },
};

const service = new TransportService(mockClient);
const transport = await service.createWithAutoUser({ ... });

expect(mockClient.transport.create).toHaveBeenCalledWith({ owner: 'TESTUSER' });
```

### Integration Tests

```typescript
// Use real SAP system
const client = createAdtClient({ baseUrl: '...', ... });
const service = new TransportService(client);
const transport = await service.createWithAutoUser({ ... });
```

---

## Summary

**Contracts = Thin, schema-driven HTTP layer**

- Pure REST operations
- No business logic
- 1:1 with SAP ADT API

**Services = Business logic orchestration**

- Multi-step workflows
- Error handling
- Convenience methods
- Uses contracts internally

**CLI = Consumes services**

- Simple commands → use contracts directly
- Complex commands → use services

This gives us the best of both worlds: **type-safe contracts** + **reusable business logic**.
