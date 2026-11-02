# Maintainer docs

Project-internal documentation: how abapify is built and where it is going. It is **not** rendered on the website — user documentation lives in [`website/docs/`](../website/docs) and is published at <https://adt-cli.netlify.app>.

## Architecture

| Page                                                         | What it covers                                                  |
| ------------------------------------------------------------ | --------------------------------------------------------------- |
| [Overview](./architecture/overview.md)                       | Layered package pipeline, layering principles, session protocol |
| [Contracts pipeline](./architecture/contracts-pipeline.md)   | XSD → `ts-xsd` → `adt-schemas` → `adt-contracts` → `adt-client` |
| [ADK](./architecture/adk.md)                                 | Typed ABAP objects, save / lock / ETag orchestration            |
| [Format plugins](./architecture/format-plugins.md)           | abapGit / gCTS serialization dispatch                           |
| [Checkin & batch lock](./architecture/checkin-batch-lock.md) | Multi-object push with a single lock session                    |
| [Mock ADT server](./architecture/mock-server.md)             | The in-process SAP emulator used by tests                       |
| [Real-SAP e2e](./architecture/real-e2e.md)                   | The opt-in real-system test harness                             |
| [Coverage pipeline](./architecture/coverage.md)              | ABAP Unit → JaCoCo → Sonar                                      |

Historical notes: [`architecture/adk-overview.md`](./architecture/adk-overview.md), [`architecture/plugin-system.md`](./architecture/plugin-system.md), [`design/`](./design).

## Roadmap

- [What shipped](./roadmap/shipped.md) — narrative of the v2 epics
- [Future work & open questions](./roadmap/future.md)
- [Epic briefs](./roadmap/README.md) — the raw E01–E15 briefs in [`roadmap/epics/`](./roadmap/epics)
- [`planning/`](./planning) — sprint and roll-out plans

## Operations

- [`deployment/mcp-http.md`](./deployment/mcp-http.md) — running the MCP HTTP transport (Docker, OIDC, multi-system)
- [`deployment/pilot-local-dev.md`](./deployment/pilot-local-dev.md) — local development for abapify Pilot
- [`ci-cd-setup.md`](./ci-cd-setup.md) — CI/CD configuration notes

## History

- [`changelogs/`](./changelogs), [`history/`](./history) — session notes and change records
- [`migration/`](./migration) — version migration notes
- [`examples/`](./examples) — older usage samples

## Specs

Behaviour specifications and change proposals are managed with [OpenSpec](https://openspec.dev/) in [`openspec/`](../openspec).
