# ADT Server Readiness

## Purpose

Keep process liveness separate from deployment-owned dependency readiness. A
listening server must not claim that its configured credential broker is usable
without checking it. This is additive to the shared ADT server contract and does
not change SAP session handling or introduce SAP boot probes.

## Requirements

### Requirement: Optional bounded readiness probe

The server SHALL accept an optional asynchronous readiness probe receiving an
AbortSignal. The server SHALL enforce a finite positive timeout no greater than
2147483647 milliseconds (2 seconds by default), returning non-ready and aborting
the signal at that deadline even if a custom probe does not settle. Invalid
deadlines SHALL be rejected before allocating MCP or registry handlers.

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

#### Scenario: Concurrent readiness requests

- **GIVEN** a probe is still pending
- **WHEN** multiple callers request readiness
- **THEN** they share one bounded probe; disconnecting one caller does not cancel
  it for others, and the next request after settlement starts a fresh check.

#### Scenario: Safe deployment-owned failure reporting

- **GIVEN** a deployment configures an optional failure reporter
- **WHEN** a shared probe fails or reaches its deadline
- **THEN** the reporter receives only `probe_failed` or `timeout`, once per probe,
  without error text, credentials, URLs or response bodies; reporter failures do
  not affect HTTP 503. The CLI writes only a structured event name and reason to
  stderr, while library callers control their own diagnostics.

### Requirement: Read-only broker readiness adapter

The package SHALL export a broker readiness adapter using the existing broker
token-file credential and authenticated destination-summary operation. The
adapter SHALL propagate cancellation through token-file reads and the broker
request, reject non-success or malformed summary responses using the strict REST
destination-summary contract, and accept a valid empty destination list. It SHALL NOT create a SAP
client, acquire a destination lease, disclose summaries in the readiness response,
or contact SAP systems.

#### Scenario: Broker returns an invalid summary

- **GIVEN** an authenticated broker returns malformed data or a summary violating
  the REST contract, including unknown fields or nonpositive versions
- **WHEN** readiness is requested
- **THEN** readiness fails without acquiring a lease or disclosing the payload.

#### Scenario: Broker returns a non-success response

- **GIVEN** the broker returns an HTTP failure with an otherwise valid summary
- **WHEN** readiness is requested
- **THEN** readiness fails regardless of the summary body.

#### Scenario: Broker returns a valid empty summary

- **GIVEN** the broker returns HTTP 200 with `{ "data": [] }`
- **WHEN** readiness is requested
- **THEN** the authenticated read-only summary request succeeds without leases.

### Requirement: Liveness remains independent

The server SHALL keep `GET /healthz` independent of broker and readiness probe
availability.

#### Scenario: Broker or probe is unavailable

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
