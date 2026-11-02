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

## Features

- 🔐 **SSO/IDP Support** - Works with Okta, Azure AD, and other identity providers
- 💾 **Session Persistence** - Reuse Okta tokens across runs
- 🎭 **Playwright-powered** - Modern, reliable browser automation
- ⚡ **Fast** - Skip login when session is still valid
- 🔄 **AuthManager Integration** - Works seamlessly with ADT CLI

## Quick Start

```typescript
// adt.config.ts
import { defineConfig } from '@abapify/adt-config';
import { withPlaywright } from '@abapify/adt-playwright';

export default withPlaywright(
  defineConfig({
    destinations: {
      DEV: 'https://sap-dev.example.com',
      PROD: 'https://sap-prod.example.com',
    },
  }),
  {
    userDataDir: true, // Enable session persistence
    headless: false, // Show browser window for SSO
    ignoreHTTPSErrors: true, // Ignore self-signed certificates
    requiredCookies: ['SAP_SESSIONID_*', 'sap-usercontext'],
  },
);
```

## Direct API Usage

```typescript
import { playwrightAuth, toCookieHeader } from '@abapify/adt-playwright';

// Authenticate - opens browser for SSO login
const credentials = await playwrightAuth.authenticate({
  url: 'https://sap-system.example.com',
  userDataDir: true,
  headless: false,
  requiredCookies: ['SAP_SESSIONID_*', 'sap-usercontext'],
});

// Convert to Cookie header for HTTP requests
const cookieHeader = toCookieHeader(credentials);

// Test if session is still valid
const result = await playwrightAuth.test(credentials);
console.log(result.valid); // true/false
```

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    Authentication Flow                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Launch Browser ──► 2. Navigate to SAP ──► 3. SSO Redirect  │
│         │                                           │           │
│         ▼                                           ▼           │
│  [Persistent Profile]                    [User completes login] │
│         │                                           │           │
│         ▼                                           ▼           │
│  4. Check Session ◄─────────────────────── 5. Capture Cookies  │
│         │                                           │           │
│         ▼                                           ▼           │
│  [Valid? Skip login]                      [Return credentials]  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

1. **Launch Browser** - Opens Chromium with optional persistent profile
2. **Navigate to SAP** - Goes to ADT discovery endpoint
3. **SSO Redirect** - Browser redirects to Okta/IDP
4. **User Login** - User completes 2FA/SSO in browser
5. **Capture Cookies** - Waits for required cookies, extracts session

## Options

```typescript
interface PlaywrightAuthOptions {
  /** SAP system URL (required) */
  url: string;

  /** Hide browser window (default: false) */
  headless?: boolean;

  /** Login timeout in ms (default: 300000 = 5 minutes) */
  timeout?: number;

  /** Custom user agent */
  userAgent?: string;

  /**
   * Cookie patterns to wait for before completing auth.
   * Supports wildcards: 'SAP_SESSIONID_*'
   * @example ['SAP_SESSIONID_*', 'sap-usercontext']
   */
  requiredCookies?: string[];

  /**
   * Session persistence directory.
   * - true: Use default (~/.adt/browser-profile)
   * - string: Custom path
   * - false/undefined: No persistence
   */
  userDataDir?: string | boolean;

  /** Ignore HTTPS errors (default: true) */
  ignoreHTTPSErrors?: boolean;
}
```

## Session Persistence

Enable `userDataDir` to persist browser state across runs:

```typescript
// Use default profile directory (~/.adt/browser-profile)
{
  userDataDir: true;
}

// Use custom directory
{
  userDataDir: '/path/to/profile';
}

// No persistence (fresh session each time)
{
  userDataDir: false;
}
```

### Benefits

- **Skip repeated logins** - Okta tokens persist across runs
- **Faster authentication** - Only refresh SAP cookies when needed
- **Better UX** - Same experience as using a regular browser

### How It Works

1. **First run**: User completes full SSO login → profile saved
2. **Subsequent runs**:
   - ✅ **Okta valid**: Auto-authenticates, extracts SAP cookies
   - ❌ **Okta expired**: Prompts for re-login

