# GitHub Copilot Instructions

## Pre-Commit Formatting (MANDATORY)

**Before every commit**, run:

```bash
bunx nx format:write
```

This formats all changed files with Prettier via Nx. Failing to do this will cause CI to fail on the `nx format:check` step.

This applies to **all file types** — TypeScript, Markdown, JSON, YAML, etc.

## Verification Checklist

Before pushing changes, always run:

```bash
bunx nx format:write                # format all files (MUST be first)
bunx nx affected -t build --base=HEAD~1  # verify compilation
bunx nx affected -t test --base=HEAD~1   # run tests
bunx nx affected -t lint --base=HEAD~1   # check lint
```

## Key Conventions

- This is an **Nx monorepo** using **bun workspaces** — use `bun`/`bunx`, not `npm`, `pnpm` or `yarn`
- Build tool: **tsdown**; Test runner: **Vitest** (some packages use Jest)
- TypeScript strict ESM — no `require()`, no `__dirname`
- See `AGENTS.md` for full project conventions and architecture

## Available Skills

| Skill                     | When to use                                                                                               |
| ------------------------- | --------------------------------------------------------------------------------------------------------- |
| `adt-mcp`                 | Work with a SAP ABAP system via the MCP server (read/write source, activate, unit tests, transports, ATC) |
| `add-endpoint`            | Add a new ADT endpoint contract + schema + fixture                                                        |
| `add-object-type`         | Add full ABAP object type support (ADK model + abapGit handler)                                           |
| `adt-export`              | Export, deploy, diff, roundtrip, or unlock ADT objects                                                    |
| `adt-reverse-engineering` | Research unknown SAP ADT REST endpoints                                                                   |
| `openspec-propose`        | Propose a new change with design, specs, and tasks                                                        |
| `openspec-apply-change`   | Implement tasks from an OpenSpec change                                                                   |
| `monitor-ci`              | Monitor CI pipeline and self-heal failures                                                                |
