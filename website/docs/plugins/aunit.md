---
title: AUnit plugin
sidebar_position: 2
---

# AUnit plugin

Package: [`@abapify/adt-aunit`](../sdk/packages/adt-aunit) · adds: `adt aunit`

Runs ABAP Unit (AUnit) tests on a package, class, transport, or explicit list
of objects, and emits results in formats your CI pipeline understands.

## What it does

Calls the ADT `/sap/bc/adt/abapunit/testruns` endpoint with a scope (package /
class / transport / `--objects-file`), collects test results and optionally
**coverage**, then writes out a machine-readable report alongside a
human-readable console summary.

Output formats supported:

- **console** (default, colored summary)
- **json** — raw result as JSON, good for custom pipelines
- **junit** — JUnit XML, the lingua franca of CI test reporters (GitLab,
  Jenkins, GitHub Actions all understand it out of the box)
- **sonar** — SonarQube
  [Generic Test Execution](https://docs.sonarsource.com/sonarqube/latest/analyzing-source-code/test-coverage/generic-test-data/)
  XML

Coverage output:

- **jacoco** — `jacoco.xml` consumable by SonarQube, Codecov, etc.
- **sonar-generic** — SonarQube
  [Generic Test Coverage](https://docs.sonarsource.com/sonarqube/latest/analyzing-source-code/test-coverage/generic-test-data/)
  XML for environments that don't speak JaCoCo.

## Installation

```bash
bun add -D @abapify/adt-aunit
```

Enable in `adt.config.ts`:

```ts title="adt.config.ts"
export default {
  commands: ['@abapify/adt-aunit/commands/aunit'],
};
```

## Usage

```bash
# Run tests on a package, print summary
adt aunit -p ZMY_PKG

# Run tests on a single class, write JUnit XML for CI
adt aunit -c ZCL_MYCLASS --format junit --output aunit.xml

# Run tests on a transport + emit coverage
adt aunit -t S0DK942970 \
  --format junit --output aunit.xml \
  --coverage --coverage-format jacoco --coverage-output jacoco.xml

# SonarQube generic reports (test + coverage)
adt aunit -p ZMY_PKG \
  --format sonar --output sonar-tests.xml \
  --coverage --coverage-format sonar-generic --coverage-output sonar-cov.xml
```

Full flag reference: `adt aunit --help` or
[CLI: aunit](../cli/aunit).

## Jacoco vs Sonar Generic

Both formats capture the same coverage data but differ in structure:

| Concern     | JaCoCo XML                         | Sonar Generic                                      |
| ----------- | ---------------------------------- | -------------------------------------------------- |
| Consumers   | Sonar, Codecov, GitLab, IntelliJ   | Only SonarQube / SonarCloud                        |
| Granularity | Class + method + instruction-level | File + line-level                                  |
| Use when…   | You want broad tool compatibility  | Your Sonar project expects the native Sonar format |

The underlying AUnit coverage payload from SAP is line-based, so both formats
are produced from the same source — no information lost either way.

## SonarQube integration

Combine test + coverage reports in `sonar-project.properties`:

```properties
sonar.tests=src
sonar.testExecutionReportPaths=sonar-tests.xml
sonar.coverageReportPaths=sonar-cov.xml
# or, if using JaCoCo:
sonar.coverage.jacoco.xmlReportPaths=jacoco.xml
```

See the
[AUnit tutorial](https://github.com/abapify/adt-cli/tree/main/packages/adt-aunit/tutorials/aunit-to-sonarqube)
for a complete GitLab CI pipeline.

## Internals

- Entry point: `src/commands/aunit.ts` — a `CliCommandPlugin` that builds the
  AUnit run body, calls `client.adt.aunit.testruns.post(body)`, and pipes the
  typed response through a formatter.
- Formatters live under `src/formatters/` (`junit.ts`, `sonar.ts`,
  `jacoco.ts`). Each is a pure function: `result → string`.
- No filesystem or client logic in formatters — they're trivially unit-testable.

## Extending

Adding a new output format is a small change:

1. Create `src/formatters/<name>.ts` with a single export
   `formatX(result: AunitResult): string`.
2. Register it in `src/formatters/index.ts` under the desired `--format` value.
3. Add a test under `tests/`.

For coverage formats, do the same under the coverage side of the formatter
registry.

## Troubleshooting

- **`No tests found`** — the scope has no test classes (or they're not marked
  `FOR TESTING RISK LEVEL HARMLESS`). AUnit respects risk-level configuration
  on the server.
- **Coverage missing** — make sure you passed `--coverage`; server-side
  coverage collection is off by default.
- **Empty JUnit report** — check that `--output` is set (required for
  `junit` / `sonar` formats).
