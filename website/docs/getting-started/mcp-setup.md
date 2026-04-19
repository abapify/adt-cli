---
title: MCP Setup
sidebar_position: 4
description: Wire the adt-mcp server into Claude Code, Cursor, VS Code, and generic MCP clients.
---

# MCP Setup

`@abapify/adt-mcp` is a [Model Context Protocol](https://modelcontextprotocol.io/) server that exposes the same typed contracts as the CLI to any MCP-aware AI client. It speaks MCP over **stdio** and is stateless — every tool call carries its own SAP connection parameters.

See the [MCP overview](../mcp/overview.md) for architecture, or jump straight to the [tool reference](../mcp/tools/discovery.md).

## Install

```bash
# Global install (recommended for IDE integration)
npm install -g @abapify/adt-mcp

# Or run on demand with npx / bunx — no install required
npx -y @abapify/adt-mcp
bunx @abapify/adt-mcp
```

Verify it starts and speaks MCP:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | npx -y @abapify/adt-mcp
```

You should see a JSON-RPC response listing 100+ tools (`discovery`, `get_object`, `activate_object`, `cts_list_transports`, …).

## Credentials model

`adt-mcp` does **not** read `~/.adt/auth.json`. It holds no session between calls. Each tool invocation accepts connection parameters:

| Field      | Required | Example                         |
| ---------- | -------- | ------------------------------- |
| `baseUrl`  | ✓        | `https://sap.example.com:44300` |
| `username` | ✓        | `DEVELOPER`                     |
| `password` | ✓        | `...`                           |
| `client`   | optional | `100`                           |
| `language` | optional | `EN`                            |

Most MCP clients let you pin default values via `env` so the AI doesn't have to repeat them. The examples below do exactly that.

:::warning
Credentials live in plain text inside the MCP client's config file. Use a service account with the minimum authorizations needed, not your personal user.
:::

## Claude Code

```bash
claude mcp add adt -- npx -y @abapify/adt-mcp
```

Or edit `~/.claude/mcp_servers.json` manually:

```json
{
  "mcpServers": {
    "adt": {
      "command": "npx",
      "args": ["-y", "@abapify/adt-mcp"],
      "env": {
        "ADT_BASE_URL": "https://sap.example.com:44300",
        "ADT_USERNAME": "DEVELOPER",
        "ADT_PASSWORD": "...",
        "ADT_CLIENT": "100"
      }
    }
  }
}
```

Restart Claude Code. You should see `adt` in the MCP panel with all tools listed.

## Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%/Claude/claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "adt": {
      "command": "npx",
      "args": ["-y", "@abapify/adt-mcp"]
    }
  }
}
```

## Cursor

Add to `~/.cursor/mcp.json` (or the workspace-level `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "adt": {
      "command": "npx",
      "args": ["-y", "@abapify/adt-mcp"],
      "env": {
        "ADT_BASE_URL": "https://sap.example.com:44300",
        "ADT_USERNAME": "DEVELOPER",
        "ADT_PASSWORD": "...",
        "ADT_CLIENT": "100"
      }
    }
  }
}
```

Reload the Cursor window; the ADT tools appear in the chat tool picker.

## VS Code (GitHub Copilot Chat)

With the MCP-enabled Copilot Chat preview, edit `.vscode/mcp.json` in the workspace:

```json
{
  "servers": {
    "adt": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@abapify/adt-mcp"]
    }
  }
}
```

Or add to user settings (`settings.json`) under `"chat.mcp.servers"`.

## Generic JSON-RPC client

Any client that can spawn a process and exchange JSON-RPC messages on stdio works. Minimal smoke test:

```bash
npx -y @abapify/adt-mcp
```

Then send:

```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{}}}
{"jsonrpc":"2.0","id":2,"method":"tools/list"}
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"discovery","arguments":{"baseUrl":"https://sap.example.com","username":"DEVELOPER","password":"...","client":"100"}}}
```

## Running from source

Cloning the monorepo and pointing the client at the built binary is useful when tracking `main`:

```json
{
  "mcpServers": {
    "adt": {
      "command": "node",
      "args": ["/absolute/path/adt-cli/packages/adt-mcp/dist/bin/adt-mcp.js"]
    }
  }
}
```

Rebuild with `bunx nx build adt-mcp` after each pull.

## First AI prompts to try

Once the server is connected, ask your assistant things like:

- "Use the `discovery` tool against my DEV system and summarize the collections."
- "Run `get_object` on `ZCL_MY_CLASS` and explain the public interface."
- "List my open transports with `cts_list_transports`."
- "Run ATC on package `$TMP` using `atc_run` and report only priority 1–2 findings."
- "Call `check_syntax` on the current class source and tell me what to fix."

## Troubleshooting

### Tool calls return 401 / 403

The env vars are missing or wrong. MCP clients don't always surface `stderr`; run the server manually (`npx -y @abapify/adt-mcp`) to see errors.

### `spawn npx ENOENT`

The client can't find `npx` on `PATH`. Use the absolute path (`/usr/local/bin/npx`) or install the CLI globally and call `adt-mcp` directly.

### Tools list is empty

The client connected but hasn't initialized. Restart the client; ensure the server's stdout is not being intercepted by a wrapper script.

## Next steps

- Browse the [full MCP tool reference](../mcp/overview.md).
- Compare tool semantics with the [CLI overview](../cli/overview.md).
- [Take the 10-minute quick tour](./quick-tour.md) to see the end-to-end flow.
