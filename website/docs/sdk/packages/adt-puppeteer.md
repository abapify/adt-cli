---
title: '@abapify/adt-puppeteer'
description: Puppeteer-based browser SSO auth plugin.
---

# `@abapify/adt-puppeteer`

SSO authentication plugin using Puppeteer. Wraps
[`@abapify/browser-auth`](./browser-auth) with a Puppeteer adapter.

## Install

```bash
bun add @abapify/adt-puppeteer
```

## Public API

```ts
export type {
  PuppeteerCredentials,
  PuppeteerAuthOptions,
  PuppeteerPluginOptions,
} from '@abapify/adt-puppeteer';
export type {
  BrowserCredentials,
  BrowserAuthOptions,
  CookieData,
} from '@abapify/adt-puppeteer';
```

## Dependencies

- `@abapify/adt-config`, `@abapify/browser-auth`, `puppeteer`

## See also

- [`adt-playwright`](./adt-playwright), [`browser-auth`](./browser-auth)
