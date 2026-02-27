# ts-xsd - AI Agent Guide

## Package Overview

**Core XSD parser, builder, and type inference** - the foundation for all XSD-based packages.

| Module    | Purpose                      | Key Exports                                   |
| --------- | ---------------------------- | --------------------------------------------- |
| `xsd`     | Parse/build XSD files        | `parseXsd`, `buildXsd`, `Schema`              |
| `infer`   | Compile-time type inference  | `InferSchema`, `InferElement`                 |
| `xml`     | Parse/build XML with schemas | `parseXml`, `buildXml`                        |
| `codegen` | Generate TypeScript from XSD | `generateSchemaLiteral`, `generateInterfaces` |

## 🚨 Critical Rules

### 1. Pure W3C XSD - No Inventions

**NEVER** add properties that don't exist in [XMLSchema.xsd](https://www.w3.org/TR/xmlschema11-1/XMLSchema.xsd):

| ❌ WRONG                  | ✅ CORRECT      | Reason                                          |
| ------------------------- | --------------- | ----------------------------------------------- |
| `attributes`              | `attribute`     | W3C uses singular                               |
| `elements`                | `element`       | W3C uses singular                               |
| `text`                    | `_text`         | Not in XSD spec (use `_text` for mixed content) |
| Direct array for sequence | `ExplicitGroup` | Must match W3C structure                        |

**Before ANY change to `types.ts`:**

