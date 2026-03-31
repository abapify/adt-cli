---
name: adt-export
description: ADT export, deploy, roundtrip, diff, and unlock commands. USE WHEN working with abapGit file export/import, deploying to SAP, comparing local vs remote, roundtrip testing, or unlocking stuck objects. Trigger words - export, deploy, diff, roundtrip, unlock, compare SAP, push to SAP, abapGit sync.
---

# ADT Export & Roundtrip Commands

CLI commands for the abapGit-to-SAP workflow: export (deploy), diff, roundtrip test, and unlock.

## Command Overview

| Command                     | Package               | Purpose                                    |
| --------------------------- | --------------------- | ------------------------------------------ |
| `adt export` / `adt deploy` | `@abapify/adt-export` | Push local abapGit files to SAP            |
| `adt diff`                  | `@abapify/adt-diff`   | Compare local files against SAP remote     |
| `adt roundtrip`             | `@abapify/adt-export` | Deploy + reimport + compare (verification) |
| `adt activate`              | `@abapify/adt-export` | Bulk-activate inactive objects             |
| `adt unlock`                | `@abapify/adt-cli`    | Force-unlock stuck SAP objects             |

All commands are registered in `adt.config.ts` and loaded by the plugin loader.

---

## 1. Export / Deploy

```bash
adt export [files...] [options]
adt deploy [files...]  [options]   # alias
```

### Options

| Flag                           | Description                                         | Default   |
| ------------------------------ | --------------------------------------------------- | --------- |
| `-s, --source <path>`          | Source directory with serialized files              | `.`       |
| `-f, --format <format>`        | Format plugin (`abapgit` / `ag`)                    | `abapgit` |
| `-t, --transport <request>`    | Transport request (optional for `$TMP`)             |           |
| `-p, --package <package>`      | Target SAP package for new objects                  |           |
| `--types <types>`              | Filter by types, comma-separated (e.g. `CLAS,TABL`) | all       |
| `--dry-run`                    | Scan only, don't save                               | `false`   |
| `--activate` / `--no-activate` | Activate after deploy                               | `true`    |
| `--unlock`                     | Force-unlock before saving                          | `false`   |
| `--abap-language-version <v>`  | `2`=keyUser, `5`=cloud (BTP)                        |           |

### Workflow

```
Local abapGit files (.xml + .abap)
  |  format.export() yields AdkObjects
  v
[Create missing subpackages if --package]
[Reassign objects to correct package if needed]
[Force-unlock if --unlock]
  |
  v  objectSet.deploy(mode: 'upsert')
SAP System (saved + activated)
```

Phases:

1. **Discovery** -- format plugin parses file tree into ADK objects
2. **Subpackage creation** -- inherits transport layer from parent package
3. **Package reassignment** -- deletes + recreates objects in wrong package
4. **Unlock** -- POST `?_action=UNLOCK` per object (if `--unlock`)
5. **Deploy** -- upsert (lock/update or create), then bulk activate

### Examples

```bash
# Deploy everything in current dir
adt export -p ZPACKAGE -t NPLK900042

# Deploy specific files
adt export zage_tabl.tabl.xml zcl_myclass.clas.xml -p ZPACKAGE

# Deploy only domains and data elements
adt export --types DOMA,DTEL -p ZPACKAGE

# Dry run (validate without saving)
adt export --dry-run -p ZPACKAGE

# Deploy without activation
adt export --no-activate -p ZPACKAGE -t NPLK900042

# Force-unlock before deploy
adt export --unlock -p ZPACKAGE
```

---

## 2. Diff

```bash
adt diff [files...] [options]
```

### Options

| Flag                    | Description                                   | Default  |
| ----------------------- | --------------------------------------------- | -------- |
| `--no-color`            | Disable colored output                        | color on |
| `-c, --context <lines>` | Context lines in diff                         | `3`      |
| `-s, --source`          | Compare ADK source instead of XML (TABL only) | `false`  |

### Supported Types

