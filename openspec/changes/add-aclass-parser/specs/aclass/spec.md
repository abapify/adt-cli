# Spec: `@abapify/aclass`

ABAP OO source → typed AST parser, symmetric to `@abapify/acds` for
CDS and `@abapify/abap-ast` for code emission.

## Package invariants

1. **Scope is strictly structural.** The parser recognises class /
   interface _declarations_: headers, sections, member declarations
   (methods, attributes, events, types, constants, aliases),
   inheritance, implements lists, and the opaque bodies of method
   implementations. It does NOT parse statements inside a method
   body, nor does it parse top-level DATA/TYPES outside classes.
2. **Method body is an opaque source slice.** Every `MethodImpl`
   node carries the raw text between its opening `METHOD <name>.`
   and its terminating `ENDMETHOD.`, plus a `{ startOffset, endOffset,
startLine, startColumn }` span. Callers that need structured
   access to method bodies are expected to plug their own expression
   parser on top of the slice.
3. **No dependency on `@abapify/abap-ast` at runtime.** The two
   packages are siblings; depending on `abap-ast` at runtime would
   couple parser evolution to emitter evolution and would create a
   circular dep the moment `abap-ast` gains optional parser helpers.
   Shared shapes are re-declared; a converter module may ship in a
   later change.
4. **Chevrotain only.** No hand-rolled lexer, no regex-driven
   tokenizer. Grammar is LL(≤4); lookahead beyond 4 is an
   error-signal that the grammar needs refactoring, not that the
   limit needs raising.
5. **Return value is `{ ast, errors }`** — never throw for malformed
   input. Partial ASTs are acceptable when the parser can recover;
   unrecoverable errors still yield a best-effort AST of whatever
   was understood up to the first break.

## Grammar coverage (MVP)

| Topic           | Rule                                                                                                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `classDef`      | `CLASS <name> DEFINITION [PUBLIC] [FINAL] [ABSTRACT] [INHERITING FROM <super>] [CREATE {PUBLIC\|PROTECTED\|PRIVATE}] [FOR TESTING [RISK LEVEL <l>] [DURATION <d>]]. <section>* ENDCLASS.`                     |
| `classImpl`     | `CLASS <name> IMPLEMENTATION. <methodImpl>* ENDCLASS.`                                                                                                                                                        |
| `interfaceDef`  | `INTERFACE <name> [PUBLIC]. <interfaceMember>* ENDINTERFACE.`                                                                                                                                                 |
| `section`       | `{PUBLIC\|PROTECTED\|PRIVATE} SECTION. <classMember>*`                                                                                                                                                        |
| `classMember`   | any of `methodDecl`, `attributeDecl`, `typeDecl`, `constantDecl`, `eventDecl`, `aliasDecl`, `interfaceStmt`                                                                                                   |
| `methodDecl`    | `[CLASS-]METHODS <name> [ABSTRACT] [FINAL] [REDEFINITION] [FOR TESTING] [IMPORTING <paramList>] [EXPORTING <paramList>] [CHANGING <paramList>] [RETURNING VALUE(<name>) TYPE <typeRef>] [RAISING <excList>].` |
| `attributeDecl` | `[CLASS-]DATA <name> TYPE <typeRef>.`                                                                                                                                                                         |
| `typeDecl`      | `TYPES <name> TYPE <typeRef>.` or `TYPES BEGIN OF <name>. … END OF <name>.` or `TYPES <name> TYPE STANDARD\|SORTED\|HASHED TABLE OF <rowType> [WITH [UNIQUE\|NON-UNIQUE] KEY …].`                             |
| `constantDecl`  | `CONSTANTS <name> TYPE <typeRef> VALUE <literal>.`                                                                                                                                                            |
| `eventDecl`     | `[CLASS-]EVENTS <name> [EXPORTING <paramList>].`                                                                                                                                                              |
| `aliasDecl`     | `ALIASES <local> FOR <qualified>.`                                                                                                                                                                            |
| `interfaceStmt` | `INTERFACES <name>.`                                                                                                                                                                                          |
| `methodImpl`    | `METHOD <name>. <opaqueBody> ENDMETHOD.`                                                                                                                                                                      |
| `abapDoc`       | `"! <text>` line(s) immediately above any declaration                                                                                                                                                         |
| `typeRef`       | `<ident>`, `REF TO <ident>`, `qualified~name`, `qualifier=>name`                                                                                                                                              |
| `paramList`     | `<name> TYPE <typeRef> [OPTIONAL\|DEFAULT <literal>]` repeated                                                                                                                                                |
| `excList`       | `<className> [ <className> … ]`                                                                                                                                                                               |

