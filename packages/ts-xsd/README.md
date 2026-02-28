# ts-xsd

[![npm](https://img.shields.io/npm/v/ts-xsd)](https://www.npmjs.com/package/ts-xsd)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue)](../../LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6)](https://www.typescriptlang.org/)

**Core XSD parser, builder, and type inference** with **1:1 TypeScript representation** of W3C XML Schema Definition (XSD) 1.1.

## Overview

`ts-xsd` is a comprehensive TypeScript library for working with W3C XSD schemas. It provides:

| Module      | Purpose                                                             |
| ----------- | ------------------------------------------------------------------- |
| **xsd**     | Parse XSD files into typed `Schema` objects, build XSD from objects |
| **infer**   | Compile-time TypeScript type inference from schema literals         |
| **xml**     | Parse/build XML documents using schema definitions                  |
| **codegen** | Generate TypeScript schema literals from XSD files                  |

### Key Features

- **Pure W3C XSD 1.1** - Types match the official [XMLSchema.xsd](https://www.w3.org/TR/xmlschema11-1/XMLSchema.xsd) exactly
- **Full roundtrip** - `XSD → Schema → XSD` with semantic preservation
- **Type inference** - `InferSchema<T>` extracts TypeScript types from schema literals
- **Shared types** - Cross-schema type resolution via `$imports`
- **Tree-shakeable** - Only import what you need
- **Zero runtime dependencies** - Only `@xmldom/xmldom` for DOM parsing

## Installation

```bash
npm install @abapify/ts-xsd
# or
bun add @abapify/ts-xsd
```

## Quick Start

### Parse and Build XSD

```typescript
import { parseXsd, buildXsd } from '@abapify/ts-xsd';

// Parse XSD to typed Schema object
const schema = parseXsd(`
  <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
    <xs:element name="person" type="PersonType"/>
    <xs:complexType name="PersonType">
      <xs:sequence>
        <xs:element name="name" type="xs:string"/>
        <xs:element name="age" type="xs:int" minOccurs="0"/>
      </xs:sequence>
    </xs:complexType>
  </xs:schema>
`);

// Build back to XSD
const xsd = buildXsd(schema, { pretty: true });
```

### Type Inference from Schema Literals

```typescript
import type { InferSchema } from '@abapify/ts-xsd';

// Define schema as const literal
const personSchema = {
  element: [{ name: 'person', type: 'PersonType' }],
  complexType: [
    {
      name: 'PersonType',
      sequence: {
        element: [
          { name: 'name', type: 'xs:string' },
          { name: 'age', type: 'xs:int', minOccurs: 0 },
        ],
      },
    },
  ],
} as const;

// Infer TypeScript type at compile time
type Person = InferSchema<typeof personSchema>;
// Result: { name: string; age?: number }
```

### Parse XML with Schema

```typescript
import { parseXml, buildXml } from '@abapify/ts-xsd';

const xml = `<person><name>John</name><age>30</age></person>`;
const data = parseXml(personSchema, xml);
// data: { name: 'John', age: 30 }

const rebuilt = buildXml(personSchema, data);
// rebuilt: <person><name>John</name><age>30</age></person>
```

## API Reference

### XSD Module

```typescript
import { parseXsd, buildXsd, type Schema } from '@abapify/ts-xsd';
```

#### `parseXsd(xsd: string): Schema`

Parse an XSD XML string into a typed Schema object.

```typescript
const schema = parseXsd(xsdString);
console.log(schema.targetNamespace);
console.log(schema.element?.[0].name);
```

#### `buildXsd(schema: Schema, options?: BuildOptions): string`

Build an XSD XML string from a Schema object.

```typescript
const xsd = buildXsd(schema, {
  prefix: 'xsd', // Namespace prefix (default: 'xs')
  pretty: true, // Pretty print (default: true)
  indent: '  ', // Indentation (default: '  ')
});
```

#### `resolveImports(schema: Schema, resolver: (location: string) => Schema): Schema`

Resolve and link imported schemas for cross-schema type resolution.

```typescript
const linkedSchema = resolveImports(schema, (location) => {
  return parseXsd(fs.readFileSync(location, 'utf-8'));
});
```

### Infer Module

```typescript
import type { InferSchema, InferElement, SchemaLike } from '@abapify/ts-xsd';
```

#### `InferSchema<T>`

Infer TypeScript type from a schema literal. Returns union of all root element types.

```typescript
type Data = InferSchema<typeof mySchema>;
```

#### `InferElement<T, ElementName>`

Infer type for a specific element by name.

```typescript
type Person = InferElement<typeof schema, 'person'>;
```

#### Built-in Type Mapping

| XSD Type                             | TypeScript |
| ------------------------------------ | ---------- |
| `xs:string`, `xs:token`, `xs:NCName` | `string`   |
| `xs:int`, `xs:integer`, `xs:decimal` | `number`   |
| `xs:boolean`                         | `boolean`  |
| `xs:date`, `xs:dateTime`, `xs:time`  | `string`   |
| `xs:anyURI`, `xs:QName`              | `string`   |
| `xs:anyType`                         | `unknown`  |

### XML Module

```typescript
import { parseXml, buildXml } from '@abapify/ts-xsd';
```

#### `parseXml<T>(schema: SchemaLike, xml: string): T`

Parse XML string using schema definition.

#### `buildXml<T>(schema: SchemaLike, data: T): string`

Build XML string from data using schema definition.

### Codegen Module

```typescript
import { generateSchemaLiteral, generateInterfaces } from '@abapify/ts-xsd';
```

#### `generateSchemaLiteral(xsd: string, options?: GenerateOptions): string`

Generate TypeScript schema literal from XSD content.

```typescript
const code = generateSchemaLiteral(xsdContent, {
  name: 'PersonSchema',
  features: { $xmlns: true, $imports: true },
  exclude: ['annotation'],
});
// export default { ... } as const;
```

#### `generateInterfaces(schema: Schema, options?: GenerateInterfacesOptions): GenerateInterfacesResult`

Generate TypeScript interfaces from parsed schema. Returns an object with `code` property containing the generated TypeScript code.

```typescript
const { code } = generateInterfaces(schema, {
  flatten: true, // Inline all nested types (default: false)
  addJsDoc: true, // Add JSDoc comments
  rootTypeName: 'MySchema', // Custom root type name
});
```

## Schema Structure

The `Schema` type is a 1:1 TypeScript representation of W3C XSD:

```typescript
interface Schema {
  // Namespace
  targetNamespace?: string;
  elementFormDefault?: 'qualified' | 'unqualified';
  attributeFormDefault?: 'qualified' | 'unqualified';

  // Composition
  import?: Import[];
  include?: Include[];

  // Declarations
  element?: TopLevelElement[];
  complexType?: TopLevelComplexType[];
  simpleType?: TopLevelSimpleType[];
  group?: NamedGroup[];
  attributeGroup?: NamedAttributeGroup[];

  // Extensions (non-W3C, prefixed with $)
  $xmlns?: { [prefix: string]: string };
  $imports?: Schema[]; // Resolved imported schemas
  $filename?: string; // Source filename
}
```

### Cross-Schema Type Resolution

Link schemas together for cross-schema type resolution:

```typescript
const adtcore = parseXsd(adtcoreXsd);
const classes = parseXsd(classesXsd);

// Link schemas via $imports
const linkedClasses = {
  ...classes,
  $imports: [adtcore],
};

// Now InferSchema can resolve types from adtcore
type AbapClass = InferSchema<typeof linkedClasses>;
```

## Type Inference Deep Dive

### How It Works

The type inference system uses TypeScript's conditional types to:

1. **Find root elements** - Extract element declarations from schema
2. **Resolve type references** - Look up `complexType` and `simpleType` by name
3. **Handle inheritance** - Process `complexContent/extension` for type inheritance
4. **Map XSD to TS** - Convert XSD types to TypeScript equivalents
5. **Handle optionality** - `minOccurs="0"` → optional property
6. **Handle arrays** - `maxOccurs="unbounded"` → array type

### Example: Complex Schema

```typescript
const schema = {
  $imports: [baseSchema],
  element: [{ name: 'order', type: 'OrderType' }],
  complexType: [
    {
      name: 'OrderType',
      complexContent: {
        extension: {
          base: 'base:BaseEntity', // Inherits from imported schema
          sequence: {
            element: [
              { name: 'items', type: 'ItemType', maxOccurs: 'unbounded' },
              { name: 'total', type: 'xs:decimal' },
            ],
          },
        },
      },
    },
    {
      name: 'ItemType',
      sequence: {
        element: [
          { name: 'sku', type: 'xs:string' },
          { name: 'quantity', type: 'xs:int' },
        ],
      },
    },
  ],
} as const;

type Order = InferSchema<typeof schema>;
// Result:
// {
//   ...BaseEntity,  // Inherited properties
//   items: { sku: string; quantity: number }[];
//   total: number;
// }
```

## Architecture

```
@abapify/ts-xsd
├── src/
│   ├── index.ts           # Main exports
│   ├── xsd/               # XSD parsing, building, resolution
│   │   ├── types.ts       # W3C 1:1 type definitions
│   │   ├── parse.ts       # XSD XML → Schema parser
│   │   ├── build.ts       # Schema → XSD XML builder
│   │   ├── resolve.ts     # Schema resolver (merges imports, expands inheritance)
│   │   ├── traverser.ts   # OO schema traversal with W3C types
│   │   ├── loader.ts      # XSD file loading with import resolution
│   │   ├── schema-like.ts # Runtime schema type guards
│   │   └── helpers.ts     # Utility functions
│   ├── infer/             # Compile-time type inference
│   │   └── types.ts       # InferSchema<T>, InferElement<T>
│   ├── xml/               # XML parsing/building with schemas
│   │   ├── parse.ts       # XML → Object parser
│   │   ├── build.ts       # Object → XML builder
│   │   ├── typed.ts       # Typed schema wrapper
│   │   └── dom-utils.ts   # DOM manipulation utilities
│   ├── walker/            # Schema traversal utilities
│   │   └── index.ts       # walkElements, walkComplexTypes, findSubstitutes
│   ├── codegen/           # Code generation
│   │   ├── generate.ts    # Schema literal generator
│   │   ├── interface-generator.ts  # Interface generator API
│   │   ├── ts-morph.ts    # TypeScript AST manipulation
│   │   ├── runner.ts      # Config-based codegen runner
│   │   └── cli.ts         # CLI interface
│   └── generators/        # Generator plugins
│       ├── raw-schema.ts  # Schema literal generator
│       ├── interfaces.ts  # TypeScript interfaces generator
│       ├── typed-schemas.ts # Typed schema exports
│       └── index-barrel.ts # Index file generator
```

### Key Components

| Component     | Purpose                                                                            |
| ------------- | ---------------------------------------------------------------------------------- |
| **Resolver**  | Merges `$imports`, expands `complexContent/extension`, handles `substitutionGroup` |
| **Traverser** | OO traversal with real W3C XSD types (SchemaTraverser class)                       |
| **Walker**    | Functional iteration over schema elements, types, groups                           |
| **Loader**    | File-based XSD loading with automatic import resolution                            |

## Design Principles

1. **Pure W3C XSD** - No invented properties or conveniences
2. **Type safety** - Full TypeScript support with inference
3. **Minimal dependencies** - Only `@xmldom/xmldom`
4. **Tree-shakeable** - Import only what you need
5. **Tested against W3C** - Verified with official XMLSchema.xsd

## Testing

```bash
# Run all tests
npx nx test ts-xsd

# Run with coverage
npx nx test:coverage ts-xsd
```

Tests include:

- Unit tests for parser, builder, and inference
- Integration tests with real XSD files
- W3C XMLSchema.xsd roundtrip verification

## Related Packages

- **[@abapify/adt-schemas](../adt-schemas)** - SAP ADT schemas using ts-xsd
- **[@abapify/adt-contracts](../adt-contracts)** - REST contracts for SAP ADT APIs
- **[@abapify/adt-plugin-abapgit](../adt-plugin-abapgit)** - abapGit plugin schemas

## Documentation

- **[Codegen Guide](./docs/codegen.md)** - Comprehensive code generation documentation
- **[AGENTS.md](./AGENTS.md)** - AI agent guidelines

## References

- [W3C XML Schema 1.1 Part 1: Structures](https://www.w3.org/TR/xmlschema11-1/)
- [XMLSchema.xsd](https://www.w3.org/TR/xmlschema11-1/XMLSchema.xsd)

## License

MIT
