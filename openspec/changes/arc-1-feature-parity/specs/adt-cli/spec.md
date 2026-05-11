## ADDED Requirements

### Requirement: adt lint subcommand

The system SHALL expose `adt lint <file>` as a top-level Commander.js subcommand registered in the `adt` CLI command tree. The command SHALL also accept `--source <text>` to lint inline source without a file.

#### Scenario: adt lint is reachable from CLI root

- **WHEN** the user runs `adt lint --help`
- **THEN** usage information for the lint command is displayed

### Requirement: adt context subcommand

The system SHALL expose `adt context <objectName>` as a top-level Commander.js subcommand with `--type`, `--depth`, `--max-deps`, and `--json` options.

#### Scenario: adt context is reachable from CLI root

- **WHEN** the user runs `adt context --help`
- **THEN** usage information for the context command is displayed

### Requirement: adt diagnose subcommand group

The system SHALL expose `adt diagnose` as a top-level Commander.js subcommand group with child commands `dumps` and `traces`.

#### Scenario: adt diagnose dumps is reachable

- **WHEN** the user runs `adt diagnose dumps --help`
- **THEN** usage information for the dumps command is displayed

#### Scenario: adt diagnose traces is reachable

- **WHEN** the user runs `adt diagnose traces --help`
- **THEN** usage information for the traces command is displayed
