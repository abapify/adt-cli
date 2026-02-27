---
description: Create CLI command for ADT object type
auto_execution_mode: 3
implements: .agents/commands/adt/command.md
---

# ADT Command Workflow

**Implements:** `.agents/commands/adt/command.md`

## Usage

```bash
/adt-command <object_type>
```

## 🚨 Data Access Preference

**ALWAYS use this order - first applicable wins:**

```
1. ADK (adk-v2)      ← PREFERRED
2. Client Service    ← If ADK doesn't exist
3. Contract          ← If service doesn't exist
4. Raw Fetch         ← LAST RESORT
```

**Example:**

```typescript
// ✅ PREFERRED - Use ADK
const transport = await AdkTransportRequest.get(ctx, number);

// ⚠️ Only if ADK doesn't exist
const data = await client.services.transports.get(number);

// ⚠️ Only if service doesn't exist
const data = await client.execute(contract.get(number));

// ❌ LAST RESORT
const data = await client.fetch('/sap/bc/adt/...');
```

## Quick Reference

### Step 1: Create Command

Location: `adt-cli/src/lib/commands/{area}/{type}.ts`

```typescript
import { getAdtClientV2 } from '../../utils/adt-client-v2';
import { AdkMyObject } from '@abapify/adk-v2';

// Use ADK for operations
const ctx = createAdkContext(client);
const obj = await AdkMyObject.get(ctx, id);
```

### Step 2: Export & Register

- Export from `commands/{area}/index.ts`
- Register in `cli.ts`

## Complete Workflow

See: `.agents/commands/adt/command.md`