CLAS, INTF, PROG, FUGR, TABL, DOMA, DTEL, TTYP, DEVC

### Two Modes

**XML mode (default)** -- works for all types:

```
Local .xml file  -->  parse via schema
                       |
Remote from SAP  -->  serialize via handler --> parse via schema
                       |
               projectOnto(remote, local)  -- strip fields local doesn't have
                       |
               rebuild both --> unified diff
```

**Source mode (`--source`)** -- TABL only:

```
Local .xml  -->  tablXmlToCdsDdl()  -->  CDS DDL text
Remote SAP  -->  getSource()        -->  CDS DDL text
                                          |
                         project remote annotations onto local's set
                                          |
                                    unified diff
```

### Projection Concept

**Local is source of truth.** Remote is projected onto local's shape:

- XML mode: `projectOnto()` drops keys/fields from remote that local doesn't have
- Source mode: annotations in remote CDS that don't exist in local CDS are stripped
- This eliminates false positives from fields SAP auto-adds (LANGDEP, POSITION, MATEFLAG, SHLPEXI)

### Examples

```bash
# Diff a single file
adt diff zage_tabl.tabl.xml

# Diff all tables
adt diff *.tabl.xml

# Source-level diff (human-readable CDS)
adt diff *.tabl.xml --source

# Diff with more context
adt diff zcl_myclass.clas.xml -c 5
```

### Exit Codes

- `0` -- no differences
- `1` -- differences found, or errors

---

## 3. Roundtrip

```bash
adt roundtrip [files...] [options]
```

### Options

Same as export, plus:

| Flag         | Description                        |
| ------------ | ---------------------------------- |
| `--keep-tmp` | Keep temp directory for inspection |

### Workflow (3 phases)

```
Phase 1: Deploy     -- local files --> SAP (same as export)
Phase 2: Reimport   -- SAP --> adk.get() --> format.import() --> temp dir
Phase 3: Compare    -- normalize XML --> diff original vs reimported
```

Exit `0` = all files match (roundtrip fidelity proven), exit `1` = mismatches found.

### Examples

```bash
# Roundtrip test all files
adt roundtrip -p ZPACKAGE -t NPLK900042

# Roundtrip specific files, keep temp for inspection
adt roundtrip zage_tabl.tabl.xml -p ZPACKAGE --keep-tmp

# Roundtrip only domains
adt roundtrip --types DOMA -p ZPACKAGE
```

### Excluded from comparison

- `.abapgit.xml` (repo metadata)
- `package.devc.xml` (package definition)

---

## 4. Unlock

```bash
adt unlock <objectNames...> [options]
```

### Options

| Flag                     | Description                               |
| ------------------------ | ----------------------------------------- |
| `--type <type>`          | Object type hint (CLAS, TABL, DOMA, etc.) |
| `--uri <uri>`            | Direct ADT URI (single object only)       |
| `--lock-handle <handle>` | Specific lock handle string               |

### Resolution Order

1. `--uri` provided -- use verbatim
2. `--type` provided -- construct URI from ADK registry
3. Neither -- search via `quickSearch()`, exact name match

### Examples

```bash
# Unlock by name (auto-resolves via search)
adt unlock ZCL_MY_CLASS

# Unlock multiple objects
adt unlock ZAGE_TABL ZAGE_STRUCTURE

# Unlock with type hint (faster, no search)
adt unlock ZAGE_TABL --type TABL

# Unlock with direct URI
adt unlock ZAGE_TABL --uri /sap/bc/adt/ddic/tables/zage_tabl
```

---

## 5. Activate

```bash
adt activate [files...] [options]
```

Three selectors (mutually exclusive):

- **files** -- parse via format plugin
- `--package <pkg>` -- read objects from package
- `--transport <tr>` -- read objects from transport request

---

## Troubleshooting

### Authentication

