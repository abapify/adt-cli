## Decision

Expose pure `createFlowCheckoutReport` and `createFlowPartialReport` builders
from the package root. Use the same builders in the CLI writer. Storage path
validation and atomic writes remain in the adapter. A report records checkout
facts and must not infer complete source coverage from an empty skipped list.

The full builder keeps optional inventory fields absent when unavailable and
normalizes `indexedOnly` to a boolean. Both builders sort copied omission arrays
by object, component, diagnostic and source transport without mutating input.
No new CLI command is introduced; existing CLI/MCP checkout behavior is unchanged.
