---
trigger: always_on
description: Verification checklist after making changes. Build, typecheck, test, lint, format.
---

# After Making Changes

**NEVER tell the user to "try it" or "run it again" — verify it yourself first.**
If you changed code, YOU must build and test before declaring it done.

```bash
bunx nx show projects     # list valid project names for <package>
bunx nx build <package>   # replace <package> with one of the listed projects (e.g., `bunx nx build api`)
bunx nx typecheck         # full type check
bunx nx test <package>    # run tests for a specific Nx project (replace <package> with e.g. my-app); for all projects use: bunx nx run-many -t test --all
bunx nx lint              # fix lint issues
bunx nx format:write      # REQUIRED before every commit — format all files with Prettier
bunx nx format:check      # REQUIRED before push — CI runs full-tree check, not just staged files
```

**Hook gap:**

- Husky runs `lint-staged`, so Prettier runs on **staged** paths only.
- Husky does **not** run `package.json` `precommit` (`nx format:check --uncommitted`).
- Commits that touch only `.toml` or other non-staged files can skip Prettier entirely.
- **GitHub Copilot Autofix** commits bypass local Husky; after pulling review autofix commits, always run `bunx nx format:check` locally before pushing.
