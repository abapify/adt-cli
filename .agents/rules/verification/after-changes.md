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
```
