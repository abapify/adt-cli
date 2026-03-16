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
