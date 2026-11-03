---
title: '@abapify/acds'
description: ABAP CDS DDL source parser (lexer, parser, typed AST).
---

# `@abapify/acds`

Parser for ABAP CDS DDL source (`.acds`/DDLS sources). Tokenizes, parses, and
produces a typed AST for tables, structures, simple types, services, metadata
extensions, and (phased) roles + view entities. Built on
[chevrotain](https://chevrotain.io/) with error recovery — partial ASTs plus
structured errors are returned even on malformed input.

## Install

```bash
bun add @abapify/acds
```

## Public API

```ts
export { parse, type ParseResult } from '@abapify/acds';
// Re-exported from './ast', './tokens', './errors':
export type {
  CdsSourceFile,
  CdsDefinition,
  TableDefinition,
  StructureDefinition,
  SimpleTypeDefinition,
  ServiceDefinition,
  MetadataExtension,
  FieldDefinition,
  IncludeDirective,
  TypeRef,
  BuiltinTypeRef,
  NamedTypeRef,
  CdsParseError,
} from '@abapify/acds';

// FROM clause (view entities)
export type {
  ViewEntityDefinition,
  DataSource,
  DataSourceParameter,
  JoinClause,
  JoinType,
  AssociationDeclaration,
  Expression,
} from '@abapify/acds';
```

## FROM clause

View entities expose the whole FROM region:

- `ViewEntityDefinition.source` — the root data source,
- `ViewEntityDefinition.joins` — the ordered join chain (`joinType` is normalized
  to `inner` / `leftOuter` / `rightOuter` / `fullOuter` / `cross`),
- `ViewEntityDefinition.fromAssociations` — associations declared next to the
  data source (as opposed to the element-list associations in `members`),
- `DataSource.parameters` — the bindings of a parameterized source, e.g.
  `:P_StartDate`, `$session.client` or a literal.

Join syntax:

- the `ON` condition is required for `[INNER] JOIN`, `LEFT [OUTER] JOIN`,
  `RIGHT [OUTER] JOIN` and `FULL [OUTER] JOIN`, and not allowed for
  `CROSS JOIN`,
- the `OUTER` keyword is optional: `LEFT JOIN` and `LEFT OUTER JOIN` are both
  accepted and both normalized to `leftOuter`,
- `FULL [OUTER] JOIN` (the SQL-standard full outer join) is supported and
  normalized to `fullOuter` — it is not part of the ABAP CDS DDL join syntax,
  but it is needed to read HANA CDS / CAP CDS sources, which use the standard
  SQL join syntax,
- the accepted spellings are the same for a CDS view entity
  (`define view entity`) and a classic SQL view (`define view`).

Keywords are matched case-insensitively — `DEFINE VIEW ENTITY` and
`define view entity` both parse, and identifiers keep their original spelling.

## Usage

```ts
import { parse } from '@abapify/acds';

const result = parse(`
  @AbapCatalog.tableCategory : #TRANSPARENT
  define table ztable {
    key field1 : abap.char(10) not null;
    field2 : some_data_element;
  }
`);

if (result.errors.length === 0) {
  const table = result.ast.definitions[0]; // TableDefinition
  console.log(table.name, table.fields);
}
```

## Dependencies

- Runtime: `chevrotain`
- Consumed by: [`@abapify/adt-plugin-abapgit`](./adt-plugin-abapgit) (maps
  CDS AST → DD02V/DD03P for abapGit TABL serialisation).

## Overview

Parses `.acds` (ABAP CDS DDL) source code into a fully typed Abstract Syntax Tree. Built on [Chevrotain](https://chevrotain.io/) for fast, error-recovering parsing.

### Supported Definitions

| CDS Construct   | AST Node                   | Example                                                                       |
| --------------- | -------------------------- | ----------------------------------------------------------------------------- |
| Table           | `TableDefinition`          | `define table [entity] ztable { ... }`                                        |
| Root table ent. | `TableDefinition`          | `define root table entity ztable { ... }`                                     |
| Structure       | `StructureDefinition`      | `define structure zstruct { ... }`                                            |
| Simple type     | `SimpleTypeDefinition`     | `define type ztype : abap.char(10);`                                          |
| View entity     | `ViewEntityDefinition`     | `define [root] view entity zv as select ...`                                  |
| Legacy view     | `ViewEntityDefinition`     | `define view zv as select ...` (`legacy`)                                     |
| Abstract entity | `AbstractEntityDefinition` | `define abstract entity zae { ... }`                                          |
| Custom entity   | `CustomEntityDefinition`   | `define custom entity zce { ... }`                                            |
| External entity | `ExternalEntityDefinition` | `define external entity zee { ... } with federated data provided at runtime;` |
| Table function  | `TableFunctionDefinition`  | `define table function ztf returns { ... }`                                   |
| Scalar function | `ScalarFunctionDefinition` | `define scalar function zsf ...`                                              |
| Hierarchy       | `HierarchyDefinition`      | `define hierarchy zh as parent child hierarchy(...) { ... }`                  |
| Aspect          | `AspectDefinition`         | `define aspect za { ... }`                                                    |
| Annotation      | `AnnotationDefinition`     | `define annotation za: Boolean;`                                              |
| Access policy   | `AccessPolicyDefinition`   | `define accesspolicy zap { ... }`                                             |
| Service         | `ServiceDefinition`        | `define service zsvc { ... }`                                                 |
| Extension       | `ExtensionDefinition`      | `extend view entity zv with { ... }`                                          |
| Metadata ext.   | `MetadataExtension`        | `annotate entity ZView with { ... }`                                          |
| Role (DCL)      | `RoleDefinition`           | `define role zr { grant select ... }`                                         |

### Parser Features

- **Error recovery** — returns partial AST + structured errors on invalid input
- **Full annotation support** — strings, enums, booleans, numbers, arrays, objects
- **Built-in types** — `abap.char(10)`, `abap.dec(11,2)`, `abap.dats`, etc.
- **Named types** — data element and qualified name references
- **Include directives** — `include <structure>` with optional suffix
- **Comments** — line (`//`, `--`) and block (`/* */`) comments are skipped
- **Case-insensitive keywords** — `DEFINE VIEW ENTITY` and `define view entity` both parse; identifiers keep their original spelling
- **FROM clause** — join chains, parameterized sources, FROM associations
- **View flavours** — `define view entity <name>` and the legacy `define view <name>`
- **Projection elements** — paths, calls (`coalesce(a, b)`, `sum(x)`) and `cast(x as type [preserving type])`

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
  | ViewEntityDefinition
  | AbstractEntityDefinition
  | CustomEntityDefinition
  | ExternalEntityDefinition
  | TableFunctionDefinition
  | ScalarFunctionDefinition
  | HierarchyDefinition
  | AspectDefinition
  | AnnotationDefinition
  | AccessPolicyDefinition
  | ServiceDefinition
  | ExtensionDefinition
  | MetadataExtension
  | RoleDefinition;
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

#### FROM clause (view entities)

```typescript
interface ViewEntityDefinition {
  kind: 'viewEntity';
  name: string;
  annotations: Annotation[];
  legacy?: boolean; // true for the legacy `define view <name>` syntax
  root?: boolean; // `define root view entity`
  writable?: boolean; // `define writable view entity`
  providerContract?: string; // `provider contract transactional_query`
  sourceKind: DataSourceKind; // 'select' | 'projection'
  distinct?: boolean; // `select distinct`
  source: DataSource; // the root data source
  joins: JoinClause[]; // ordered join chain — empty when there are no joins
  fromAssociations?: AssociationDeclaration[]; // associations of the FROM region
  aspectBindings?: AspectBinding[]; // `bind aspect` bindings
  parameters: ParameterDefinition[];
  members: ViewMember[];
  where?: Expression;
  groupBy?: string[];
  having?: Expression;
  setOperations?: SetOperation[]; // union/intersect/except branches
}

interface DataSource {
  name: string;
  alias?: string;
  parameters?: DataSourceParameter[]; // parameterized source
}

interface DataSourceParameter {
  name: string; // e.g. 'P_StartDate'
  value: string; // raw binding: ':P_Key1StartDate', '$session.client', "'X'"
}

type JoinType = 'inner' | 'leftOuter' | 'rightOuter' | 'fullOuter' | 'cross';

// Conditioned joins always carry an ON condition — the grammar enforces it.
interface ConditionedJoinClause {
  kind: 'join';
  joinType: 'inner' | 'leftOuter' | 'rightOuter' | 'fullOuter';
  source: JoinSource; // DataSource | JoinGroup
  on: Expression; // the ON condition (opaque)
  cardinality?: WordCardinality; // `many to one join` / `to one join`
}

// A cross join never carries an ON condition.
interface CrossJoinClause {
  kind: 'join';
  joinType: 'cross';
  source: JoinSource;
}

type JoinClause = ConditionedJoinClause | CrossJoinClause;

// A join source is either a plain data source or a parenthesized group.
type JoinSource = DataSource | JoinGroup;

// `join (A join B on …) on …` — the group acts as a single join source.
interface JoinGroup {
  kind: 'joinGroup';
  source: JoinSource; // nested — may itself be a group
  joins: JoinClause[]; // the join chain inside the parentheses
}
```

Supported join spellings (normalized to `JoinType`):

| spelling           | `joinType`   | Notes                            |
| ------------------ | ------------ | -------------------------------- |
| `JOIN`             | `inner`      |                                  |
| `INNER JOIN`       | `inner`      |                                  |
| `LEFT JOIN`        | `leftOuter`  | `OUTER` is optional              |
| `LEFT OUTER JOIN`  | `leftOuter`  |                                  |
| `RIGHT JOIN`       | `rightOuter` | `OUTER` is optional              |
| `RIGHT OUTER JOIN` | `rightOuter` |                                  |
| `FULL JOIN`        | `fullOuter`  | `OUTER` is optional              |
| `FULL OUTER JOIN`  | `fullOuter`  |                                  |
| `CROSS JOIN`       | `cross`      | must not carry an `ON` condition |

The `ON` condition is **required** for inner and outer joins and **not allowed**
for a cross join — the grammar enforces this.

The accepted join syntax is the same for every view flavour: a CDS view entity
(`define view entity`) and a classic SQL view (`define view`) accept exactly the
same spellings. `FULL [OUTER] JOIN` is the SQL-standard full outer join — it is
not part of the ABAP CDS DDL join syntax, but it is supported so that HANA CDS /
CAP CDS sources (which use the standard SQL join syntax) can be read with the
same parser.

Example:

```typescript
const { ast } = parse(`
  define view entity ZC_Cube as select from I_Item as _Item
    left outer join ZI_Other as _Other
      on _Item.key = _Other.key
    association [0..1] to I_Product as _Product
      on $projection.Product = _Product.Product
  {
    key _Item.key
  }
`);

const view = ast.definitions[0] as ViewEntityDefinition;
view.joins[0].joinType; // 'leftOuter'
view.joins[0].source.alias; // '_Other'
view.fromAssociations?.[0].target; // 'I_Product'
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

- ✅ **DDL**: tables, structures, simple types, view entities (`define [root] view entity`, projection views + `provider contract`), legacy `define view`, abstract/custom/table/external entities, table/scalar functions, hierarchies, aspects (DRAS), DDLA annotation definitions, access policies, services (SRVD), metadata extensions (DDLX), `extend view/entity` forms, parameters, associations, compositions
- ✅ **DCL**: role definitions — `switchable`, grant-select + `where`, `with optional elements`, `combination mode and|or|redefinition`, `inherit`, `inheriting conditions`
- ✅ **Annotations**: full value grammar (strings, enums, booleans, numbers, arrays, objects, dotted keys)
- ✅ **Tooling**: AST walker helpers, semantic validators (`SemanticDiagnostic`), grammar coverage metadata
- ✅ **FROM clause**: join chains (`inner`, `left [outer]`, `right [outer]`, `full [outer]`, `cross`) with word cardinalities and grouped joins, parameterized sources, FROM associations, path-expression data sources (`_assoc[ ... ]`), `bind aspect`
- ✅ **Elements**: `case … end`, arithmetic, casts, calls (incl. `f()`), window `over (…)`, paths, `: localized`, `: redirected to`, `distinct`, `where`/`group by`/`having`, `union [all]`/`intersect`/`except`
- 🔜 **Expression grammar** (structured `on`/`where` trees — currently opaque `{ source, tokens }`)
- 🔜 **BDEF / behavior definitions** (owned by epic E10)

## See also

- [`adt-plugin-abapgit`](./adt-plugin-abapgit) — primary consumer
- [DDIC contracts](../contracts/ddic) — the REST side of CDS sources
