---
title: Plugins Overview
sidebar_position: 1
---

# Plugins Overview

`adt-cli` is plugin-first. Almost every feature beyond the core HTTP client and
a handful of essential commands (`auth`, `info`, `fetch`, `search`, `import`)
ships as an optional plugin you opt in to via your `adt.config.ts`. This keeps
the default install lean and lets teams assemble exactly the toolbox they need.

There are **two classes of plugin**, and they solve different problems.

## Command plugins

Command plugins extend the CLI with new subcommands. They implement the
[`CliCommandPlugin`](../sdk/packages/adt-plugin) interface and register their
own `commander` commands plus options. Once loaded, a plugin's subcommands are
indistinguishable from built-in ones — they share the same auth, logger, and
client instance.

Examples shipped in this repo:

| Plugin                                              | Commands added             | Purpose                                               |
| --------------------------------------------------- | -------------------------- | ----------------------------------------------------- |
| [`@abapify/adt-atc`](./atc)                         | `adt atc`                  | Run ABAP Test Cockpit checks, emit SARIF/GitLab/Sonar |
| [`@abapify/adt-aunit`](./aunit)                     | `adt aunit`                | Run ABAP Unit tests, emit JUnit/JaCoCo/Sonar          |
| [`@abapify/adt-export`](../sdk/packages/adt-export) | `adt export`, `adt deploy` | Deploy local serialized files back to SAP             |
| [`@abapify/adt-plugin-gcts-cli`](./gcts-cli)        | `adt gcts …`               | gCTS (git-enabled CTS) repo/branch/commit operations  |
| `@abapify/adt-diff`                                 | `adt diff`                 | Compare local abapGit files against SAP remote        |
| `@abapify/adt-codegen`                              | `adt codegen`              | Regenerate contracts from discovery/fixtures          |

## Format plugins

Format plugins handle **serialization** — converting ADK objects to and from
on-disk file layouts. They implement the [`FormatPlugin`](../sdk/packages/adt-plugin)
interface and register themselves under a short name (`abapgit`, `gcts`). Any
command that reads or writes source files (`import`, `export`, `checkin`,
`checkout`) accepts a `--format <name>` flag to pick which serializer runs.

| Plugin                                            | Format names   | Layout                                          |
| ------------------------------------------------- | -------------- | ----------------------------------------------- |
| [`@abapify/adt-plugin-abapgit`](./abapgit-format) | `abapgit`      | `.abap` + `.xml` (classic abapGit)              |
| [`@abapify/adt-plugin-gcts`](./gcts-format)       | `gcts` / `aff` | JSON metadata + `.abap` / `.asddls` / `.asdcls` |

Format plugins are stateless and client-agnostic: they receive ADK objects or
a `FileTree` and do nothing else. All SAP interaction stays in the command
plugin or core CLI.

## How plugins are loaded

Plugins are loaded at CLI startup by `@abapify/adt-config`, which reads
`adt.config.ts` from the current working directory (walking upward until it
finds one). Each string in the `commands` array is a dynamic ESM import path.

```ts title="adt.config.ts"
import type { AdtConfig } from '@abapify/adt-config';

export default {
  commands: [
    '@abapify/adt-atc/commands/atc',
    '@abapify/adt-aunit/commands/aunit',
    '@abapify/adt-export/commands/export',
    '@abapify/adt-plugin-gcts-cli/commands/gcts',
  ],
} as AdtConfig;
```

- The import path must resolve to an ESM module with a **default export**
  implementing `CliCommandPlugin` (or a named export that `adt-cli` re-exports
  — see the plugin's own docs).
- Format plugins **self-register on import**. You rarely list them directly in
  `commands`; they get pulled in transitively by any command plugin that uses
  them, or explicitly via `import '@abapify/adt-plugin-abapgit'` in a custom
  setup.
- If a plugin import fails, `adt-cli` prints a warning and continues — missing
  plugins don't break the rest of the CLI.

See [`@abapify/adt-config`](../sdk/packages/adt-config) for the full config
schema (logging, output, extension-specific options) and [architecture
overview](../architecture/overview) for how plugins slot into the overall
stack.

## Writing your own

Both plugin classes have step-by-step guides:

- [Writing a command plugin](./writing-command-plugin)
- [Writing a format plugin](./writing-format-plugin)

{/_ TODO(D2d): link to architecture page on plugin lifecycle once written _/}
