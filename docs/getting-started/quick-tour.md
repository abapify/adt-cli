---
title: Quick Tour
sidebar_position: 5
description: A 10-minute end-to-end walkthrough — create a package, add a class, run tests, and clean up.
---

# Quick Tour

This tour takes about 10 minutes. By the end you will have created a package, added a class with a unit test, checked it into an abapGit repository on disk, and cleaned up. You need:

- An SAP system you can write to (a local sandbox or BTP trial works best).
- A user with change authorization.
- An open transport, or authority to create one.

Assuming `DEV` is your default system (see [auth](./auth.md)); every step also works with `--sid <SID>`.

## Step 1 — Sanity check

```bash
adt info
adt discovery
```

`info` confirms the session. `discovery` lists the ADT services your system exposes — make sure `oo/classes`, `aunit`, and `cts/transports` are present.

{/_ screenshot placeholder: adt info output — add in D3 _/}

## Step 2 — Create a transport

```bash
adt cts transport create \
  --description "Quick tour demo" \
  --type K
```

```
Created transport DEVK900555
```

Save the TR number — later steps use it. See [`adt cts transport`](../cli/cts-transport.md).

:::tip
On BTP / S/4HANA Cloud use `adt gcts` branches instead of classical transports. The rest of the tour still works; just skip the CTS steps.
:::

## Step 3 — Create a package

```bash
adt package create ZTOUR_DEMO \
  --description "Quick tour playground" \
  --software-component HOME \
  --transport DEVK900555
```

{/_ screenshot placeholder: package created — add in D3 _/}

Reference: [`adt package`](../cli/package.md).

## Step 4 — Create a class

```bash
adt objects class create ZCL_TOUR_DEMO \
  --package ZTOUR_DEMO \
  --description "Quick tour class" \
  --transport DEVK900555
```

`adt` pushes the skeleton via the OO classes contract, then acquires a lock so you can add real source.

## Step 5 — Add source code

Write the implementation locally:

```bash
mkdir -p tour
cat > tour/zcl_tour_demo.abap <<'ABAP'
CLASS zcl_tour_demo DEFINITION PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    METHODS add IMPORTING a TYPE i b TYPE i RETURNING VALUE(r) TYPE i.
ENDCLASS.

CLASS zcl_tour_demo IMPLEMENTATION.
  METHOD add.
    r = a + b.
  ENDMETHOD.
ENDCLASS.
ABAP

adt objects class source put ZCL_TOUR_DEMO \
  --file tour/zcl_tour_demo.abap \
  --transport DEVK900555
```

`put` runs the full write cycle for you: lock → PUT source → unlock. On failure it always releases the lock.

Now add a unit test include:

```bash
cat > tour/zcl_tour_demo.testclasses.abap <<'ABAP'
CLASS ltcl_tour DEFINITION FINAL FOR TESTING
  DURATION SHORT
  RISK LEVEL HARMLESS.
  PRIVATE SECTION.
    METHODS should_add FOR TESTING.
ENDCLASS.

CLASS ltcl_tour IMPLEMENTATION.
  METHOD should_add.
    cl_abap_unit_assert=>assert_equals(
      exp = 7
      act = NEW zcl_tour_demo( )->add( a = 3 b = 4 ) ).
  ENDMETHOD.
ENDCLASS.
ABAP

adt objects class source put ZCL_TOUR_DEMO \
  --include testclasses \
  --file tour/zcl_tour_demo.testclasses.abap \
  --transport DEVK900555
```

Reference: [`adt objects`](../cli/objects.md), [`adt source`](../cli/source.md), [`adt lock`](../cli/lock.md).

## Step 6 — Activate

```bash
adt objects class activate ZCL_TOUR_DEMO
```

```
Activated 1 object: ZCL_TOUR_DEMO
```

## Step 7 — Run the unit test

```bash
adt aunit ZCL_TOUR_DEMO --coverage
```

```
ZCL_TOUR_DEMO
  ✓ should_add                              4ms
  1 passed, 0 failed, 0 skipped             Coverage 100%
```

{/_ screenshot placeholder: aunit pass — add in D3 _/}

Reference: [`adt aunit`](../cli/aunit.md).

## Step 8 — Check out the package as abapGit

```bash
mkdir tour-repo && cd tour-repo
adt checkout --package ZTOUR_DEMO --format abapgit .
```

```
tour-repo/
  src/
    ztour_demo.devc.xml
    zcl_tour_demo.clas.abap
    zcl_tour_demo.clas.testclasses.abap
    zcl_tour_demo.clas.xml
```

You now have a plain-file snapshot of the package in abapGit layout. Diff it, commit it to git, or push it into a gCTS repo.

Reference: [`adt checkout`](../cli/checkout.md), [`adt gcts`](../cli/gcts.md).

## Step 9 — Re-import the other direction

To prove round-trip fidelity:

```bash
adt checkin --package ZTOUR_DEMO --format abapgit . \
  --transport DEVK900555 --dry-run
```

`--dry-run` reports what would change without writing. Drop it to push for real.

Reference: [`adt checkin`](../cli/checkin.md).

## Step 10 — Clean up

```bash
cd ..
adt objects class delete ZCL_TOUR_DEMO --transport DEVK900555
adt package delete ZTOUR_DEMO --transport DEVK900555
adt cts transport release DEVK900555
```

:::warning
`delete` is irreversible and respects ADT's dependency rules. If deletion is rejected, check for referenced objects (`adt get --where-used`).
:::

## What you used

| Step       | Command                                 | Reference                                                    |
| ---------- | --------------------------------------- | ------------------------------------------------------------ |
| Identity   | `adt info` / `adt discovery`            | [info](../cli/info.md), [discovery](../cli/discovery.md)     |
| Transports | `adt cts transport …`                   | [cts-transport](../cli/cts-transport.md)                     |
| Structure  | `adt package …` / `adt objects class …` | [package](../cli/package.md), [objects](../cli/objects.md)   |
| Source     | `adt objects class source put`          | [source](../cli/source.md)                                   |
| Tests      | `adt aunit`                             | [aunit](../cli/aunit.md)                                     |
| Repo       | `adt checkout` / `adt checkin`          | [checkout](../cli/checkout.md), [checkin](../cli/checkin.md) |

## Next steps

- Same flow, driven by an AI assistant: [MCP setup](./mcp-setup.md).
- Programmatic access from TypeScript: [`@abapify/adt-client`](../sdk/packages/adt-client.md) and the [SDK overview](../sdk/packages/overview.md).
- Full command catalogue: [CLI overview](../cli/overview.md).
