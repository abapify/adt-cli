---
title: System
description: Users and security PSEs.
---

# `client.adt.system`

## Sub-namespaces

### `client.adt.system.users`

| Method | HTTP | Path | Summary |
|--------|------|------|---------|
| `.list()` | GET | `/sap/bc/adt/system/users` | List users |
| `.get(username)` | GET | `/sap/bc/adt/system/users/{username}` | Get user |

### `client.adt.system.security.pses`

PSE (Personal Security Environment) management:

| Method | HTTP | Path | Summary |
|--------|------|------|---------|
| `.list()` | GET | `/sap/bc/adt/system/security/pses` | List PSEs |
| `.get(...)` / `.getCert(...)` / `.getPin(...)` | GET | `/sap/bc/adt/system/security/pses/...` | Read PSE artefacts |
| `.create(...)` | POST | `/sap/bc/adt/system/security/pses` | Create |
| `.delete(...)` | DELETE | `/sap/bc/adt/system/security/pses/{name}` | Delete |

## Schema

Source: [`adt-contracts/src/adt/system/`](https://github.com/abapify/adt-cli/blob/main/packages/adt-contracts/src/adt/system)

## Example

```ts
const users = await client.adt.system.users.list();
const me = await client.adt.system.users.get('DEVELOPER');
```
