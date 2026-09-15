# ts-xsd

[![npm version](https://img.shields.io/npm/v/@abapify/ts-xsd)](https://www.npmjs.com/package/@abapify/ts-xsd)
[![license](https://img.shields.io/npm/l/@abapify/ts-xsd)](https://github.com/abapify/adt-cli/blob/main/LICENSE)

**W3C XSD 1.1 parser, builder, and TypeScript type inference** — a 1:1 TypeScript representation of XML Schema Definition.

## Why

Working with XSD schemas in TypeScript usually means hand-maintaining types that drift from the source of truth. `ts-xsd` closes that gap:

- **Parse** any W3C XSD 1.1 schema into a typed `Schema` object — no invented properties, no shortcuts.
- **Infer** TypeScript types at compile time from schema literals via `InferSchema<T>`.
- **Generate** TypeScript interfaces at build time when schemas are too complex for compile-time inference.
- **Round-trip** `XSD → Schema → XSD` with semantic preservation.
- **Parse/build XML** documents against a schema definition.

## Installation

```bash
npm install @abapify/ts-xsd
# or
pnpm add @abapify/ts-xsd
# or
bun add @abapify/ts-xsd
```

> **Runtime dependency:** `@xmldom/xmldom` (DOM parsing). `ts-morph` and `zod` are required for codegen features.

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

// Infer TypeScript type at compile time — no runtime cost
type Person = InferSchema<typeof personSchema>;
// => { name: string; age?: number }
```

### Parse and Build XML with a Schema

```typescript
import { parseXml, buildXml } from '@abapify/ts-xsd';

const xml = `<person><name>John</name><age>30</age></person>`;
const data = parseXml(personSchema, xml);
// => { person: { name: 'John', age: 30 } }

const rebuilt = buildXml(personSchema, data, { xmlDecl: false });
// => <person><name>John</name><age>30</age></person>
```

### Generate TypeScript Interfaces from XSD

```typescript
import { parseXsd, generateInterfaces } from '@abapify/ts-xsd';

const schema = parseXsd(xsdContent);
const { code } = generateInterfaces(schema, {
  flatten: true, // Inline all nested types into one
  addJsDoc: true, // Add JSDoc comments
  rootTypeName: 'MySchema',
});

// code is a ready-to-write .ts file:
// export type MySchema = { person: { name: string; age?: number } };
```

## API Reference

### XSD Module

```typescript
import {
  parseXsd,
  buildXsd,
  resolveImports,
  loadSchema,
  type Schema,
} from '@abapify/ts-xsd';
```

#### `parseXsd(xsd: string): Schema`

Parse an XSD XML string into a typed `Schema` object.

#### `buildXsd(schema: Schema, options?: BuildOptions): string`

Build an XSD XML string from a `Schema` object.

```typescript
const xsd = buildXsd(schema, {
  prefix: 'xs', // Namespace prefix (default: 'xs')
  pretty: true, // Pretty print (default: true)
  indent: '  ', // Indentation string
});
```

#### `resolveImports(schema, availableSchemas): Schema`

Resolve and link imported schemas by matching `import.schemaLocation` to `$filename`. Returns a new schema with `$imports` populated.

```typescript
const base = { ...parseXsd(baseXsd), $filename: 'base.xsd' };
const orders = { ...parseXsd(ordersXsd), $filename: 'orders.xsd' };

const linked = resolveImports(orders, [base]);
// linked.$imports = [base]
```

#### `loadSchema(schemaPath: string, options?: LoaderOptions): Schema`

Load and parse an XSD file from disk. Synchronous. Set `autoLink: true` to automatically resolve imports, or `autoResolve: true` to merge everything into one schema.

```typescript
const schema = loadSchema('/path/to/schema.xsd', { autoLink: true });
```

### Infer Module

```typescript
import type { InferSchema, InferElement, SchemaLike } from '@abapify/ts-xsd';
```

#### `InferSchema<T>`

Infer a TypeScript type from a schema literal (`as const`). Returns a union of all root element types.

#### `InferElement<T, Name>`

Infer the type for a specific root element by name.

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

#### `parseXml<T>(schema, xml: string): T`

Parse an XML string into a typed object using a schema definition.

#### `buildXml<T>(schema, data: T, options?: XmlBuildOptions): string`

Build an XML string from a typed object using a schema definition. Defaults to `xmlDecl: true` (includes `<?xml ...?>` declaration); pass `{ xmlDecl: false }` for bare output.

### Codegen Module

```typescript
import { generateSchemaLiteral, generateInterfaces } from '@abapify/ts-xsd';
```

#### `generateSchemaLiteral(xsd: string, options?): string`

Generate a TypeScript `as const` schema literal from XSD content — for use with `InferSchema<T>`.

```typescript
const code = generateSchemaLiteral(xsdContent, {
  name: 'PersonSchema',
  features: { $xmlns: true, $filename: true },
  exclude: ['annotation'],
});
// export const PersonSchema = { ... } as const;
```

#### `generateInterfaces(schema: Schema, options?): { code: string }`

Generate TypeScript interfaces from a parsed schema. Useful when schemas are too complex for compile-time `InferSchema<T>` (TypeScript TS2589 recursion limits).

```typescript
const { code } = generateInterfaces(schema, {
  flatten: true, // Inline all nested types (default: false)
  addJsDoc: true, // JSDoc comments
  rootTypeName: 'MySchema',
});
```

| Option         | Type      | Default | Description                      |
| -------------- | --------- | ------- | -------------------------------- |
| `flatten`      | `boolean` | `false` | Inline all nested types into one |
| `addJsDoc`     | `boolean` | `false` | Add JSDoc comments               |
| `rootTypeName` | `string`  | auto    | Custom name for the root type    |

### CLI

The package ships a CLI for code generation:

```bash
# Config-based (recommended) — uses ts-xsd.config.ts in cwd
npx ts-xsd codegen

# Single-file mode
npx ts-xsd codegen person.xsd
npx ts-xsd codegen person.xsd ./generated/person-schema.ts
npx ts-xsd codegen person.xsd --name=PersonSchema
```

### Config-Based Generation

For multi-schema projects, use the composable generator system:

```typescript
import {
  defineConfig,
  rawSchema,
  interfaces,
} from '@abapify/ts-xsd/generators';

export default defineConfig({
  sources: {
    base: {
      xsdDir: 'schemas',
      outputDir: 'src/generated',
      schemas: ['base'],
    },
    orders: {
      xsdDir: 'schemas',
      outputDir: 'src/generated',
      schemas: ['orders'],
      autoLink: true,
    },
  },
  generators: [rawSchema(), interfaces({ flatten: true })],
});
```

## Schema Structure

The `Schema` type is a 1:1 TypeScript representation of W3C XSD. Non-W3C extension properties are prefixed with `$`:

```typescript
interface Schema {
  targetNamespace?: string;
  elementFormDefault?: 'qualified' | 'unqualified';

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
  $xmlns?: { [prefix: string]: string }; // Namespace prefix mappings
  $imports?: Schema[]; // Linked imported schemas
  $filename?: string; // Source filename (for round-trip)
}
```

### Cross-Schema Type Resolution

Link schemas via `$imports` to resolve types across schema boundaries:

```typescript
const base = { ...parseXsd(baseXsd), $filename: 'base.xsd' };
const orders = { ...parseXsd(ordersXsd), $filename: 'orders.xsd' };

const linked = resolveImports(orders, [base]);

// InferSchema can now resolve types from `base`
type OrderData = InferSchema<typeof linked>;
```

## Design Principles

1. **Pure W3C XSD 1.1** — types match the official [XMLSchema.xsd](https://www.w3.org/TR/xmlschema11-1/XMLSchema.xsd) exactly; no invented properties.
2. **Type-safe** — full TypeScript support with compile-time inference.
3. **Minimal dependencies** — `@xmldom/xmldom` for DOM parsing, `ts-morph` and `zod` for codegen.
4. **Tree-shakeable** — import only what you need.
5. **Round-trip verified** — tested against the official W3C XMLSchema.xsd.

## References

- [W3C XML Schema 1.1 Part 1: Structures](https://www.w3.org/TR/xmlschema11-1/)
- [XMLSchema.xsd](https://www.w3.org/TR/xmlschema11-1/XMLSchema.xsd)
- [Codegen Guide](https://github.com/abapify/adt-cli/tree/main/packages/ts-xsd/docs/codegen.md)

## License

[MIT](https://github.com/abapify/adt-cli/blob/main/LICENSE)
