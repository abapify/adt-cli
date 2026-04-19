---
title: gcts
sidebar_position: 28
description: git-enabled CTS — repositories, branches, commits.
---

# `adt gcts`

SAP gCTS (git-enabled CTS) operations. Shipped as a command plugin from
`@abapify/adt-plugin-gcts-cli`. Maps to `/sap/bc/cts_abapvcs/*`.

Mirrors sapcli's `sap gcts` surface.

## Subcommands

```
adt gcts repo list|create|clone|delete|pull|push|checkout
adt gcts branch list|create|switch|delete
adt gcts commit <rid> [-m ...] [-d <pkg> | --corrnr <tr>]
adt gcts log <rid>
adt gcts objects <rid>
adt gcts config <rid> list|get|set|unset [key] [value]
```

## `adt gcts repo`

| Command | Description |
| --- | --- |
| `repo list` | List all gCTS repositories (`GET /repository`). |
| `repo create <rid> <url>` | Create a new gCTS repository. |
| `repo clone <rid>` | Clone repository on target system. |
| `repo delete <rid>` (alias `rm`) | Delete a gCTS repository. |
| `repo pull <rid>` | Pull a gCTS repository. |
| `repo push <rid>` | Push a gCTS repository. |
| `repo checkout <rid> <branch> [currentBranch]` | Check out a branch. |

### `repo create` options

| Flag | Description |
| --- | --- |
| `--vsid <vsid>` | Virtual system ID (default: `6IT`). |
| `--role <role>` | Repository role (`SOURCE` \| `TARGET`). Default: `SOURCE`. |
| `--type <type>` | Repository type (`GITHUB` \| `GIT`). Default: `GITHUB`. |
| `--starting-folder <dir>` | Repository start dir (default: `src/`). |
| `--vcs-token <token>` | VCS authentication token. |
| `--json` | Output response as JSON. |

All other repo subcommands accept `--json`.

## `adt gcts branch`

| Command | Description |
| --- | --- |
| `branch list <rid>` | List branches of a repository. |
| `branch create <rid> <name>` | Create a new branch. |
| `branch delete <rid> <name>` | Delete a branch. |
| `branch switch <rid> <target> [current]` | Switch branches. |

### `branch list` options

| Flag | Description |
| --- | --- |
| `-r, --remote` | Show remote branches only. |
| `-a, --all` | Show all branches (local + remote). |
| `--json` | Output as JSON. |

### `branch create` options

| Flag | Description |
| --- | --- |
| `--local-only` | Create a local branch only. |
| `--symbolic` | Create a symbolic ref. |
| `--peeled` | Create a peeled ref. |
| `--json` | Output response as JSON. |

## `adt gcts commit <rid>`

Commit a package or transport to the gCTS repository (auto-pushes).

| Flag | Description |
| --- | --- |
| `-m, --message <text>` | Commit message (default: auto-generated). |
| `-d, --devc <pkg>` | ABAP package name (defaults to `<rid>`). |
| `--corrnr <tr>` | Transport number (mutually exclusive with `--devc`). |
| `--description <text>` | Long commit description. |
| `--json` | Output response as JSON. |

## `adt gcts log <rid>` / `objects <rid>`

Read-only listing of commit history (`log`) or repository objects (`objects`).
Both support `--json`.

## `adt gcts config <rid>`

Manage repository configuration (`GET/POST/DELETE /repository/<rid>/config`).

| Argument | Description |
| --- | --- |
| `[action]` | `get` \| `set` \| `unset` \| `list` (default: `list`). |
| `[key]` | Config key (required for `get`, `set`, `unset`). |
| `[value]` | Config value (required for `set`). |
| `--json` | Output as JSON. |

## Examples

```bash
# Register a new repository
adt gcts repo create MYREPO https://github.com/acme/abap-demo \
    --type GITHUB --role TARGET --vcs-token $GH_TOKEN

adt gcts repo clone MYREPO

# Branch workflow
adt gcts branch create MYREPO feature/foo
adt gcts branch switch MYREPO feature/foo

# Commit an ABAP package
adt gcts commit MYREPO -d $ZDEMO -m "Export demo package"

# ... or a transport
adt gcts commit MYREPO --corrnr DEVK900001

# History
adt gcts log MYREPO
adt gcts objects MYREPO --json

# Config
adt gcts config MYREPO set CLIENT_VCS_AUTH_TOKEN $GH_TOKEN
adt gcts config MYREPO list
```

## See also

- [`cts`](./cts-transport) — classic transport requests
- `@abapify/adt-plugin-gcts-cli` — plugin source
- `@abapify/adt-plugin-gcts` — file-format plugin (AFF layout)
