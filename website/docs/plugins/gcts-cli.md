---
title: gCTS CLI plugin
sidebar_position: 1
---

# gCTS CLI plugin

Package: [`@abapify/adt-plugin-gcts-cli`](../sdk/packages/adt-plugin-gcts-cli) ·
adds: `adt gcts …`

Mirrors [`sapcli`'s `sap gcts` surface](https://github.com/jfilak/sapcli/blob/master/sap/cli/gcts.py)
on top of `@abapify/adt-client`'s `client.adt.gcts.*` contracts. Everything is
a thin command wrapper around a typed contract call — no business logic, no
custom HTTP.

## What it does

Drives the **gCTS REST API** exposed by S/4HANA for managing git-enabled CTS
repositories from the CLI: clone, branch, commit, pull/push, checkout, and
inspect repository state. Pairs naturally with the
[gCTS format plugin](./gcts-format) but is completely independent —
`adt gcts` works with or without local serialization.

## Installation

```bash
bun add -D @abapify/adt-plugin-gcts-cli
```

Enable in `adt.config.ts`:

```ts title="adt.config.ts"
import type { AdtConfig } from '@abapify/adt-config';

export default {
  commands: ['@abapify/adt-plugin-gcts-cli/commands/gcts'],
} as AdtConfig;
```

## Subcommands

| Command                                                       | Endpoint                                       |
| ------------------------------------------------------------- | ---------------------------------------------- |
| `adt gcts repo list`                                          | `GET /repository`                              |
| `adt gcts repo create <rid> <url>`                            | `POST /repository`                             |
| `adt gcts repo clone <rid>`                                   | `POST /repository/<rid>/clone`                 |
| `adt gcts repo delete <rid>`                                  | `DELETE /repository/<rid>`                     |
| `adt gcts repo pull <rid>`                                    | `GET /repository/<rid>/pullByCommit`           |
| `adt gcts repo push <rid>`                                    | `GET /repository/<rid>/push`                   |
| `adt gcts repo checkout <rid> <branch> [current]`             | `GET /branches/<current>/switch?branch=<…>`    |
| `adt gcts branch list <rid>`                                  | `GET /repository/<rid>/branches`               |
| `adt gcts branch create <rid> <name>`                         | `POST /repository/<rid>/branches`              |
| `adt gcts branch delete <rid> <name>`                         | `DELETE /repository/<rid>/branches/<name>`     |
| `adt gcts branch switch <rid> <target> [current]`             | `GET /branches/<current>/switch?branch=<…>`    |
| `adt gcts commit <rid> [--corrnr <TR>] [-d <pkg>] [-m <msg>]` | `POST /repository/<rid>/commit`                |
| `adt gcts log <rid>`                                          | `GET /repository/<rid>/getCommit`              |
| `adt gcts objects <rid>`                                      | `GET /repository/<rid>/getObjects`             |
| `adt gcts config <rid> [get\|set\|unset\|list]`               | `GET/POST/DELETE /repository/<rid>/config/...` |

All commands accept `--json` for machine-readable output.

Per-command flags and argument order are documented by
[`adt gcts --help`](../cli/gcts).

## MCP parity

The same gCTS operations are exposed as MCP tools (see
[MCP tools](../mcp/overview)): `gcts_list_repos`, `gcts_create_repo`,
`gcts_clone_repo`, `gcts_commit`, `gcts_log`, etc. Both surfaces call the same
underlying contracts, so behavior stays in sync.

## Internals

- Entry point: `src/commands/gcts.ts` — a single `CliCommandPlugin` whose
  `register()` adds the `gcts` parent command and attaches subcommand modules
  from `src/commands/gcts/{repo,branch,commit,log,objects,config}.ts`.
- Each subcommand pulls an `AdtClient` via the shared `getAdtClient()` helper
  and calls exactly one contract method.
- No state — every call is independent. CSRF/session handling is inherited
  from [`@abapify/adt-client`](../sdk/packages/adt-client).

## Extending

To add a new subcommand that maps to a gCTS endpoint not yet covered:

1. Add the endpoint to [`adt-contracts`](../sdk/contracts/gcts) so the client
   gets typed access.
2. Add a `commander` subcommand module under
   `packages/adt-plugin-gcts-cli/src/commands/gcts/<name>.ts`.
3. Register it in `gcts.ts`.
4. Add a CLI reference page under `docs/cli/`.

Full walkthrough: [writing a command plugin](./writing-command-plugin).

## Troubleshooting

- **`403 CSRF token invalid`** — the gCTS endpoints require the full security
  session flow; `adt-client` handles this automatically, so make sure you
  `auth login` before running `adt gcts …`.
- **`404` on repo operations** — the `<rid>` argument is the gCTS internal
  repository id, **not** a branch or package name. Use `adt gcts repo list`
  to find it.
- **`commit` rejected** — check that `--corrnr` points at a modifiable
  transport; the server enforces CTS authorization rules.
