## Why

Consumers reconstruct checkout completeness assessment themselves: the SDK
exposes report builders (first increment) but not a validated assessment that
binds a persisted report to descriptor ownership and caller-verified file
evidence. Historical task checkout and current parent export have different
diagnostic shapes, so the classification is maintained more than once.

## What Changes

Add a pure, validated assessment contract in `adt-flow` that binds a
`FlowCheckoutReport`-shaped payload to object descriptors and caller-supplied
file evidence:

- Schema-validate the report payload; missing or unsupported reports resolve
  to an explicit `unknown` assessment, never to `complete`.
- Validate inventory-to-owner mapping: resolved inventory entries must map to
  a descriptor identity or carry a typed omission.
- Verify source exactness: every descriptor owned file needs caller evidence
  (hash match = acquired, verified absence = deleted, missing evidence =
  unverified, mismatch = typed divergence omission).
- Classify `complete` / `partial` from typed omissions only; report-storage
  failure stays the caller's boundary (documented).

No checkout behavior, storage layout, command surface, provider integration
or dependency changes. This is the second increment of snapshot diagnostics.

## Impact

Only `adt-flow` (new assessment module, index export, README, website SDK
page) and its tests change. Consumers keep their presentation and Git/MR
orchestration; CLI/MCP parity is retained because no command surface changes.
