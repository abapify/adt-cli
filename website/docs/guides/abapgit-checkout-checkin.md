---
title: abapGit checkout/checkin roundtrip
sidebar_position: 7
description: Full disk ↔ SAP roundtrip using the abapGit serialisation format.
---

# abapGit checkout / checkin roundtrip

## Goal

Pull a package out of SAP as abapGit-formatted files, edit them with any
tool, commit to git, and push the changes back to SAP — without Eclipse,
without the abapGit frontend.

## Prerequisites

- [adt-cli installed and authenticated](/getting-started/installation)
- A source package (`$ZDEMO` used throughout)
- A transport: `export TR=DEVK900001`
- Optional: git client, IDE, ESLint-for-ABAP, etc. — none is required

## Layout

abapGit classic format. Each object becomes:

```
src/
  zcl_demo.clas.abap        # source
  zcl_demo.clas.xml         # metadata
  zif_demo.intf.abap
  zif_demo.intf.xml
  zt_customer.tabl.xml      # DDIC: metadata only, no .abap
  zi_customer.ddls.asddls   # DDL source
  .apack-manifest.xml       # (if present — package manifest)
  package.devc.xml          # package metadata
```

See [Format comparison](./format-comparison) for the gCTS/AFF equivalent.

## Steps

### 1. Checkout

```bash
adt checkout package \$ZDEMO ./src
```

Expected output:

```
Importing package $ZDEMO ...
  CLAS  ZCL_DEMO             → src/zcl_demo.clas.abap (+xml)
  INTF  ZIF_DEMO              → src/zif_demo.intf.abap (+xml)
  TABL  ZT_CUSTOMER           → src/zt_customer.tabl.xml
  DDLS  ZI_CUSTOMER           → src/zi_customer.ddls.asddls
  DEVC  $ZDEMO                → src/package.devc.xml
4 objects, 1 package
```

Narrow by type:

```bash
adt checkout package \$ZDEMO ./src --object-types CLAS,INTF,DDLS
```

### 2. Edit

Work on the files with any editor, toolchain, linter, or AI assistant. abapGit
`.abap` files are plain ABAP with no wrapper — you can run `prettier-abap`,
ESLint-for-ABAP, git diff, etc.

### 3. Git snapshot

```bash
git init && git add src && git commit -m "initial checkout of $ZDEMO"
# ... edit ...
git commit -am "add validation in ZCL_DEMO->main"
```

### 4. Dry-run the checkin

Before writing anything back:

```bash
adt checkin ./src -p \$ZDEMO --dry-run
```

Expected output:

```
Plan (dry-run, no SAP writes):
  UPDATE  CLAS  ZCL_DEMO        (source changed)
  SKIP    INTF  ZIF_DEMO        (unchanged)
  SKIP    TABL  ZT_CUSTOMER     (unchanged)
1 updates, 0 creates, 0 deletes
```

### 5. Real checkin

```bash
adt checkin ./src -p \$ZDEMO -t $TR
```

`checkin`:

1. Walks the directory and matches files to the format plugin.
2. Opens a batch lock session.
3. Creates-or-updates each object (attaches to `$TR`).
4. Activates them as a group.

### 6. JSON output for scripts

```bash
adt checkin ./src -p \$ZDEMO -t $TR --json > result.json
jq '.results[] | select(.status!="ok")' result.json
```

Exit code is `1` if any object failed — `result.json` lists the details.

### 7. Skip activation (staging)

```bash
adt checkin ./src -p \$ZDEMO -t $TR --no-activate
```

## Subset operations

```bash
# Single object
adt checkout class ZCL_DEMO ./src
adt checkin ./src --types CLAS -p \$ZDEMO -t $TR

# Multiple types
adt checkin ./src --types CLAS,INTF,DDLS -p \$ZDEMO -t $TR
```

## Troubleshooting

| Error                                     | Cause                                             | Fix                                                                                                                                                        |
| ----------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Object ZCL_DEMO locked by user PPLENKOV` | Stale lock from a previous run                    | `adt checkin ./src -p \$ZDEMO -t $TR --unlock` (force-unlocks locks held by _your_ user)                                                                   |
| `Activation failed: ZT_CUSTOMER inactive` | Type dependency didn't activate in-order          | Keep all files together; abapGit activation orders by object kind. If it still fails, split: `--types TABL,DTEL,DOMA` first, then `--types CLAS,INTF,DDLS` |
| `Format plugin not found: abapgit`        | Plugin dependency not installed                   | `npm i -g @abapify/adt-plugin-abapgit`                                                                                                                     |
| `Checkout wrote 0 files`                  | Package empty, or type filter excluded everything | Remove `--object-types`, or drop into SE80/`adt ls` to confirm content                                                                                     |
| 412 Precondition Failed during checkin    | Object changed in SAP since last checkout         | Re-checkout, merge, retry                                                                                                                                  |

## See also

- [`adt checkout`](/cli/checkout) and [`adt checkin`](/cli/checkin) — command reference
- [`adt import`](/cli/import) — lower-level with `--format-option`
- [gCTS workflow](./gcts-workflow) — alternative using git-enabled CTS on SAP
- [Format comparison](./format-comparison)
- [`@abapify/adt-plugin-abapgit`](/sdk/packages/adt-plugin-abapgit) — serialiser internals
