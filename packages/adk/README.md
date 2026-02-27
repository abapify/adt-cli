# @abapify/adk

ABAP Development Kit v2 - Schema-driven object construction for ABAP objects.

## Overview

ADK v2 is a complete redesign focused on:

- **Schema-first**: All types derived from `@abapify/adt-schemas`
- **Contract-based**: Uses `@abapify/adt-contracts` for API interactions
- **Pure construction**: No network calls, no side effects
- **Lazy loading**: Source code and includes loaded on-demand
- **Immutable**: Objects are snapshots

## Key Differences from v1

| Aspect       | v1                     | v2                          |
| ------------ | ---------------------- | --------------------------- |
| Schemas      | Manual (`adt-schemas`) | XSD-derived (`adt-schemas`) |
| Network      | Mixed in               | Separated out               |
| Source       | Eager                  | Lazy                        |
| Dependencies | `adt-client` v1        | `adt-contracts`             |

## Usage

```typescript
import { AdkFactory } from '@abapify/adk';
import { adtClientV2 } from '@abapify/adt-client';

// Create factory
const factory = new AdkFactory();

// Construct from ADT XML
const classObj = factory.fromAdtXml('CLAS/OC', xmlString);

// Access metadata
console.log(classObj.kind); // 'CLAS/OC'
console.log(classObj.name); // 'ZCL_MY_CLASS'

// Lazy load source (requires fetcher)
const source = await classObj.getSource();
const includes = await classObj.getIncludes();
```

## Architecture

```
adt-schemas (types)
       ↓
adt-contracts (API contracts)
       ↓
adk (pure construction) ← THIS PACKAGE
       ↓
adt-cli (orchestration)
```

## Status

🚧 Work in progress - Part of ACR-17 v2 migration
