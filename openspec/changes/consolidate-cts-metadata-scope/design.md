## Decision

Add a pure module in `packages/adt-services` (sibling of the existing `CtsTransportMetadataService`) that consumes `CtsTransportMetadataResult` and caller-supplied raw CTS inventory facts. Two public builders:

- `normalizeCtsTransportUnits(result)` — generic request/task normalization. A request without tasks stays a task-less request; missing optional metadata stays absent (never invented); object functions, release timestamps and owner resolution are preserved as recorded; unsupported entries are retained and counted, never silently discarded.
- `planCtsScope(requests)` — ordered multi-root scope planning. Deterministic ordering by requested order then transport number; duplicate identities (same transport requested twice, or a task whose parent is also requested) are deduplicated to a single identity with provenance preserved; mixed systems are reported per system, never merged across systems.

Both are pure: no Git, no file system, no network. The ADT client keeps protocol decoding; consumers keep naming, ticket extraction, eligibility policy and CI serialization.

Ordering normalizes case-insensitively on transport numbers (CTS numbers are case-insensitive identifiers) and does not mutate caller inputs. An empty requested list yields an empty plan, not an invented root.

## Risks / Trade-offs

- Keeping raw inventory inside the SDK could drift from consumer policies; mitigated by exposing facts only (no eligibility decisions).
- Multi-root planning across mixed systems is intentionally per-system; cross-system ordering stays the caller's decision.
