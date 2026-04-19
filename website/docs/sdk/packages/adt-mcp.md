---
title: '@abapify/adt-mcp'
description: MCP server exposing ADT operations to AI clients.
---

# `@abapify/adt-mcp`

Stateless [Model Context Protocol](https://modelcontextprotocol.io) server that
exposes ADT operations as MCP tools. A thin adapter — all logic lives in
[`adt-client`](./adt-client), [`adt-contracts`](./adt-contracts), and domain
packages.

## Install

```bash
bun add @abapify/adt-mcp
adt-mcp   # runs stdio transport
```

## Public API

```ts
export { createMcpServer, type McpServerOptions } from '@abapify/adt-mcp';
export { registerTools } from '@abapify/adt-mcp';
```

## Usage

```ts
import { createMcpServer } from '@abapify/adt-mcp';
const server = createMcpServer({
  /* options */
});
await server.start();
```

## Dependencies

- `@abapify/adt-client`, `@abapify/adt-contracts`, `@abapify/adt-schemas`,
  `@abapify/adt-locks`, `@modelcontextprotocol/sdk`, `zod`.

## See also

- [MCP overview](../../mcp/overview)
- Package internals: [`packages/adt-mcp/AGENTS.md`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/AGENTS.md)
