# Windsurf Workspace Guide

This document explains how I (Cascade, your Windsurf agent) work with the `.windsurf/` folder in this repository. It is the source of truth for agent behavior that is committable, reviewable, and shareable with your team.

## Folder Structure

```
.windsurf/
  README.md                  # This guide (you are here)
  best-practices/            # Team-wide standards and patterns
  rules/                     # Conditional rules the agent must follow
  workflows/                 # Executable workflows (slash commands)
```

## Best Practices (`.windsurf/best-practices/`)

- Purpose: Persist team-wide guidelines and patterns used across packages.
- Behavior: I consult these documents before making changes and align code with them.
- Example: `best-practices/esnext-patterns.md` documents Node 22+ ESNext standards (Object.hasOwn, ??, .at, structuredClone, etc.).

Recommended usage:

- Keep examples concise and actionable.
- Add a "Quick Rules Summary" at the top of major guides.
- Reference code paths (e.g., `packages/xmld/src/core/decorators/element.ts`) to anchor the guidance.

## Rules (`.windsurf/rules/`)

- Purpose: Conditional rules that I must always obey when they apply.
- Behavior: I read relevant rules when a situation matches, and follow them strictly.
- Examples you already have:
  - `spec-first-then-code.md`: For spec-driven packages, write/update the spec first.
  - `tmp-folder-testing.md`: Use the tmp folder for non-committable test output.

Recommended usage:

- Create rules when you want deterministic, repeatable behavior.
- Use precise, scenario-based language: “If X, then do Y.”

## Workflows (`.windsurf/workflows/`)

- Purpose: Define executable, reproducible procedures as Markdown with YAML frontmatter.
- Trigger: Explicitly by name (e.g., “run /lint”), or implicitly when relevant.
- Format: Ordered steps. If a step has a `// turbo` comment above it, I may auto-run that terminal step safely.

Example format:

```md
---
description: Lint and quick-fix all packages
---

1. Run Nx lint with fix
   // turbo
2. Command: `npx nx run-many -t lint --fix`
3. Review output and summarize remaining issues
```

Recommended usage:

- Encode repeatable tasks (release steps, migration scripts, verification flows).
- Prefer small, composable workflows over monolithic ones.

## Planning System (Repo-level, outside `.windsurf/`)

You’ve also defined a local planning system in `/planning/` that I honor:

- `/planning/abap-code-review.md`: Kanban-style tracking
- `/planning/current-sprint.md`: Active sprint focus
- `/planning/roadmap.md`: Long-term milestones
- `/planning/README.md`: System overview

Behavior:

- I check `/planning/` when starting work on this project.
- I update the planning docs as work progresses and reference GitHub issues as needed.

## Memory: Internal vs. Workspace-Committable

- Internal Memory (AI-side):
  - Stored in a persistent database.
  - Tracks user preferences, high-level decisions, and context.
  - Not committed to git.

- Workspace Memory (Committable):
  - Documents under `.windsurf/` and the `/planning/` directory.
  - Version-controlled, reviewed, and shared with the team.
  - Treated as the source of truth for standards, workflows, and processes.

I prefer committable memory for team-wide standards and processes.

## Agent Behaviors You Can Rely On

- I will:
  - Consult `.windsurf/rules/` and follow applicable rules.
  - Use `.windsurf/workflows/` for well-defined procedures.
  - Keep `.windsurf/best-practices/` aligned with actual code changes.
  - Propose and create new rules/workflows/best-practices when patterns stabilize.

- You can:
  - Ask me to create/update a workflow for a recurring task.
  - Ask me to codify a rule when you want deterministic behavior.
  - Ask me to extract patterns into `best-practices/` when we standardize an approach.

## Quick Links (Local)

- ESNext Standards: `/.windsurf/best-practices/esnext-patterns.md`
- Rules (existing): `/.windsurf/rules/`
- Workflows: `/.windsurf/workflows/`

## FAQ

- Q: How do I make you auto-run a step in a workflow?
  - A: Add `// turbo` above that step. I’ll treat that step as safe to auto-run if it’s a terminal command.

- Q: What’s the difference between a rule and a best practice?
  - A: Rules are imperative (“must do” under a specific condition). Best practices are guidance that I aim to follow consistently.

- Q: When should I create a workflow instead of a rule?
  - A: Create a workflow for multi-step procedures that you want me to execute. Create a rule for conditional behavior I must obey during normal tasks.

---

If you want, I can add a workflow for “ESNext Modernization” that runs lint, applies automated transforms where possible, and verifies build/tests.
