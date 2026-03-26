---
trigger: always_on
description: Know which files are generated/downloaded before editing. Never edit codegen output or SAP XSD downloads.
---

# File Lifecycle — Know Before You Edit

**Before editing ANY file**, check whether it's generated/downloaded:

```bash
bunx nx show project <package> --json | grep -i "xsd\|generated\|download"
```

| Pattern                               | Lifecycle           | Rule                                                   |
| ------------------------------------- | ------------------- | ------------------------------------------------------ |
| `packages/*/src/schemas/generated/**` | Codegen output      | Never edit — fix the generator or XSD source           |
| `packages/adt-schemas/.xsd/sap/**`    | Downloaded from SAP | Never edit — create custom extension in `.xsd/custom/` |
| `packages/adt-schemas/.xsd/custom/**` | Hand-maintained     | Safe to edit                                           |
| `packages/*/dist/**`                  | Build output        | Never edit                                             |

If an edit keeps "reverting": **stop**. Something is regenerating the file. Check Nx targets before using `sed`/force-writes.
