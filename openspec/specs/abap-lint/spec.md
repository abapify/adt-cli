# abap-lint Specification

## Purpose

Offline ABAP linting via `@abaplint/core` for the `adt lint` CLI command and `lint_abap` MCP tool — presets, rule inspection, auto-fixes, and an opt-in pre-write gate.

## Requirements

### Requirement: Lint ABAP source locally

The system SHALL lint ABAP source code offline using `@abaplint/core` without requiring a live SAP connection, returning structured diagnostics (line, column, severity, message, rule name).

#### Scenario: Lint clean source returns no issues

- **WHEN** the user provides syntactically valid ABAP source with no rule violations
- **THEN** the tool returns an empty issues list and a success status

#### Scenario: Lint source with violations returns diagnostics

- **WHEN** the user provides ABAP source that violates abaplint rules (e.g. mixed-case keywords)
- **THEN** the tool returns one diagnostic entry per violation with line, column, severity (`error` | `warning` | `info`), message text, and rule name

#### Scenario: Lint and fix returns corrected source

- **WHEN** the user calls lint with `action: "lint_and_fix"` on source with auto-fixable issues
- **THEN** the tool returns the corrected source code and any remaining non-fixable issues

#### Scenario: List rules returns rule catalog

- **WHEN** the user calls lint with `action: "list_rules"`
- **THEN** the tool returns a list of all available abaplint rule names with their enabled/disabled status and current configuration

### Requirement: Explicit preset selection

The system SHALL let the caller select the rule preset explicitly — CLI `--preset <btp|onpremise>` flag or MCP `systemType` parameter — defaulting to `onpremise`. Automatic detection from the SAP system info endpoint is not implemented; callers targeting a BTP ABAP Environment must pass the `btp` preset explicitly.

#### Scenario: BTP preset uses cloud rules

- **WHEN** the caller passes `--preset btp` (or `systemType: "btp"`)
- **THEN** the linter enables `cloud_types` and `strict_sql` at Error severity

#### Scenario: Default preset is on-premise

- **WHEN** no preset is provided
- **THEN** the `cloud_types` rule is disabled (on-premise ruleset)

### Requirement: Custom abaplint config override

The system SHALL accept an optional path to a custom `abaplint.jsonc` configuration file (CLI `--config` flag) or an inline rule-override object (MCP tool parameter) that takes precedence over the selected preset.

#### Scenario: Custom config overrides preset

- **WHEN** the user provides a custom abaplint.jsonc config
- **THEN** that config's rules are applied instead of the selected preset

### Requirement: Pre-write lint gate in update_source

The system SHALL provide an opt-in lint gate for `update_source` / `adt source write`. When enabled (`lintBeforeWrite: true` / `--lint-before-write`), diagnostics with keys `parser_error`, `cloud_types`, or `strict_sql` SHALL block the write and report the blocking diagnostics without modifying SAP (`strict_sql` violations block only when the BTP preset enables the rule).

#### Scenario: Gate blocks write on parser error

- **WHEN** `lintBeforeWrite` is enabled and the source has ABAP parser errors
- **THEN** the write is rejected with `isError: true` and the blocking diagnostics are reported (formatted as `rule: message` text; a structured diagnostics payload is tracked as follow-up work)

#### Scenario: Gate allows write when source is clean

- **WHEN** `lintBeforeWrite` is enabled and the source passes lint
- **THEN** the write proceeds normally

#### Scenario: Gate is disabled by default

- **WHEN** no `lintBeforeWrite` flag is set
- **THEN** `update_source` writes without running lint

### Requirement: CLI lint command

The system SHALL expose `adt lint <file>` (or `adt lint --source <text>`) that reads source from a file path or an inline `--source` argument and prints diagnostics to stdout in human-readable or `--json` format. Reading from standard input is not supported.

#### Scenario: Lint a file and print diagnostics

- **WHEN** the user runs `adt lint path/to/myclass.abap`
- **THEN** diagnostics are printed to stdout with file, line, column, severity, and message

#### Scenario: Lint exits non-zero on errors

- **WHEN** linting finds at least one error-severity issue
- **THEN** the CLI exits with a non-zero exit code
