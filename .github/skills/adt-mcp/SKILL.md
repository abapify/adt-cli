---
name: adt-mcp
description: >
  Work with SAP ABAP systems through the adt-mcp MCP server. USE WHEN the user
  wants to read or write ABAP source code, activate objects, run unit tests or
  ATC checks, manage transports, or explore the ABAP repository via the MCP
  server. Trigger words – get source, update source, activate, check syntax,
  run unit tests, list package objects, search objects, transport request, ATC.
license: MIT
metadata:
  author: abapify
  version: '1.0'
---

Work with a SAP ABAP system via the `@abapify/adt-mcp` MCP server.

## What the server provides

The adt-mcp server exposes 17 tools covering the full ABAP development cycle:

| Tool | Purpose |
|---|---|
| `search_objects` | Find objects by name/wildcard |
| `get_object` | Get metadata for a specific object |
| `get_source` | Fetch ABAP source code |
| `update_source` | Write new source (lock → PUT → unlock) |
| `activate_object` | Activate one or more objects |
| `check_syntax` | Run syntax check, get structured messages |
| `run_unit_tests` | Run ABAP Unit, get pass/fail counts |
| `get_test_classes` | Fetch test class source for a class |
| `list_package_objects` | List objects in a package |
| `atc_run` | Run ATC checks, get findings |
| `system_info` | SAP system and session details |
| `discovery` | Available ADT services |
| `cts_list_transports` | List transport requests |
| `cts_get_transport` | Transport details |
| `cts_create_transport` | Create transport (🚧 not yet implemented) |
| `cts_release_transport` | Release transport (🚧 not yet implemented) |
| `cts_delete_transport` | Delete transport |

---

## Required connection parameters

Every tool requires these parameters (never stored, forwarded per call):

```
baseUrl   – SAP system URL, e.g. https://my-system.example.com:8000
client    – SAP client number, e.g. 100
username  – SAP username
password  – SAP password
```

If the user has not provided connection details, ask for them before proceeding.

---

## Standard workflow patterns

### 1. Read → Edit → Activate cycle

When asked to change ABAP source code:

1. **get_source** – fetch current source (`objectName`, `objectType` if known)
2. Inspect the source, make the changes in your context
3. **update_source** – write updated source (include `transport` if the system is not a local/test system)
4. **check_syntax** – verify with `version=inactive` to catch errors before activation
5. **activate_object** – activate; stop here if check_syntax reported `hasErrors: true`
6. **run_unit_tests** – confirm nothing is broken

### 2. Explore a package

```
list_package_objects  packageName=ZPACKAGE
→ for each object of interest:
    get_source   objectName=ZCL_FOO  objectType=CLAS
```

### 3. Quality check

```
check_syntax      objectName=ZCL_FOO  objectType=CLAS
atc_run           objectUri=/sap/bc/adt/oo/classes/zcl_foo
run_unit_tests    objectName=ZCL_FOO  objectType=CLAS
```

---

## Tips for effective tool use

### Passing `objectType` saves a network round-trip

`get_source`, `update_source`, `activate_object`, `check_syntax`, and `run_unit_tests` all accept an optional `objectType`. When you already know the type, always pass it:

| ABAP type | `objectType` value |
|---|---|
| Class | `CLAS` |
| Program | `PROG` |
| Interface | `INTF` |
| Function group | `FUGR` |
| Package | `DEVC` |
| Data element | `DTEL` |
| Domain | `DOMA` |
| Table | `TABL` |
| Message class | `MSAG` |

### Batch activation is more efficient

When activating multiple objects, use the `objects` array instead of calling `activate_object` once per object:

```json
{
  "objects": [
    { "objectName": "ZCL_FOO", "objectType": "CLAS" },
    { "objectName": "ZIF_FOO", "objectType": "INTF" }
  ]
}
```

### check_syntax before activate_object

Always run `check_syntax` with `version=inactive` after writing source. If `hasErrors` is `true`, do not activate — fix the errors first.

### Transport numbers

On transportable SAP systems, `update_source` requires a `transport` parameter. Ask the user for the transport number if they did not provide one, or use `cts_list_transports` to find open transports.

### Test classes

If the user asks about unit tests for a class, use `get_test_classes` to retrieve the local test class source, then `run_unit_tests` to execute them.

---

## Error handling

All tools return `isError: true` with a descriptive message when something goes wrong. Common causes:

| Error | Likely cause |
|---|---|
| `Object '...' not found` | Object name does not exist or is misspelled |
| `Activation failed` | Syntax errors or missing transport |
| `lock` / `409 Conflict` | Object is locked by another user |
| `403 Forbidden` | Wrong credentials or missing authorisation |
| `404` on source read | Object type mismatch, or inactive object has no source yet |

When `update_source` fails, the lock is automatically released (best-effort) before the error is returned.

---

## Setup reference

### Claude Desktop

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

### VS Code (GitHub Copilot)

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

For full documentation see [`packages/adt-mcp/README.md`](../../packages/adt-mcp/README.md).
