---
trigger: always_on
description: Verification checklist after making changes. Build, typecheck, test, lint, format.
---

# After Making Changes

**NEVER tell the user to "try it" or "run it again" — verify it yourself first.**
If you changed code, YOU must build and test before declaring it done.

```bash
bunx nx build <package>   # verify it compiles
bunx nx typecheck         # full type check
bunx nx test <package>    # run tests
bunx nx lint              # fix lint issues
bunx nx format:write      # REQUIRED before every commit — format all files with Prettier
bunx nx format:check      # REQUIRED before push — CI runs full-tree check, not just staged files
```

**Hook gap:** Husky runs `lint-staged` (Prettier on **staged** paths only). It does **not** run `package.json` `precommit` (`nx format:check --uncommitted`). Commits that touch only `.toml` / non-staged files skip Prettier entirely. **GitHub Copilot Autofix** commits bypass local Husky — always run `bunx nx format:check` locally after pulling review autofix commits, before pushing.
