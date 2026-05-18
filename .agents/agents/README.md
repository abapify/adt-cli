# Multi-agent manifest (`adt-cli`)

This repo is edited by **several AI runtimes**. They share one canonical tree—**`.agents/`**—and keep native config thin.

## Principles

1. **Single source of truth**: Rules, skills, and workflow bodies live under `.agents/`.
2. **Thin native layers**: `.cursor/` carries Cursor-only discovery (slash commands → workflows). Legacy `.windsurf/` remains as stubs only.
3. **No duplicated procedure text**: If you change an OpenSpec flow, edit `.agents/workflows/opsx-*.md`.

## Registered agents

| Agent                   | Native config                                                                          | Consumes from repo                                                             |
| ----------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **Cursor (IDE)**        | `.cursor/commands/`, `.cursor/rules/`, `.cursor/skills/` (stubs)                       | `.agents/rules/`, `.agents/skills/`, `.agents/workflows/`, `.agents/commands/` |
| **Claude Code / Codex** | `.claude/` ([README](../../.claude/README.md)) — thin commands/skills + hooks/settings | Same `.agents/` paths; sync skills with `npx skills add` when needed           |
| **Windsurf Cascade**    | `.windsurf/` (**deprecated stubs**)                                                    | Redirects to `.agents/`                                                        |

Details: [`manifest.yaml`](manifest.yaml).

## Delegation

- **Specs & planning**: OpenSpec workflows in `.agents/workflows/opsx-*.md`.
- **Nx / monorepo**: Skills `nx-workspace`, `nx-run-tasks`, `nx-generate`, … under `.agents/skills/`.
- **ADT / SAP**: Commands under `.agents/commands/adt/` plus skills `add-endpoint`, `adt-export`, etc.

When spawning subagents or parallel tasks, pass **paths under `.agents/`** so every runtime reads the same instructions.

## Adding a new runtime

1. Document it in `manifest.yaml`.
2. Point its skill/rule discovery at `.agents/` (symlink, CLI sync, or copy-on-install).
3. Add a short profile file here (e.g. `my-runtime.md`) describing quirks and env vars—keep vendor secrets out of git.
