---
title: auth
sidebar_position: 2
description: Authentication — login, logout, status, list, set-default, refresh.
---

# `adt auth`

Manage authenticated sessions with SAP systems. Sessions are cached in
`~/.adt/auth.json` and looked up automatically by every other command.

## Subcommands

| Command | Description |
| --- | --- |
| `adt auth login` | Login to ADT — supports Basic Auth and Browser-based SSO. |
| `adt auth logout` | Logout from ADT. |
| `adt auth status` | Check authentication status. |
| `adt auth list` (alias `ls`) | List all authenticated SAP systems. |
| `adt auth set-default <sid>` | Set the default SAP system. |
| `adt auth refresh` | Refresh an existing session (re-runs the plugin if credentials expired). |

## Options

### `login`

| Flag | Description |
| --- | --- |
| `--service-key <path>` | Path to a BTP service key JSON file for service-key login. |
| `--redirect-uri <uri>` | OAuth callback redirect URI (e.g. Codespaces/tunnel URL). |
| `--insecure` | Allow insecure SSL connections (ignore certificate errors). |
| `--sid <sid>` *(global)* | System ID — skips the interactive destination picker. |

If no `--sid` is provided and the config file (`adt.config.ts`) declares
destinations, `adt` shows an interactive list; otherwise it falls back to a
fully manual URL + basic-auth prompt.

### `logout` / `status` / `refresh`

| Flag | Description |
| --- | --- |
| `--sid <sid>` | System ID to operate on (defaults to current default). |

### `set-default`

| Argument | Description |
| --- | --- |
| `<sid>` | System ID to set as default (e.g. `BHF`, `S0D`). |

### `list`

No options.

## Examples

```bash
# First-time login, interactive
adt auth login

# Login with a BTP service key
adt auth login --sid BHF --service-key ~/btp/bhf-key.json

# Check who I am
adt auth status
#  ✅ DEV — user PPLENKOV — cookie session valid until 2025-11-21T09:12:03Z

# Switch the default system
adt auth set-default BHF

# Clean logout
adt auth logout --sid BHF
```

## See also

- `@abapify/adt-auth` — the underlying session/credential library
- <!-- TODO: link after D1b --> MCP tool `auth_status`