### Deferred from MVP (tracked)

- `METHODS ... EVENT HANDLER FOR <obj>->.<evt>` syntax
- `ALIASES` with `IMPLEMENTED BY` clauses (rare)
- Sort-key clauses inside `HASHED TABLE` (accepted but not validated)
- Generic type expressions inside `RAISING` (multiple CX- types are
  already supported; structured `RESUMABLE`/`EXCEPTIONS` clauses are
  not)
- `CLASS-EVENTS` parameter types beyond the simple `EXPORTING VALUE(x)`
  form.

## AST shape

```
AbapSourceFile {
  kind: 'AbapSourceFile',
  source: string,                      // original input, for offset math
  definitions: AbapDefinition[],
  errors: ParseError[],
}

AbapDefinition =
  | ClassDef
  | ClassImpl
  | InterfaceDef

ClassDef {
  kind: 'ClassDef',
  name: string,
  abapDoc?: string[],
  isFinal: boolean,
  isAbstract: boolean,
  isForTesting: boolean,
  createVisibility: 'public' | 'protected' | 'private',
  superClass?: string,
  sections: Section[],
  span: SourceSpan,
}

Section {
  kind: 'Section',
  visibility: 'public' | 'protected' | 'private',
  members: ClassMember[],
  span: SourceSpan,
}

ClassMember =
  | MethodDecl | AttributeDecl | TypeDecl | ConstantDecl | EventDecl
  | AliasDecl | InterfaceStmt

MethodDecl {
  kind: 'MethodDecl',
  name: string,
  abapDoc?: string[],
  isClassMethod: boolean,
  isAbstract: boolean,
  isFinal: boolean,
  isRedefinition: boolean,
  isForTesting: boolean,
  importing: Param[],
  exporting: Param[],
  changing: Param[],
  returning?: Param,
  raising: string[],
  span: SourceSpan,
}

MethodImpl {
  kind: 'MethodImpl',
  name: string,
  body: string,                        // raw text, no trimming
  bodySpan: SourceSpan,
  span: SourceSpan,
}

// … analogous shapes for AttributeDecl, TypeDecl, ConstantDecl,
//   EventDecl, AliasDecl, InterfaceStmt, InterfaceDef, ClassImpl …

SourceSpan {
  startOffset: number,
  endOffset: number,
  startLine: number,
  startColumn: number,
}

ParseError {
  severity: 'error' | 'warning',
  line: number,
  column: number,
  message: string,
}
```

## Testing contract

- **Unit tests** per grammar topic (see proposal, section "What this
  PR adds").
- **Fixtures test** parses every `*.clas.abap` / `*.intf.abap` under
  `samples/petstore3-client/generated/abapgit/src/`. Must return
  zero errors and a non-empty `definitions` array.
- **Roundtrip test** is the release gate. For every fixture,
  `abapAstPrint(parse(src).ast) === src` after whitespace
  normalisation. If the AST shapes diverge from `abap-ast`, a
  converter is used in the test only. The roundtrip test depends on
  `@abapify/abap-ast` as a devDependency and runs in the `aclass`
  test suite.
- **Coverage target**: 80%+ statement coverage, 100% on the grammar
  rules listed above.

## Release gates (for this change)

1. `nx test aclass` green locally and in CI.
2. Roundtrip test green for every fixture (the five petstore3 files
   plus three hand-crafted fixtures covering edge cases: abstract
   class, interface with events, class with nested type declarations).
3. `nx typecheck aclass` green.
4. `nx lint aclass` green.
5. `nx build aclass` produces `dist/index.mjs` + `dist/index.d.mts`
   under 200 kB.
6. Root `AGENTS.md` rules-index gains a link to the new
   `packages/aclass/AGENTS.md` (which in turn mirrors
   `packages/acds/AGENTS.md`).
