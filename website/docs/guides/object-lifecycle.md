---
title: Object lifecycle (class / interface / program)
sidebar_position: 2
description: CRUD for classic ABAP source objects — create, edit, activate, deploy, handle lock conflicts.
---

# Object lifecycle (classic ABAP sources)

## Goal

Walk through the full life of a repository object (`CLAS`, `INTF`, `PROG`,
include): create the shell, iterate on source, activate, attach to a
transport, and deal with the two most common failure modes — lock conflicts
and inactive dependencies.

## Prerequisites

- [adt-cli installed and authenticated](/getting-started/installation)
- A target package (non-`$TMP` if you want the object transported)
- A workbench transport, if the package is transportable (see [CTS workflow](./cts-workflow))

## Steps

### 1. Create the shell

```bash
export TR=DEVK900001

adt class create ZCL_DEMO "Demo service" ZMYPKG -t $TR
```

Expected output:

```
Created CLAS ZCL_DEMO in ZMYPKG (attached to DEVK900001)
```

The object exists but is **inactive** and holds only a skeleton public
section — no methods, no implementation.

### 2. Write source

Two patterns:

**A. Write from a file.**

```bash
cat > zcl_demo.clas.abap <<'ABAP'
CLASS zcl_demo DEFINITION PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    INTERFACES if_oo_adt_classrun.
ENDCLASS.

CLASS zcl_demo IMPLEMENTATION.
  METHOD if_oo_adt_classrun~main.
    out->write( |Hello { sy-uname }| ).
  ENDMETHOD.
ENDCLASS.
ABAP

adt class write ZCL_DEMO zcl_demo.clas.abap -t $TR --activate
```

**B. Pipe from stdin** (handy in scripts):

```bash
echo "REPORT zdemo. WRITE 'hi'." | adt program write ZDEMO - -t $TR --activate
```

### 3. Activate (separately, if you didn't pass `--activate`)

```bash
adt class activate ZCL_DEMO --json
```

Batch activation is supported:

```bash
adt interface activate ZIF_A ZIF_B ZIF_C --json
```

### 4. Inspect

```bash
adt class read ZCL_DEMO            # print source to stdout
adt class read ZCL_DEMO --json     # metadata only, no source

adt wb outline ZCL_DEMO            # includes, methods, attributes
adt wb where-used ZCL_DEMO -m 50   # reverse dependencies
```

See [Workbench navigation](./workbench-navigation) for more.

### 5. Run a quick smoke test (class-run)

Any class that implements `IF_OO_ADT_CLASSRUN` can be executed with
[`adt abap run`](/cli/abap-run), but only _ad-hoc_. To invoke your
_persisted_ class, run it through a temporary wrapper:

```bash
echo "DATA(o) = NEW zcl_demo( ). o->if_oo_adt_classrun~main( out )." \
  | adt abap run
```

### 6. Deploy

Objects already in a transport are transported implicitly when the TR is
released. Re-read [CTS workflow](./cts-workflow) for the release cut.

### 7. Delete

```bash
adt class delete ZCL_DEMO -t $TR -y
```

## Troubleshooting

### Lock conflicts (`CLS_LOCKED` / `Object is locked by user X`)

```
Error: Object is currently being edited by user PPLENKOV (session 2A020DE...)
```

Two situations:

1. **You have a stale lock from a failed run.** List your persisted lock
   handles and remove the one that points at this object:

   ```bash
   adt locks           # list
   adt unlock class/ZCL_DEMO
   ```

2. **Another user holds the lock.** Coordinate, or if you're certain they
   left it behind:

   ```bash
   adt unlock class/ZCL_DEMO --force
   ```

   `--force` bypasses the persisted registry; SAP still refuses if the other
   session is actually active.

### Activation fails — "Inactive dependencies"

```
Error: Program cannot be activated: referenced object ZCL_HELPER is inactive
```

Activate dependencies first, or do a combined activation pass:

```bash
adt class activate ZCL_HELPER ZCL_DEMO
```

### Write rejected — "object does not exist"

Check that the object was actually created (step 1 may have silently errored
because the name was reserved). Re-run `create` with `--no-error-existing`
to make it idempotent.

### Write rejected — HTTP 412 Precondition Failed

The client's ETag cache is stale. Re-read the object to refresh, then retry:

```bash
adt class read ZCL_DEMO > /dev/null
adt class write ZCL_DEMO zcl_demo.clas.abap -t $TR --activate
```

## See also

- [`adt class / interface / program` reference](/cli/objects)
- [`adt lock` / `unlock` / `locks`](/cli/lock)
- [CTS workflow](./cts-workflow)
- [Workbench navigation](./workbench-navigation)
- [MCP `create_object`](/mcp/tools/create_object)
