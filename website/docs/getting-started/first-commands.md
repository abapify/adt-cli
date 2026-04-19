---
title: First Commands
sidebar_position: 3
description: A guided tour through the most common adt commands.
---

# First Commands

This page walks through the commands you'll run every day. It assumes you've [installed](./installation.md) `adt` and [logged in](./auth.md) to at least one system.

All commands accept `--sid <SID>` to target a non-default system. Output samples below are trimmed for readability.

## 1. Confirm the session — `adt info`

```bash
adt info
```

```
System       DEV (001)
User         DEVELOPER
Release      SAP_BASIS 7.58 SP 0001
Host         https://sap.example.com:44300
Session      active, CSRF cached
```

If `adt info` succeeds, authentication, cookies, and the security session are all working. See the full reference at [`adt info`](../cli/info.md).

## 2. List local abapGit content — `adt ls`

```bash
adt ls ./src
```

Lists ABAP objects serialized in the current directory using the abapGit format. This command does **not** require authentication — it only reads local files. Handy for browsing a cloned gCTS repository.

Reference: [`adt ls`](../cli/ls.md).

## 3. Quick search — `adt search`

```bash
adt search "ZCL_*"
adt search "ZCL_UNIT" --type CLAS --limit 20
```

```
CLAS   ZCL_ABAP_UNIT_ASSERT        Unit test assertions
CLAS   ZCL_UNIT_HELPER             Local helper class
INTF   ZIF_UNIT_CONTRACT           Shared contract
```

Uses the ADT repository information system. Filter by `--type` (`CLAS`, `INTF`, `PROG`, `FUGR`, `DEVC`, `TABL`, …) or `--package`.

Reference: [`adt search`](../cli/search.md).

## 4. Resolve a single object — `adt get`

```bash
adt get ZCL_ABAP_UNIT_ASSERT
```

```
Name         ZCL_ABAP_UNIT_ASSERT
Type         CLAS/OC
Package      SABP_UNIT
URI          /sap/bc/adt/oo/classes/zcl_abap_unit_assert
Description  ABAP Unit: Assert
```

`get` is a zero-assumption resolver — it returns the canonical URI plus metadata for any object. Useful as the first step before `source`, `lock`, or `outline`.

Reference: [`adt get`](../cli/get.md).

## 5. Read source — `adt source`

```bash
adt source /sap/bc/adt/oo/classes/zcl_abap_unit_assert/source/main
```

Or via the typed wrapper:

```bash
adt objects class source ZCL_ABAP_UNIT_ASSERT
```

Both stream the ABAP source to stdout. Pipe to a file, `less`, or your favorite formatter.

:::tip
`adt source` is lock-free and read-only. For the write cycle (`lock` → edit → PUT → `unlock`) see [`adt lock`](../cli/lock.md).
:::

References: [`adt source`](../cli/source.md), [`adt objects`](../cli/objects.md).

## 6. Transports — `adt cts`

```bash
# Your recent transports
adt cts transport list --user $USER

# Inspect one
adt cts transport get DEVK900123
```

```
DEVK900123  K  Modifiable  PPLENKOV  Refactor unit test helpers
  Tasks:
    DEVK900124  Task  PPLENKOV
  Objects:
    CLAS ZCL_UNIT_HELPER
    INTF ZIF_UNIT_CONTRACT
```

Reference: [`adt cts transport`](../cli/cts-transport.md).

## 7. Run unit tests — `adt aunit`

```bash
adt aunit ZCL_UNIT_HELPER --coverage
```

```
ZCL_UNIT_HELPER
  ✓ should_split_on_separator              12ms
  ✓ should_trim_whitespace                  8ms
  ✗ should_handle_empty_input               3ms
      Expected: initial
      Actual:   space
  2 passed, 1 failed, 0 skipped             Coverage 87%
```

Runs ABAP Unit under the covered object's package. `--coverage` enables SAP Coverage Analyzer and reports line/branch coverage.

Reference: [`adt aunit`](../cli/aunit.md).

## 8. Everything else

The full command catalogue lives in the sidebar under **CLI**. High-value entry points:

- [`adt discovery`](../cli/discovery.md) — probe which ADT services a system exposes.
- [`adt fetch`](../cli/fetch.md) — authenticated HTTP GET for ad-hoc endpoints.
- [`adt checkin` / `adt checkout`](../cli/checkin.md) — sync an object set to / from disk (abapGit format).
- [`adt gcts`](../cli/gcts.md) — git-enabled CTS for S/4HANA and BTP.
- [`adt repl`](../cli/repl.md) — interactive shell with autocompletion.

## Next steps

- [Configure an MCP client](./mcp-setup.md) to use the same tools from an AI assistant.
- [Take the 10-minute quick tour](./quick-tour.md).
- Browse the [CLI overview](../cli/overview.md).
