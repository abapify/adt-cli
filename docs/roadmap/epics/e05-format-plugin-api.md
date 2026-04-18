# E05 — Format-Plugin API (foundation)

## Mission

Define and ship a stable plugin API so any third-party package can register a serialization format (abapGit, gCTS, AFF, custom) and be consumed transparently by `export`, `diff`, `roundtrip`, and `import` commands.

## Why

Currently `@abapify/adt-plugin-abapgit` is the only serializer and is hardwired into the export/import code paths. The user requirement: "even if `gcts` command isn't installed we must still be able to save in gcts format alongside abapgit". That requires:

1. A plugin contract (TypeScript interface) for "format plugins".
2. A registry where plugins announce themselves at startup.
3. Refactoring `adt-export`, `adt-diff`, the `import` services, and `checkout` so they pick a format by name (`--format abapgit | gcts | aff`) and dispatch to the registered plugin.

This is the **foundation** for E06 (gCTS format) and E08 (checkin) — both of which need to slot in alongside abapGit without forking the pipeline.

## Dependencies

- Blocked by: none
- Blocks: **E06, E07, E08**

## References

- Existing format plugin (single hard-coded consumer): `packages/adt-plugin-abapgit/`
- Plugin interface package (currently CLI-command-only): `packages/adt-plugin/` — extend it.
- Export/diff/roundtrip consumers:
  - `packages/adt-export/src/`
  - `packages/adt-diff/src/`
  - `packages/adt-cli/src/lib/services/import/`
  - `packages/adt-cli/src/lib/commands/checkout.ts`
- abapGit handler base class: `packages/adt-plugin-abapgit/src/lib/handlers/base.ts`

## Scope — files

### Add

```
packages/adt-plugin/src/lib/format/format-plugin.ts          # FormatPlugin interface
packages/adt-plugin/src/lib/format/format-registry.ts        # global registry + register/list/get
packages/adt-plugin/src/lib/format/index.ts
packages/adt-plugin/tests/format-registry.test.ts
docs/architecture/format-plugins.md                          # design doc
```

### Modify

```
packages/adt-plugin/src/index.ts                             # export FormatPlugin types/registry
packages/adt-plugin-abapgit/src/index.ts                     # register itself as 'abapgit' format on import
packages/adt-plugin-abapgit/src/lib/handlers/base.ts         # implement FormatPlugin interface
packages/adt-export/src/...                                  # accept --format <name>, dispatch to registry
packages/adt-diff/src/...                                    # same
packages/adt-cli/src/lib/services/import/service.ts          # accept format option, dispatch
packages/adt-cli/src/lib/commands/checkout.ts                # --format flag
packages/adt-cli/src/lib/cli.ts                              # ensure adt-plugin-abapgit registers on startup
packages/adt-cli/src/lib/cli-bootstrap.ts (or equivalent)    # plugin discovery from package.json
```

## FormatPlugin interface (proposed)

```ts
export interface FormatPlugin {
  /** Stable id used on the CLI (`--format <id>`). */
  readonly id: string;
  /** Human description for `adt --help`. */
  readonly description: string;
  /** Object types this plugin can serialize. */
  readonly supportedTypes: ReadonlyArray<string>;
  /** Serialize a single ADT object to one or more files. */
  serialize(obj: AdtObject): Promise<SerializedFile[]>;
  /** Inverse: read files and reconstruct an ADT object. */
  deserialize(files: SerializedFile[]): Promise<AdtObject>;
  /** Diff two serialized representations (text-level by default). */
  diff?(local: SerializedFile[], remote: SerializedFile[]): Promise<DiffResult>;
}
```

Plugin registration is at module-load time via `registerFormatPlugin(...)` so any package that adds the plugin to `package.json` dependencies + imports gets auto-registered (via the existing CLI plugin discovery in `adt-cli/src/lib/plugins/`).

## Out of scope

- Implementing gCTS itself (E06).
- Implementing the AFF format plugin (separate future epic).
- Lock/transport orchestration (E08).

## Tests

- Unit: registry register/lookup/list, name conflict detection, supportedTypes filtering.
- Integration: existing `adt export` / `adt diff` / `adt checkout` tests still pass with abapGit auto-selected when `--format` is absent.
- Add a minimal in-memory test plugin (`tests/fixtures/test-format-plugin.ts`) and assert `--format test` dispatches to it.

## Acceptance

```bash
bunx nx run-many -t build,test -p adt-plugin adt-plugin-abapgit adt-export adt-diff adt-cli
bunx nx typecheck && bunx nx lint && bunx nx format:write
```

- `grep -rE "from.*adt-plugin-abapgit['\"]" packages/adt-export packages/adt-diff packages/adt-cli` returns ZERO results — every consumer goes through `getFormatPlugin('abapgit')`.

## Devin prompt

```
Spec: /mnt/wsl/workspace/ubuntu/adt-cli/docs/roadmap/epics/e05-format-plugin-api.md
Read AGENTS.md + docs/roadmap/README.md, then this spec. This epic is foundation for E06/E07/E08;
breakages will block multiple downstream sessions.
Do NOT commit without approval.
```

## Open questions

- Should plugin discovery scan `node_modules/@abapify/*` automatically (like the existing CLI command-plugin pattern), or require explicit registration in user config? Recommend automatic for parity with CLI-command plugins.
- How does multi-file serialization round-trip (e.g. one ABAP class produces 6 files)? Confirm `SerializedFile[]` carries enough metadata.

## Follow-ups discovered during implementation

- **`diff()` on `FormatPlugin` was deferred.** The epic proposed `diff(local, remote): Promise<DiffResult>` as an optional method. It was dropped from v1 because current diff logic is abapGit-specific (field projection, XML normalization). Revisit when a second format (gCTS) needs diff support, so we have two data points to generalise from.

- **`ObjectHandler` vs `FormatHandler`.** The concrete `ObjectHandler<T, TSchema>` in `adt-plugin-abapgit` is heavily parameterised on `AbapGitSchema` — moving it to `@abapify/adt-plugin` would drag abapgit types into the generic interface. Instead, we defined a narrower `FormatHandler` in `@abapify/adt-plugin` and rely on structural subtyping (the abapgit handler is a superset). New formats (gCTS, AFF) can define their own concrete handler shape as long as it satisfies `FormatHandler`.

- **Dynamic-import fast path.** `loadFormatPlugin` in `adt-cli/src/lib/utils/format-loader.ts` still performs a dynamic `await import(pkg)` to obtain the legacy `AdtPlugin` instance (needed for import services and the bundled-binary preloaded-plugin code path). Once the `AdtPlugin`/`FormatPlugin` split is fully consumed by E08, the dynamic import can be replaced with a pure `getFormatPlugin(id)` lookup.

- **Sourcemaps trip the literal grep.** The acceptance grep matches pre-existing compiled `dist/**/*.mjs.map` files (sourcemap `sourcesContent` embeds source as a single JSON line, so `.` inadvertently matches across what were originally multi-line imports). Run the grep with `--exclude-dir=dist --exclude-dir=node_modules` to see only real source hits (zero after this change).

- **Bundler static-import assumption.** The previous `format-loader.ts` carried a comment noting that Bun's bundler required a static `import * as abapgitPlugin from '@abapify/adt-plugin-abapgit'`. We replaced it with dynamic import + side-effect bootstrap. If we see regressions in `adt-all` bundled binary resolution, reintroduce the static import only inside the bootstrap file (`cli.ts`), never in shared utilities.
