---
title: flp — Fiori Launchpad
sidebar_position: 30
description: Fiori Launchpad (FLP) inventory — read-only.
---

# `adt flp`

Fiori Launchpad (FLP) inventory commands. **Read-only**. Wraps the
Page-Builder APIs used by the FLP Designer.

## Subcommands

| Command                 | Description                                         |
| ----------------------- | --------------------------------------------------- |
| `adt flp list-catalogs` | List Fiori Launchpad catalogs.                      |
| `adt flp list-groups`   | List Fiori Launchpad groups (Page Builder "Pages"). |
| `adt flp list-tiles`    | List Fiori Launchpad tiles (CHIPs).                 |
| `adt flp get-tile <id>` | Get a single Fiori Launchpad tile by ID.            |

## Options

### `list-catalogs` / `list-groups`

| Flag     | Description     |
| -------- | --------------- |
| `--json` | Output as JSON. |

### `list-tiles`

| Flag                 | Description                                        |
| -------------------- | -------------------------------------------------- |
| `-c, --catalog <id>` | Restrict to tiles belonging to a specific catalog. |
| `--json`             | Output as JSON.                                    |

### `get-tile <id>`

| Argument | Description                                              |
| -------- | -------------------------------------------------------- |
| `<id>`   | CHIP ID (e.g. `X-SAP-UI2-CHIP:/UI2/STATIC_APPLAUNCHER`). |
| `--json` | Output as JSON.                                          |

## Examples

```bash
# Catalogs and groups
adt flp list-catalogs --json
adt flp list-groups --json

# All tiles in a catalog
adt flp list-tiles -c ZACME_CATALOG

# A specific tile
adt flp get-tile 'X-SAP-UI2-CHIP:/UI2/STATIC_APPLAUNCHER' --json
```

## See also

- [`rap`](./rap) — service definitions/bindings that power FLP apps
- MCP tools [`list_flp_catalogs`](/mcp/tools/list_flp_catalogs), [`list_flp_tiles`](/mcp/tools/list_flp_tiles), [`get_flp_tile`](/mcp/tools/get_flp_tile)
