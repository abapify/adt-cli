---
trigger: always_on
description: Never commit or push without explicit user approval.
---

# No Auto-Commit Rule

## Rule

**NEVER run `git commit` or `git push` without explicit user approval.**

Before committing:

1. Show the planned commit(s): message, staged files, diff summary
2. Wait for the user to confirm
3. Only then execute `git commit`

## Applies To

- All AI assistants (Devin, Windsurf, Claude, etc.)
- Both interactive and background/subagent sessions

## Why

Commits are permanent project history. The user must review and approve:

- What files are staged
- The commit message
- Whether changes should be split into multiple commits
- Whether to push after committing
