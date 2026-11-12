## Decision

Validate the descriptor through its existing schema. Compare its owned paths
against explicit current hashes, treating missing evidence as unknown and an
explicit null as an absent file. Only assess a stale descriptor as explained
when every owned file matches its recorded hash in the caller-proven previous
tree. Return owned paths whose bytes changed; never alter descriptors or hashes.

The caller proves accepted merge ancestry/tree and clean managed source before
collecting hashes, archives original descriptor bytes, rechecks evidence for
concurrent changes, then decides whether to retire the derived index. This
helper is not authorization to delete files and does not prove historical SAP
source exactness. It introduces no CLI command or MCP surface.
