---
title: '@abapify/adt-plugin-gcts-cli'
description: '`adt gcts …` CLI command plugin.'
---

# `@abapify/adt-plugin-gcts-cli`

CLI command plugin that adds the `adt gcts …` subcommand tree (clone, pull,
push, branch, commit, config, …) mirroring the sapcli surface.

## Install

```bash
bun add @abapify/adt-plugin-gcts-cli
```

```ts
// adt.config.ts
export default { commands: ['@abapify/adt-plugin-gcts-cli'] };
```

## Public API

```ts
export { gctsCommand, default } from '@abapify/adt-plugin-gcts-cli';
export type { GctsClient } from '@abapify/adt-plugin-gcts-cli';
```

## Usage

```bash
adt gcts repository list
adt gcts repository clone git@github.com/foo/bar.git
adt gcts branches switch <rid> main
```

## Dependencies

- `@abapify/adt-plugin`, `@abapify/adt-client`, `@abapify/adt-contracts` (gCTS namespace)

## Subcommands

| Command                                                 | Endpoint                                       |
| ------------------------------------------------------- | ---------------------------------------------- |
| `adt gcts repo list`                                    | GET `/repository`                              |
| `adt gcts repo create <rid> <url>`                      | POST `/repository`                             |
| `adt gcts repo clone <rid>`                             | POST `/repository/<rid>/clone`                 |
| `adt gcts repo delete <rid>`                            | DELETE `/repository/<rid>`                     |
| `adt gcts repo pull <rid>`                              | GET `/repository/<rid>/pullByCommit`           |
| `adt gcts repo push <rid>`                              | GET `/repository/<rid>/push`                   |
| `adt gcts repo checkout <rid> <branch> [current]`       | GET `/branches/<current>/switch?branch=<…>`    |
| `adt gcts branch list <rid>`                            | GET `/repository/<rid>/branches`               |
| `adt gcts branch create <rid> <name>`                   | POST `/repository/<rid>/branches`              |
| `adt gcts branch delete <rid> <name>`                   | DELETE `/repository/<rid>/branches/<name>`     |
| `adt gcts branch switch <rid> <target> [current]`       | GET `/branches/<current>/switch?branch=<…>`    |
| `adt gcts commit <rid> [--corrnr <TR>] [-d <pkg>] [-m]` | POST `/repository/<rid>/commit`                |
| `adt gcts log <rid>`                                    | GET `/repository/<rid>/getCommit`              |
| `adt gcts objects <rid>`                                | GET `/repository/<rid>/getObjects`             |
| `adt gcts config <rid> [get\|set\|unset\|list]`         | GET/POST/DELETE `/repository/<rid>/config/...` |

All commands accept `--json` for machine-readable output.

## See also

- [gCTS contracts](../contracts/gcts), [`adt-plugin-gcts`](./adt-plugin-gcts)
