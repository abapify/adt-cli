## Why

Consumers discover the selected executable, walk dependency roots and load internal package registries to learn which formats/types are available. This couples orchestration to packaging layout and has caused runtime module-resolution failures. The installed CLI already knows what it supports — it just cannot say so.

## What Changes

- Define a versioned machine-readable capability/runtime contract: CLI and source identity (version, commit when available), supported formats and object types (from the loaded plugin registry), and diagnostic features (e.g. flow support flags).
- Expose it through the existing CLI surface (reusing the established version/info command plumbing where practical; no parallel metadata service and no new network calls).
- Add installed-artifact checks for all configured runtime modules and lazy dependencies: a capability answer reflects what the installed artifact can actually load, so a missing configured dependency produces a clear typed failure instead of a silent fallback to another runtime.
- Keep internal registry authentication, image selection and digest/provenance verification in the consumer/builder.

## Impact

- Affected specs: `adt-cli-runtime` (new capability)
- Affected code: `packages/adt-cli` (capability collector + command surface + typed failure path), tests and fixtures.
- Existing behavior of version/info commands remains compatible.
- Installed CLI must work from an unrelated working directory and via a PATH symlink; standalone/bundled layout and CLI/MCP parity are tested where applicable.
- Output and fixtures contain no private endpoints or credentials.
- GitLab canary integration only; production selectors, stable tags and mirror refs remain unchanged.
