# sapcli-parity Roadmap

Master plan for closing functional gaps with `jfilak/sapcli` and going beyond.

Each epic is a **self-contained brief** (one file in `epics/`) ready to be handed to a fresh Devin session. The orchestrator (mega-agent) tracks dependencies; each agent works only inside its own epic file.

## Status legend

- 🟢 Ready to start (no blocking deps)
- 🟡 Blocked by another epic
- ✅ Landed
- 🚧 In progress

## Dependency graph

```
                      ┌─────────────────────┐
                      │ E05: format-plugin  │ (foundation)
                      │ API contract        │
                      └─────────┬───────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
    ┌──────────────┐  ┌──────────────────┐ ┌──────────────────┐
    │ E06: gcts    │  │ E08: checkin     │ │ E07: gcts-cmd    │
    │ format plug. │  │ (lock-batch)     │ │ plugin (cmds)    │
    └──────────────┘  └──────────────────┘ └──────────────────┘

              ┌─────────────────┐
              │ E09: acds parser│ (foundation for RAP)
              └────────┬────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   ┌─────────┐   ┌─────────┐    ┌─────────┐
   │E10:BDEF │   │E11:SRVD │    │E12:SRVB │
   └─────────┘   └─────────┘    └─────────┘

  Independent (can parallelize from day 1):
  E01:include  E02:function  E03:badi  E04:strust  E13:startrfc  E14:flp  E15:wb
```

## Epics

| #   | File                                                                 | Title                        | Size | Status        | Blocks        |
| --- | -------------------------------------------------------------------- | ---------------------------- | ---- | ------------- | ------------- |
| E01 | [epics/e01-include.md](epics/e01-include.md)                         | INCL CLI + MCP               | S    | 🟢            | —             |
| E02 | [epics/e02-function.md](epics/e02-function.md)                       | FUGR/FUNC CLI + MCP          | M    | 🟢            | —             |
| E03 | [epics/e03-badi.md](epics/e03-badi.md)                               | BAdI implementations         | M    | 🟢            | —             |
| E04 | [epics/e04-strust.md](epics/e04-strust.md)                           | STRUST cert management       | S    | 🟢            | —             |
| E05 | [epics/e05-format-plugin-api.md](epics/e05-format-plugin-api.md)     | Format-plugin API foundation | M    | 🟢            | E06, E07, E08 |
| E06 | [epics/e06-gcts-format-plugin.md](epics/e06-gcts-format-plugin.md)   | gCTS as format-plugin        | L    | 🟡 (E05)      | E07, E08      |
| E07 | [epics/e07-gcts-command-plugin.md](epics/e07-gcts-command-plugin.md) | gCTS as command-plugin       | L    | 🟡 (E05, E06) | —             |
| E08 | [epics/e08-checkin.md](epics/e08-checkin.md)                         | checkin (push to SAP)        | M    | 🟡 (E05)      | —             |
| E09 | [epics/e09-acds-parser.md](epics/e09-acds-parser.md)                 | Extend acds parser           | M    | 🟢            | E10, E11, E12 |
| E10 | [epics/e10-rap-bdef.md](epics/e10-rap-bdef.md)                       | RAP BDEF                     | M    | 🟡 (E09)      | —             |
| E11 | [epics/e11-rap-srvd.md](epics/e11-rap-srvd.md)                       | RAP SRVD                     | S    | 🟡 (E09)      | —             |
| E12 | [epics/e12-rap-srvb.md](epics/e12-rap-srvb.md)                       | RAP SRVB CLI/MCP             | S    | 🟢            | —             |
| E13 | [epics/e13-startrfc.md](epics/e13-startrfc.md)                       | startrfc (NW RFC transport)  | L    | 🟢            | —             |
| E14 | [epics/e14-flp.md](epics/e14-flp.md)                                 | Fiori Launchpad              | M    | 🟢            | —             |
| E15 | [epics/e15-wb.md](epics/e15-wb.md)                                   | Workbench navigation         | S    | 🟢            | —             |

**Sizes:** S = ≤ 2 days, M = 3-5 days, L = 1-2 weeks.

## Recommended first-wave dispatch (parallel)

Day 1 — start these 5 in parallel (no inter-dependencies):

- **E01** include — quickest win, opens INCL surface
- **E02** function — closes existing FUGR/FUNC contract gap
- **E04** strust — small, isolated
- **E05** format-plugin API — unblocks the gCTS chain
- **E09** acds parser — unblocks RAP chain

Day 4-5 (after E05 lands):

- **E06** gcts-format
- **E08** checkin

Day 8+ (after E06):

- **E07** gcts-command

Day 4+ (after E09):

- **E10/E11/E12** RAP trio

## Per-epic Devin session protocol

Every epic file must contain (template at `epics/_template.md`):

1. **Mission** — single-sentence goal
2. **Why** — value, urgency, dependencies fulfilled
3. **References** — sapcli files (in `tmp/sapcli-ref/sapcli/`), existing repo files, RFCs
4. **Scope** — explicit list of files to add/modify
5. **Out of scope** — what NOT to touch
6. **Tests** — unit + e2e CLI/MCP parity expectations
7. **Acceptance** — bash commands that must pass
8. **Devin prompt** — ready-to-paste opening message for the spawned session

The spawned Devin session reads the epic file as its sole spec and produces a PR (or commits to a feature branch). Mega-agent does NOT inline code in epic files — only intent and references.

## How to spawn a session

When the Devin private-mode `devin_session_create` MCP tool is available:

```
mcp_call_tool(server="deepwiki", tool="devin_session_create",
              arguments={"prompt": "<contents of epics/eXX-name.md Devin prompt section>",
                          "tags": ["sapcli-parity", "eXX"]})
```

Otherwise: open https://app.devin.ai/ → New session → paste the **Devin prompt** block from the epic file.

## Conventions enforced across all epics

- All HTTP via typed contracts (`@abapify/adt-contracts`). NO `fast-xml-parser`. NO `client.fetch()` bypasses unless documented.
- CLI command + MCP tool MUST be added together (parity is non-negotiable).
- Every operation needs an entry in `packages/adt-cli/tests/e2e/parity.<area>.test.ts`.
- Real SAP fixtures in `@abapify/adt-fixtures` (mark `TODO-synthetic` only when no capture available).
- abapGit-style filenames everywhere a file path is emitted (use `adtUriToAbapGitPath`).
- No commits without explicit user approval (per repo `.agents/rules/git/no-auto-commit`).
- Run `bunx nx format:write` before signalling done.
