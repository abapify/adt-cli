# E09 — Extend `@abapify/acds` parser

## Mission

Bring the existing `@abapify/acds` parser up to production-grade coverage of the CDS DDL/DCL grammar so it can power BDEF, SRVD, SRVB resolution and any future CDS-aware tooling (linting, refactor, navigation).

## Why

We have a starter parser at `packages/acds/`. RAP (E10/E11/E12) needs reliable AST-level access to CDS sources — annotations, associations, parameters, projections, action declarations. Without this, the RAP epics will reinvent partial parsers each time.

## Dependencies

- Blocked by: none
- Blocks: **E10, E11, E12** (RAP)

## References

- Existing package: `packages/acds/` (read README/AGENTS.md)
- ABAP CDS DDL specification: SAP help (download / pin reference grammar locally — `tmp/cds-grammar/`).
- abaplint CDS support (TS implementation): https://github.com/abaplint/abaplint — for cross-comparison of grammar rules.

## Scope — files

### Add

```
packages/acds/src/lib/grammar/
├── ddl.ts                         # full DDL grammar rules
├── dcl.ts                         # access control DDL grammar
├── annotations.ts                 # annotation tokens, allowed scopes
├── associations.ts                # association declarations
├── parameters.ts
├── projections.ts                 # projection views, RAP behavior projections
└── actions.ts                     # define action / function
packages/acds/src/lib/ast/         # rich AST node types (visitors, walkers)
packages/acds/src/lib/validate/    # semantic validators (e.g. cardinality, type checks)
packages/acds/tests/grammar/       # spec tests per construct
packages/acds/tests/fixtures/      # real CDS sources from SAP examples (sanitized)
```

### Modify

```
packages/acds/src/index.ts                     # expose new entry points
packages/acds/AGENTS.md                        # update grammar coverage table
packages/acds/README.md
```

## Out of scope

- BDEF parsing — that's a separate language, owned by E10.
- DDIC SQL view emission.

## Tests

- Per-grammar-rule: ≥ 50 tests (cover every CDS construct from the official grammar).
- Real-world fixtures: ≥ 10 large CDS files parsed without error (collect from SAP samples or sanitized customer examples).
- Roundtrip (parse → emit → parse): identical AST.

## Acceptance

```bash
bunx nx build acds && bunx nx test acds
```

- 100% of fixture files parse without error.
- AST visitor API documented (use TypeDoc or hand-written) in `packages/acds/docs/`.

## Devin prompt

```
Spec: /mnt/wsl/workspace/ubuntu/adt-cli/docs/roadmap/epics/e09-acds-parser.md
Read packages/acds/AGENTS.md and the existing grammar/parser. Refer to SAP CDS DDL spec.
This is foundation for RAP epics — keep API stable.
Do NOT commit without approval.
```

## Open questions

- Tokenizer/parser approach: hand-written recursive-descent (current) vs PEG / Chevrotain? Recommend staying hand-written for predictability; revisit if grammar coverage stalls.

## Delivered in this pass (2025-PR)

- Chevrotain LL(4) grammar coverage for: `define view entity` (+ `as select from` / `as projection on`), `define abstract entity`, `define custom entity`, `define role` + `grant select on … [where …]`, `with parameters`, `association`/`composition` with full cardinality syntax (`[L..U]`, `[*]`, `[0..*]`, `[N]`, `[L..*]`), `redirected to`, `of many|one`, associations/compositions with `on` expressions.
- New AST nodes: `ViewEntityDefinition`, `AbstractEntityDefinition`, `CustomEntityDefinition`, `RoleDefinition` (with grants), `AssociationDeclaration`, `Cardinality`, `ParameterDefinition`, `Expression` (opaque token bag for `on`/`where`).
- `src/lib/grammar/*.ts` — per-topic grammar coverage metadata (`GRAMMAR_COVERAGE` exported at runtime).
- `src/lib/ast/walker.ts` — `walkDefinitions`, `walkAnnotations`, `walkAssociations`, `walkFields`, `walkParameters`, `walkViewElements`, `findAnnotation`, plus `hasFields`/`hasMembers`/`hasParameters`/`isAssociation` type guards.
- `src/lib/validate/*.ts` — semantic validators returning `SemanticDiagnostic[]` (`ACDS001`…`ACDS011` for cardinality + key/virtual combinations).
- 78 tests (23 legacy + 32 new per-topic grammar + 5 walker + 5 validator + 6 fixtures + 7 integration), 12 real-world fixtures (6 from `git_modules/abap-file-formats` + 6 hand-crafted RAP examples).

## Still out of scope — track as follow-ups

- **Expression grammar**: `on` / `where` clauses return opaque `{ source, tokens }`. Structured parsing (boolean/comparison trees, function calls) is deferred.
- **SQL surface inside view element list**: `cast(...)`, `case when`, arithmetic, aggregates, window functions. Current grammar only accepts `<qualified-name> [as <alias>]` as a projection element.
- **Joins**: `inner join`, `left outer join`, `on` conditions between joined sources.
- **Union / intersect / union all** at source level.
- **`define aspect` (DRAS), `define hierarchy`, cache definitions (DTDC/DTSC), scalar functions (DSFD), view buffer (DTEB), annotation definitions (DDLA)** — these were observed in the abap-file-formats fixtures but are not required by E10/E11/E12. Add when the consuming epic needs them.
- **BDEF / behavior definitions** — E10 owns this.
- **`$projection.X` / `$parameters.X` system references** — the `$` prefix is not yet part of the identifier regex. Add when SRVD projections need it.

## Handoff for E10 / E11 / E12

To consume the parser from a RAP epic:

```ts
import {
  parse,
  walkViewElements,
  walkAssociations,
  walkParameters,
  findAnnotation,
  type ViewEntityDefinition,
  type ServiceDefinition,
  type AssociationDeclaration,
} from '@abapify/acds';

const { ast, errors } = parse(source);
if (errors.length) throw new Error('CDS parse failed');

const def = ast.definitions[0];
if (def.kind === 'viewEntity') {
  for (const { element } of walkViewElements(ast)) {
    // element.expression, element.alias, element.isKey, ...
  }
  for (const { association } of walkAssociations(ast)) {
    // association.target, association.cardinality, association.on, ...
  }
}
if (def.kind === 'service') {
  // ServiceDefinition.exposes: ExposeStatement[]
}
```

- **E10 (BDEF)**: cross-reference `managed implementation in class … unique` against a `ViewEntityDefinition` parsed from the projection source. Use `walkAssociations` to enumerate child entities for `with draft` / `composition of` detection.
- **E11 (SRVD)**: parse `.srvd.acds` → `ServiceDefinition`, iterate `exposes[]`, resolve each `entity` by parsing the corresponding DDLS source with this parser.
- **E12 (SRVB)**: use `ServiceDefinition` as the binding inventory; no new parser needs to be introduced.
