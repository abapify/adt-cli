---
title: AUnit with coverage
sidebar_position: 6
description: Run ABAP unit tests, emit JaCoCo / Sonar-generic reports, and wire them into SonarQube.
---

# AUnit with coverage

## Goal

Run ABAP unit tests for a class, package, or transport; emit JUnit and
coverage reports in formats SonarQube / CI systems understand; and fail the
build on regressions.

## Prerequisites

- [adt-cli installed and authenticated](/getting-started/installation)
- AUnit-enabled objects (classes with `FOR TESTING` methods)
- SonarQube (optional, for end-to-end)

## Steps

### 1. Run locally against a single class

```bash
adt aunit -c ZCL_DEMO_TEST
```

Human-readable output:

```
ZCL_DEMO_TEST
  should_greet_user ................................ PASS (0.04s)
  should_handle_empty .............................. PASS (0.02s)
  should_reject_numeric ............................ FAIL (0.03s)
    Expected 'invalid' but got 'INVALID'

3 tests — 2 passed, 1 failed — 0.09s
```

Exit code: `0` if all pass, `1` otherwise.

### 2. Emit JUnit XML for CI

```bash
mkdir -p reports
adt aunit -c ZCL_DEMO_TEST --format junit --output reports/aunit.xml
```

Any CI system (GitHub Actions, GitLab, Jenkins) can ingest this via its
standard JUnit reporter.

### 3. Emit coverage — JaCoCo

JaCoCo is the de-facto standard for Java/Sonar integration. SAP's coverage
service speaks it natively:

```bash
adt aunit -c ZCL_DEMO_TEST \
  --format junit --output reports/aunit.xml \
  --coverage --coverage-format jacoco \
  --coverage-output reports/jacoco.xml
```

### 4. Emit coverage — Sonar generic

If your Sonar server doesn't have the JaCoCo plugin or you use a lean
"generic coverage" setup:

```bash
adt aunit -t DEVK900001 \
  --format sonar --output reports/tests.xml \
  --coverage --coverage-format sonar-generic \
  --coverage-output reports/coverage.xml
```

### 5. Wire into SonarQube

```properties
# sonar-project.properties
sonar.projectKey=zmypkg
sonar.sources=src
sonar.sourceEncoding=UTF-8

# Tests
sonar.tests=src
sonar.test.inclusions=**/*.testclasses.abap
sonar.testExecutionReportPaths=reports/tests.xml

# Coverage (pick ONE — don't mix)
sonar.coverageReportPaths=reports/coverage.xml          # sonar-generic
# sonar.coverage.jacoco.xmlReportPaths=reports/jacoco.xml  # jacoco
```

Then:

```bash
sonar-scanner
```

### 6. Scope selection cheatsheet

| What you want to test       | Flag                                      |
| --------------------------- | ----------------------------------------- |
| One class                   | `-c ZCL_DEMO_TEST`                        |
| Whole package               | `-p $ZDEMO`                               |
| Every object in a transport | `-t DEVK900001`                           |
| Explicit URI                | `-o /sap/bc/adt/oo/classes/zcl_demo_test` |
| Files from a list           | `-f uris.txt` (one URI per line)          |

### 7. Gate a pull request

```yaml
# .github/workflows/test-on-sap.yml excerpt
- name: Run AUnit
  run: |
    adt aunit -t "$TR" \
      --format junit --output reports/aunit.xml \
      --coverage --coverage-format jacoco --coverage-output reports/jacoco.xml
- name: Publish JUnit
  if: always()
  uses: mikepenz/action-junit-report@v4
  with:
    report_paths: reports/aunit.xml
```

See [CI pipeline integration](./ci-pipeline) for the full workflow including
auth caching.

## Troubleshooting

| Error                                             | Cause                               | Fix                                                                                                                        |
| ------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `No test classes in scope`                        | Class has no `FOR TESTING` methods  | Confirm `CLASS ... DEFINITION FOR TESTING` on the test class                                                               |
| `Coverage requested but backend reports disabled` | ABAP coverage not enabled on system | Ask basis to enable `/SAP/ABAP_UNIT_COVERAGE` service and SCOV config                                                      |
| `Timeout after 120s`                              | Big transport scope                 | Narrow scope to a package: `-p $ZDEMO`                                                                                     |
| JaCoCo report empty                               | Tests didn't actually execute       | Check exit code — if AUnit itself failed, there's nothing to cover                                                         |
| Sonar shows 0% coverage                           | Wrong `sonar.coverage*` property    | `sonar-generic` uses `sonar.coverageReportPaths`, JaCoCo uses `sonar.coverage.jacoco.xmlReportPaths` — not interchangeable |

## See also

- [`adt aunit` reference](/cli/aunit)
- [`adt check`](/cli/check) — faster static syntax checks
- [CI pipeline integration](./ci-pipeline)
- [MCP `run_unit_tests`](/mcp/tools/activate_object) — see MCP tool catalog
