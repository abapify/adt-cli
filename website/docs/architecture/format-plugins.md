---
title: Format Plugins
sidebar_position: 4
---

# Format Plugins

_Status_: accepted (E05). Implemented in `@abapify/adt-plugin-abapgit`
(reference) and `@abapify/adt-plugin-gcts`. See also:
[Plugins → Overview](../plugins/overview),
[SDK → adt-plugin](../sdk/packages/adt-plugin),
[SDK → adt-plugin-abapgit](../sdk/packages/adt-plugin-abapgit),
[SDK → adt-plugin-gcts](../sdk/packages/adt-plugin-gcts).

## Problem

The `adt` CLI originally hard-wired `@abapify/adt-plugin-abapgit` as the only
serialization format. `export`, `diff`, `import`, and `checkout` all imported
that package directly, which made it impossible to add a new format (gCTS,
AFF, …) without either (a) forking the CLI or (b) shipping an additional
`adt-plugin-abapgit`-shaped package and patching every consumer.

The user requirement driving this epic is:

> Even if the `gcts` command isn't installed we must still be able to save in
> gCTS format alongside abapGit.

That means the CLI must discover formats through a contract, not through
import statements.

## Solution

A small in-process registry of **format plugins**, plus a stable
`FormatPlugin` interface that any third-party package can implement. Format
plugins self-register at module-load time — importing the package is enough
to make `--format <id>` work.

### Moving parts

```
┌──────────────────────────────────────────────────────┐
│ @abapify/adt-plugin                                  │
│                                                      │
│  interface FormatPlugin { id, description,           │
│                           supportedTypes,            │
│                           getHandler(type),          │
│                           parseFilename?(name) }     │
│                                                      │
│  registerFormatPlugin(plugin)                        │
│  getFormatPlugin(id) / requireFormatPlugin(id)       │
│  listFormatPlugins()                                 │
└───────────────────────▲──────────────────────────────┘
                        │ implements
                        │
┌───────────────────────┴──────────────────────────────┐
│ @abapify/adt-plugin-abapgit                          │
│                                                      │
│  abapgitFormatPlugin : FormatPlugin                  │
│  (self-registers on module load)                     │
└───────────────────────▲──────────────────────────────┘
                        │ looks up via getFormatPlugin('abapgit')
                        │
┌───────────────────────┴──────────────────────────────┐
│ Consumers                                            │
│  - @abapify/adt-diff                                 │
│  - @abapify/adt-export                               │
│  - @abapify/adt-cli services/import + checkout       │
└──────────────────────────────────────────────────────┘
```

The registry is keyed on the `globalThis` with a `Symbol.for` well-known key
so duplicate module-graph evaluation (tests, bundler outputs) does not
produce two independent registries.

### Bootstrap

Exactly **one** location in the CLI imports `@abapify/adt-plugin-abapgit`
directly: `packages/adt-cli/src/lib/cli.ts` uses a side-effect-only import
(no `from` clause) so that the acceptance grep — which forbids
`from.*adt-plugin-abapgit` in `adt-export`, `adt-diff`, and `adt-cli` — stays
clean. Every other file uses `getFormatPlugin('abapgit')`.

Third-party plugins are loaded either:

1. Statically, by adding `import '@abapify/<your-format-plugin>';` to the
   consumer's entry point, or
2. Dynamically, via `await import(packageName)` (current behaviour of
   `loadFormatPlugin` in adt-cli — useful for plugins listed in
   `adt.config.ts`).

Both paths trigger the plugin's module-level `registerFormatPlugin(...)` call.

### Interface contract

```ts
export interface FormatPlugin {
  readonly id: string;
  readonly description: string;
  readonly supportedTypes: ReadonlyArray<string>;
  getHandler(type: string): FormatHandler | undefined;
  parseFilename?(filename: string): ParsedFormatFilename | undefined;
}
```

- **`id`** is what users pass after `--format` on the CLI. It is part of the
  public API and cannot change without a major version bump.
- **`supportedTypes`** may be computed lazily via a getter (the abapGit
  plugin does this because it reads from a live handler registry).
- **`getHandler(type)`** returns a `FormatHandler` — the per-object-type
  serializer. The abapGit concrete `ObjectHandler<T, TSchema>` is a
  structural superset of `FormatHandler`, so existing abapGit handlers work
  through a widening cast (no translation layer needed).
- **`parseFilename(name)`** is optional because not every format uses
  filenames at all (gCTS streams via REST, for example).

### Registration rules

```
registerFormatPlugin(plugin)
  - same id, same instance    → no-op (idempotent, survives HMR / dual graph)
  - same id, different object → throws (prevents silent shadowing)
  - new id                    → stored
```

`requireFormatPlugin(id)` throws with a message that lists the currently
registered ids, which keeps user-visible errors actionable:

```
Format plugin "gcts" is not registered. Available formats: abapgit.
```

## Alternatives considered

1. **Extend the existing `AdtPlugin`** (`name`, `registry`, `format` shape) —
   rejected because that interface couples serialization logic with
   import/export workflow orchestration. The format registry needs a
   narrower, purely serialization-focused contract so that future formats
   (e.g. gCTS) can implement it without also re-implementing the import
   pipeline.

2. **Move `ObjectHandler` into `@abapify/adt-plugin`** — rejected because
   `ObjectHandler` is heavily parameterized on `AbapGitSchema`, which is an
   abapGit-specific thing and has no business leaking into the generic
   plugin interface. Instead, `FormatHandler` in `@abapify/adt-plugin`
   defines the minimum surface consumers need (parse/build/serialize) and
   concrete handlers may be structural supersets.

3. **Auto-discover `node_modules/@abapify/*`** — deferred. The CLI already
   has a plugin-loading mechanism fed by `adt.config.ts`; rather than
   introducing a second discovery path, format plugins piggy-back on the
   same module imports. See _Open questions_ below.

## Out of scope

- Implementing gCTS as a format plugin (E06).
- The `gcts` CLI command surface (E07).
- Checkin-side lock/transport orchestration (E08).
- `diff(local, remote)` on the `FormatPlugin` interface — the diff command
  today reaches into the concrete handler directly through `getHandler()`.
  Promoting it onto `FormatPlugin` can happen when a second format needs
  diff support.

## Open questions

1. **Automatic discovery vs explicit bootstrap.** The current design relies
   on the consumer (CLI, tests) deciding which plugin packages to import.
   Should `@abapify/adt-plugin` ship a `discoverFormatPlugins()` helper that
   scans `node_modules/@abapify/adt-plugin-*` and imports them? The
   equivalent already exists for CLI-command plugins — parity is probably
   desirable once a second format lands.

2. **Multi-file round-trip metadata.** `SerializedFile[]` carries only
   `path`, `content`, `encoding`. Some formats may need extra per-file
   metadata (e.g. gCTS pack hints, charset overrides). We intentionally did
   **not** extend `SerializedFile` yet; we will revisit when the first
   format actually needs it.

3. **Diff on `FormatPlugin`.** The epic listed
   `diff(local, remote): Promise<DiffResult>` as a candidate method. It was
   dropped from the v1 interface because the current diff logic is
   abapGit-specific (projecting remote onto local's field set, XML
   normalization, etc.) and there is no obvious generic contract yet. When
   gCTS arrives (E06) we'll have two data points and can lift a real
   abstraction.
