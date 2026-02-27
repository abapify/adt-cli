---
description: Create CLI display page for ADT object type
auto_execution_mode: 3
implements: .agents/commands/adt/page.md
---

# ADT Page Workflow

**Implements:** `.agents/commands/adt/page.md`

## Usage

```bash
/adt-page <object_type>
```

## 🚨 Data Access Preference

**ALWAYS use this order - first applicable wins:**

```
1. ADK (adk-v2)      ← PREFERRED
2. Client Service    ← If ADK doesn't exist
3. Contract          ← If service doesn't exist
4. Raw Fetch         ← LAST RESORT
```

## Quick Reference

### Step 1: Create Page

Location: `adt-cli/src/lib/ui/pages/{type}.ts`

```typescript
import { definePage } from '../router';
import { AdkMyObject } from '@abapify/adk-v2';

export const myPageDef = definePage<AdkMyObject>({
  type: '{TYPE_CODE}',
  name: '{Type}',
  icon: '📦',

  // ALWAYS prefer ADK for data fetching
  fetch: async (client, params) => {
    const ctx = createAdkContext(client);
    return AdkMyObject.get(ctx, params.name); // ← ADK preferred
  },

  render: (data, params) => {
    /* ... */
  },
});
```

### Step 2: Export & Use

- Export from `ui/pages/index.ts`
- Import in command to trigger registration

## Components

- `Box(...children)` - Container
- `Section('Title', ...children)` - Titled section
- `Field('Label', 'Value')` - Key-value pair
- `Text('...')` - Plain text
- `adtLink({ name, type, uri })` - Clickable link

## Complete Workflow

See: `.agents/commands/adt/page.md`
