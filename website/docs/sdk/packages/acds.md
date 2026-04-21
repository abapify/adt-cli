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
```

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

## See also

- [`adt-plugin-abapgit`](./adt-plugin-abapgit) — primary consumer
- [DDIC contracts](../contracts/ddic) — the REST side of CDS sources
