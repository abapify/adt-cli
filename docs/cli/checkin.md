---
title: checkin
sidebar_position: 12
description: Push a local abapGit/gCTS directory into SAP.
---

# `adt checkin`

Push a local abapGit/gCTS-formatted directory into SAP (inverse of
[`checkout`](./checkout)).

`checkin` walks the source directory, resolves the declared format plugin
(abapGit by default, AFF/gCTS via `--format gcts`), opens a batch lock session,
creates-or-updates each object, and activates them as a group. A dry-run mode
computes the plan without touching SAP.

## Arguments

| Argument | Description |
| --- | --- |
| `<directory>` | Source directory containing serialised files. |

## Options

| Flag | Description |
| --- | --- |
| `--format <format>` | Format plugin id (default: `abapgit`; try `gcts` for AFF layout). |
| `-p, --package <package>` | Target root SAP package for the checkin. |
| `-t, --transport <transport>` | Transport request to use for lock/save operations. |
| `--types <types>` | Filter by object types (comma-separated, e.g. `CLAS,INTF`). |
| `--dry-run` | Validate & plan only — no writes to SAP (default: `false`). |
| `--no-activate` | Skip activation after save (objects remain inactive). |
| `--unlock` | Force-unlock objects already locked by the current user before applying. |
| `--abap-language-version <version>` | ABAP language version for new objects (e.g. `'5'` for Cloud). |
| `--json` | Emit the `CheckinResult` as JSON (machine-readable) (default: `false`). |

## Examples

```bash
# Plan only — no writes
adt checkin ./repo -p ZMYPKG --dry-run

# Real checkin, abapGit layout
adt checkin ./repo -p ZMYPKG -t DEVK900001

# gCTS / AFF layout + filter
adt checkin ./repo --format gcts -p ZMYPKG -t DEVK900001 \
    --types CLAS,INTF,DDLS --json

# Force-unlock stale locks and skip activation
adt checkin ./repo -p ZMYPKG -t DEVK900001 --unlock --no-activate
```

## Exit codes

- `0` — all objects applied successfully (or dry-run planned cleanly).
- `1` — at least one object failed; the `CheckinResult` JSON contains per-object
  error details.

## See also

- [`checkout`](./checkout) — the inverse
- [`import`](./import) — lower-level object/package/transport imports
- [`lock`](./lock) — managing stale locks manually
- `@abapify/adt-plugin-abapgit` — default serialiser
