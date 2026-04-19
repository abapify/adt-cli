---
title: Roadmap — What Shipped
sidebar_position: 1
---

# Roadmap — What Shipped

The v2 rewrite of `adt-cli` was planned as a sequence of self-contained
**epics**, each scoped small enough for a fresh Devin session to land in
one pass. This page narrates what each wave delivered; the next page
([Future](./future)) collects the open questions and follow-ups that
remain.

:::note Where are the raw epic files?
The underlying OpenSpec-style briefs live in the repository at
[`docs/roadmap/epics/`](https://github.com/abapify/adt-cli/tree/main/docs/roadmap/epics)
and are intentionally **excluded** from the public documentation site.
They contain internal scope negotiations and evolving acceptance criteria
and are kept as the source of truth for maintainers. This page is the
user-facing summary.
:::

## Wave 1 — Independent object surfaces

Small, parallelisable epics closing legacy gaps vs. `sapcli`.

| Epic | Title                       | CLI                          | MCP                                                                                                               |
| ---- | --------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| E01  | INCL CLI + MCP              | `adt ddic` incl. / `adt get` | `get_include`                                                                                                     |
| E02  | FUGR / FUNC                 | `adt function …`             | `create_function_group`, `create_function_module`, `get_function_group`, `get_function`, `delete_function_module` |
| E03  | BAdI implementations        | `adt badi …`                 | `create_badi`, `get_badi`, `delete_badi`                                                                          |
| E04  | STRUST cert management      | `adt strust …`               | `list_certs`, `upload_cert`, `delete_cert`, `list_pses`                                                           |
| E13  | startrfc (NW RFC over SOAP) | `adt rfc …`                  | `call_rfc`                                                                                                        |
| E14  | Fiori Launchpad             | `adt flp …`                  | `list_flp_catalogs`, `list_flp_groups`, `list_flp_tiles`, `get_flp_tile`                                          |
| E15  | Workbench navigation        | `adt wb …`                   | `find_definition`, `find_references`, `get_callers_of`, `get_callees_of`                                          |

## Wave 2 — Format-plugin foundation

| Epic | Title                        | Outcome                                                                                                                                   |
| ---- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| E05  | Format-plugin API foundation | `FormatPlugin` interface + global registry. Single side-effect import bootstraps abapGit. [Architecture](../architecture/format-plugins). |
| E06  | gCTS as format plugin        | `@abapify/adt-plugin-gcts` — id `gcts` (alias `aff`). Full round-trip with `manifest.yml`.                                                |
| E07  | gCTS as command plugin       | `@abapify/adt-plugin-gcts-cli` — `adt gcts repo/branch/commit/pull/…` (12 subcommands).                                                   |
| E08  | Checkin (push to SAP)        | `adt checkin`, batch-lock-session validation, dependency-tier apply. [Architecture](../architecture/checkin-batch-lock).                  |

## Wave 3 — ABAP CDS & RAP

| Epic | Title                | Outcome                                                                                        |
| ---- | -------------------- | ---------------------------------------------------------------------------------------------- |
| E09  | Extend `acds` parser | Phase-1 grammar for TABL / structure / DRTY / SRVD / DDLX. [SDK → acds](../sdk/packages/acds). |
| E10  | RAP BDEF             | `adt rap bdef …` + `create_bdef` / `get_bdef` / `delete_bdef`.                                 |
| E11  | RAP SRVD             | `adt rap srvd …` + `create_srvd` / `get_srvd` / `delete_srvd`.                                 |
| E12  | RAP SRVB             | `adt rap srvb …` + `create_srvb` / `get_srvb` / `delete_srvb` / `publish_service_binding`.     |

## QC waves

Alongside the feature epics, three "QC" passes shipped:

- **QC1 — Fixture backfill.** Real-SAP captures for every endpoint
  where TRL allowed it. `where-used`, FLP, RFC-SOAP, discovery, core
  http, classes/interfaces, CTS, activation, search. Yielded the
  results table in [Architecture → Real-SAP e2e](../architecture/real-e2e).
- **QC2 — Unified mock server.** Consolidated the MCP integration
  mock and the CLI e2e mock into `@abapify/adt-fixtures`'s
  `createMockAdtServer()`. See [Architecture → Mock server](../architecture/mock-server).
- **QC3 — Documentation sweep (D2a – D2f).** This site.

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

  Independent (parallelised from day 1):
    E01:include  E02:function  E03:badi  E04:strust
    E13:rfc      E14:flp       E15:wb
```

## See also

- [Roadmap → Future work & open questions](./future)
- [Architecture overview](../architecture/overview)
- [Changelogs (repository)](https://github.com/abapify/adt-cli/tree/main/docs/changelogs)
