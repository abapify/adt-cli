# CTS class owner canonicalization and checkout evidence

LIMU CLSD/CPUB/METH with ADT wbtypes CLAS/OC, CLAS/OSU, CLAS/OM must resolve
to the repository owner R3TR CLAS. Reuse existing immutable source discovery
and format materialization; do not concatenate method bodies or read mutable
active source to replace missing historical boundaries.

Preserve a resolution for every original CTS inventory identity even when
multiple leaves are deduplicated to one repository object. Expose these
resolutions, inventory, actual object descriptor paths, structured skips and
exact added-object absence at base in an optional checkout report. The
`--report <repository-relative-file>` flag forces inventory recomputation to
avoid trusting legacy incomplete exact-head indexes. Report schemaVersion 1
uses coverageVersion 1. Existing `--partial-report` payload stays unchanged.

The report contains identities, paths and diagnostic codes, never source
bodies, credentials or raw HTTP payloads. Format paths and hashes remain in
ordinary object descriptors. A consumer can require complete coverage or
persist explicit partial omissions before publishing any Git snapshot.

Validation: synthetic CTS leaves with real subtype strings, immutable version
responses, real abapGit class serialization at base/head, descriptor inventory,
CLI report fields, cached-index bypass, and existing flow regressions. No live
SAP, Git operations against remote providers, or release/promotion is needed.
