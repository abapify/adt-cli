---
title: lock / unlock / locks
sidebar_position: 15
description: Manage ADT object locks.
---

# `adt lock` / `adt unlock` / `adt locks`

Explicit lock management. Under normal flow every write command (e.g. `adt
class write`, `adt source put`, `adt checkin`) locks and unlocks transparently;
these commands exist for:

- scripting a batch edit session with a single lock;
- cleaning up stale locks left over from a failed run;
- inspecting persisted lock handles stored in the local registry
  (`~/.adt/locks.json`).

## `adt lock`

Acquire a lock on one or more SAP objects. The returned lock handles are
persisted to the local registry and can be re-used by subsequent calls or
released later with [`adt unlock`](#adt-unlock).

| Argument / Flag | Description |
| --- | --- |
| `[objectNames...]` | Object name(s) to lock (e.g. `ZAGE_FUGR_SAMPLE ZCL_MY_CLASS`). |
| `--type <type>` | Object type (`CLAS`, `INTF`, `TTYP`, `TABL`, `DOMA`, `DTEL`, `PROG`, `FUGR`, `DEVC`). |
| `--uri <uri>` | Direct object URI (skips search). |
| `--transport <transport>` | Transport request number. |

## `adt unlock`

Release a previously-acquired lock. With `--force`, `adt` first *re-locks* the
object to reconstruct the lock handle (only works for locks owned by the
current user), then releases it.

| Argument / Flag | Description |
| --- | --- |
| `[objectNames...]` | Object name(s) to unlock. |
| `--lock-handle <handle>` | Specific lock handle (if known). |
| `--type <type>` | Object type. |
| `--uri <uri>` | Direct object URI (skips search). |
| `--force` | Re-lock to recover handle, then unlock (same-user locks only). |

## `adt locks`

Inspect and clean up the local lock registry.

| Command | Description |
| --- | --- |
| `adt locks` | Short-hand for `adt locks list`. |
| `adt locks list` | List all persisted lock entries. |
| `adt locks cleanup` | Try to UNLOCK every persisted entry on the SAP system. |
| `adt locks clear` | Remove all entries from the registry (does NOT unlock on SAP). |

## Examples

```bash
# Explicit lock / edit / unlock loop
adt lock ZCL_DEMO --transport DEVK900001
adt source put ZCL_DEMO zcl_demo.abap --transport DEVK900001
adt unlock ZCL_DEMO

# Force-unlock a stale lock owned by me
adt unlock ZCL_DEMO --force

# Inspect persisted lock handles
adt locks list

# Clean up after a crashed run
adt locks cleanup
```

## See also

- [`source`](./source) / [`objects`](./objects) — write commands that
  lock implicitly
- [`checkin`](./checkin) — batch mode with `--unlock`
- `@abapify/adt-locks` — underlying lock service
