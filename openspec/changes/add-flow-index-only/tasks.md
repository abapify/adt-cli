## 1. Flow service and descriptors

- [x] 1.1 Add a failing `adt-flow` service test for an inexact manifest indexed without source reads or source-file changes.
- [x] 1.2 Implement the explicit index-only service operation by reusing manifest, inventory, omission, and descriptor logic; verify the focused `adt-flow` test passes.
- [x] 1.3 Add a regression test that strict checkout still leaves the repository unchanged on the same inexact manifest; verify it passes.

## 2. Delivery adapters

- [x] 2.1 Add failing CLI command tests for index-only transport flow and its source-free structured output.
- [x] 2.2 Implement the CLI adapter as a thin delegation to the public flow service; verify CLI tests pass.
- [x] 2.3 Add MCP parity coverage for the same fixture and implement the matching tool delegation; verify the parity test passes.

## 3. Documentation and verification

- [x] 3.1 Document the index-only command and the distinction from strict and partial checkout; verify the README example is accurate.
- [x] 3.2 Run focused Nx test, typecheck, lint, build, format-check, OpenSpec strict validation, and `git diff --check`; record any unrelated baseline blocker.
