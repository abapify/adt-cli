---
title: '@abapify/browser-auth'
description: Browser SSO core shared by Playwright/Puppeteer adapters.
---

# `@abapify/browser-auth`

Protocol-agnostic browser SSO core. Opens a browser, waits for cookies
matching configured patterns, converts them to a `Cookie` header for reuse.
Adapters: [`adt-playwright`](./adt-playwright),
[`adt-puppeteer`](./adt-puppeteer).

## Install

```bash
bun add @abapify/browser-auth
```

## Public API

```ts
export {
  authenticate,
  testCredentials,
  toCookieHeader,
  toHeaders,
} from '@abapify/browser-auth';
export type { AuthenticateOptions } from '@abapify/browser-auth';

export type {
  CookieData,
  BrowserCredentials,
  BrowserAuthOptions,
  BrowserAdapter,
  ResponseEvent,
  TestResult,
} from '@abapify/browser-auth';

export {
  matchesCookiePattern,
  cookieMatchesAny,
  resolveUserDataDir,
} from '@abapify/browser-auth';
```

## Dependencies

- Consumed by [`adt-playwright`](./adt-playwright) and
  [`adt-puppeteer`](./adt-puppeteer).
