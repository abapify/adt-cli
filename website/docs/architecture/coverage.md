---
title: ABAP Unit Coverage Pipeline
sidebar_position: 7
---

# ABAP Unit Coverage Pipeline

`adt aunit` (from `@abapify/adt-aunit`) runs ABAP Unit tests and can
emit coverage in the formats consumers expect. The pipeline is thin:
two SAP calls + a local transform.

## Two-step coverage collection

SAP splits coverage into two endpoints:

```
POST /sap/bc/adt/runtime/traces/coverage/measurements/<id>
        │
        └─► tree of {class → method → counters}
             (lines / branches / statements, missed + executed)

GET  /sap/bc/adt/runtime/traces/coverage/statements/<id>
        │
        └─► per-method statement ranges (start line → end line)
```

Both responses are typed — they have contracts in `@abapify/adt-contracts`
under `runtime-traces` and reuse the `Acoverage*` schemas from
`adt-schemas`. The CLI calls:

```ts
const measurements =
  await client.adt.runtime.traces.coverage.measurements.post(measurementId);
const statements =
  await client.adt.runtime.traces.coverage.statements.get(measurementId);
```

(see `packages/adt-aunit/src/commands/aunit.ts`).

## JaCoCo XML emit

`formatters/jacoco.ts` folds `(measurements, statements)` into a single
JaCoCo XML tree. Two formats are supported out-of-the-box:

| Format        | Flag                              | Consumer                                   |
| ------------- | --------------------------------- | ------------------------------------------ |
| JaCoCo        | `--coverage-format jacoco`        | generic CI; IntelliJ; default              |
| Sonar Generic | `--coverage-format sonar-generic` | SonarQube 'Generic Test Coverage' importer |

Counter types are mapped to JaCoCo's vocabulary:

| SAP counter  | JaCoCo type |
| ------------ | ----------- |
| `statements` | `LINE`      |
| `branches`   | `BRANCH`    |
| `methods`    | `METHOD`    |

Missed/covered counts are emitted per `<counter>` element.

## abapGit filename mapping (our improvement over sapcli)

SAP identifies coverage targets by ADT URI
(`/sap/bc/adt/oo/classes/ZCL_X/includes/main`). CI tools want file
paths. `sapcli` leaves the URI in place, which makes SonarQube reports
useless — the "files" are unclickable ADT handles.

`adt aunit` imports `adtUriToAbapGitPath` from
`@abapify/adt-plugin-abapgit` and rewrites every target to the abapGit
path convention:

```
/sap/bc/adt/oo/classes/ZCL_X                    → src/zcl_x.clas.abap
/sap/bc/adt/oo/classes/ZCL_X/includes/main      → src/zcl_x.clas.abap
/sap/bc/adt/oo/classes/ZCL_X/includes/testclasses → src/zcl_x.clas.testclasses.abap
/sap/bc/adt/programs/programs/ZMY               → src/zmy.prog.abap
```

The resulting `sourcefile` and `name` attributes in the JaCoCo XML
match what abapGit would write to disk, so the reports line up with
the source files a developer actually has in their repo / IDE.

## SonarQube integration

`sonar-project.properties` needs:

```
sonar.coverage.jacoco.xmlReportPaths=reports/jacoco.xml
sonar.sources=src
sonar.tests=src
```

Then:

```bash
adt aunit -p $ZDEMO \
  --coverage --coverage-format jacoco \
  --coverage-output reports/jacoco.xml
# ... then run sonar-scanner
```

SonarQube picks up the `src/zcl_*.clas.abap` filenames directly — no
further rewriting needed.

The `sonar-generic` format (SonarQube's "generic test coverage" schema)
is also supported and uses the same filename mapping.

## MCP equivalent

The `run_unit_tests` MCP tool calls the same contracts + formatters.
See [MCP → run_unit_tests](../mcp/tools/run_unit_tests).

## See also

- [CLI → aunit](../cli/aunit)
- [MCP → run_unit_tests](../mcp/tools/run_unit_tests)
- [SDK → adt-aunit](../sdk/packages/adt-aunit)
- [SDK → contracts → runtime-traces](../sdk/contracts/runtime-traces)
