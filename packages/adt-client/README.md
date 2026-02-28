# @abapify/adt-client

[![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-client)](https://www.npmjs.com/package/@abapify/adt-client)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue)](../../LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6)](https://www.typescriptlang.org/)

**Contract-driven SAP ADT REST client** — uses `speci` + `ts-xsd` for full type safety.

## Why v2?

This package replaces the legacy `adt-client` with a **contract-first design**:

```
┌─────────────────────────────────────────────────────────────────┐
│                      adt-client                               │
│              (HTTP Client + Request Execution)                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      adt-contracts                               │
│         (REST API Contracts using speci + ts-xsd)                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     adt-schemas                              │
│        (TypeScript schemas from SAP XSD definitions)             │
└─────────────────────────────────────────────────────────────────┘
```

**Benefits over v1:**

- ✅ **Type-safe from XSD** - Types generated from official SAP schemas
- ✅ **Contract-first** - API contracts define the interface
- ✅ **Zero manual types** - No hand-written type definitions
- ✅ **Easy to extend** - Add endpoints by defining contracts
- ✅ **Testable** - Contracts are pure data, easy to mock

## Features

- ✅ **Contract-driven** - Uses `speci` + `ts-xsd` contracts
- ✅ **Full type inference** - Types flow from XSD to response
- ✅ **Zero dependencies** - Only uses native fetch API
- ✅ **Clean API** - Arrow-function contracts
- ✅ **Promise-based** - Modern async/await API

## Installation

```bash
bun add @abapify/adt-client
```

## Quick Start

```typescript
import { createAdtClient } from '@abapify/adt-client';

// Create client
const client = createAdtClient({
  baseUrl: 'https://sap-system.com:8000',
  username: 'YOUR_USER',
  password: 'YOUR_PASS',
  client: '100',
  language: 'EN',
});

// Get complete class with all includes
const classObj = await client.getClass('ZCL_MY_CLASS');
console.log(classObj.metadata.description);
console.log(classObj.includes.main);
console.log(classObj.includes.definitions);
console.log(classObj.includes.implementations);

// Update main source
await client.updateMainSource('ZCL_MY_CLASS', newSource);
```

## API Reference

### Client Creation

```typescript
createAdtClient(config: AdtConnectionConfig): AdtClient
```

**Config:**

- `baseUrl` - SAP system URL (e.g., `https://sap-system.com:8000`)
- `username` - SAP username
- `password` - SAP password
- `client` - SAP client (optional, e.g., `'100'`)
- `language` - SAP language (optional, e.g., `'EN'`)

### Class Operations

#### Get Complete Class

```typescript
getClass(className: string): Promise<ClassObject>
```

Returns class metadata and all includes (main, definitions, implementations, macros, testclasses).

#### Get Metadata Only

```typescript
getMetadata(className: string): Promise<ClassMetadata>
```

Returns class metadata (name, description, package, etc.).

#### Get All Includes

```typescript
getIncludes(className: string): Promise<ClassIncludes>
```

Returns all class source includes.

#### Get Specific Include

```typescript
getInclude(className: string, includeType: 'main' | 'definitions' | 'implementations' | 'macros' | 'testclasses'): Promise<string>
```

Returns specific include source code.

#### Update Main Source

```typescript
updateMainSource(className: string, source: string): Promise<OperationResult>
```

Updates the main class source code.

#### Create Class

```typescript
createClass(className: string, metadata: Partial<ClassMetadata>): Promise<OperationResult>
```

Creates a new class with specified metadata.

#### Delete Class

```typescript
deleteClass(className: string): Promise<OperationResult>
```

Deletes a class.

#### Lock/Unlock

```typescript
lockClass(className: string): Promise<string>
unlockClass(className: string, lockHandle: string): Promise<OperationResult>
```

Lock and unlock class for editing.

## Types

### ClassMetadata

```typescript
interface ClassMetadata {
  name: string;
  description?: string;
  packageName?: string;
  responsible?: string;
  createdBy?: string;
  createdAt?: string;
  changedBy?: string;
  changedAt?: string;
  final?: boolean;
  abstract?: boolean;
  visibility?: 'public' | 'protected' | 'private';
}
```

### ClassIncludes

```typescript
interface ClassIncludes {
  main?: string;
  definitions?: string;
  implementations?: string;
  macros?: string;
  testclasses?: string;
}
```

### ClassObject

```typescript
interface ClassObject {
  metadata: ClassMetadata;
  includes: ClassIncludes;
}
```

## Examples

### Read and Modify Class

```typescript
// Get class
const classObj = await client.getClass('ZCL_MY_CLASS');

// Modify source
const newSource = classObj.includes.main?.replace('OLD_TEXT', 'NEW_TEXT');

// Update
if (newSource) {
  await client.updateMainSource('ZCL_MY_CLASS', newSource);
}
```

### Create New Class

```typescript
await client.createClass('ZCL_NEW_CLASS', {
  description: 'My new class',
  packageName: 'ZPACKAGE',
  visibility: 'public',
  final: false,
  abstract: false,
});
```

### Lock, Edit, Unlock Pattern

```typescript
// Lock class
const lockHandle = await client.lockClass('ZCL_MY_CLASS');

try {
  // Edit class
  await client.updateMainSource('ZCL_MY_CLASS', newSource);
} finally {
  // Always unlock
  await client.unlockClass('ZCL_MY_CLASS', lockHandle);
}
```

## Architecture

### Two-Layer Design

```typescript
const client = createAdtClient({...});

// Layer 1: Low-level contracts (direct ADT REST access)
client.adt.core.http.sessions.getSession()
client.adt.cts.transportrequests.getTransport(id)

// Layer 2: High-level services (business logic)
client.services.transports.importAndActivate(transportId)  // Future

// Utility: Raw HTTP for debugging
client.fetch('/arbitrary/endpoint', { method: 'GET' })
```

**Contracts** - Thin, declarative HTTP definitions with 1:1 mapping to SAP ADT endpoints
**Services** - Business logic orchestration combining multiple contract calls

## Comparison with adt-client v1

| Feature           | v1 (Legacy)   | v2 (New)           |
| ----------------- | ------------- | ------------------ |
| **Type Safety**   | Manual types  | Generated from XSD |
| **Architecture**  | Service-based | Contract-first     |
| **Dependencies**  | Many          | Zero               |
| **Extensibility** | Complex       | Add contracts      |
| **Testing**       | Difficult     | Easy (pure data)   |

## Related Packages

- **[adt-contracts](../adt-contracts)** - REST API contracts (speci + ts-xsd)
- **[adt-schemas](../adt-schemas)** - TypeScript schemas from SAP XSD
- **[speci](../speci)** - Contract specification system
- **[ts-xsd](../ts-xsd)** - XSD → TypeScript generation

## License

MIT
