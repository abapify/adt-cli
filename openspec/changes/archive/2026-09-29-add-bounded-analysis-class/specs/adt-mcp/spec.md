## ADDED Requirements

### Requirement: Bounded analysis is a separate operation class

The server SHALL classify every MCP tool that creates diagnostic analysis
state as `safe_execute`, independently of its HTTP method and independently
of repository mutation authority.

#### Scenario: Read credential requests ATC

- **WHEN** a credential contains only the `read` class
- **THEN** `atc_run` is absent from the destination-mode tool list and a direct
  call is denied before a destination lease or tool handler

#### Scenario: Explicit bounded-analysis credential requests ATC

- **WHEN** a trusted request access snapshot contains `safe_execute`
- **THEN** the scope catalogue permits `atc_run` subject to all other
  destination and resource checks

### Requirement: Unsupported signed policies fail closed

The server SHALL not dispatch a signed invocation that includes
`safe_execute` until it can enforce every policy field required for that
operation.

#### Scenario: Future-form safe-execution credential arrives early

- **WHEN** a valid signed credential contains `safe_execute` but no supported
  exact execution policy exists
- **THEN** the server exposes no MCP tools through that invocation
