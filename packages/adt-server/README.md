# @abapify/adt-server

[![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-server)](https://www.npmjs.com/package/@abapify/adt-server)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/abapify/adt-cli/blob/main/LICENSE)

Destination-aware ADT sidecar for MCP and safe REST access.

## Install

```bash
npm install -g @abapify/adt-server
```

## Usage

```bash
adt-server
```

Required environment:

| Variable                              | Purpose                                        |
| ------------------------------------- | ---------------------------------------------- |
| `ADT_BROKER_BASE_URL`                 | URL of the credential broker                   |
| `ADT_SERVER_BROKER_TOKEN_FILE`        | Path to the file holding the broker credential |
| `ADT_SERVER_HOST` / `ADT_SERVER_PORT` | Bind address (optional)                        |

## Features

- Destination-aware sidecar: credentials stay in the broker, not the agent
- Read-only REST API (`/v1/destinations/...`) with OpenAPI document
- MCP endpoint for AI agents with deadlines and abort handling

## Documentation

**[adt-cli.netlify.app/sdk/packages/adt-server](https://adt-cli.netlify.app/sdk/packages/adt-server)**

---

Part of [**abapify**](https://github.com/abapify/adt-cli) — open, typed tooling for SAP ABAP Development Tools (ADT): CLI, MCP server, and SDK.
