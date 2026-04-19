---
title: CTS transport workflow
sidebar_position: 1
description: Create a transport, attach objects, release it, and hand it off to deployment.
---

# CTS transport workflow

## Goal

Take a change from "I want to start working" all the way to "a released
transport request is sitting in the import queue". This guide shows the
canonical path using [`adt cts`](/cli/cts-transport) plus the object-level
commands that implicitly attach objects to the transport.

## Prerequisites

- [adt-cli installed and authenticated](/getting-started/installation)
- Developer authorisation on the source system (`S_TRANSPRT` with activity 01/02)
- A package assigned to a transport layer (not `$TMP`)

## Steps

### 1. Create a transport

```bash
adt cts tr create -d "Customer entity — initial" --no-interactive
```

Expected output:

```
Created transport DEVK900001 — "Customer entity — initial" (type K, target LOCAL)
```

Grab the ID and keep it in an env var to keep commands short:

```bash
export TR=DEVK900001
```

`--no-interactive` requires `-d`; drop it to let `adt` prompt you. Pass
`--type W` for customising requests or `--target <SID>` to route at creation.

### 2. Attach objects by using `-t` on write operations

Every `write` / `create` / `delete` subcommand takes `-t/--transport`. Each
call creates a task under `$TR` (or appends to an existing task you own) and
records the object in it:

```bash
adt class create ZCL_CUSTOMER "Customer service" ZMYPKG -t $TR
adt class write  ZCL_CUSTOMER zcl_customer.clas.abap -t $TR --activate

adt ddl create ZI_CUSTOMER "Customer view" ZMYPKG -t $TR
adt ddl write  ZI_CUSTOMER zi_customer.ddls.asddls -t $TR --activate
```

### 3. Inspect what's in the transport

```bash
adt cts tr get $TR --objects
```

This shows the header, tasks, and every object locked into the request. Use
`--json` for scripts.

### 4. Run checks before release

Release fails if any object is syntactically broken or unactivated. Pre-flight
with:

```bash
adt check -t $TR             # syntax check all objects in transport
adt aunit -t $TR             # run unit tests of objects in transport
```

See [AUnit with coverage](./aunit-with-coverage) for report formats.

### 5. Release

```bash
adt cts tr release $TR --release-all -y
```

`--release-all` releases every task first, then the transport itself.
`-y` skips the confirmation.

Expected output:

```
Releasing task DEVK900002 ... done
Releasing task DEVK900003 ... done
Releasing transport DEVK900001 ... done
```

### 6. Hand off / deploy

On the **target** system, import the released request as files (useful for
archive or gCTS staging):

```bash
adt import transport $TR ./release --format abapgit
```

or, more commonly, it flows through the normal STMS import queue — no CLI
needed on the target system.

## Troubleshooting

| Error                                                        | Cause                                     | Fix                                                                 |
| ------------------------------------------------------------ | ----------------------------------------- | ------------------------------------------------------------------- |
| `TK430: Not possible to create transport (no target system)` | Package not assigned to a transport layer | Use `ZMYPKG` with proper layer, or pass `--target <SID>` explicitly |
| `TK135: Transport is already released`                       | Already released; can't add more objects  | Create a new transport (step 1)                                     |
| `Object locked by PPLENKOV in another transport`             | Object sitting in a different request     | Release or delete the other transport, or `adt unlock <uri>`        |
| `Release-failed: syntax errors`                              | Step 4 not run                            | Run `adt check -t $TR`, fix, activate, retry release                |

## Role separation

In regulated environments developers create + attach, a release manager
releases. The CLI split:

| Role            | Commands                                                                        |
| --------------- | ------------------------------------------------------------------------------- |
| Developer       | `adt cts tr create`, `adt class/ddl/... write -t $TR`, `adt check`, `adt aunit` |
| Release manager | `adt cts tr get $TR --objects`, `adt cts tr release $TR`                        |
| Deployment      | `adt import transport $TR` (or STMS)                                            |

Grant the release manager only the `S_TRANSPRT ACTVT=43` (release) authorisation.

## See also

- [`adt cts` reference](/cli/cts-transport)
- [`adt import transport`](/cli/import)
- [Object lifecycle](./object-lifecycle)
- [MCP `cts_release_transport`](/mcp/tools/cts_release_transport)
