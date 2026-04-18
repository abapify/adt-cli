# E07 — gCTS Command-Plugin

## Mission

Ship `@abapify/adt-plugin-gcts-cli` — a CLI command plugin providing `adt gcts repo / branch / commit / pull / config` subcommands, mirroring sapcli's `sap gcts`. Calls SAP gCTS REST endpoints (`/sap/bc/cts_abapvcs/`).

## Why

gCTS is SAP's first-party git integration on S/4HANA Cloud and BTP. Without a CLI, users can't script gCTS operations (clone repos, switch branches, pull updates) from CI. This epic is the operational counterpart to E06 (which only handles file serialization). Together they make adt-cli a viable gCTS workbench.

## Dependencies

- Blocked by: **E05** (FormatPlugin API), **E06** (gCTS format plugin — for cross-import of `adtUriToGctsPath`).
- Blocks: nothing.

## References

- sapcli CLI: `tmp/sapcli-ref/sapcli/sap/cli/gcts.py` (~1000 LOC), `sap/cli/gcts_task.py`, `sap/cli/gcts_utils.py`
- sapcli ADT/REST: `tmp/sapcli-ref/sapcli/sap/rest/gcts/` (whole subdirectory)
- sapcli fixtures: `tmp/sapcli-ref/sapcli/test/unit/fixtures_sap_rest_gcts*.py`
- SAP REST endpoints under `/sap/bc/cts_abapvcs/repository/...` — different namespace than ADT.

## Scope — files

### Add (new package)

```
packages/adt-plugin-gcts-cli/
├── package.json
├── project.json
├── tsconfig*.json
├── tsdown.config.ts
├── README.md
├── AGENTS.md
├── src/
│   ├── index.ts                              # CliCommandPlugin export
│   ├── lib/
│   │   ├── commands/
│   │   │   ├── repo/
│   │   │   │   ├── list.ts                   # adt gcts repo list
│   │   │   │   ├── create.ts                 # adt gcts repo create
│   │   │   │   ├── clone.ts                  # adt gcts repo clone
│   │   │   │   ├── delete.ts
│   │   │   │   ├── pull.ts
│   │   │   │   └── checkout.ts
│   │   │   ├── branch/
│   │   │   │   ├── list.ts
│   │   │   │   ├── create.ts
│   │   │   │   └── switch.ts
│   │   │   ├── commit.ts                     # adt gcts commit
│   │   │   ├── log.ts                        # adt gcts log
│   │   │   ├── config.ts                     # adt gcts config
│   │   │   └── index.ts                      # registration glue
│   │   └── client/
│   │       └── gcts-client.ts                # wraps client.fetch with gCTS base path
│   └── types.ts
└── tests/
    ├── unit/
    │   └── per-command tests
    └── e2e/
        └── parity.gcts.test.ts               # CLI+MCP parity (8+ tests)
```

### Add (separate)

```
packages/adt-contracts/src/adt/gcts/                # NEW namespace (NOT under /adt/cts/ — gCTS is a peer)
├── repository.ts                                   # /sap/bc/cts_abapvcs/repository
├── branches.ts
├── commits.ts
├── config.ts
└── index.ts
packages/adt-contracts/tests/contracts/gcts.test.ts
packages/adt-schemas/.xsd/custom/gcts*.xsd          # if no SAP XSD
packages/adt-fixtures/src/fixtures/gcts/*.{xml,json}  # real SAP gCTS responses

packages/adt-mcp/src/lib/tools/{gcts-list-repos,gcts-create-repo,gcts-clone-repo,
                                gcts-delete-repo,gcts-pull,gcts-checkout-branch,
                                gcts-list-branches,gcts-create-branch,gcts-switch-branch,
                                gcts-commit,gcts-log,gcts-config}.ts
```

### Modify

```
packages/adt-contracts/src/adt/index.ts             # register gcts at top level
packages/adt-mcp/src/lib/tools/index.ts             # register all gcts_* tools
packages/adt-fixtures/src/fixtures/registry.ts
packages/adt-fixtures/src/mock-server/routes.ts     # gCTS endpoint routes
packages/adt-cli/src/lib/cli.ts                     # auto-discover @abapify/adt-plugin-gcts-cli
```

## Out of scope

- gCTS file serialization — owned by **E06**.
- abapGit-side equivalents.

## Tests

- Contract: 10+ scenarios covering repo / branches / commits / config.
- ADK: not needed — gCTS commands use the contract directly (no objects to model as ADK).
- E2E parity: 8+ tests (repo list / create / pull / branch list / branch create / commit / config get / config set).

## Acceptance

```bash
bunx nx run-many -t build,test -p adt-plugin-gcts-cli adt-contracts adt-mcp adt-cli adt-fixtures
bunx nx typecheck && bunx nx lint && bunx nx format:write
```

## Devin prompt

```
Spec: /mnt/wsl/workspace/ubuntu/adt-cli/docs/roadmap/epics/e07-gcts-command-plugin.md
Read AGENTS.md, docs/roadmap/README.md, e05-format-plugin-api.md, e06-gcts-format-plugin.md.
Reference: /tmp/sapcli-ref/sapcli/sap/cli/gcts.py and sap/rest/gcts/.
Do NOT commit without approval.
```

## Open questions

- Does the gCTS REST surface require a different auth (basic vs OAuth) than ADT? Confirm and document.
- Is there overlap with `client.adt.cts.transportrequests.*` (we have full CTS already)? Surface comparison needed before coding.
