---
description: Create ADT schema following schema workflow
auto_execution_mode: 3
implements: .agents/commands/adt/schema.md
---

# ADT Schema Workflow

**Implements:** `.agents/commands/adt/schema.md`

## Usage

```bash
/adt-schema <schema_name>
```

## Key Concepts

### ts-xsd = XSD in TypeScript

- Full type inference from schema definition
- Round-trip: `parse(xml) → object` and `build(object) → xml`
- Compile-time type safety

### speci = Schema Factory

- Adds `parse()` and `build()` methods
- Requires `as const` for type inference
- All ADT schemas must be speci-compatible

## �� CRITICAL Rules

### Never Modify Generated Files

- Files in `src/schemas/generated/` are READ-ONLY
- Fix the generator in `ts-xsd/src/codegen/` instead
- **Requires user confirmation** before modifying ts-xsd
- **Full ts-xsd test coverage required**

### Type Check is MANDATORY

```bash
npx nx test adt-schemas-xsd
npx tsc --noEmit -p packages/adt-schemas-xsd  # REQUIRED!
```

## Quick Reference

### Step 1: Capture Sample XML

```bash
npx adt fetch /sap/bc/adt/{endpoint} --raw > sample.xml
```

### Step 2: Determine Source

- **XSD exists?** → Generate
- **Standard ADT XML?** → Manual schema
- **ABAP XML (asx:abap)?** → ABAP XML schema

### Step 3: Create Schema

- Generated: Add to `tsxsd.config.ts`, run `npx nx run adt-schemas-xsd:generate`
- Manual: Create in `src/schemas/manual/` with `as const`

### Step 4: Export

Add to `src/schemas/index.ts`

### Step 5: Test Scenario (MANDATORY)

- Location: `tests/scenarios/`
- Use `SchemaType<typeof schema>` for type safety
- Tests must compile with `tsc --noEmit`

## Complete Workflow

See: `.agents/commands/adt/schema.md`
