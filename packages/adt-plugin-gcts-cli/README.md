# @abapify/adt-plugin-gcts-cli

CLI command-plugin for SAP **gCTS** (git-enabled CTS) — mirrors
[sapcli's `sap gcts` surface](https://github.com/jfilak/sapcli/blob/master/sap/cli/gcts.py).

## Install

```bash
bun add -D @abapify/adt-plugin-gcts-cli
```

Then enable in `adt.config.ts`:

```ts
export default {
  commands: ['@abapify/adt-plugin-gcts-cli/commands/gcts'],
};
```

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

- [`@abapify/adt-plugin-gcts`](../adt-plugin-gcts) — file-format plugin (E06)
- [`@abapify/adt-contracts`](../adt-contracts) — `client.adt.gcts.*` namespace

## License

MIT
