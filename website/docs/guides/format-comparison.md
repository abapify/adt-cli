---
title: Format comparison — abapGit vs gCTS / AFF
sidebar_position: 9
description: Side-by-side comparison of the two serialisation formats adt-cli supports.
---

# Format comparison: abapGit vs gCTS / AFF

## Goal

Pick the right `--format` for `adt checkout`, `adt checkin`, and
`adt import`. Both formats are supported by adt-cli via plugins:

- `--format abapgit` — the classic abapGit layout (`@abapify/adt-plugin-abapgit`). Default.
- `--format gcts` — gCTS / AFF layout (`@abapify/adt-plugin-gcts`).

## Side-by-side

| Aspect                | **abapGit classic**                                                         | **gCTS / AFF**                                           |
| --------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------- |
| Primary driver        | abapGit (client-side)                                                       | SAP gCTS (server-side)                                   |
| Source extension      | `.<type>.abap` (e.g. `zcl_foo.clas.abap`)                                   | `.<type>.abap`                                           |
| Metadata format       | **XML** (`<DD02V>`, `<VSEOCLASS>`, ...)                                     | **JSON** (`{ "header": { ... } }`)                       |
| Metadata extension    | `.<type>.xml`                                                               | `.<type>.json`                                           |
| DDL source            | `.ddls.asddls`                                                              | `.ddls.asddls`                                           |
| Includes (class)      | `zcl_foo.clas.locals_imp.abap`, `...locals_def.abap`, `...testclasses.abap` | Same filenames, plus a JSON index                        |
| Package folder layout | Flat (one dir per TADIR package)                                            | Hierarchical (nested directories mirror nested packages) |
| Object index          | _(none — files are the index)_                                              | `.aff-manifest.json` at the root                         |
| Typical consumer      | Local git client, CI pipelines                                              | SAP gCTS (`/sap/bc/cts_abapvcs/*`)                       |
| Standardised by       | abapGit community                                                           | SAP (AFF = ABAP File Format)                             |
| File encoding         | UTF-8                                                                       | UTF-8                                                    |
| Line endings          | LF                                                                          | LF                                                       |

## Example: a single class

**abapGit:**

```
src/
  zcl_demo.clas.abap
  zcl_demo.clas.xml
  zcl_demo.clas.locals_imp.abap
  zcl_demo.clas.testclasses.abap
```

`zcl_demo.clas.xml` (excerpt):

```xml
<?xml version="1.0" encoding="utf-8"?>
<abapGit version="v1.0.0" serializer="LCL_OBJECT_CLAS" serializer_version="v1.0.0">
 <asx:abap xmlns:asx="http://www.sap.com/abapxml" version="1.0">
  <asx:values>
   <VSEOCLASS>
    <CLSNAME>ZCL_DEMO</CLSNAME>
    <LANGU>E</LANGU>
    <DESCRIPT>Demo class</DESCRIPT>
   </VSEOCLASS>
  </asx:values>
 </asx:abap>
</abapGit>
```

**gCTS / AFF:**

```
src/
  zmypkg/
    zcl_demo/
      zcl_demo.clas.abap
      zcl_demo.clas.json
      zcl_demo.clas.locals_imp.abap
      zcl_demo.clas.testclasses.abap
```

`zcl_demo.clas.json`:

```json
{
  "formatVersion": "1",
  "header": {
    "description": "Demo class",
    "originalLanguage": "en"
  },
  "class": {
    "classCategory": "generalObjectType",
    "classPoolType": "classPool"
  }
}
```

## Example: a table

| File                    | abapGit                      | gCTS / AFF                 |
| ----------------------- | ---------------------------- | -------------------------- |
| `zt_customer.tabl.xml`  | ✅ (XML, DD02V/DD03P nested) | ❌                         |
| `zt_customer.tabl.json` | ❌                           | ✅ (JSON, flat `fields[]`) |

No `.abap` for DDIC objects in either format — they're metadata-only.

## Pick the right format

| You want to...                                  | Use                                 |
| ----------------------------------------------- | ----------------------------------- |
| Store ABAP in GitHub and round-trip via abapGit | **abapgit**                         |
| Use SAP's native server-side git (gCTS)         | **gcts**                            |
| Interop with existing abapGit repos             | **abapgit**                         |
| Start fresh on a greenfield S/4 project         | **gcts** (SAP's forward direction)  |
| Validate with `xmllint`                         | **abapgit** (XML schemas available) |
| Use standard JSON tooling (jq, JSON Schema)     | **gcts**                            |

## Switching between them

`adt checkin` and `adt import` accept `--format` — the same source package
can be serialised both ways:

```bash
adt checkout package \$ZDEMO ./abapgit --format abapgit
adt checkout package \$ZDEMO ./aff     --format gcts

# Round-trip back with either
adt checkin ./abapgit -p \$ZDEMO -t $TR
adt checkin ./aff     -p \$ZDEMO -t $TR --format gcts
```

The two directories are **not** byte-equivalent — same SAP objects, different
serialisations.

## See also

- [abapGit roundtrip](./abapgit-checkout-checkin)
- [gCTS workflow](./gcts-workflow)
- [`@abapify/adt-plugin-abapgit`](/sdk/packages/adt-plugin-abapgit) — abapGit serialiser
- [`@abapify/adt-plugin-gcts`](/sdk/packages/adt-plugin-gcts) — gCTS/AFF serialiser
