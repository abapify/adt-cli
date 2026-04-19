---
title: check
sidebar_position: 17
description: Syntax check (checkruns) for ABAP objects.
---

# `adt check`

Run syntax check (checkruns) on ABAP objects. Maps to `/sap/bc/adt/checkruns`.

## Arguments

| Argument       | Description                                                                        |
| -------------- | ---------------------------------------------------------------------------------- |
| `[objects...]` | Object name(s) to check. May be omitted when `--package` or `--transport` is used. |

## Options

| Flag                          | Description                                                |
| ----------------------------- | ---------------------------------------------------------- |
| `-p, --package <package>`     | Check all objects in a package.                            |
| `-t, --transport <transport>` | Check all objects in a transport request.                  |
| `--type <type>`               | Object type hint for resolving URIs (e.g. `CLAS`, `DOMA`). |
| `--version <version>`         | Version to check: `active`, `inactive`, `new`.             |
| `--json`                      | Output results as JSON.                                    |

## Examples

```bash
# Check a single class
adt check ZCL_DEMO

# Check the inactive version before activating
adt check ZCL_DEMO --version inactive

# Entire package
adt check --package $ZDEMO --json

# All objects in a transport
adt check --transport DEVK900001
```

## Exit codes

- `0` — no errors (warnings allowed).
- `1` — at least one error was reported; the JSON output contains per-object
  diagnostics.

## See also

- [`aunit`](./aunit) — unit tests (runtime)
- [`objects`](./objects) / [`source`](./source) — write commands that
  can `--activate` after a successful check
