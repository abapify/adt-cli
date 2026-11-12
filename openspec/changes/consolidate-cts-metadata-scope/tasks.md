## Implementation

- [x] Add behavioral regressions for generic request/task normalization (task-less requests, missing metadata, unsupported omissions, parent identity).
- [x] Add behavioral regressions for ordered multi-root scope planning (duplicate identities, task-under-requested-parent, mixed systems, case/duplicate order independence, empty list).
- [x] Implement the pure normalization and scope-planning module; export from the package root.
- [x] Scalar and multi-root fixtures: released task-less requests, missing metadata, mixed systems, duplicate identities, deterministic order; namespaced/padded class components deduplicate to owners with provenance.
- [ ] Run package tests, build, typecheck, lint and formatting; record limitations.
