# Keep Code Review checks as bounded analysis

## Why

ATC, AUnit, and code coverage create execution state on the SAP system, so
they stay outside ordinary read authority. An earlier attempt to reclassify
them as `read` was reverted during PR #173 review after a security finding
that ordinary read credentials could then invoke SAP analysis execution.

## What changes

- Keep `atc_run` and `run_unit_tests` (with or without coverage) classified
  as `safe_execute` operations.
- Retain support for object-bound `safe_execute` credentials when a
  workflow elects to use them.
- Keep repository mutations and analysis execution outside ordinary read
  authority.

## Impact

Delegated read assistants cannot run ATC, AUnit, or coverage; those
operations require `safe_execute` authority. Scoped credentials bind that
authority to exact object keys and deployment-owned execution policies.
Destination binding, authentication, response bounds, and execution limits
remain server-enforced.
