# abapify Pilot — Local Development

Run the MCP server and Mastra Playground agent locally in a few steps.

## Architecture

```text
adt.config.ts  (SAP destinations: DEV, QAS, …)
      │  ADT_CONFIG_FILE
      ▼
adt-mcp-http  :3001   ──── POST /mcp ────►  mastra dev API  :4111
  Streamable HTTP MCP                         Mastra Playground UI  :4112
```

## Prerequisites

| Requirement         | Notes                             |
| ------------------- | --------------------------------- |
| Node ≥ 20           | Required by Mastra                |
| bun                 | Monorepo package manager          |
| LiteLLM proxy       | Or any OpenAI-compatible endpoint |
| SAP system with ADT | Accessible from your machine      |

## Step 1 — SAP system configuration

Create or update `adt.config.ts` at the repo root (or any path):

```ts
import { defineConfig } from '@abapify/adt-config';

export default defineConfig({
  destinations: {
    DEV: {
      type: '@abapify/adt-auth/plugins/basic',
      options: {
        url: 'https://your-sap-dev-system.example.com',
        client: '100',
      },
    },
  },
});
```

> **Security note**: do not add `username`/`password` to `adt.config.ts`.
> The MCP server drops credentials from disk config intentionally.
> Supply them at runtime via the `sap_connect` MCP tool.

## Step 2 — Environment configuration

```bash
cp .env.example .env
```

Edit `.env` (root of repo):

```env
# LiteLLM proxy
LITELLM_BASE_URL=http://127.0.0.1:4000
LITELLM_API_KEY=sk-your-key
MODEL=openai/gpt-4o

# MCP server settings (env vars picked up by adt-mcp-http)
MCP_PORT=3001
MCP_HOST=127.0.0.1
MCP_CORS_ORIGIN=http://localhost:4112

# TLS is mandatory — generate a dev pair once (see .env.example) and
# point both vars at it. Paths are relative to packages/adt-mcp/.
MCP_TLS_CERT=../../cert.pem
MCP_TLS_KEY=../../key.pem

# Optional: path to adt.config.ts (relative to packages/adt-mcp/)
ADT_CONFIG_FILE=../../adt.config.ts
```

## Step 3 — Build MCP server

```bash
bunx nx build adt-mcp
```

## Step 4 — Start both servers

```bash
# Mastra's MCPClient must trust the dev cert — Node only reads
# NODE_EXTRA_CA_CERTS at process start, so export it in the shell
# (dotenv/.env is applied too late). Run from the repo root:
export NODE_EXTRA_CA_CERTS="$PWD/cert.pem"

bun run dev:pilot
```

This starts:

- `adt-mcp-http` via `bunx nx run adt-mcp:serve`
- `mastra dev` via `bunx mastra dev --dir src/mastra --env .env`

## Step 5 — Open the Playground

Navigate to **http://localhost:4112** in your browser.

Select the **abapify Pilot – Review** agent and start a conversation:

```text
Connect to SAP system DEV, then review package ZPACKAGE and summarize ATC findings.
```

Use the `sap_connect` tool for credentials (never paste passwords into the chat).
The agent calls `list_package_objects` and `atc_run` via the MCP server.

## Alternatively — run servers separately

**MCP server only** — run these from the **repo root** (the `./cert.pem`
paths below are relative to your shell's cwd, unlike Step 2's `.env`
paths which are relative to `packages/adt-mcp/`):

```bash
# With adt-config (cert.pem/key.pem generated per .env.example)
ADT_CONFIG_FILE=./adt.config.ts MCP_PORT=3001 MCP_CORS_ORIGIN='*' \
  MCP_TLS_CERT=./cert.pem MCP_TLS_KEY=./key.pem \
  node packages/adt-mcp/dist/bin/adt-mcp-http.mjs

# Without adt-config (pass SAP URL per-call via sap_connect)
MCP_PORT=3001 MCP_CORS_ORIGIN='*' \
  MCP_TLS_CERT=./cert.pem MCP_TLS_KEY=./key.pem \
  node packages/adt-mcp/dist/bin/adt-mcp-http.mjs
```

**Mastra Playground only** (MCP must already be running):

```bash
cd packages/adt-pilot
bunx mastra dev --dir ../../src/mastra --env .env
```

## Healthcheck

```bash
curl --cacert cert.pem https://localhost:3001/healthz
# → {"status":"ok","sessions":0}
```

## Troubleshooting

| Symptom                      | Fix                                                              |
| ---------------------------- | ---------------------------------------------------------------- |
| `LITELLM_API_KEY` not set    | Add it to the repo root `.env`                                   |
| MCP server not found         | Check that `MCP_SERVER_URL` points to the running `adt-mcp-http` |
| `ADT_CONFIG_FILE` path error | Use an absolute path or a path relative to `packages/adt-mcp/`   |
| Destination has no URL       | Ensure `options.url` is set in `adt.config.ts`                   |
| CORS error from Playground   | Set `MCP_CORS_ORIGIN=http://localhost:4112` (or `*` for dev)     |
