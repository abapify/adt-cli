# Documentation Roadmap

Full user documentation for adt-cli — CLI, MCP, SDK, plugins, architecture.

**Stack**: Docusaurus 3.7 (`website/`) + Markdown content in `docs/` + Netlify deploy. Pattern copied from `github.com/docker-x/composed`.

## Layout (final)

```
adt-cli/
├── docs/                        # Markdown source
│   ├── index.md                 # landing
│   ├── getting-started/
│   ├── cli/                     # one page per command group
│   ├── mcp/
│   │   ├── overview.md
│   │   ├── tools/               # one page per tool (56 tools)
│   │   └── integrations.md
│   ├── sdk/
│   │   ├── packages/            # per-package guides
│   │   └── contracts/           # per-ADT-namespace contract docs
│   ├── plugins/
│   │   ├── abapgit.md
│   │   ├── gcts-format.md
│   │   ├── gcts-cli.md
│   │   ├── abapgit-plugin.md
│   │   ├── aunit.md
│   │   └── atc.md
│   ├── architecture/
│   │   ├── overview.md
│   │   ├── contracts.md         # schemas → contracts → client pipeline
│   │   ├── adk.md
│   │   ├── format-plugins.md
│   │   ├── mock-server.md
│   │   └── real-e2e.md
│   └── contributing/
├── website/                     # Docusaurus app (build only)
│   ├── docusaurus.config.ts
│   ├── sidebars.ts
│   ├── package.json
│   ├── src/css/custom.css
│   └── static/img/
└── netlify.toml                 # base=website, build via bun
```

## Dependency graph

```
                   ┌────────────────┐
                   │ D0: Foundation │ Docusaurus + Netlify scaffold
                   └───────┬────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
          ┌───────┐    ┌───────┐    ┌───────┐
          │ D1a   │    │ D1b   │    │ D1c   │
          │ CLI   │    │ MCP   │    │ SDK   │
          │ ref   │    │ tools │    │ ref   │
          └───┬───┘    └───┬───┘    └───┬───┘
              │            │            │
              └────────────┼────────────┘
                           │
              ┌────────────┼────────────┬────────────┐
              ▼            ▼            ▼            ▼
          ┌───────┐    ┌───────┐    ┌───────┐    ┌───────┐
          │ D2a   │    │ D2b   │    │ D2c   │    │ D2d   │
          │ Start │    │ CLI   │    │Plugin │    │ Arch  │
          │       │    │guides │    │guides │    │ +roadmap
          └───┬───┘    └───┬───┘    └───┬───┘    └───┬───┘
              └────────────┴────────────┴────────────┘
                           │
                           ▼
                   ┌────────────────┐
                   │ D3: Polish     │ links, search, netlify, README
                   └────────────────┘
```

## Waves

### D0 — Foundation (sequential, 1 agent)

Set up the Docusaurus app + Netlify config + base nav. Agent verifies `bunx --cwd website run build` produces `website/build/`.

### D1 — Auto-generated reference (parallel, 3 agents)

Walk the source tree; generate markdown. These three don't overlap.

**D1a CLI reference** — walks `packages/adt-cli/src/lib/cli.ts` commander tree. One file per top-level command, one section per subcommand. Flags, positional args, examples, cross-links to SDK types.

**D1b MCP tool reference** — walks `packages/adt-mcp/src/lib/tools/`. 56 tools. One page per tool: name, description, Zod input schema (rendered as TS), output shape, example invocation, links to underlying contracts.

**D1c SDK reference** — two sides:

1. Per-package: `@abapify/adt-client`, `@abapify/adt-contracts`, `@abapify/adt-schemas`, `@abapify/adk`, `@abapify/speci`, `@abapify/adt-fixtures`, `@abapify/adt-locks`, `@abapify/adt-rfc`, `@abapify/acds`, `@abapify/ts-xsd` — purpose, public API, usage.
2. Contract catalog: walk `adtContract` tree, document every namespace (`client.adt.cts.transportrequests`, `.oo.classes`, etc.) with HTTP endpoint, method, request/response type, and link to reference XSD.

### D2 — User guides (parallel, 4 agents)

**D2a Getting Started** — install (`npm i -g @abapify/adt-cli`), `adt auth login`, system info, first object read, first MCP tool call, configuring MCP in Claude/VSCode.

**D2b CLI how-to guides per area** — task-oriented:

- CTS (transports): search, create, release, reassign
- Object lifecycle: class/interface/program CRUD + activate
- DDIC: domain/dataelement/table/structure
- CDS: DDL/DCL source edit
- RAP: BDEF + SRVD + SRVB lifecycle
- AUnit + coverage (JaCoCo/Sonar)
- gCTS: repo/branch/commit via `adt gcts`
- Workbench: where-used/callers/callees/outline
- Checkout / checkin (bidirectional abapGit/gcts workflow)
- Lock management
- RFC calls

**D2c Plugin guides** — for each plugin package: what it does, how to install/enable, configuration, extending with custom handler.

- abapGit format: serializer, filename convention, per-object handlers
- gCTS format (AFF-compatible)
- gCTS CLI plugin
- AUnit, ATC

**D2d Architecture + Roadmap** — deep dives + cross-refs to `docs/roadmap/` epics.

- Contracts pipeline (XSD → ts-xsd → schemas → contracts → client with worked example)
- ADK object model (save/lock/unlock/ETag)
- Format plugin API (E05)
- Mock server (adt-fixtures)
- Real-SAP e2e harness
- Port archived roadmap epics as architecture notes

### D3 — Polish (sequential, 1 agent) — **complete**

- Cross-links across docs (resolved TODO markers in CLI / plugin pages)
- Broken-link check via Docusaurus `onBrokenLinks: 'throw'` **and** `onBrokenMarkdownLinks: 'throw'`
- Search via `@easyops-cn/docusaurus-search-local` (hashed index, docs only)
- Top-level navbar: Getting Started, Guides, CLI, MCP, SDK, Plugins, Architecture, Roadmap, GitHub
- Netlify config documented (no hardcoded private registry)
- Root `README.md` updated with Documentation section pointing at the hosted site

## Conventions enforced

- **Markdown only** — no custom React components for MVP. Use Docusaurus admonitions (`:::note`, `:::tip`, `:::warning`).
- **Code examples** — every reference page has at least one working bash / TS example. Examples are copy-paste runnable against the mock server.
- **Cross-links** — `[client.adt.oo.classes](/sdk/contracts/oo-classes)` syntax. Broken links must throw at build time.
- **Per-page front-matter** — `title`, `sidebar_position`, and optional `description` for SEO.
- **No emojis in content** (matches AGENTS.md; emojis allowed only in user-provided content).
- **English only** — matches global AGENTS.md rule.

## Acceptance (per wave)

```
cd website && bun install && bun run build
```

Must complete without broken-link errors. Build output in `website/build/`.

For D2 / D3, `bunx --cwd website run start` serves locally on :3000 for review.

## Known deferrals

- Internationalization (Russian, German) — structure supports it via `i18n.locales` but out of scope for first-pass.
- Versioned docs (`docs/2.0/` etc.) — Docusaurus supports, not needed until first release.
- API TypeDoc generation — heavy; reference is hand-written + examples.

## Spawn protocol

Every wave file in `docs-roadmap/waves/dXX-<name>.md` (sibling to feature roadmap at `docs/roadmap/epics/*`). Same template, same Devin prompt block ready for session spawn.
