# ADT CLI Specification

## ADDED Requirements

### Requirement: Login verifies basic-auth credentials against SAP

The `adt auth login` command MUST verify basic-auth credentials by
calling the SAP ADT sessions endpoint (`/sap/bc/adt/core/http/sessions`,
including `sap-client` when configured) before persisting the session
and reporting success.

#### Scenario: Valid credentials are stored and reported

- **WHEN** the sessions endpoint returns HTTP 200 for the supplied
  username/password/client
- **THEN** the session is persisted and the command reports successful
  login

#### Scenario: SAP rejects the credentials

- **WHEN** the sessions endpoint returns HTTP 401
- **THEN** the command fails with an error naming HTTP 401 and likely
  causes (wrong password, SNC-only system, locked/expired account)
- **AND** no session is persisted for the attempted SID

#### Scenario: System unreachable during login

- **WHEN** the verification request fails with a network or non-401 HTTP
  error
- **THEN** the command fails with an error including the underlying
  cause
- **AND** no session is persisted for the attempted SID

#### Scenario: Verification explicitly skipped

- **WHEN** login runs with `--skip-verify`
- **THEN** the command stores the session without contacting SAP and
  reports that credentials were not verified

### Requirement: Cookie-auth logins are not re-verified

Basic-auth verification MUST apply only to basic-auth logins. Cookie /
SSO plugin logins (which already authenticate interactively against the
system) and service-key logins keep their existing behaviour.

#### Scenario: Browser SSO login unchanged

- **WHEN** login uses a cookie-based auth plugin
- **THEN** no extra verification request is performed
