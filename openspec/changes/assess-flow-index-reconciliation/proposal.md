## Why

Consumers interpret SDK object descriptors to decide whether an accepted source
merge has made their file hashes stale. This duplicates descriptor semantics.

## What Changes

Add a pure public assessment of one descriptor against supplied previous and
current file hashes. Git merge proof, clean-tree validation, symlink checks,
archival and any mutation remain caller responsibilities. Preserve the existing
flow design: the package does not invoke Git or manage branches or commits.

## Impact

Additive library API only. Normal checkout is unchanged and remains strict.
