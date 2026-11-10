# @abapify/adt-mcp

[![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-mcp)](https://www.npmjs.com/package/@abapify/adt-mcp)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/abapify/adt-cli/blob/main/LICENSE)

MCP server for SAP ADT operations – exposes adt-cli features as MCP tools.

## Install

```bash
npm install -g @abapify/adt-mcp
```

## Usage

For VS Code (`.vscode/mcp.json`):

```json
{
  "servers": {
    "adt": {
      "type": "stdio",
      "command": "npx",
      "args": ["@abapify/adt-mcp"]
    }
  }
}
```

For Claude Desktop / Cursor / Windsurf (`mcpServers` format):

```json
{
  "mcpServers": {
    "adt": {
      "command": "npx",
      "args": ["@abapify/adt-mcp"]
    }
  }
}
```

For a shared, session-aware server run `adt-mcp-http` (Streamable HTTP). See [MCP setup](https://adt-cli.netlify.app/getting-started/mcp-setup) for client-specific configuration details.

## Features

- ABAP read/write, activation, ATC, ABAP Unit, and transports as MCP tools
- Same service layer as `adt` — CLI and MCP behave identically
- stdio (`adt-mcp`) and Streamable HTTP (`adt-mcp-http`) transports

## Documentation

**[adt-cli.netlify.app/mcp/overview](https://adt-cli.netlify.app/mcp/overview)**

---

Part of [**abapify**](https://github.com/abapify/adt-cli) — open, typed tooling for SAP ABAP Development Tools (ADT): CLI, MCP server, and SDK.
