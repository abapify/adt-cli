---
title: adt-cli
sidebar_position: 0
description: SAP ADT tooling — CLI, MCP server, typed SDK, and plugin system.
slug: /
---

# adt-cli

SAP ABAP Development Tools (ADT) brought to the command line, to MCP clients, and to your TypeScript applications. One toolkit, three surfaces, same typed contracts underneath.

## What you can do

- **CLI** — Drive ADT from your shell: authenticate, read and write ABAP objects, manage transports, run ATC, work with gCTS.
- **MCP** — Expose ADT to AI assistants and IDEs through the Model Context Protocol.
- **SDK** — Use the same contract-driven client and schema types that power the CLI in your own code.
- **Plugins** — Extend the format layer (abapGit, gCTS) and the command surface without forking.

## Sections

- **[Getting Started](/getting-started/installation)** — Install, authenticate, and make your first call.
- **[CLI Reference](/cli/overview)** — Every command, flag, and argument.
- **[MCP Server](/mcp/overview)** — Tool catalog and client integration.
- **[SDK](/sdk/packages/overview)** — Package guides and the full ADT contract catalog.
- **[Plugins](/plugins/overview)** — abapGit, gCTS, AUnit, ATC, and writing your own.
- **[Architecture](/architecture/overview)** — How the pieces fit together.

## Get started in 30 seconds

```bash
npm i -g @abapify/adt-cli
adt auth login
adt info
```

:::tip
Already authenticated and want to try an object read? Run `adt search CL_SALV_TABLE` and then `adt get class/CL_SALV_TABLE`.
:::
