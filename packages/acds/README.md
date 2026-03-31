# @abapify/acds

**ABAP CDS source parser** — tokenizer, parser, and typed AST for DDL-based ABAP source types.

## Overview

Parses `.acds` (ABAP CDS DDL) source code into a fully typed Abstract Syntax Tree. Built on [Chevrotain](https://chevrotain.io/) for fast, error-recovering parsing.

### Supported Definitions

| CDS Construct | AST Node               | Example                              |
| ------------- | ---------------------- | ------------------------------------ |
| Table         | `TableDefinition`      | `define table ztable { ... }`        |
| Structure     | `StructureDefinition`  | `define structure zstruct { ... }`   |
| Simple type   | `SimpleTypeDefinition` | `define type ztype : abap.char(10);` |
| Service       | `ServiceDefinition`    | `define service zsvc { ... }`        |
| Metadata ext. | `MetadataExtension`    | `annotate entity ZView with { ... }` |

### Parser Features

- **Error recovery** — returns partial AST + structured errors on invalid input
- **Full annotation support** — strings, enums, booleans, numbers, arrays, objects
- **Built-in types** — `abap.char(10)`, `abap.dec(11,2)`, `abap.dats`, etc.
- **Named types** — data element and qualified name references
- **Include directives** — `include <structure>` with optional suffix
- **Comments** — line (`//`) and block (`/* */`) comments are skipped

## Installation

```bash
bun add @abapify/acds
```

## Quick Start

```typescript
import { parse } from '@abapify/acds';

const result = parse(`
  @AbapCatalog.tableCategory : #TRANSPARENT
  @AbapCatalog.deliveryClass : #A
  define table ztable {
    key mandt : abap.clnt not null;
    key field1 : abap.char(10) not null;
    field2 : some_data_element;
  }
`);

if (result.errors.length === 0) {
  const table = result.ast.definitions[0]; // TableDefinition
  console.log(table.kind); // 'table'
  console.log(table.name); // 'ztable'
  console.log(table.members); // [FieldDefinition, FieldDefinition, ...]
  console.log(table.annotations); // [Annotation, Annotation]
}
```

## API

### `parse(source: string): ParseResult`

Parses a CDS source string through the full pipeline: tokenize → parse → visit.

```typescript
interface ParseResult {
  /** The parsed AST (may be partial if there are errors) */
  ast: CdsSourceFile;
  /** Lexing and parsing errors */
  errors: CdsParseError[];
}
```

### AST Types

#### Root

```typescript
interface CdsSourceFile {
  definitions: CdsDefinition[];
}

type CdsDefinition =
  | TableDefinition
  | StructureDefinition
  | SimpleTypeDefinition
  | ServiceDefinition
  | MetadataExtension
  | RoleDefinition // Phase 2 placeholder
  | ViewEntityDefinition; // Phase 3 placeholder
```

#### Definitions

```typescript
interface TableDefinition {
  kind: 'table';
  name: string;
  annotations: Annotation[];
  members: TableMember[]; // FieldDefinition | IncludeDirective
}

interface StructureDefinition {
  kind: 'structure';
  name: string;
  annotations: Annotation[];
  members: TableMember[];
}

interface SimpleTypeDefinition {
  kind: 'simpleType';
  name: string;
  annotations: Annotation[];
  type: TypeRef;
}

interface ServiceDefinition {
  kind: 'service';
  name: string;
  annotations: Annotation[];
  exposes: ExposeStatement[];
}

interface MetadataExtension {
  kind: 'metadataExtension';
  entity: string;
  annotations: Annotation[];
  elements: AnnotatedElement[];
}
```

#### Fields & Types

```typescript
interface FieldDefinition {
  annotations: Annotation[];
  name: string;
  type: TypeRef;
  isKey: boolean;
  notNull: boolean;
}

type TypeRef = BuiltinTypeRef | NamedTypeRef;

// abap.char(10), abap.dec(11,2)
interface BuiltinTypeRef {
  kind: 'builtin';
  name: string;
  length?: number;
  decimals?: number;
}

// Data element or qualified name
interface NamedTypeRef {
  kind: 'named';
  name: string;
}
```

#### Annotations

```typescript
interface Annotation {
  key: string;
  value: AnnotationValue;
}

type AnnotationValue =
  | { kind: 'string'; value: string }
  | { kind: 'enum'; value: string } // #TRANSPARENT → 'TRANSPARENT'
  | { kind: 'boolean'; value: boolean }
  | { kind: 'number'; value: number }
  | { kind: 'array'; items: AnnotationValue[] }
  | { kind: 'object'; properties: AnnotationProperty[] };
```

#### Errors

```typescript
interface CdsParseError {
  message: string;
  line: number;
  column: number;
  offset: number;
  length: number;
}
```

## Architecture

```
Source string
  → CdsLexer (Chevrotain Lexer)     tokens.ts
  → CdsParser (Chevrotain CstParser) parser.ts
  → CdsVisitor (CST → AST)           visitor.ts
  → CdsSourceFile                     ast.ts
```

| Module       | Responsibility                                  |
| ------------ | ----------------------------------------------- |
| `tokens.ts`  | Token definitions (keywords, symbols, literals) |
| `parser.ts`  | Grammar rules (CST production)                  |
| `visitor.ts` | CST → typed AST transformation                  |
| `ast.ts`     | AST node type definitions                       |
| `errors.ts`  | Error normalization (lex + parse)               |
| `index.ts`   | `parse()` entry point + re-exports              |

## Roadmap

- **Phase 1** (current): `TABL`, `Structure`, `DRTY`, `SRVD`, `DDLX`
- **Phase 2**: `DCLS`, `DDLA`, `DRAS`, `DSFD`, `DTDC`, `DTEB`, `DTSC`
- **Phase 3**: `DDLS` (view entity — SQL-like syntax)

## Dependencies

- [`chevrotain`](https://chevrotain.io/) — Parser toolkit (lexer + CstParser + visitor)
