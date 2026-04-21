---
title: MCP Overview
sidebar_position: 1
description: Model Context Protocol server exposing SAP ADT tooling to AI assistants.
---

# MCP Overview

`@abapify/adt-mcp` is a stateless [Model Context Protocol](https://modelcontextprotocol.io/) server that bridges MCP-aware clients — Claude Code, Cursor, VS Code Copilot, and others — to SAP ABAP Development Tools (ADT). It uses the same typed contracts as the [`adt` CLI](../cli/overview.md), so every tool call goes through `@abapify/adt-client` and the XSD-driven schema pipeline. No manual XML, no ad-hoc HTTP.

The server is a **thin MCP adapter**. All business logic lives in `@abapify/adt-client`, `@abapify/adt-contracts`, and the domain packages.

## Why an MCP server?

- **Agentic ABAP workflows.** An AI assistant can search objects, read source, run syntax checks, execute ATC, create transports, and commit to gCTS — all inside the same conversation.
- **Type safety end-to-end.** Every tool is backed by a typed contract; responses are parsed against the schemas in `@abapify/adt-schemas`.
- **Same guarantees as the CLI.** CSRF sessions, lock protocol, ETag refresh, and security session semantics are handled by `@abapify/adt-client` — see [adt-client architecture](../architecture/overview.md).

## Installing and running

`adt-mcp` is published as a binary inside the monorepo. The server speaks MCP over **stdio**.

```bash
# From the monorepo
bunx nx build adt-mcp

# Run directly
node packages/adt-mcp/dist/bin/adt-mcp.js
```

### Claude Code / Claude Desktop

Add the following to your `~/.config/claude/claude_desktop_config.json` (or equivalent):

```json
{
  "mcpServers": {
    "adt": {
      "command": "node",
      "args": ["/absolute/path/to/packages/adt-mcp/dist/bin/adt-mcp.js"]
    }
  }
}
```

### Cursor

In **Settings → MCP Servers**:

```json
{
  "adt": {
    "command": "node",
    "args": ["/absolute/path/to/packages/adt-mcp/dist/bin/adt-mcp.js"]
  }
}
```

### VS Code (Copilot / other MCP clients)

Point the client at the same binary using its MCP server configuration UI. The transport is always stdio — no HTTP port, no daemon.

## Calling a tool

Tools are invoked through the standard MCP `tools/call` request. Every tool accepts the **connection parameters** (baseUrl, username, password, client) as arguments — the server is stateless and creates a fresh `AdtClient` per call.

Example raw JSON-RPC request:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "search_objects",
    "arguments": {
      "baseUrl": "https://sap.example.com:44300",
      "username": "DEVELOPER",
      "password": "***",
      "client": "100",
      "query": "ZCL_MY"
    }
  }
}
```

The response is a single text content item whose `text` field contains a JSON-serialised result:

```json
{
  "content": [
    { "type": "text", "text": "[ { \"name\": \"ZCL_MY_CLASS\", ... } ]" }
  ]
}
```

Errors are returned with `isError: true` and a human-readable message.

## Tool catalog

All 96 registered tools grouped by category. Each page documents the input schema (Zod), the underlying contract, and an example invocation.

### Discovery & system

- [`discovery`](tools/discovery.md) — list available ADT services
- [`system_info`](tools/system_info.md) — SAP system / session information
- [`get_installed_components`](tools/get_installed_components.md) — installed software components
- [`get_features`](tools/get_features.md) — enabled ADT feature toggles
- [`lookup_user`](tools/lookup_user.md) — resolve an SAP user

### Search & navigation

- [`search_objects`](tools/search_objects.md) — quick search (object name prefix)
- [`get_object`](tools/get_object.md) — fetch an object's metadata by URI
- [`grep_objects`](tools/grep_objects.md) — regex search over source
- [`grep_packages`](tools/grep_packages.md) — regex search across packages
- [`find_definition`](tools/find_definition.md) — jump to symbol definition
- [`find_references`](tools/find_references.md) — find references to a symbol
- [`get_callers_of`](tools/get_callers_of.md) — callers of a function/method
- [`get_callees_of`](tools/get_callees_of.md) — callees of a function/method
- [`get_object_structure`](tools/get_object_structure.md) — outline / structure
- [`get_type_hierarchy`](tools/get_type_hierarchy.md) — class / interface hierarchy
- [`pretty_print`](tools/pretty_print.md) — format ABAP source

### Source code

- [`get_source`](tools/get_source.md) — read source code
- [`update_source`](tools/update_source.md) — write source (lock-aware)
- [`activate_object`](tools/activate_object.md) — activate an object
- [`activate_package`](tools/activate_package.md) — activate a whole package
- [`check_syntax`](tools/check_syntax.md) — syntax check
- [`lock_object`](tools/lock_object.md) — acquire an edit lock
- [`unlock_object`](tools/unlock_object.md) — release an edit lock
- [`run_unit_tests`](tools/run_unit_tests.md) — AUnit execution
- [`get_test_classes`](tools/get_test_classes.md) — list unit-test classes
- [`run_abap`](tools/run_abap.md) — ad-hoc ABAP execution
- [`run_query`](tools/run_query.md) — data preview

### Objects – generic CRUD

- [`create_object`](tools/create_object.md) — create PROG / CLAS / INTF / FUGR / DEVC / …
- [`delete_object`](tools/delete_object.md) — delete an object
- [`clone_object`](tools/clone_object.md) — duplicate an object
- [`get_include`](tools/get_include.md) — read a class / program include
- [`create_package`](tools/create_package.md) — create a DEVC package
- [`get_package`](tools/get_package.md) — read package metadata
- [`stat_package`](tools/stat_package.md) — package statistics
- [`list_package_objects`](tools/list_package_objects.md) — enumerate package contents

### Function groups & modules

- [`get_function_group`](tools/get_function_group.md) — read FUGR metadata
- [`get_function`](tools/get_function.md) — read a function module
- [`create_function_group`](tools/create_function_group.md) — create FUGR
- [`create_function_module`](tools/create_function_module.md) — create FM
- [`delete_function_module`](tools/delete_function_module.md) — delete FM

### DDIC

- [`get_domain`](tools/get_domain.md) — read a DOMA domain
- [`get_data_element`](tools/get_data_element.md) — read a DTEL data element
- [`get_structure`](tools/get_structure.md) — read a structure
- [`get_table`](tools/get_table.md) — read a TABL table
- [`get_table_contents`](tools/get_table_contents.md) — preview rows

### CDS

- [`get_cds_ddl`](tools/get_cds_ddl.md) — read a CDS DDL view (DDLS)
- [`get_cds_dcl`](tools/get_cds_dcl.md) — read a CDS DCL role (DCLS)

### RAP / services

- [`get_bdef`](tools/get_bdef.md), [`create_bdef`](tools/create_bdef.md), [`delete_bdef`](tools/delete_bdef.md) — behavior definitions
- [`get_srvd`](tools/get_srvd.md), [`create_srvd`](tools/create_srvd.md), [`delete_srvd`](tools/delete_srvd.md) — service definitions
- [`get_srvb`](tools/get_srvb.md), [`create_srvb`](tools/create_srvb.md), [`delete_srvb`](tools/delete_srvb.md) — service bindings
- [`publish_service_binding`](tools/publish_service_binding.md) — publish a binding
- [`unpublish_srvb`](tools/unpublish_srvb.md) — unpublish a binding

### BAdI

- [`get_badi`](tools/get_badi.md) — read a BAdI implementation
- [`create_badi`](tools/create_badi.md) — create a BAdI implementation
- [`delete_badi`](tools/delete_badi.md) — delete a BAdI implementation

### CTS transports

- [`cts_list_transports`](tools/cts_list_transports.md) — list transports of a user
- [`cts_search_transports`](tools/cts_search_transports.md) — search with filters
- [`cts_get_transport`](tools/cts_get_transport.md) — read a transport
- [`cts_create_transport`](tools/cts_create_transport.md) — create a transport
- [`cts_update_transport`](tools/cts_update_transport.md) — update a transport
- [`cts_release_transport`](tools/cts_release_transport.md) — release a transport
- [`cts_reassign_transport`](tools/cts_reassign_transport.md) — reassign owner
- [`cts_delete_transport`](tools/cts_delete_transport.md) — delete a transport

### ATC

- [`atc_run`](tools/atc_run.md) — run ATC checks on an object / package

### gCTS (git-enabled CTS)

- [`gcts_list_repos`](tools/gcts_list_repos.md), [`gcts_get_repo`](tools/gcts_get_repo.md)
- [`gcts_create_repo`](tools/gcts_create_repo.md), [`gcts_clone_repo`](tools/gcts_clone_repo.md), [`gcts_delete_repo`](tools/gcts_delete_repo.md)
- [`gcts_list_branches`](tools/gcts_list_branches.md), [`gcts_create_branch`](tools/gcts_create_branch.md)
- [`gcts_checkout_branch`](tools/gcts_checkout_branch.md), [`gcts_switch_branch`](tools/gcts_switch_branch.md)
- [`gcts_commit`](tools/gcts_commit.md), [`gcts_log`](tools/gcts_log.md), [`gcts_pull`](tools/gcts_pull.md)
- [`gcts_config`](tools/gcts_config.md)

### abapGit

- [`get_git_types`](tools/get_git_types.md) — list serializable object types
- [`git_export`](tools/git_export.md) — export to abapGit format

### Import / checkin

- [`import_object`](tools/import_object.md), [`import_package`](tools/import_package.md), [`import_transport`](tools/import_transport.md)
- [`checkin`](tools/checkin.md) — push local files to SAP (inverse of import)

### STRUST (SSL certificates)

- [`list_pses`](tools/list_pses.md), [`list_certs`](tools/list_certs.md)
- [`upload_cert`](tools/upload_cert.md), [`delete_cert`](tools/delete_cert.md)

### Fiori Launchpad

- [`list_flp_catalogs`](tools/list_flp_catalogs.md)
- [`list_flp_groups`](tools/list_flp_groups.md)
- [`list_flp_tiles`](tools/list_flp_tiles.md)
- [`get_flp_tile`](tools/get_flp_tile.md)

### RFC

- [`call_rfc`](tools/call_rfc.md) — invoke a classic RFC via SOAP-over-HTTP

## Architecture notes

- **Stateless.** No session, no cached client, no credentials in memory between calls. Every request receives its own `AdtClient`.
- **Schema-driven.** All request bodies and response parsing go through schemas in `@abapify/adt-schemas` — never a manual XML parser.
- **Contract-backed.** Each tool calls exactly one typed contract from `@abapify/adt-contracts`. If an endpoint has no contract yet, a contract is added before the tool.
- **Mock server for testing.** `createMockAdtServer()` starts an in-process HTTP server backed by fixtures; see `packages/adt-mcp/tests/integration.test.ts` for examples.

## Known limitations

- **Credentials in arguments.** MCP tool calls include connection parameters in every invocation. The server never persists them — but clients do need to forward them.
- **Per-call sessions.** SAP allows one security session per user. Concurrent tool calls from the same user compete for the same slot.
- **No streaming.** Tools return a single JSON blob; long-running operations (package import, ATC runs) do not stream progress.

## See also

- [adt-mcp package AGENTS guide](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/AGENTS.md) — internal conventions
- [CLI overview](../cli/overview.md) — same contracts, CLI surface
- [Architecture](../architecture/overview.md) — session & lock protocol
