---
title: Architecture Overview
sidebar_position: 1
---

# Architecture Overview

`adt-cli` is a monorepo of TypeScript packages organised as a layered pipeline.
Everything SAP-facing — the CLI, the MCP server, format plugins, the ADK — sits
on top of a single **schema-driven typed-contract** stack:

```
                 ┌──────────────┐
                 │ SAP XSD /    │
                 │ hand-authored│
                 │ .xsd files   │
                 └──────┬───────┘
                        │  parse + codegen
                        ▼
                 ┌──────────────┐
                 │  ts-xsd      │  Pure W3C XSD parser/builder + type inference
                 └──────┬───────┘
                        │  typed() wrappers, `$xmlns` / `$imports` / `$filename`
                        ▼
                 ┌──────────────┐
                 │ adt-schemas  │  Exports typed schema objects (204+ interfaces)
                 └──────┬───────┘
                        │  toSpeciSchema() – bridges ts-xsd ↔ speci
                        ▼
                 ┌──────────────┐
                 │adt-contracts │  Endpoint descriptors (method/path/body/responses)
                 └──────┬───────┘
                        │  RestContract
                        ▼
                 ┌──────────────┐
                 │ adt-client   │  Thin adapter: contract + session → HTTP + parse
                 └──┬────────┬──┘
                    │        │
                    ▼        ▼
             ┌──────────┐ ┌──────────────┐
             │   adk    │ │ direct calls │
             │ (save /  │ │ (read-only,  │
             │  lock /  │ │  ad-hoc)     │
             │ETag orch)│ └──────────────┘
             └────┬─────┘
                  │
       ┌──────────┼──────────────────┐
       ▼          ▼                  ▼
  ┌────────┐ ┌────────┐ ┌────────────────────────┐
  │adt-cli │ │adt-mcp │ │ format plugins          │
  │(CLI)   │ │(MCP)   │ │ (abapgit, gcts, …)      │
  └────────┘ └────────┘ └────────────────────────┘
```

## Packages at a glance

| Layer            | Package(s)                                        | Responsibility                                  |
| ---------------- | ------------------------------------------------- | ----------------------------------------------- |
| XSD toolkit      | `@abapify/ts-xsd`                                 | Parse/build XSD, compile-time type inference    |
| Schemas          | `@abapify/adt-schemas`                            | Typed wrappers around generated schema literals |
| Contracts        | `@abapify/adt-contracts`                          | `speci`-based endpoint descriptors              |
| HTTP client      | `@abapify/adt-client`                             | Security-session + CSRF + schema-aware adapter  |
| Auth             | `@abapify/adt-auth`, `@abapify/browser-auth`, `…` | Plugin-based authentication                     |
| ABAP objects     | `@abapify/adk`                                    | Save/lock/unlock + ETag orchestration           |
| Locks            | `@abapify/adt-locks`                              | Single lock implementation (incl. batch)        |
| Format plugins   | `@abapify/adt-plugin`, `…-abapgit`, `…-gcts`      | Serialize/deserialize ADK ↔ on-disk             |
| CLI              | `@abapify/adt-cli`                                | `adt …` commands                                |
| MCP              | `@abapify/adt-mcp`                                | Model Context Protocol server                   |
| Fixtures / mock  | `@abapify/adt-fixtures`                           | Real SAP XML samples + in-process mock server   |
| Domain utilities | `@abapify/acds`, `@abapify/asjson-parser`, `…`    | ABAP CDS / ASX / gCTS JSON parsers              |

The monorepo also hosts `@abapify/adt-codegen`, `@abapify/adt-atc`,
`@abapify/adt-aunit`, `@abapify/adt-diff`, `@abapify/adt-export`,
`@abapify/adt-rfc`, `@abapify/adt-tui` and supporting tools (`speci`,
`logger`, etc.). See the [SDK → Packages](../sdk/packages/overview) section
for the full list.

## Layering principles

1. **Schema-driven everywhere.** Every ADT endpoint that speaks XML has a
   matching XSD → schema → contract. No ad-hoc XML parsing in application
   code. [Deep dive →](./contracts-pipeline)
2. **No plugin-specific logic in core packages.** `adt-auth`,
   `adt-client`, `adt-plugin` must not import any concrete implementation.
   Plugins register themselves via discovery or a global registry.
3. **ADK mediates writes.** CLI/MCP write flows go through `@abapify/adk`
   so lock management, ETag refresh and the batch lock session are
   centralised. Direct contract calls are used for reads and ad-hoc
   work. [Deep dive →](./adk)
4. **One mock server.** Both MCP integration tests and CLI e2e tests use
   `createMockAdtServer()` from `@abapify/adt-fixtures`. See the
   [mock-server page](./mock-server).
5. **Real SAP is opt-in.** `packages/adt-cli/tests/real-e2e/` reaches a
   real system only when a session file + env var are present. See
   [real-e2e](./real-e2e).

## Where to go next

- [Contracts pipeline](./contracts-pipeline) — trace a request from XSD to call site.
- [ADK](./adk) — how writes/locks/etag work.
- [Format plugins](./format-plugins) — abapGit/gCTS/… dispatch.
- [Mock server](./mock-server) — the in-process SAP emulator.
- [Real-SAP e2e](./real-e2e) — the `describeReal` harness.
- [Coverage pipeline](./coverage) — ABAP Unit + JaCoCo + Sonar.
- [Checkin batch lock](./checkin-batch-lock) — E08 multi-object save.
- [CLI reference](../cli/overview) · [MCP tools](../mcp/overview) · [SDK packages](../sdk/packages/overview)
