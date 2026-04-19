---
title: aunit
sidebar_position: 16
description: Run ABAP Unit tests with coverage output.
---

# `adt aunit`

Run ABAP Unit tests and collect coverage. Shipped as a command plugin from
`@abapify/adt-aunit` (loaded automatically).

## Arguments

One of `-p`, `-o`, `-c`, `-t`, or `-f` must be supplied — it tells ADT which
objects to run tests for.

## Options

| Flag                          | Description                                             |
| ----------------------------- | ------------------------------------------------------- |
| `-p, --package <package>`     | Run tests on package.                                   |
| `-o, --object <uri>`          | Run tests on specific ADT object URI.                   |
| `-c, --class <name>`          | Run tests on ABAP class (e.g. `ZCL_MY_CLASS`).          |
| `-t, --transport <transport>` | Run tests on transport request (e.g. `NPLK900042`).     |
| `-f, --from-file <file>`      | Run tests on objects listed in file (one URI per line). |
| `--format <format>`           | Output format: `console`, `json`, `junit`, `sonar`.     |
| `--output <file>`             | Path to write the test report to (otherwise stdout).    |
| `--coverage`                  | Also request and write a coverage report.               |
| `--coverage-output <file>`    | Destination file for the coverage report.               |
| `--coverage-format <format>`  | Coverage format: `jacoco` \| `sonar-generic`.           |

## Examples

```bash
# Single class, human-readable output
adt aunit -c ZCL_DEMO_TEST

# Package-level run, JUnit XML into ./reports
adt aunit -p $ZDEMO --format junit --output reports/aunit.xml

# Class-level with JaCoCo coverage
adt aunit -c ZCL_DEMO_TEST \
    --coverage --coverage-format jacoco \
    --coverage-output reports/jacoco.xml

# Transport-level run, Sonar-generic coverage for SonarQube
adt aunit -t DEVK900001 \
    --format sonar --output reports/tests.xml \
    --coverage --coverage-format sonar-generic \
    --coverage-output reports/coverage.xml
```

## Exit codes

- `0` — all tests passed.
- `1` — at least one test failed (details in the chosen output format).

## See also

- `@abapify/adt-aunit` — plugin source
- MCP tool [`run_unit_tests`](/mcp/tools/run_unit_tests)
- [`check`](./check) — static syntax checks (faster, but not runtime)
