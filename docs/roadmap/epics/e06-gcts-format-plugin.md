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
