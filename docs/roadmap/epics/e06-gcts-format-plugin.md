# E06 — gCTS Format-Plugin

## Mission

Ship `@abapify/adt-plugin-gcts` — a format-plugin that serializes ADT objects in **gCTS** (git-enabled CTS) layout, so `adt export --format gcts`, `adt diff --format gcts`, `adt roundtrip --format gcts`, `adt checkout --format gcts` all work even without the gCTS command-plugin (E07) installed.

## Why

gCTS has its own on-disk layout (different from abapGit). Users on S/4HANA Cloud / BTP work in gCTS-formatted git repos and need a way to sync local files with our tooling. This plugin makes adt-cli **format-agnostic** — abapGit and gCTS are peers.

## Dependencies

- Blocked by: **E05** (FormatPlugin API)
- Blocks: **E07** (command plugin reuses serialization), **E08** (checkin)

## References

- gCTS file format docs: SAP Help → "git-enabled CTS file format". Capture relevant pages locally as references.
- sapcli gCTS module (for shape, NOT for format — sapcli doesn't serialize, only commands): `tmp/sapcli-ref/sapcli/sap/cli/gcts.py`, `sap/adt/gcts.py`
- Real gCTS-formatted repo example: see https://github.com/SAP-samples/abap-platform-sample-app or similar; clone to `tmp/gcts-sample/` for reference.
- Our abapGit plugin (template to mimic): `packages/adt-plugin-abapgit/src/lib/handlers/`

## Scope — files

### Add (new package)

```
packages/adt-plugin-gcts/
├── README.md
├── AGENTS.md                     # ADK conventions: gCTS layout rules
├── package.json
├── project.json
├── tsconfig*.json
├── tsdown.config.ts
├── src/
│   ├── index.ts                  # FormatPlugin registration
│   ├── lib/
│   │   ├── format/
│   │   │   ├── gcts-format.ts    # implements FormatPlugin
│   │   │   ├── filename.ts       # adtUriToGctsPath() — gCTS naming convention
│   │   │   └── types.ts
│   │   └── handlers/
│   │       ├── base.ts           # GctsHandlerBase
│   │       └── objects/
│   │           ├── clas.ts
│   │           ├── intf.ts
│   │           ├── prog.ts
│   │           ├── fugr.ts
│   │           ├── ddls.ts
│   │           ├── dcls.ts
│   │           ├── doma.ts
│   │           ├── dtel.ts
│   │           ├── tabl.ts
│   │           ├── devc.ts       # package
│   │           └── ...           # match abapGit coverage
└── tests/
    ├── format/
    │   ├── filename.test.ts
    │   └── round-trip.test.ts    # serialize → deserialize identity
    └── handlers/
        └── *.test.ts             # per-handler unit tests
```

### Modify

```
packages/adt-cli/src/lib/cli.ts                  # auto-discover @abapify/adt-plugin-gcts on startup
packages/adt-cli/package.json                    # do NOT add as required dep — discovery is opt-in via user install
docs/roadmap/epics/e05-format-plugin-api.md      # cross-link this implementation as the second consumer
```

## gCTS naming summary (fill in concretely)

Captured during research; high-level pointer for the agent:

- gCTS uses object-type subdirectories (e.g. `objects/CLAS/zcl_foo/zcl_foo.clas.abap`).
- Metadata in `manifest.yml` per object, not per-file XML.
- Encoding: UTF-8.
- Source includes named differently from abapGit (research SAP docs; do NOT copy abapGit's `.locals_def.abap`).

Document the **complete table** in `packages/adt-plugin-gcts/AGENTS.md` before coding handlers.

## Out of scope

- gCTS-specific commands (`repo create`, `branch`, `pull`) — that's E07.
- Server-side gCTS repository management — read/write files only.

## Tests

- Per-object serialize round-trip: 12+ tests (one per supported type).
- `adt export --format gcts` end-to-end against the shared mock: 1 test.
- `adt diff --format gcts` between two synthetic file sets: 1 test.
- Filename mapping: 20+ tests (mirror E coverage's `adt-uri-to-path.test.ts`).

## Acceptance

```bash
bunx nx run-many -t build,test -p adt-plugin-gcts adt-export adt-diff adt-cli
bunx nx typecheck && bunx nx lint && bunx nx format:write
```

- `bunx adt export --format gcts <pkg>` produces a gCTS-shaped tree.
- `bunx adt export --format abapgit <pkg>` still works (no regression).

## Devin prompt

```
Spec: /mnt/wsl/workspace/ubuntu/adt-cli/docs/roadmap/epics/e06-gcts-format-plugin.md
Read AGENTS.md, docs/roadmap/README.md, e05-format-plugin-api.md, then this file.
Reference SAP help docs for gCTS file layout — capture and pin locally before coding handlers.
This epic must NOT introduce gCTS *commands* (those are E07). Only serialization.
Do NOT commit without approval.
```

## Open questions

- AFF (`SAP/abap-file-formats`) JSON-based metadata vs gCTS's `manifest.yml` — are they the same? If yes, this plugin is also "AFF format plugin". Worth confirming and updating naming.

## Follow-ups discovered during implementation (v0.1)

- **Terminology inversion.** The epic's acceptance says `adt export --format gcts <pkg>` produces a gCTS-shaped tree. In adt-cli's actual command set, `adt export` means _disk → SAP_ (deploy) and `adt import package` means _SAP → disk_ (pull). v0.1 implements the SAP → disk direction (`adt import package --format gcts ZMYPKG ./out`); the Git → SAP direction (`adt export --format gcts`) requires deserialization handlers and is deferred alongside E08 checkin. Update acceptance wording in a follow-up.

- **Format naming — gcts vs aff.** The open question above is effectively resolved in v0.1: a single plugin with id `gcts` (alias `aff`) handles both. If a concrete layout divergence is found later we'll introduce a separate id rather than branching inside the plugin.

- **AFF JSON schemas not yet vendored.** Handlers use loose typing on metadata payloads because `SAP/abap-file-formats` has not been pulled into `git_modules/` as a submodule. Once vendored, tighten the metadata types (`src/lib/format/types.ts`) and add schema-validation tests parallel to abapGit's XSD-round-trip tests.

- **Package metadata shape is ad-hoc.** `devc.ts` invents a `package.softwareComponent` / `applicationComponent` / `packageType` payload. Replace with the real AFF devc schema when vendored.

- **FUGR FM-level files deferred.** AFF emits one file per function module under the group directory. v0.1 only emits the group metadata — matches E04/E09 current FM support level. Revisit once ADK exposes FM iteration cleanly.

- **No XSDs required.** Unlike abapGit, AFF is JSON-native. The plugin consciously does NOT use ts-xsd. If a future format needs XML (e.g. an SAPLink variant), it belongs in a separate plugin package.

- **Bundler/static-import.** `adt-cli/src/lib/cli.ts` uses a side-effect-only `import '@abapify/adt-plugin-gcts';` (mirroring the abapgit import). If the bundled `adt-all` binary loses the registration, add a static named import inside `cli.ts` (never in shared utilities), as noted in E05's follow-ups.
