---
trigger: model_decision
description: If you want to create some test output which is not supposed to be commited to git - use tmp folder
---

# Temporary Files and Testing Output Rule

## File Organization for Testing and Experiments

### Rule: All Temporary Files → `tmp/` Directory

**Applies to:**

- CLI output files (e.g., `adt get ZCL_TEST -o tmp/class.xml`)
- Transport import test results
- Experiment outputs
- Debug files
- Any temporary data generated during development or testing

**Examples:**

```bash
# ✅ CORRECT - Use tmp/ for experiments
npx adt import transport TR001 ./tmp/test-transport --format abapgit --debug

# ❌ WRONG - Don't create test files in root
npx adt import transport TR001 ./test-transport-import --format abapgit --debug
```

### Exception: E2E Tests

**E2E test cases** can create new folders in `e2e/` directory:

- `e2e/transport-import/` - for transport import integration tests
- `e2e/quality-checks/` - for ATC integration tests
- `e2e/[feature-name]/` - for specific feature testing
