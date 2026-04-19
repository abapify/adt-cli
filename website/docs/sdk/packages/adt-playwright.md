---
title: '@abapify/adt-playwright'
description: Playwright-based browser SSO auth plugin.
---

# `@abapify/adt-playwright`

SSO authentication plugin using Playwright. Wraps
[`@abapify/browser-auth`](./browser-auth) with a Playwright adapter for
interactive SSO/IDP login flows.

## Install

```bash
bun add @abapify/adt-playwright
```

## Public API

```ts
export type {
  PlaywrightCredentials,
  PlaywrightAuthOptions,
  PlaywrightPluginOptions,
} from '@abapify/adt-playwright';
export type {
  BrowserCredentials,
  BrowserAuthOptions,
  CookieData,
} from '@abapify/adt-playwright';
```

## Dependencies

- `@abapify/adt-config`, `@abapify/browser-auth`, `playwright`

## See also

- [`adt-puppeteer`](./adt-puppeteer), [`browser-auth`](./browser-auth)
