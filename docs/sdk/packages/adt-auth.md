---
title: '@abapify/adt-auth'
description: Authentication manager, session storage, and auth plugins.
---

# `@abapify/adt-auth`

Authentication for SAP ADT: plugin-based credential acquisition plus file-backed
session storage. Built-in plugins: `basic` (username/password), `service-key`
(BTP service key / UAA). Browser-SSO plugins live in
[`adt-playwright`](./adt-playwright) and [`adt-puppeteer`](./adt-puppeteer).

:::note
`AuthManager` is **generic** — it only knows about the standard
`AuthPluginResult` contract. Plugins MUST have a default export implementing
`AuthPlugin`. See the package `AGENTS.md` for the contract details.
:::

## Install

```bash
bun add @abapify/adt-auth
```

## Public API

```ts
// Main
export { AuthManager, type Destination } from '@abapify/adt-auth';

// Storage
export { FileStorage } from '@abapify/adt-auth';

// Built-in plugins
export { default as basicAuthPlugin } from '@abapify/adt-auth/plugins/basic';
export { default as serviceKeyAuthPlugin } from '@abapify/adt-auth/plugins/service-key';

// Utilities
export { resolveServiceKeyFromEnv, readServiceKey } from '@abapify/adt-auth';

// Types
export type {
  AuthMethod, AuthConfig, AuthSession,
  BasicCredentials, CookieCredentials, Credentials,
  AuthPlugin, AuthPluginOptions, AuthPluginResult,
  CookieAuthResult, BasicAuthResult, ConnectionTestResult,
  BTPServiceKey, UAACredentials, ServiceKeyPluginOptions,
} from '@abapify/adt-auth';
```

## Usage

```ts
import { AuthManager } from '@abapify/adt-auth';

const auth = new AuthManager();
const session = await auth.login('my-sid', {
  plugin: '@abapify/adt-auth/plugins/basic',
  options: { url: 'https://sap.example.com', username: 'u', password: 'p' },
});
```

## Dependencies

- `@abapify/logger`, `proxy-agent`
- Consumed by: [`adt-cli`](./adt-cli), [`adt-config`](./adt-config),
  [`adt-playwright`](./adt-playwright), [`adt-puppeteer`](./adt-puppeteer).

## See also

- Package internals: [`packages/adt-auth/AGENTS.md`](https://github.com/abapify/adt-cli/blob/main/packages/adt-auth/AGENTS.md)
- [`browser-auth`](./browser-auth) — shared browser-SSO core
