---
description: Create ADT contract following contract workflow
auto_execution_mode: 3
implements: .agents/commands/adt/contract.md
---

# ADT Contract Workflow

**Implements:** `.agents/commands/adt/contract.md`

## Usage

```bash
/adt-contract <contract_name>
```

## Key Concepts

### Contracts = Type-Safe API Definitions

- Method, path, headers, query, body, responses
- Use speci-compatible schemas for full type inference
- Response types inferred from schema

### Testing Philosophy

- Tests validate definitions, not HTTP calls
- No mocks needed - test contract objects directly
- Type safety verified at compile time
- If it compiles, types are correct

## 🚨 CRITICAL: Type Check is MANDATORY

```bash
npx nx test adt-contracts
npx tsc --noEmit -p packages/adt-contracts  # REQUIRED!
```

## Quick Reference

### Step 1: Identify Endpoint

```bash
npx adt discovery
```

### Step 2: Create Contract

Location: `adt-contracts/src/adt/{area}/{resource}.ts`

```typescript
import { contract } from '../../base';
import { mySchema } from '@abapify/adt-schemas-xsd';

export const myResource = {
  get: (id: string) =>
    contract({
      method: 'GET',
      path: `/sap/bc/adt/{area}/${id}`,
      headers: { Accept: 'application/xml' },
      responses: { 200: mySchema },
    }),
};
```

### Step 3: Export

- Area index: `src/adt/{area}/index.ts`
- Main index: `src/adt/index.ts`

### Step 4: Test Scenario (MANDATORY)

- Location: `tests/contracts/{area}.ts`
- Use `ContractOperation[]` type
- Tests must compile with `tsc --noEmit`

## Complete Workflow

See: `.agents/commands/adt/contract.md`