### Clearing Sessions

```bash
# Remove default profile
rm -rf ~/.adt/browser-profile

# Or remove custom profile
rm -rf /path/to/custom/profile
```

## Configuration Patterns

### Pattern 1: All Destinations with Playwright

```typescript
import { defineConfig } from '@abapify/adt-config';
import { withPlaywright } from '@abapify/adt-playwright';

export default withPlaywright(
  defineConfig({
    destinations: {
      DEV: 'https://sap-dev.example.com',
      QAS: 'https://sap-qas.example.com',
      PROD: 'https://sap-prod.example.com',
    },
  }),
  {
    userDataDir: true,
    headless: false,
    requiredCookies: ['SAP_SESSIONID_*', 'sap-usercontext'],
  },
);
```

### Pattern 2: Per-Destination Options

```typescript
import { defineConfig } from '@abapify/adt-config';
import { playwright } from '@abapify/adt-playwright';

export default defineConfig({
  destinations: {
    DEV: playwright({
      url: 'https://sap-dev.example.com',
      timeout: 60000,
    }),
    PROD: playwright({
      url: 'https://sap-prod.example.com',
      requiredCookies: ['SAP_SESSIONID_*', 'MYSAPSSO2'],
    }),
  },
});
```

### Pattern 3: Mixed Auth Types

```typescript
import { defineConfig } from '@abapify/adt-config';
import { basic } from '@abapify/adt-auth/plugins/basic';
import { playwright } from '@abapify/adt-playwright';

export default defineConfig({
  destinations: {
    // Basic auth for dev
    DEV: basic({
      url: 'https://dev.example.com',
      username: 'developer',
      password: process.env.SAP_PASSWORD,
    }),
    // Playwright for production (SSO)
    PROD: playwright({
      url: 'https://prod.example.com',
      userDataDir: true,
    }),
  },
});
```

## CLI Usage

```bash
# Login to a system
npx adt auth login --sid DEV

# Login with specific destination
npx adt auth login --sid PROD

# Check session status
npx adt auth status

# Logout
npx adt auth logout --sid DEV
```

## Architecture

This package is a thin wrapper around `@abapify/browser-auth`:

```
@abapify/browser-auth (core logic)
├── Event-driven auth flow
├── Cookie utilities
└── Pattern matching
    ↑
@abapify/adt-playwright (this package)
├── adapter.ts      - Playwright BrowserAdapter implementation
├── playwright-auth.ts - Wrapper around browser-auth
├── auth-plugin.ts  - AuthManager compatibility
└── index.ts        - Public exports
```

## Troubleshooting

### Browser doesn't open

Ensure `headless: false` is set:

```typescript
{
  headless: false;
}
```

### Cookies not captured

Specify the required cookies explicitly:

```typescript
{
  requiredCookies: ['SAP_SESSIONID_*', 'sap-usercontext'];
}
```

### SSL Certificate errors

Enable `ignoreHTTPSErrors` (default is true):

```typescript
{
  ignoreHTTPSErrors: true;
}
```

### Session not persisting

Check that `userDataDir` is enabled and the directory is writable:

```typescript
{
  userDataDir: true;
}
// or
{
  userDataDir: '/writable/path';
}
```

## Related Packages

- [`@abapify/browser-auth`](https://github.com/abapify/adt-cli/blob/main/packages/browser-auth) - Core authentication logic
- [`@abapify/adt-puppeteer`](https://github.com/abapify/adt-cli/blob/main/packages/adt-puppeteer) - Puppeteer alternative
- [`@abapify/adt-auth`](https://github.com/abapify/adt-cli/blob/main/packages/adt-auth) - Authentication manager
- [`@abapify/adt-config`](https://github.com/abapify/adt-cli/blob/main/packages/adt-config) - Configuration utilities

## See also

- [`adt-puppeteer`](./adt-puppeteer), [`browser-auth`](./browser-auth)
