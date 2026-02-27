# adt-fixtures

**SAP ADT XML Fixtures** - Centralized test fixtures for the ADT toolkit.

## Installation

```bash
bun add adt-fixtures
```

## Usage

### Lazy Loading with Type Safety

```typescript
import { fixtures } from 'adt-fixtures';

// Nothing loads on import - completely lazy!

// Get a handle (still no loading)
const handle = fixtures.transport.single;
console.log(handle.path); // 'transport/single.xml'

// Explicitly load when needed
const xml = await handle.load();

// Or one-liner
const xml = await fixtures.transport.single.load();
```

### Load by Path

```typescript
import { load, getPath } from 'adt-fixtures';

// Load any fixture by path
const xml = await load('transport/single.xml');

// Get absolute path (for fs operations)
const path = getPath('transport/single.xml');
```

## Available Fixtures

| Category    | Fixture    | Description                    |
| ----------- | ---------- | ------------------------------ |
| `transport` | `single`   | GET transport request response |
| `transport` | `create`   | POST create transport request  |
| `atc`       | `worklist` | ATC worklist response          |
| `atc`       | `result`   | ATC check result               |

## Adding Fixtures

1. Add XML file to `fixtures/[category]/[name].xml`
2. Update `src/fixtures.ts` with typed accessor
3. Build: `npx nx build adt-fixtures`

See [AGENTS.md](./AGENTS.md) for detailed instructions.

## License

MIT
