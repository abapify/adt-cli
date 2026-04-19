---
title: cts — transports
sidebar_position: 10
description: Change and Transport System — transport requests, search, tree.
---

# `adt cts`

Change and Transport System (CTS) operations. Wraps `/sap/bc/adt/cts/*`.

## Subcommands

```
adt cts tr list|get|create|release|reassign|delete|set
adt cts search
adt cts tree list
adt cts tree config [-e|--edit]
adt cts tree config set [flags]
```

## `adt cts tr` — transport requests

### `list`

List transport requests owned by the current user.

| Flag | Description |
| --- | --- |
| `-m, --max <number>` | Maximum results (default: `50`). |
| `--json` | Output as JSON. |

### `get <transport>`

Get details of a single transport request (e.g. `S0DK942971`).

| Flag | Description |
| --- | --- |
| `--json` | Output as JSON. |
| `--objects` | Show list of objects in transport. |

### `create`

Create a new transport request.

| Flag | Description |
| --- | --- |
| `-d, --description <desc>` | Transport description. |
| `--type <type>` | Transport type (`K` = workbench, `W` = customising, ...). |
| `--target <target>` | Target system (default: `LOCAL`). |
| `--project <project>` | CTS project. |
| `--no-interactive` | Skip interactive prompts (requires `-d`). |
| `--json` | Output as JSON. |

### `release <transport>`

| Flag | Description |
| --- | --- |
| `--skip-check` | Skip pre-release validation. |
| `--release-all` | Release all tasks first, then the transport. |
| `-y, --yes` | Skip confirmation prompt. |
| `--json` | Output result as JSON. |

### `reassign <transport> <new-owner>`

Change the owner of a transport.

| Flag | Description |
| --- | --- |
| `--include-tasks` | Reassign tasks under the request as well. |
| `--json` | Output result as JSON. |

### `delete <transport>`

| Flag | Description |
| --- | --- |
| `-y, --yes` | Skip interactive confirmation. |
| `--json` | Output result as JSON. |

### `set <transport>`

Update transport metadata non-interactively (for scripting).

| Flag | Description |
| --- | --- |
| `-d, --description <desc>` | New transport description. |
| `--target <target>` | New target system. |
| `--from-json <file>` | Load full payload from JSON file. |
| `--json` | Output result as JSON. |

## `adt cts search`

Ad-hoc transport search (does not use the saved tree configuration).

| Flag | Description |
| --- | --- |
| `-u, --user <user>` | Filter by owner (`*` = all). Default: `*`. |
| `-s, --status <status>` | Status filter (`modifiable`, `released`, ...). |
| `-m, --max <number>` | Maximum results (default: `50`). |
| `--json` | Output as JSON. |

## `adt cts tree`

The tree view reuses a *saved search configuration* — the same filter the
SAP GUI "Transport Organizer" persists per user.

### `tree list`

List transports using the saved configuration.

| Flag | Description |
| --- | --- |
| `-m, --max <number>` | Maximum results (default: `50`). |
| `--json` | Output as JSON. |

### `tree config`

View the saved configuration, or edit it interactively with `-e`.

| Flag | Description |
| --- | --- |
| `--json` | Output as JSON. |
| `-e, --edit` | Open interactive editor. |

### `tree config set`

Non-interactive configuration update.

| Flag | Description |
| --- | --- |
| `-u, --user <username>` | Filter by user (`*` for all). |
| `--workbench <bool>` | Include workbench requests. |
| `--customizing <bool>` | Include customizing requests. |
| `--copies <bool>` | Include transport of copies. |
| `--modifiable <bool>` | Include modifiable requests. |
| `--released <bool>` | Include released requests. |
| `--date-filter <preset>` | Date preset (`0`=Week, `1`=2Weeks, `2`=4Weeks, `3`=3Months, `4`=Custom, `5`=All). |
| `--from-date <date>` | From date (YYYY-MM-DD or YYYYMMDD). |
| `--to-date <date>` | To date (YYYY-MM-DD or YYYYMMDD). |

## Examples

```bash
# Create + get
adt cts tr create -d "Demo transport" --no-interactive
adt cts tr get S0DK942971 --objects

# Release
adt cts tr release S0DK942971 --release-all -y

# Search by user
adt cts search -u PPLENKOV -m 10

# Non-interactive config tune + list
adt cts tree config set --workbench true --modifiable true
adt cts tree list --json
```

## See also

- [`import transport`](./import) — import a released transport
- `@abapify/adt-contracts` — `cts` endpoint definitions
