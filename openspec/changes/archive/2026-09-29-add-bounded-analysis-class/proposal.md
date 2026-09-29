# Add an explicit bounded-analysis operation class

## Why

Some SAP diagnostic operations create temporary server-side analysis state.
Treating them as ordinary reads makes a signed read grant broader than its
meaning.

## What changes

- Add `safe_execute` as an MCP operation class.
- Reclassify `atc_run` from `read` to `safe_execute`.
- Parse the new class in signed invocation claims, while keeping it
  non-dispatchable until a later change defines an exact, enforceable policy.

## Non-goals

- This change adds no issuer-specific policy, agent identity, or execution
  workflow.
- This change does not enable a diagnostic run through signed HTTP invocation.
- This change does not alter ABAP repository write permissions.

## Validation

- Scope tests prove a read grant cannot call `atc_run`.
- Scope tests prove only `safe_execute` can dispatch `atc_run`.
- Invocation tests prove an unimplemented `safe_execute` policy remains
  fail-closed.
