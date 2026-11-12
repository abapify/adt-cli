## Why

The versioned checkout report is assembled inside the CLI adapter. Library
consumers cannot produce the same report without duplicating its contract.

## What Changes

Extract public typed builders for the existing full and partial report shapes.
Keep schema version, omission ordering, CLI storage and failure behavior intact.
This is the first increment of snapshot diagnostics, not completeness assessment.

## Impact

Only `adt-flow` and its report tests change. No command, filesystem policy,
checkout selection, provider integration or dependency is added.
