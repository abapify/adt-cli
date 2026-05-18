---
title: '@abapify/adt-pilot'
description: Mastra-based ABAP code review agent on top of ADT MCP.
---

# `@abapify/adt-pilot`

**abapify Pilot** — library for ATC-based ABAP code review using
[`@abapify/adt-mcp`](./adt-mcp) as the only ADT integration layer.

## Install

```bash
bun add @abapify/adt-pilot
```

## Modes

1. **Workflow** — deterministic pipeline: package or transport → ATC →
   `CodeReviewReport` (no LLM).
2. **Harness** — `createAbapifyPilot()` for interactive review via a Mastra
   Agent with MCP tools.

## Public API

```ts
import {
  createCodeReviewWorkflow,
  connectMcpClient,
  createAbapifyPilot,
} from '@abapify/adt-pilot';
```

## Local development

See [abapify Pilot local dev](https://github.com/abapify/adt-cli/blob/main/docs/deployment/pilot-local-dev.md).

## Dependencies

- `@mastra/core`, `@modelcontextprotocol/sdk`, `zod`
- Dev: `@abapify/adt-mcp`, `@abapify/adt-fixtures` for tests
