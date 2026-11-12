## ADDED Requirements

### Requirement: The installed CLI exposes a versioned capability contract

The CLI SHALL provide a machine-readable capability report describing the
installed artifact: CLI identity (version, source identity when available),
supported formats and object types, and diagnostic features.

#### Scenario: Capability report is self-describing

- **WHEN** the installed CLI is asked for its capabilities
- **THEN** the report carries a schema version and the CLI identity without
  walking dependency roots or loading internal package registries

#### Scenario: Report reflects the loaded registry

- **WHEN** plugins are configured and loadable
- **THEN** the supported formats and object types match the registry state

### Requirement: Installed-artifact checks cover configured runtime modules

Capability assessment SHALL verify that every configured runtime module and
lazy dependency can be resolved from the installed artifact, and SHALL NOT
fall back to another runtime when one is missing.

#### Scenario: Works from an unrelated working directory

- **WHEN** the installed CLI runs from a directory that contains no
  workspace, repository or config artifacts
- **THEN** the capability report is produced without module-resolution
  failures

#### Scenario: Works through a PATH symlink

- **WHEN** the CLI is invoked through a symlink placed on PATH
- **THEN** capability assessment resolves the installed artifact correctly

#### Scenario: Missing configured dependency fails with a typed error

- **WHEN** a configured runtime module or lazy dependency is missing from
  the installed artifact
- **THEN** capability assessment reports it as a typed failure naming the
  module
- **AND** no other runtime is used as a fallback

### Requirement: Output and fixtures stay public

Capability output, tests and fixtures SHALL NOT contain private endpoints,
registry credentials or provenance details.

#### Scenario: No private material in output

- **WHEN** the capability report and its fixtures are rendered
- **THEN** they contain no private endpoints or credentials

#### Scenario: Registry secrets remain consumer concerns

- **WHEN** capability assessment runs
- **THEN** internal registry authentication, image selection and
  digest/provenance verification remain consumer/builder responsibilities
