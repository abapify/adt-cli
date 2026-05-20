# GitHub Copilot Instructions

## Pull request completion (MANDATORY)

**Do not end your session** while you are working on a pull request until **all** of the following are true:

1. **Every PR status check is green** on GitHub — including `main` (Nx CI), CodeQL, and **SonarCloud Code Analysis**. A green Nx run with a red SonarCloud gate is **not** done.
2. **Every open review thread** on that PR is addressed: fix or push back in-thread, then resolve the thread.

Treat “implementation finished” and “PR ready” as different gates. Code can be done while CI or review is still open; the session is done only when CI and review are both clear.

### CI green loop

After each `git push` to the PR branch:

1. **Read check status once** (do not use watch/poll flags on `gh` that block the whole session). Examples:

   ```bash
   gh pr checks --repo abapify/adt-cli <PR_NUMBER>
   gh api repos/abapify/adt-cli/commits/<HEAD_SHA>/check-runs \
     --jq '.check_runs[] | {name, conclusion, details_url, summary: .output.summary}'
   ```

2. If **any** check is `FAILURE`, `CANCELLED`, or still `PENDING`/`IN_PROGRESS`:
   - Open the failing check’s `details_url` / summary (SonarCloud lists measures and file hotspots).
   - Fix the **root cause** in the repo (refactor duplication, fix reliability bugs, format, tests).
   - Run the [Verification Checklist](#verification-checklist) locally.
   - Commit, push, and **go back to step 1**.

3. Repeat until **all** checks report success or you hit a hard blocker you cannot fix (missing secrets, upstream outage, policy conflict). If blocked, state which check failed, what you tried, and what a human must do — **do not** claim the PR is ready.

**Timeouts:** Keep working for at least **90 minutes** of wall time when checks are failing for fixable reasons (Sonar duplication, lint, tests). Prefer many small fix-and-push cycles over stopping after one failed Sonar run.

### SonarCloud (common gate on this repo)

When **SonarCloud Code Analysis** fails, typical conditions:

| Failure                                  | What to do                                                                                            |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Duplication on new code** (> 3%)       | Extract shared helpers; remove copy-pasted blocks; do not duplicate import/filter logic across files. |
| **Reliability rating on new code** (< A) | Fix bugs Sonar flags (null handling, dead branches, swallowed errors).                                |
| **Security hotspots**                    | Fix or document with Sonar-safe patterns used elsewhere in the repo.                                  |

Do **not** mark the task complete after only `bunx nx affected` passes — Sonar runs **after** merge CI and must be green too.

### Review threads (after CI is green)

1. List unresolved threads: `gh api graphql` or the PR “Files changed” review UI.
2. For each comment: implement the fix **or** explain why not (with evidence).
3. Push fixes if needed; reply **in the same thread**; resolve when done.
4. Only then summarize completion for the user.

### Anti-patterns

| Do not                                                           | Why                                                 |
| ---------------------------------------------------------------- | --------------------------------------------------- |
| Stop when Nx/GitHub Actions is green but SonarCloud is red       | Quality gate is part of “all CI checks”.            |
| Stop with open review threads                                    | User asked for fix + resolution, not silent ignore. |
| `@`-mention yourself as “done” without re-reading `gh pr checks` | Status changes after every push.                    |
| Disable Sonar rules / blanket `NOSONAR` without cause            | Hides debt; usually rejected on this repo.          |

For Nx Cloud–connected workspaces, the `monitor-ci` skill can supplement this loop; on GitHub PRs, **`gh pr checks` + fix + push** is the source of truth.

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
