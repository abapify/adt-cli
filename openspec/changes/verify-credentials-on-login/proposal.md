# Verify credentials before reporting login success

## Why

Issue #289: `adt auth login` with basic auth reports
"✅ Successfully logged in!" without ever contacting SAP — the basic
plugin only packages credentials. Users then get `HTTP 401` on their
first real command (`adt info`) and reasonably conclude the client is
broken (it is not; the header is sent correctly — verified against the
published npm packages). The false success message hides the real
failure: wrong password, SNC-only system, expired account, or a proxy
stripping `Authorization`.

## What changes

- `adt auth login` performs a credential verification against
  `/sap/bc/adt/core/http/sessions` (with `sap-client`) before persisting
  the session for basic-auth logins (manual flow and destination-config
  flow).
- Verification failure aborts the login: no session is saved, the error
  message names the HTTP status and points at likely causes.
- `--skip-verify` flag allows offline / unreachable-system logins with
  the previous behaviour.

## Impact

- Affected capability: `adt-cli` (auth login behaviour).
- No changes to `adt-auth` plugins, `AuthManager`, or `adt-client`
  request/auth header logic.
- Login now performs one extra HTTP round-trip for basic auth only.
