---
title: abapGit command integration
sidebar_position: 4
---

# abapGit command integration

Unlike ATC/AUnit/gCTS-CLI, abapGit does **not** ship as a separate command
plugin. It is a **format plugin** — [`@abapify/adt-plugin-abapgit`](./abapgit-format) —
and integrates with the CLI via the standard `--format abapgit` flag on
existing commands.

## Commands that use it

| Command                                | Purpose                                                                                           |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| [`adt import`](../cli/import)          | Serialize SAP objects to an abapGit tree on disk                                                  |
| `adt export`                           | Deploy an abapGit tree back to SAP (requires [`@abapify/adt-export`](../sdk/packages/adt-export)) |
| [`adt checkin`](../cli/checkin)        | Push local abapGit file changes to SAP                                                            |
| [`adt checkout`](../cli/checkout)      | Pull SAP objects into an existing abapGit tree                                                    |
| [`adt diff`](../sdk/packages/adt-diff) | Compare local abapGit files against SAP remote                                                    |

`abapgit` is the **default format** where a format is required, so the flag is
typically optional.

```bash
# These two are equivalent
bunx adt import package ZMY_PKG ./out
bunx adt import package ZMY_PKG ./out --format abapgit

# Explicit when mixing plugins
bunx adt export --source ./out --format abapgit --transport DEVK900001
```

## MCP tools that use it

Several MCP tools (see [MCP tools](../mcp/overview)) operate on abapGit
trees: `checkin`, `git_export`, `clone_object`, `import_object`,
`import_package`. They reuse the format plugin internally, so the same
serialization rules apply.

## Where to look next

- [abapGit format plugin](./abapgit-format) — filename conventions,
  handlers, XSD pipeline.
- [`@abapify/adt-plugin-abapgit`](../sdk/packages/adt-plugin-abapgit) — SDK
  reference.
- [Writing a format plugin](./writing-format-plugin) — how to extend the
  abapgit plugin with new object types or write a different serializer.