| Symptom                       | Fix                                                            |
| ----------------------------- | -------------------------------------------------------------- |
| `ADT client not available`    | Run `adt auth login` first                                     |
| `401 Unauthorized`            | Session expired -- run `adt auth login` again                  |
| SAML/SSO popup doesn't appear | Check `adt auth status`, try `adt auth login --method browser` |

### Export / Deploy

| Symptom                         | Fix                                                                                                   |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `Object is locked by user X`    | Use `--unlock` flag, or run `adt unlock <name>` first                                                 |
| `Transport request required`    | Add `-t <TR>` (objects not in `$TMP` need a transport)                                                |
| `Package does not exist`        | Create the package in SAP first, or use `-p` with an existing root package (subpackages auto-created) |
| `Plugin not found`              | Run `bun add @abapify/adt-plugin-abapgit`                                                             |
| Object ends up in wrong package | Export deletes + recreates when `-p` is set. Ensure `-p` is the correct target.                       |
| `--types` not filtering         | Types are uppercase and match full ADK type or prefix (e.g., `CLAS` matches `CLAS/OC`)                |
| Partial failures                | Check output for per-object errors. Re-run with `--dry-run` to validate.                              |

### Diff

| Symptom                         | Fix                                                                                                                                                                                                                                     |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Cannot parse filename`         | Must be abapGit format: `name.type.xml`                                                                                                                                                                                                 |
| `Expected .xml file, got .abap` | Pass the `.xml` metadata file, not `.abap` source                                                                                                                                                                                       |
| `--source` errors on non-TABL   | Source mode only supports TABL. Use default XML mode for other types.                                                                                                                                                                   |
| False positives (extra fields)  | This is the projection system's job. If you see spurious diffs on fields like LANGDEP/POSITION/SHLPEXI, the local XML is likely using a newer schema that includes those fields -- the projection should strip them. File a bug if not. |
| `Unsupported object type: XXX`  | Type not registered in abapGit plugin. Check `getSupportedTypes()`.                                                                                                                                                                     |

### Roundtrip

| Symptom                 | Fix                                                                                                                                                                                                |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mismatches in roundtrip | Expected: the serializer isn't perfectly round-tripping. Use `--keep-tmp` and diff the temp dir manually. Common causes: field ordering, auto-computed fields (POSITION), missing optional fields. |
| Objects not activated   | Check activation errors in output. Some objects need dependencies activated first.                                                                                                                 |

### Unlock

| Symptom                              | Fix                                                                  |
| ------------------------------------ | -------------------------------------------------------------------- |
| `Object not found via search`        | Use `--type TABL` or `--uri /sap/bc/adt/ddic/tables/name`            |
| `Type X has no registered endpoint`  | Falls back to search. Use `--uri` if search also fails.              |
| Object not locked (info, not error)  | Normal -- means it was already unlocked or never locked              |
| Unlock fails for another user's lock | Can only unlock your own locks via ADT. Admin unlock needed in SM12. |

### General

| Symptom                               | Fix                                                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `nx build` fails with doubled path    | Run `bunx nx reset` then rebuild                                                                       |
| Stale CLI behavior after code changes | Rebuild: `bunx nx build <package>`                                                                     |
| `.abapgit.xml` not found              | Commands that need repo root walk up directories looking for it. Ensure you're inside an abapGit repo. |

---

## Key Files

| File                                            | Description                     |
| ----------------------------------------------- | ------------------------------- |
| `packages/adt-export/src/commands/export.ts`    | Export/deploy command           |
| `packages/adt-export/src/commands/roundtrip.ts` | Roundtrip command               |
| `packages/adt-export/src/commands/activate.ts`  | Activate command                |
| `packages/adt-diff/src/commands/diff.ts`        | Diff command                    |
| `packages/adt-diff/src/lib/abapgit-to-cds.ts`   | TABL XML to CDS DDL converter   |
| `packages/adt-cli/src/lib/commands/unlock.ts`   | Unlock command                  |
| `packages/adt-cli/src/lib/plugin-loader.ts`     | Plugin-to-Commander translation |
| `adt.config.ts`                                 | Command registration            |
