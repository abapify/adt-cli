# ADT Client Specification

**Version**: 2.0  
**Status**: Draft  
**Updated**: 2026-05-12

## Purpose

`@abapify/adt-client` is the contract-driven SAP ADT runtime used by CLI, MCP, and SDK packages.  
It provides a typed contract tree (`client.adt.*`), a generic low-level fetch path, and protocol-correct SAP security-session/CSRF handling.

High-level business workflows (object save orchestration, lock coordination, transport-aware write flows) belong to service packages such as `@abapify/adk`, not to the core client.

## Requirements

### Requirement: Contract-driven API surface

The client SHALL expose ADT operations through generated/declared typed contracts rather than a hand-maintained object-operation facade.

#### Scenario: Typed contract execution

- **WHEN** a consumer invokes `client.adt.<domain>.<endpoint>(...)`
- **THEN** request and response types are inferred from the contract schema and parsed by the configured adapter.

### Requirement: Transport-safe low-level escape hatch

The client SHALL provide a generic request utility for unsupported or experimental endpoints.

#### Scenario: Raw endpoint call

- **WHEN** a consumer calls `client.fetch('/sap/bc/adt/...', options)`
- **THEN** the request is sent through the same adapter/session stack used by contract calls.

### Requirement: SAP security-session protocol

The client SHALL implement SAP's required security-session + CSRF handshake and keep lock operations bound to that session context.

#### Scenario: CSRF initialization

- **WHEN** a write-capable request needs CSRF/session state
- **THEN** the client performs create-session → fetch-token → delete-session bootstrap before regular `use` requests.

### Requirement: ETag lifecycle management

The client SHALL maintain an internal ETag cache for optimistic concurrency and expose a cache-reset API.

#### Scenario: Manual ETag reset after out-of-band writes

- **WHEN** object content was changed outside the current client instance
- **THEN** consumers can call `clearETag(url?)` to clear a single key or the full cache before the next write.

### Requirement: Reusable service layer hooks

The client SHALL be consumable by higher-level orchestration services without duplicating transport/session logic.

#### Scenario: Service orchestration

- **WHEN** ADK or CLI service logic performs composite operations
- **THEN** it reuses a single initialized `AdtClient` and does not re-implement HTTP/session internals.

## Architecture

- **Schemas**: `@abapify/adt-schemas`
- **Contracts**: `@abapify/adt-contracts`
- **Runtime adapter**: `@abapify/adt-client` adapter/session manager
- **Business orchestration**: `@abapify/adk` and package services

## Non-goals

- No hand-authored `getObject/updateObject/...` API as the primary public surface.
- No plugin/business-domain logic embedded in the client core.
- No alternate CSRF/session flow that bypasses the SAP protocol.
