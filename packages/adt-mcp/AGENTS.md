# adt-mcp – Agent Guide

This document covers the internal architecture, conventions, and extension patterns for the `@abapify/adt-mcp` package. Read it before adding or modifying tools.

---

## What This Package Is

`adt-mcp` is a stateless [Model Context Protocol](https://modelcontextprotocol.io/) server that bridges MCP clients (AI assistants, IDEs) to SAP ABAP Development Tools (ADT) via the same typed contracts used by `adt-cli`. It is a **thin MCP adapter** — all business logic lives in `@abapify/adt-client`, `@abapify/adt-contracts`, and the domain packages.

---

## Directory Layout

```
packages/adt-mcp/
├── src/
│   ├── bin/
│   │   └── adt-mcp.ts          # CLI entry-point (stdio transport)
│   ├── lib/
│   │   ├── server.ts           # createMcpServer() factory
│   │   ├── types.ts            # ConnectionParams, ToolContext
│   │   ├── tools/
│   │   │   ├── index.ts        # registerTools() – wires all tools
│   │   │   ├── shared-schemas.ts  # connectionShape (Zod, reused by all tools)
│   │   │   ├── utils.ts        # extractObjectReferences, resolveObjectUriFromType
│   │   │   ├── <tool-name>.ts  # one file per tool
│   │   │   └── ...
│   │   └── mock/
│   │       ├── server.ts       # createMockAdtServer() – in-process HTTP server
│   │       ├── fixtures.ts     # static XML/JSON fixtures
│   │       └── index.ts        # mock public API
└── tests/
    └── integration.test.ts     # integration tests (node:test + mock server)
```

---

## Key Invariants

### 1. One file per tool
Each MCP tool lives in `src/lib/tools/<tool-name>.ts` and exports a single `register<ToolName>Tool(server, ctx)` function. Registration is wired in `tools/index.ts`.

### 2. Schema-based serialisation – no manual XML
Request bodies and response parsing **must** go through the typed schemas in `@abapify/adt-schemas`. The `@abapify/adt-client` adapter calls `schema.build()` / `schema.parse()` automatically when a contract is used.

**Correct:**
```typescript
// body: ObjectReferencesBody (typed against adtcore schema)
await client.adt.activation.activate.post(params, body);
```

**Wrong:**
```typescript
// ❌ manual XML string + third-party parser
const xml = `<adtcore:objectReferences ...>`;
const parsed = new XMLParser().parse(rawXml);
```

If a required endpoint has no contract yet, add one to `@abapify/adt-contracts` first.

### 3. No external XML parser dependency
`fast-xml-parser`, `xml2js`, and similar libraries must not be used. The XSD→schema→contract pipeline handles all XML.

### 4. Stateless server – connection-per-call
Each tool call creates its own `AdtClient` via `ctx.getClient(args)`. The server holds no session, no cached client, and no credentials between calls.

### 5. All tools return JSON text
Every tool handler returns:
```typescript
{ content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
```
or on error:
```typescript
{ isError: true, content: [{ type: 'text', text: 'Descriptive error message' }] }
```

### 6. Zod for input validation
All tool inputs are declared with `z.string()`, `z.number()`, etc. The shared `connectionShape` (from `shared-schemas.ts`) is spread into every tool's schema.

---

## Adding a New Tool

### Step 1 – Check if a contract exists

Look in `packages/adt-contracts/src/adt/` for the relevant domain. If the endpoint you need is missing, add a contract first following the existing patterns (see `adt-contracts/AGENTS.md`).

### Step 2 – Create the tool file

```typescript
// src/lib/tools/my-new-tool.ts
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types.js';
import { connectionShape } from './shared-schemas.js';

export function registerMyNewTool(server: McpServer, ctx: ToolContext): void {
  server.tool(
    'my_new_tool',
    'One-line description shown to the AI client',
    {
      ...connectionShape,
      myParam: z.string().describe('What this parameter does'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        const result = await client.adt.someNamespace.someEndpoint(args.myParam);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: `My new tool failed: ${error instanceof Error ? error.message : String(error)}` }],
        };
      }
    },
  );
}
```

### Step 3 – Register in tools/index.ts

```typescript
import { registerMyNewTool } from './my-new-tool.js';
// ...
export function registerTools(server: McpServer, ctx: ToolContext): void {
  // ... existing tools
  registerMyNewTool(server, ctx);
}
```

### Step 4 – Add mock fixture and integration test

1. Add a fixture response to `src/lib/mock/fixtures.ts`
2. Add a route handler in `src/lib/mock/server.ts` (`matchRoute` function)
3. Add a `describe` block in `tests/integration.test.ts`

### Step 5 – Update README and feature parity table

Update `README.md` with the new tool's parameters and return shape, and update the **Feature Parity Map** table.

---

## Object URI Resolution

Most tools that target a specific object use `resolveObjectUriFromType()` first (zero-network, type-based), then fall back to `quickSearch`:

```typescript
let objectUri = args.objectType
  ? resolveObjectUriFromType(args.objectType, args.objectName)
  : undefined;

if (!objectUri) {
  const searchResult = await client.adt.repository.informationsystem.search.quickSearch({
    query: args.objectName,
    maxResults: 10,
  });
  const match = extractObjectReferences(searchResult).find(
    (o) => String(o.name ?? '').toUpperCase() === args.objectName.toUpperCase(),
  );
  if (!match?.uri) return notFoundError(args.objectName);
  objectUri = match.uri;
}
```

`resolveObjectUriFromType` lives in `utils.ts` and covers the most common SAP object types (PROG, CLAS, INTF, FUGR, DEVC, TABL, DOMA, DTEL, MSAG). Extend it if you need to handle new types.

---

## Lock Protocol (update_source)

Source writes follow the SAP ADT security-session lock protocol via `@abapify/adt-locks`:

```
1. createLockService(client).lock(objectUri, { transport })  → lockHandle
2. PUT source to  objectUri/source/main?lockHandle=...
3. createLockService(client).unlock(objectUri, { lockHandle })
```

Always unlock in a `finally`-equivalent catch block to avoid stuck locks.

---

## Mock Server

`createMockAdtServer()` starts an in-process `http.Server` on a random port. It:
- Returns a fresh random CSRF token per instance (no hardcoded secrets)
- Routes requests via `matchRoute(method, url)` in `server.ts`
- Loads static XML/JSON fixtures from `fixtures.ts`

To add a new endpoint to the mock:
1. Add the fixture string/object to `fixtures.ts`
2. Add an `if` branch in `matchRoute()` in `server.ts`
3. Add the corresponding `describe` + `it` in `integration.test.ts`

---

## Build & Verify

```bash
bunx nx build adt-mcp      # tsdown build
bunx nx typecheck adt-mcp  # tsc --noEmit
bunx nx lint adt-mcp       # ESLint
bunx nx test adt-mcp       # integration tests (node:test)
bunx nx format:write       # Prettier (run before every commit)
```

---

## Dependency Rules

`adt-mcp` may depend on:

| Package | Purpose |
|---------|---------|
| `@abapify/adt-client` | Typed ADT client (contracts + HTTP adapter) |
| `@abapify/adt-contracts` | ADT endpoint contracts |
| `@abapify/adt-schemas` | Schema types for typed body/response |
| `@abapify/adt-locks` | Lock/unlock protocol implementation |
| `@modelcontextprotocol/sdk` | MCP server primitives |
| `zod` | Input validation |

It must **not** depend on:
- `@abapify/adt-cli` (would create a circular via plugin system)
- `fast-xml-parser`, `xml2js`, or any other XML parser
- Any SAP domain plugin packages (`@abapify/adt-atc`, etc.) — use contracts instead
