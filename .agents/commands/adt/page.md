# ADT CLI Page Creation Workflow

Create CLI display pages for ADT object types.

## Usage

```bash
/adt-page <object_type>
```

**Example:** `/adt-page transport`

## Prerequisites

- ADK model implemented via `/adt-adk` workflow
- Understanding of page patterns in `adt-cli/src/lib/ui/`

## Fundamental Concepts

### Data Access Preference Hierarchy

**ALWAYS prefer higher-level abstractions. Use the first applicable option:**

```
1. ADK (adk-v2)           ← PREFERRED - High-level object facade
   │                        Full type safety, lazy loading, relationships
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

### Page Architecture

Pages are **self-registering display components** that:

- Fetch data using ADK objects (preferred)
- Render formatted output for terminal
- Register with the router on import

```
┌─────────────────────────────────────┐
│ Command (get, list, etc.)          │
│ - Handles CLI args, auth, progress  │
└─────────────┬───────────────────────┘
              │ router.navTo(client, type, params)
              ▼
┌─────────────────────────────────────┐
│ Router                              │
│ - Finds registered page by type     │
│ - Calls page.fetch() then render()  │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ Page                                │
│ - fetch: Load data via ADK          │
│ - render: Build component tree      │
│ - print: Output to terminal         │
└─────────────────────────────────────┘
```

### Component System

Pages use a component tree for rendering:

```typescript
import { Box, Field, Section, Text, adtLink } from '../components';

// Components are composable
const content = Box(
  Section(
    '▼ Properties',
    Field('Name', obj.name),
    Field('Description', obj.description),
  ),
  Section('▼ Details', Text('Additional info...')),
);
```

### Self-Registration Pattern

Pages register themselves when imported:

```typescript
import { definePage } from '../router';

export const myPageDef = definePage<MyData>({
  type: 'MYTYPE', // Object type code
  name: 'My Object',
  icon: '📦',
  fetch: async (client, params) => {
    /* ... */
  },
  render: (data, params) => {
    /* ... */
  },
});
```

## Workflow Steps

### Step 1: Create Page File

**Location:** `adt-cli/src/lib/ui/pages/{type}.ts`

**Pattern:**

````typescript
/**
 * {Type} Page
 *
 * Self-registering page for {type} objects using ADK.
 *
 * Note: ADK global context is automatically initialized by getAdtClientV2().
 * No need to create context manually - just use ADK objects directly.
 */

import type { Page, Component } from '../types';
import type { NavParams } from '../router';
import { Adk{Type} } from '@abapify/adk-v2';
import { Box, Field, Section, Text, adtLink } from '../components';
import { createPrintFn } from '../render';
import { definePage } from '../router';

// =============================================================================
// Types
// =============================================================================

/**
 * Page navigation parameters
 */
export interface {Type}Params extends NavParams {
  /** Object name/ID */
  name?: string;
  /** Additional display options */
  showDetails?: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format date for display
 */
function formatDate(date: Date | undefined): string {
  if (!date) return '-';
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// =============================================================================
// Render Function
// =============================================================================

/**
 * Render {type} page
 */
function render{Type}Page(data: Adk{Type}, params: NavParams): Page {
  const showDetails = (params.showDetails as boolean | undefined) ?? false;

  // Build content sections
  const sections: Component[] = [];

  // Properties section with ADT link
  const objectLink = adtLink({ name: data.name, type: data.type, uri: data.objectUri });

  sections.push(Section('▼ Properties',
    Field('Name', data.name),
    Field('Description', data.description || '-'),
    Field('Package', data.package || '-'),
    Field('ADT Link', objectLink),
  ));

  // Additional sections based on showDetails
  if (showDetails) {
    sections.push(Section('▼ Details',
      Field('Created By', data.createdBy || '-'),
      Field('Created At', formatDate(data.createdAt)),
      Field('Changed By', data.changedBy || '-'),
      Field('Changed At', formatDate(data.changedAt)),
    ));
  }

  const content = Box(...sections);

  const page: Page = {
    title: `{Type}: ${data.name}`,
    icon: '📦',
    render: () => content.render(),
    print: () => {},
  };

  page.print = createPrintFn(page);
  return page;
}

// =============================================================================
// Page Definition
// =============================================================================

/**
 * {Type} Page Definition
 *
 * Self-registers with the router on import.
 * Type: {TYPE_CODE}
 *
 * Usage:
 * ```ts
 * const page = await router.navTo(client, '{TYPE_CODE}', {
 *   name: 'OBJECT_NAME',
 *   showDetails: true
 * });
 * page.print();
 * ```
 */
export const {type}PageDef = definePage<Adk{Type}>({
  type: '{TYPE_CODE}',
  name: '{Type}',
  icon: '📦',

  // ADK global context is auto-initialized by getAdtClientV2()
  // Just use ADK objects directly - no context needed!
  fetch: async (_client, params) => {
    if (!params.name) throw new Error('{Type} name is required');
    // Use ADK (PREFERRED) - context is global, no need to pass it
    return Adk{Type}.get(params.name);
  },

  render: render{Type}Page,
});

export default {type}PageDef;
````

### Step 2: Export from Index

**Location:** `adt-cli/src/lib/ui/pages/index.ts`

```typescript
export { {type}PageDef } from './{type}';
```

### Step 3: Register Routes (if needed)

**Location:** `adt-cli/src/lib/ui/routes.ts`

Routes are auto-registered via `definePage()`, but you can add aliases:

```typescript
import './{type}'; // Triggers self-registration
```

### Step 4: Import in Command

**Location:** `adt-cli/src/lib/commands/{area}/{type}.ts`

```typescript
// Import to trigger page registration
import '../../ui/pages/{type}';

// Use in action:
const page = await router.navTo(client, '{TYPE_CODE}', { name: id });
page.print();
```

## Component Reference

### Available Components

```typescript
import { Box, Field, Section, Text, adtLink } from '../components';

// Box - Container for other components
Box(...children);

// Section - Titled section with children
Section('▼ Title', ...children);

// Field - Label: Value pair
Field('Label', 'Value');

// Text - Plain text
Text('Some text');

// adtLink - Clickable ADT link (terminal hyperlink)
adtLink({ name: 'OBJ', type: 'CLAS', uri: '/sap/bc/adt/...' });
```

### Custom Components

```typescript
function MyComponent(data: MyData): Component {
  return {
    render: () => `Custom: ${data.value}`,
  };
}
```

## Page Definition Interface

```typescript
interface PageDefinition<T> {
  /** Object type code (e.g., 'CLAS', 'RQRQ') */
  type: string;

  /** Display name */
  name: string;

  /** Icon emoji */
  icon: string;

  /** Fetch data from client */
  fetch: (client: AdtClient, params: NavParams) => Promise<T>;

  /** Render page from data */
  render: (data: T, params: NavParams) => Page;
}
```

## Checklist

- [ ] Page file created with proper structure
- [ ] Uses ADK for data fetching
- [ ] Uses component system for rendering
- [ ] Self-registers via `definePage()`
- [ ] Exported from pages index
- [ ] Imported in command file
- [ ] Supports relevant display options (showDetails, etc.)

## Related

- `/adt-command` - Command creation (uses pages)
- `/adt-adk` - Full object type implementation
