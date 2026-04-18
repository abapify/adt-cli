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
