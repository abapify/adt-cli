# ADT CLI Command Creation Workflow

Create CLI commands for ADT object types.

## Usage

```bash
/adt-command <object_type>
```

**Example:** `/adt-command transport`

## Prerequisites

- ADK model implemented via `/adt-adk` workflow
- Understanding of CLI patterns in `adt-cli`

## Fundamental Concepts

### Data Access Preference Hierarchy

**ALWAYS prefer higher-level abstractions. Use the first applicable option:**

```
1. ADK (adk-v2)           ← PREFERRED - High-level object facade
   │                        Full type safety, lazy loading, CRUD+actions
   │                        Example: AdkTransportRequest.get(ctx, number)
   ▼
2. Client Service         ← If ADK doesn't exist yet
   │                        Business logic layer
   │                        Example: client.services.transports.get(number)
   ▼
3. Contract               ← If service doesn't exist
   │                        Type-safe API definition
   │                        Example: client.execute(transportContract.get(number))
   ▼
4. Raw Fetch              ← LAST RESORT - Only if nothing else applies
                            Direct HTTP call
                            Example: client.fetch('/sap/bc/adt/cts/...')
```

**Why this order?**

- **ADK** - Encapsulates business logic, relationships, lazy loading
- **Service** - Reusable business logic, error handling
- **Contract** - Type-safe but low-level
- **Fetch** - No type safety, manual parsing

### Command Architecture

```
┌─────────────────────────────────────┐
│ Commands (get, list, create, etc.) │
│ - Handles CLI args, auth, progress  │
│ - Uses ADK for object operations    │
└─────────────┬───────────────────────┘
              │ Prefer: ADK > Service > Contract > Fetch
              ▼
┌─────────────────────────────────────┐
│ ADK Objects (adk-v2)                │
│ - Type-safe object models           │
│ - Lazy loading, CRUD operations     │
└─────────────────────────────────────┘
```

### Command Patterns

**Full CRUD cycle:**

- `get <id>` - Display single object
- `list` - List objects with filters
- `create` - Create new object
- `update <id>` - Modify object
- `delete <id>` - Delete object
- `{action} <id>` - Object-specific actions

### Client Initialization

**ALWAYS use shared helper:**

```typescript
import { getAdtClientV2 } from '../utils/adt-client-v2';
import { AdkTransportRequest } from '@abapify/adk-v2';

// Get client - this also initializes ADK global context automatically
const client = await getAdtClientV2();

// Use ADK directly - no context needed!
const transport = await AdkTransportRequest.get(number);
```

**Key points:**

- `getAdtClientV2()` automatically initializes ADK global context
- ADK objects can be used without passing context explicitly
- Context is optional - pass it only for testing or multi-connection scenarios

**NEVER import v1 directly in commands.**

## Workflow Steps

### Step 1: Create Command File

**Location:** `adt-cli/src/lib/commands/{area}/{type}.ts`

**Pattern:**

```typescript
/**
 * adt {area} {type} - {Type} commands
 *
 * Uses ADK ({AdkType}) for operations.
 */

import { Command } from 'commander';
import { getAdtClientV2 } from '../../utils/adt-client-v2';
import { createProgressReporter } from '../../utils/progress-reporter';
import { createCliLogger } from '../../utils/logger-config';
import { router } from '../../ui/router';
// Import to trigger page registration
import '../../ui/pages/{type}';

export const {type}Command = new Command('{type}')
  .description('Manage {type} objects');

// GET subcommand
{type}Command
  .command('get <id>')
  .description('Get {type} details')
  .option('--json', 'Output as JSON')
  .action(async function(this: Command, id: string, options) {
    const globalOpts = this.optsWithGlobals?.() ?? {};
    const logger = createCliLogger({ verbose: globalOpts.verbose });
    const progress = createProgressReporter({ compact: !globalOpts.verbose, logger });

    try {
      const client = await getAdtClientV2();
      progress.step(`🔍 Getting {type} ${id}...`);

      // Use router for page-based display
      const page = await router.navTo(client, '{TYPE_CODE}', { name: id });
      progress.clear();

      if (options.json) {
        // Raw JSON output
        const data = await client.services.{types}.get(id);
        console.log(JSON.stringify(data, null, 2));
      } else {
        page.print();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      progress.done(`❌ Failed: ${message}`);
      process.exit(1);
    }
  });

// LIST subcommand
{type}Command
  .command('list')
  .description('List {type} objects')
  .option('-p, --package <package>', 'Filter by package')
  .option('-u, --user <user>', 'Filter by user')
  .option('--json', 'Output as JSON')
  .action(async function(this: Command, options) {
    // ... similar pattern
  });

// CREATE subcommand (if applicable)
{type}Command
  .command('create')
  .description('Create new {type}')
  .requiredOption('-d, --description <desc>', 'Description')
  .option('-p, --package <package>', 'Target package')
  .action(async function(this: Command, options) {
    // ... similar pattern
  });

// Object-specific actions
{type}Command
  .command('release <id>')
  .description('Release {type}')
  .action(async function(this: Command, id: string) {
    // ... similar pattern
  });
```

### Step 2: Create Index Export

**Location:** `adt-cli/src/lib/commands/{area}/index.ts`

```typescript
import { Command } from 'commander';
import { {type}Command } from './{type}';

export const {area}Command = new Command('{area}')
  .description('{Area} commands')
  .addCommand({type}Command);
```

### Step 3: Register in CLI

**Location:** `adt-cli/src/lib/cli.ts`

```typescript
import { {area}Command } from './commands/{area}';

program.addCommand({area}Command);
```

### Step 4: Add Tests

**Location:** `adt-cli/src/lib/commands/{area}/{type}.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { {type}Command } from './{type}';

describe('{type} command', () => {
  it('should have get subcommand', () => {
    const getCmd = {type}Command.commands.find(c => c.name() === 'get');
    expect(getCmd).toBeDefined();
    expect(getCmd?.description()).toContain('details');
  });

  it('should have list subcommand', () => {
    const listCmd = {type}Command.commands.find(c => c.name() === 'list');
    expect(listCmd).toBeDefined();
  });

  // Test command structure, not execution
  // Execution tests require mocking client
});
```

## Output Formatting Guidelines

### Emoji Indicators

- 🔄 - Loading/in progress
- 🔍 - Searching
- 📋 - Listing results
- ✅ - Success
- ❌ - Error
- 💡 - Hint/tip
- 💾 - File saved

### JSON Output

**Always add `--json` flag:**

```typescript
if (options.json) {
  console.log(JSON.stringify(data, null, 2));
} else {
  // Human-readable format via page
  page.print();
}
```

### Error Handling

```typescript
try {
  // Command logic
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error('❌ Command failed:', message);
  process.exit(1);
}
```

## Integration with Pages

Commands should use the router for display:

```typescript
import { router } from '../../ui/router';
import '../../ui/pages/{type}'; // Trigger page registration

// In action handler:
const page = await router.navTo(client, '{TYPE_CODE}', { name: id });
page.print();
```

This separates:

- **Command** - Handles CLI args, options, auth, progress
- **Page** - Handles data fetching and rendering

## Checklist

- [ ] Command file created with CRUD subcommands
- [ ] Uses `getAdtClientV2()` for client
- [ ] Uses router for page-based display
- [ ] Has `--json` option for machine output
- [ ] Proper error handling with emoji indicators
- [ ] Exported from area index
- [ ] Registered in cli.ts
- [ ] Basic tests for command structure

## Related

- `/adt-page` - Page creation (display logic)
- `/adt-adk` - Full object type implementation