1. Find the type in [XMLSchema.xsd](https://www.w3.org/TR/xmlschema11-1/XMLSchema.xsd)
2. Match properties exactly (name, type, optionality)
3. Run `npx nx test ts-xsd`

### 2. Type Naming Convention

Follow W3C XSD type names exactly (PascalCase):

```
topLevelElement  → TopLevelElement
localElement     → LocalElement
namedGroup       → NamedGroup
explicitGroup    → ExplicitGroup
```

### 3. Extension Properties ($ Prefix)

Non-W3C properties are prefixed with `$` to clearly distinguish them from W3C XSD properties.

| Property    | Type                           | Purpose                                                                                                                                                                                                                |
| ----------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `$xmlns`    | `{ [prefix: string]: string }` | **Namespace declarations** - Maps prefixes to namespace URIs. Extracted from `xmlns:*` attributes in XML. Required for resolving QName prefixes like `xs:string` or `adtcore:AdtObject`.                               |
| `$imports`  | `Schema[]`                     | **Linked schemas** - Array of resolved imported schemas. Enables cross-schema type resolution. When type inference encounters `base: "adtcore:AdtObject"`, it searches `$imports` to find the `AdtObject` complexType. |
| `$filename` | `string`                       | **Source filename** - Original XSD filename (e.g., `classes.xsd`). Enables **backward rendering** - rebuilding XSD from schema objects with correct import references.                                                 |

#### Why These Extensions?

**`$xmlns`** - W3C XSD uses QNames (qualified names) like `xs:string` or `adtcore:AdtObject`. To resolve these, we need the namespace prefix mappings. XML stores these as `xmlns:xs="..."` attributes, but XSD schema structure doesn't have a place for them. `$xmlns` preserves this critical information.

**`$imports`** - W3C XSD `import` element only contains `namespace` and `schemaLocation` strings. For type inference to work across schemas, we need actual schema objects. `$imports` holds the resolved, linked schemas.

**`$filename`** - **Enables backward compatibility!** When building XML back from parsed data, we need to reconstruct `schemaLocation` references. `$filename` allows the builder to generate correct import paths, making schemas fully round-trippable: `XSD → Schema → XSD`.

#### Example: Cross-Schema Type Resolution

```typescript
const adtcore = {
  $filename: 'adtcore.xsd',
  targetNamespace: 'http://www.sap.com/adt/core',
  complexType: [{ name: 'AdtObject', ... }],
} as const;

const classes = {
  $xmlns: {
    adtcore: 'http://www.sap.com/adt/core',
    class: 'http://www.sap.com/adt/oo/classes',
  },
  $imports: [adtcore],  // Linked schema
  targetNamespace: 'http://www.sap.com/adt/oo/classes',
  complexType: [{
    name: 'AbapClass',
    complexContent: {
      extension: { base: 'adtcore:AdtObject' }  // Resolved via $imports
    }
  }],
} as const;

// InferSchema<typeof classes> can now resolve AdtObject from $imports
```

### 4. Monorepo Conventions

- ❌ No `devDependencies` in package.json
- ❌ No `scripts` in package.json
- ✅ Use `project.json` for Nx targets
- ✅ Build target inferred by nx-tsdown plugin

## Architecture

```
src/
├── index.ts           # Main exports
├── xsd/               # XSD parsing, building, resolution
│   ├── types.ts       # W3C 1:1 type definitions
│   ├── parse.ts       # XSD XML → Schema parser
│   ├── build.ts       # Schema → XSD XML builder
│   ├── resolve.ts     # Schema resolver (merges imports, expands inheritance)
│   ├── traverser.ts   # OO schema traversal with W3C types
│   ├── loader.ts      # XSD file loading with import resolution
│   ├── schema-like.ts # Runtime schema type guards
│   └── helpers.ts     # Utility functions
├── infer/             # Compile-time type inference
│   └── types.ts       # InferSchema<T>, InferElement<T>
├── xml/               # XML parsing/building with schemas
│   ├── parse.ts       # XML → Object parser
│   ├── build.ts       # Object → XML builder
│   ├── typed.ts       # Typed schema wrapper
│   └── dom-utils.ts   # DOM manipulation utilities
├── walker/            # Schema traversal utilities
│   └── index.ts       # walkElements, walkComplexTypes, findSubstitutes
├── codegen/           # Code generation
│   ├── generate.ts    # Schema literal generator
│   ├── interface-generator.ts  # Interface generator API
│   ├── ts-morph.ts    # TypeScript AST manipulation
│   ├── runner.ts      # Config-based codegen runner
│   └── cli.ts         # CLI interface
└── generators/        # Generator plugins
    ├── raw-schema.ts  # Schema literal generator
    ├── interfaces.ts  # TypeScript interfaces generator
    ├── typed-schemas.ts # Typed schema exports
    └── index-barrel.ts # Index file generator
```

### Key Components

| Component     | Purpose                                                                            |
| ------------- | ---------------------------------------------------------------------------------- |
| **Resolver**  | Merges `$imports`, expands `complexContent/extension`, handles `substitutionGroup` |
| **Traverser** | OO traversal with real W3C XSD types (SchemaTraverser class)                       |
| **Walker**    | Functional iteration over schema elements, types, groups                           |
| **Loader**    | File-based XSD loading with automatic import resolution                            |

## Key Type Definitions

### Schema (W3C Root)

```typescript
interface Schema {
  // Namespace
  targetNamespace?: string;
  elementFormDefault?: 'qualified' | 'unqualified';

  // Declarations
  element?: TopLevelElement[];
  complexType?: TopLevelComplexType[];
  simpleType?: TopLevelSimpleType[];
  group?: NamedGroup[];
  attributeGroup?: NamedAttributeGroup[];

  // Composition
  import?: Import[];
  include?: Include[];

  // Extensions (non-W3C)
  $xmlns?: { [prefix: string]: string };
  $imports?: Schema[];
}
```

### Type Inference

```typescript
// Infer from schema literal
type Data = InferSchema<typeof schema>;

// Infer specific element
type Person = InferElement<typeof schema, 'person'>;

// Schema-like constraint
type SchemaLike = {
  element?: readonly ElementLike[];
  complexType?: readonly ComplexTypeLike[];
  // ...
};
```

## Common Tasks

### Adding a New XSD Type

1. **Find in W3C spec**: https://www.w3.org/TR/xmlschema11-1/XMLSchema.xsd
2. **Add interface** to `src/xsd/types.ts`:
   ```typescript
   export interface NewType extends Annotated {
     readonly name: string;
     readonly someProperty?: string;
   }
   ```
3. **Update parser** in `src/xsd/parse.ts`
4. **Update builder** in `src/xsd/build.ts`
5. **Add tests** in `tests/unit/`
6. **Run tests**: `npx nx test ts-xsd`

### Modifying Type Inference

1. **Understand the flow**:
   - `InferSchema` → `InferRootElementTypes` → `InferTypeName`
   - `InferTypeName` → `FindComplexType` → `InferComplexType`
   - `InferComplexType` → `InferGroup` → `InferElements`

2. **Test with real schemas** - inference is complex, test thoroughly

3. **Check recursion limits** - TypeScript has depth limits

### Adding Codegen Feature

1. **Modify generator** in `src/codegen/generate.ts`
2. **Update options** in `GenerateOptions` interface
3. **Test output** with real XSD files

## Testing

```bash
# Run all tests
npx nx test ts-xsd

# Run with coverage
npx nx test:coverage ts-xsd

# Run specific test
npx vitest run tests/unit/parse.test.ts
```

### Test Categories

| Test                    | Purpose                |
| ----------------------- | ---------------------- |
| `parse.test.ts`         | XSD parsing            |
| `build.test.ts`         | XSD building           |
| `roundtrip.test.ts`     | Parse → Build → Parse  |
| `w3c-roundtrip.test.ts` | Official XMLSchema.xsd |

## Common Mistakes

| Mistake                   | Consequence           | Prevention                              |
| ------------------------- | --------------------- | --------------------------------------- |
| Inventing properties      | Breaks W3C compliance | Check XMLSchema.xsd first               |
| Renaming properties       | Type inference fails  | Use exact W3C names                     |
| Simplifying structures    | Loses XSD semantics   | Keep nested structure                   |
| Missing `as const`        | Type inference fails  | Always use `as const`                   |
| Circular type refs        | TypeScript errors     | Use `$imports` linking                  |
| Stack overflow in codegen | Infinite recursion    | Cycle detection in `expandTypeToString` |

## Dependencies

- `@xmldom/xmldom` - DOM parser for XSD parsing

## Reference

- [W3C XML Schema 1.1 Part 1: Structures](https://www.w3.org/TR/xmlschema11-1/)
- [XMLSchema.xsd](https://www.w3.org/TR/xmlschema11-1/XMLSchema.xsd)
- [README.md](./README.md) - Full package documentation
- [Codegen Guide](./docs/codegen.md) - Code generation documentation
