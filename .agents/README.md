# Workspace agents (`adt-cli`)

Team-visible standards for AI-assisted work live here. **`.agents/` is the single source of truth** for rules, skills, workflows, and ADT command docs. Tool-specific folders ([`.cursor/`](../.cursor/README.md), legacy [`.windsurf/`](../.windsurf/README.md)) stay thin so Cursor/Windsurf only add discovery glue (commands, optional stubs).

## Repository conventions

Monorepo layout, MCP↔CLI coupling, rules index, and package-level guides:
[`repo-guide.md`](repo-guide.md).

## Layout

```
.agents/
  README.md              # You are here
  repo-guide.md          # Monorepo + architecture reference for agents
  agents/                # Multi-agent manifest + per-runtime notes
  rules/                 # Conditional rules (“when X, do Y”)
  skills/                # Skills (SKILL.md trees; shared across agents)
  workflows/             # Multi-step procedures (OpenSpec, lint, …)
  commands/adt/          # Long-form ADT workflows (schema, contract, …)
```

## Rules (`.agents/rules/`)

Use imperative, scenario-based wording. Agents load these when the situation matches.

## Skills (`.agents/skills/`)

Documentation for the model: prerequisites, commands to run, troubleshooting. Install into a native agent cache with [`npx skills add`](https://github.com/vercel-labs/skills) when needed; the repo copy remains authoritative.

## Workflows (`.agents/workflows/`)

Reusable procedures (OpenSpec opsx-\*, lint). **Cursor slash commands** under `.cursor/commands/` delegate here—edit the workflow file, not the Cursor stub.

ADT specifics: see [`.agents/workflows/adt/README.md`](workflows/adt/README.md) → [`.agents/commands/adt/`](commands/adt/).

## OpenSpec & planning

- `openspec/specs/` — specifications
- `openspec/changes/` — active changes
- `openspec/config.yaml` — project config
- `docs/planning/` — coordination docs

## Memory: internal vs repo

- **Internal** (vendor-specific persistence): preferences and session DB—not committed.
- **Workspace** (this tree + `openspec/`): versioned, reviewable, shared.

Prefer repo-backed docs for anything the team must agree on.

## Migrating from Windsurf

Legacy `.windsurf/workflows/` and `.windsurf/skills/` now **redirect** to `.agents/`. Remove Windsurf-only duplicates from your mental model; extend `.agents/` instead.

## Multi-agent setup

See [`agents/README.md`](agents/README.md) for registered runtimes (Cursor IDE, Claude Code, Windsurf stubs), ownership, and delegation hints.
