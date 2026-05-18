# Cursor IDE profile (`adt-cli`)

## Role

Primary interactive editor agent with repo access, terminal, and MCP.

## Where to read first

1. Repo root `AGENTS.md` (Nx expectations).
2. `.agents/rules/` for conditional standards.
3. `.agents/workflows/` when the user runs `/opsx:*` or asks for a procedural flow.

## Cursor-only files

- `.cursor/commands/*.md` — **Stub only**: frontmatter for the `/` palette + pointer to `.agents/workflows/`.
- `.cursor/rules/*.mdc` — Always-on or scoped hints; keep them short.
- `.cursor/skills/openspec-*/SKILL.md` — **Stub only**: discovery wrapper; canonical skill body is `.agents/skills/openspec-*`.

Do not grow duplicate procedure text in `.cursor/`—extend `.agents/` instead.

There is **no** `/models` command in this repo. If you still see one that hits Anthropic’s API, delete it from Cursor (`/commands`) or from `~/.cursor/commands/models.md` / `.cursor/commands/models.md`.
