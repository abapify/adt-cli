# adt-plugin-gcts — AI Agent Guide

## Package purpose

Serialize ABAP objects in **gCTS / AFF** layout (`SAP/abap-file-formats`).
Peer of `@abapify/adt-plugin-abapgit` — only the on-disk representation
differs (JSON metadata, AFF source extensions).

This plugin does **not** implement gCTS-specific CLI commands (`repo create`,
`branch`, `pull`). That is E07, a separate package.

## Naming: gCTS vs AFF

gCTS (git-enabled CTS) and AFF (`SAP/abap-file-formats`) use **the same**
on-disk layout — JSON metadata, same object-type subdirectories, same `(ns)`
folder convention. This plugin targets AFF conventions which also satisfies
gCTS consumers. The CLI exposes both ids (`--format gcts` and `--format aff`
— same plugin).

If a concrete divergence is discovered, introduce a second plugin id
(`aff-strict`?) rather than forking. Do not branch on `--format` inside
this package.

## Directory layout

```
src/
├── index.ts                       # Self-registers FormatPlugin + AdtPlugin
├── lib/
│   ├── format/
│   │   ├── gcts-format.ts         # FormatPlugin (declarative contract)
│   │   ├── filename.ts            # gctsFilename / parseGctsFilename / adtUriToGctsPath
│   │   └── types.ts               # GctsMetadata / GctsHeader
│   ├── gcts-plugin.ts             # AdtPlugin (format.import implementation)
│   └── handlers/
│       ├── base.ts                # createHandler factory (JSON output)
│       └── objects/*.ts           # Per-object-type handlers
tests/
├── format/filename.test.ts        # 20+ mapping tests
├── format/round-trip.test.ts      # FormatPlugin registration + e2e import
└── handlers/base.test.ts          # createHandler factory behaviour
```

## Conventions

### 1. No XML — JSON only

Unlike `adt-plugin-abapgit`, this plugin has **no XSD schemas**. AFF is JSON
native. `handler.schema.parse` is `JSON.parse`, `handler.schema.build` is
`JSON.stringify(obj, null, 2) + '\n'`.

When a handler needs rich validation, use an AJV / Zod schema — do NOT
introduce XSDs here.

### 2. Every metadata file has a `header`

Every JSON metadata file must carry a `header` object with at least
`formatVersion: '1.0'`. Additional header fields (description,
originalLanguage, abapLanguageVersion) are optional but strongly
recommended — consumers may project on them.

### 3. Source file extensions

| Source type                   | Extension |
| ----------------------------- | --------- |
| ABAP (CLAS, INTF, PROG, FUGR) | `.abap`   |
| DDL source (DDLS)             | `.asddls` |
| DCL source (DCLS)             | `.asdcls` |

`gctsFilename(name, type, 'source')` picks the right extension — never hard-
code the extension in a handler.

### 4. Handler registration is side-effectful

Importing a file under `src/lib/handlers/objects/` triggers
`createHandler(...)` which registers the handler in the module-local map.
The barrel `src/lib/handlers/objects/index.ts` re-exports all handlers, and
`src/index.ts` imports it transitively via `format/gcts-format.ts`.

### 5. AdtPlugin.format.import is the primary direction

`adt import package --format gcts` is what v0.1 supports end-to-end.
`adt export --format gcts` (disk → SAP) is **deferred** — see the follow-ups
in `docs/roadmap/epics/e06-gcts-format-plugin.md`.

Acceptance grep (from E05) is satisfied because no consumer imports this
package directly: `adt-cli/src/lib/cli.ts` does a bootstrap-only
`import '@abapify/adt-plugin-gcts';` and every other consumer goes through
`getFormatPlugin('gcts')` or the `FORMAT_SHORTCUTS` map in
`adt-cli/src/lib/utils/format-loader.ts`.

## Anti-patterns

| Don't                                    | Do instead                                    |
| ---------------------------------------- | --------------------------------------------- |
| Emit XML                                 | Emit JSON via `JSON.stringify(data, null, 2)` |
| Parse filenames with regex in handlers   | Call `parseGctsFilename(...)`                 |
| Import this package from consumers       | Use `getFormatPlugin('gcts')`                 |
| Hard-code `.abap` in filenames           | Use `gctsFilename(name, type, 'source')`      |
| Duplicate abapGit handlers byte-for-byte | Share logic via ADK — only mapping lives here |

## AFF schemas — vendored via submodule

`git_modules/abap-file-formats` (pinned in `.gitmodules`) is the schema
source of truth. Re-sync = `git submodule update --remote
git_modules/abap-file-formats` + commit; schemas declare `formatVersion`
consts so a re-sync is always reviewed, never silent.

- **Runtime access**: `src/lib/aff/schemas.ts` (`affSchema`,
  `affVersions`, `affValidate` via ajv 2020-12, `affExamples`). No
  workspace deps — safe to import from tests without builds.
- **Typed models**: `bunx nx codegen adt-plugin-gcts` regenerates
  `src/schemas/generated/{stem}-v{n}.ts` (namespaced as
  `AffGenerated.{Type}V{n}` from `src/index.ts`). Generated files are
  artifacts — never hand-edit.
- **Conformance test**: `tests/aff/schema-conformance.test.ts` validates
  every upstream example against its official schema (version-matched;
  `.docu.` companions routed to the `docu` schema; LIMU sub-objects
  routed to their nested schemas (e.g. `fugr/func-v1.json`,
  `fugr/reps-v1.json`).
- **Coverage**: `bun scripts/aff-coverage.ts` prints the
  `type × [versions, body-fields, examples, handler-kind]` matrix —
  dedicated `objects/{type}.ts` vs `wave2-generic.ts` stub. Wave-1..5
  enrich work = graduating stubs to dedicated handlers; see
  `openspec/changes/add-aff-full-coverage/`.

## Build / test

```bash
bunx nx test adt-plugin-gcts         # node --test
bunx nx build adt-plugin-gcts        # tsdown
bunx nx lint adt-plugin-gcts
bunx nx codegen adt-plugin-gcts      # AFF schema → TS models
bunx nx aff-coverage adt-plugin-gcts # coverage matrix
```

## Open items (tracked in E06)

- FUGR sub-module (FUNC) serialization deferred.
- Git → SAP direction (`format.export`) deferred to E08.
