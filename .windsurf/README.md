# Windsurf / Cascade (legacy)

**This tree is deprecated for `adt-cli`.** Team instructions now live under **[`.agents/`](../.agents/README.md)** (rules, skills, workflows). Cursor uses **[`.cursor/`](../.cursor/README.md)** as a thin native layer.

## What remains here

- **`workflows/`** — Tiny redirect files only. Each points at an `.agents/workflows/` or `.agents/commands/` path.
- **`skills/`** — Stubs that tell Cascade to open the matching `.agents/skills/*/SKILL.md`.

Do **not** add new durable content under `.windsurf/`; extend `.agents/` instead.

### Historical note

Cascade previously treated `.windsurf/` as committable workspace memory. That responsibility moved to `.agents/` plus OpenSpec (`openspec/`).
