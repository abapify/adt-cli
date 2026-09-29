# Design: Code Review checks as non-mutating analysis

## Decision

`atc_run` and `run_unit_tests` belong to the ordinary `read` catalogue because
they inspect or execute existing ABAP code and return findings, test results,
and coverage without changing repository objects, transport contents,
configuration, or approval state.

The SAP implementation creates ephemeral ATC/AUnit execution state. That
implementation detail is not a business mutation and does not justify
interrupting every Code Review with a user approval.

Existing object-bound `safe_execute` credentials remain valid for workflows
that require stricter resource and replay limits. This is an optional narrowing
of authority, not a prerequisite for ATC.

## Boundaries

- The authenticated credential still binds the Destination.
- MCP response and transport limits remain enforced.
- All repository, CTS, lock, activation, configuration, and write operations
  remain excluded from read authority.
