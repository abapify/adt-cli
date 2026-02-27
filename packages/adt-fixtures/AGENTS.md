# adt-fixtures - AI Agent Guide

## Overview

Centralized SAP ADT XML fixtures for testing across the monorepo.

## Purpose

- **Single source of truth** for real SAP XML samples
- **Reusable** across schemas, contracts, e2e tests
- **Lazy loading** - nothing loads until `.load()` is called
- **Type-safe** - autocomplete for fixture paths

## Usage

```typescript
import { fixtures, load } from 'adt-fixtures';

// LAZY - nothing loads on import!
// Get handle first, then explicitly load:
const handle = fixtures.transport.single;
console.log(handle.path); // 'transport/single.xml'
const xml = await handle.load(); // NOW it loads

// Or one-liner:
const xml = await fixtures.transport.single.load();

// Or load by path directly:
const xml = await load('transport/single.xml');
```

## Adding New Fixtures

1. **Add XML file** to `fixtures/` directory:

   ```
   fixtures/
   ├── transport/
   │   └── mynew.xml    # Add here
   ```

2. **Update registry** in `src/fixtures.ts`:

   ```typescript
   const registry = {
     transport: {
       // ... existing
       mynew: 'transport/mynew.xml', // Just add path!
     },
   } as const;
   ```

3. **Build**: `npx nx build adt-fixtures`

## Fixture Requirements

- **MUST be real SAP responses** - not fabricated XML
- **Sanitize sensitive data** - remove real transport numbers, usernames
- **Document source** - add comment with endpoint that produced it

## Directory Structure

```
fixtures/
├── transport/           # Transport management
│   ├── single.xml       # GET transport response
│   └── create.xml       # POST create request
├── atc/                 # ATC checks
│   ├── worklist.xml
│   └── result.xml
└── [category]/          # Add more as needed
```

## Consumers

- `adt-schemas` - Schema round-trip tests
- `adt-contracts` - Mock response fixtures
- `tests/e2e/` - Integration test baselines
