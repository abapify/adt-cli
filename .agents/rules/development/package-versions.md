---
trigger: model_decision
description: Always install latest package versions when adding dependencies. Never hardcode specific versions.
---

# Package Versions: Always Install Latest

## Rule

When creating new projects, test scripts, or reproduction repos:

**NEVER** hardcode specific versions in `package.json`. Instead:

1. Use `bun add <package>` to get latest
2. Or use `latest` tag: `"tsdown": "latest"`

## Why

- Features may already be implemented in newer versions
- Bug reports against old versions waste maintainer time
- Testing against latest ensures accurate issue reproduction

## Examples

### ❌ WRONG - Hardcoded versions

```json
{
  "devDependencies": {
    "tsdown": "^0.16.7",
    "typescript": "^5.7.2"
  }
}
```

### ✅ CORRECT - Install fresh

```bash
# Let bun resolve latest
bun init -y
bun add -D tsdown typescript

# Or use latest tag
bun add -D tsdown@latest typescript@latest
```

## Exception

When reproducing issues in **existing projects**, match the project's versions to accurately reproduce the environment.

## Incident

- **Date**: 2025-12-18
- **Issue**: Reported tsdown#655 for missing feature that was already fixed in 0.18.x
- **Cause**: Used 0.16.7 from existing workspace instead of installing latest
- **Resolution**: Closed issue, apologized to maintainers
