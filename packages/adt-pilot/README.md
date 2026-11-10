# @abapify/adt-pilot

[![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-pilot)](https://www.npmjs.com/package/@abapify/adt-pilot)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/abapify/adt-cli/blob/main/LICENSE)

abapify Pilot — Mastra AI agent for ABAP code review via ADT MCP.

## Install

```bash
npm install @abapify/adt-pilot
```

## Usage

```ts
import { connectMcpClient, createCodeReviewWorkflow } from '@abapify/adt-pilot';

const { callTool, client } = await connectMcpClient(transport); // MCP transport to adt-mcp
try {
  const workflow = createCodeReviewWorkflow(callTool);
  // use workflow...
} finally {
  await client.close();
}
```

## Features

- Deterministic ATC review pipeline for a package or transport (no LLM)
- `createAbapifyPilot()` — Mastra agent harness for interactive review
- Uses `@abapify/adt-mcp` as its only ADT integration

## Documentation

**[adt-cli.netlify.app/sdk/packages/adt-pilot](https://adt-cli.netlify.app/sdk/packages/adt-pilot)**

---

Part of [**abapify**](https://github.com/abapify/adt-cli) — open, typed tooling for SAP ABAP Development Tools (ADT): CLI, MCP server, and SDK.
