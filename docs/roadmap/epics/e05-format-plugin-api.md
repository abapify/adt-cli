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
