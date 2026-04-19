---
title: Core HTTP
description: Sessions and system information endpoints.
---

# `client.adt.core.http`

Infrastructure endpoints: security session + CSRF handshake, and basic
system information.

## Sub-namespaces

### `client.adt.core.http.sessions`

| Method          | HTTP | Path                             | Summary                                      |
| --------------- | ---- | -------------------------------- | -------------------------------------------- |
| `.getSession()` | GET  | `/sap/bc/adt/core/http/sessions` | Create a security session & fetch CSRF token |

Request headers:

- `Accept: application/vnd.sap.adt.core.http.session.v3+xml`
- `x-csrf-token: Fetch`
- `X-sap-adt-sessiontype: stateful`
- `x-sap-security-session: create`

### `client.adt.core.http.systeminformation`

| Method   | HTTP | Path                                      | Summary                           |
| -------- | ---- | ----------------------------------------- | --------------------------------- |
| `.get()` | GET  | `/sap/bc/adt/core/http/systeminformation` | SID, client, release, language, … |

## Schemas

Source: [`adt-contracts/src/adt/core/http/`](https://github.com/abapify/adt-cli/blob/main/packages/adt-contracts/src/adt/core/http)
Response schema: `http` (adt-schemas) for sessions; typed JSON payload for
systeminformation.

## Example

```ts
const session = await client.adt.core.http.sessions.getSession();
const info = await client.adt.core.http.systeminformation.get();
```

:::info Session lifecycle
The `adt-client` adapter drives the 3-step Eclipse session flow automatically
(create → fetch CSRF → delete). You rarely need to call `getSession` yourself.
:::

## See also

- Package internals: [`adt-client/AGENTS.md`](https://github.com/abapify/adt-cli/blob/main/packages/adt-client/AGENTS.md)
