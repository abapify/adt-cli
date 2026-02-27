# @abapify/adt-config

Configuration loader for ADT CLI. Loads destinations from `adt.config.ts/json` files.

## Installation

```bash
npm install @abapify/adt-config
```

## Usage

### Configuration File

Create `adt.config.ts` in your project root:

```typescript
import { defineConfig } from '@abapify/adt-config';

export default defineConfig({
  destinations: {
    DEV: {
      type: 'puppeteer',
      options: {
        url: 'https://dev.sap.example.com',
        client: '100',
      },
    },
    QAS: {
      type: 'basic',
      options: {
        url: 'https://qas.sap.example.com',
        client: '100',
      },
    },
  },
});
```

### Loading Config

```typescript
import { loadConfig } from '@abapify/adt-config';

const config = await loadConfig();

// Get specific destination
const dest = config.getDestination('DEV');

// List all destination names
const names = config.listDestinations(); // ['DEV', 'QAS']

// Check if destination exists
if (config.hasDestination('DEV')) {
  // ...
}

// Access raw config (for future extensions)
console.log(config.raw);
```

## Architecture

```
CLI (adt-cli)
    │
    ├── @abapify/adt-config (this package)
    │   └── loads destinations from adt.config.ts/json
    │
    ├── @abapify/adt-auth
    │   ├── auth methods (basic, slc, oauth, puppeteer)
    │   └── session management (~/.adt/sessions/)
    │
    └── @abapify/adt-client
        └── HTTP client (receives session at runtime)
```

## Config Precedence

1. `adt.config.ts` (project - TypeScript)
2. `adt.config.json` (project - JSON)
3. `~/.adt/config.json` (global defaults)
