# ADT Server Readiness

## Purpose

Keep process liveness separate from deployment-owned dependency readiness. A
listening server must not claim that its configured credential broker is usable
without checking it. This is additive to the shared ADT server contract and does
not change SAP session handling or introduce SAP boot probes.

## Requirements

### Requirement: Optional bounded readiness probe

The server SHALL accept an optional asynchronous readiness probe receiving an
AbortSignal. A configured probe SHALL complete within a finite positive timeout
(2 seconds by default), and the server SHALL abort the probe at that deadline.

#### Scenario: Probe succeeds

- **GIVEN** a readiness probe is configured
- **WHEN** it completes successfully before the deadline
- **THEN** `GET /readyz` returns HTTP 200 and `{ "status": "ready" }`.

#### Scenario: Probe fails or exceeds its deadline

- **GIVEN** a configured probe rejects or does not settle before its deadline
- **WHEN** a caller requests readiness
- **THEN** the server returns HTTP 503 with a generic non-ready response and no
  exception, credential, destination, or upstream-response details.

#### Scenario: Existing caller does not configure a probe

- **GIVEN** no readiness probe is configured
- **WHEN** a caller requests readiness
- **THEN** the existing HTTP 200 readiness behavior is preserved.

### Requirement: Read-only broker readiness adapter

The package SHALL export a broker readiness adapter using the existing broker
token-file credential and authenticated destination-summary operation. The
adapter SHALL propagate cancellation, reject non-success or malformed summary
responses, and accept a valid empty destination list. It SHALL NOT create a SAP
client, acquire a destination lease, disclose summaries in the readiness response,
or contact SAP systems.

### Requirement: Liveness remains independent

- **GIVEN** the configured broker or readiness probe is unavailable
- **WHEN** a caller requests `GET /healthz`
- **THEN** the process still responds with HTTP 200 while readiness remains
  independently non-ready.

## Compatibility and rollback

No package version, dependency, REST authorization rule, or existing operation is
changed. Consumers opt in to the new readiness adapter; deployments requiring
broker-aware readiness must require that exported capability rather than silently
passing an ignored option to an older package. Rollback must preserve each
deployment's readiness requirement instead of treating process liveness as proof
of broker availability.
