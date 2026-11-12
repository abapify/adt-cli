## Decision

Add a capability collector in `packages/adt-cli` that reads the _loaded_ plugin registry and the installed package identity, and renders one machine-readable report through the existing command plumbing. Assessment resolves configured runtime modules and lazy dependencies from the installed artifact (module-resolution probes, no registry/network access). A missing module is a typed failure that names the module — never a fallback to another runtime.

Bundled/standalone and node_modules layouts both satisfy the probes; tests cover an unrelated working directory and a PATH symlink.

## Risks / Trade-offs

- The report describes the loaded registry, so config-driven plugin sets appear only when their config resolves; this is intentional (the report describes what this invocation can do).
- Probing lazy imports at report time adds a small startup cost, bounded to the configured module list.
