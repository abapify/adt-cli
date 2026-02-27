---
description: Create or update ADK object type with full stack support
auto_execution_mode: 3
implements: .agents/commands/adt/adk.md
---

# ADT-ADK Object Type Workflow

**Implements:** `.agents/commands/adt/adk.md`

## Usage

```bash
/adt-adk <object_type>
```

**Example:** `/adt-adk TABL`

## Windsurf Features

- **Turbo mode** - non-stop execution through all steps
- **Sub-workflow invocation** - modular workflow composition
- **Test-driven** - each step requires passing tests
- **Type check mandatory** - `tsc --noEmit` must pass at each step

## Quick Reference

### Step 1: Understand Object Type

- Research SAP documentation
- Discover ADT endpoints via `/sap/bc/adt/discovery`
- Document semantics, operations, relationships

### Step 2: Create Schema

**Invoke:** `/adt-schema <schema_name>`

### Step 3: Create Contract

**Invoke:** `/adt-contract <contract_name>`

### Step 4: Create Service (if needed)

- Location: `adt-client-v2/src/services/{area}/`
- For complex multi-step operations

### Step 5: Implement ADK Model

- Location: `adk-v2/src/objects/{category}/{type}/`
- Files: `{type}.model.ts`, `{type}.types.ts`, `index.ts`
- Pattern: Extend `AdkObject`, implement lazy loading

### Step 6: Implement CLI Commands

**Invoke:** `/adt-command <object_type>`

### Step 7: Implement CLI Pages

**Invoke:** `/adt-page <object_type>`

### Step 8: Implement TUI Editor

- Location: `adt-tui/src/pages/{area}/`
- Edit pages for modify operations

### Step 9: Add abapGit Support (repository objects)

- Location: `plugins/abapgit/src/objects/{type}/`
- Serialization handler
- File mapping

## Sub-Workflows

| Workflow        | Purpose                     |
| --------------- | --------------------------- |
| `/adt-schema`   | Create type-safe XML schema |
| `/adt-contract` | Create API contract         |
| `/adt-command`  | Create CLI commands         |
| `/adt-page`     | Create display pages        |

## Complete Workflow

See: `.agents/commands/adt/adk.md`
