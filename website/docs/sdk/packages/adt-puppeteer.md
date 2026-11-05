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

## Features

- 🔐 **SSO/IDP Support** - Works with Okta, Azure AD, and other identity providers
- 💾 **Session Persistence** - Reuse Okta tokens across runs
- 🎭 **Puppeteer-powered** - Mature, well-tested browser automation
- ⚡ **Fast** - Skip login when session is still valid
- 🔄 **AuthManager Integration** - Works seamlessly with ADT CLI

## Quick Start

```typescript
// adt.config.ts
import { defineConfig } from '@abapify/adt-config';
import { withPuppeteer } from '@abapify/adt-puppeteer';

export default withPuppeteer(
  defineConfig({
    destinations: {
      DEV: 'https://sap-dev.example.com',
      PROD: 'https://sap-prod.example.com',
    },
  }),
  {
    userDataDir: true, // Enable session persistence
    headless: false, // Show browser window for SSO
    requiredCookies: ['SAP_SESSIONID_*', 'sap-usercontext'],
  },
);
```

## Direct API Usage

```typescript
import { puppeteerAuth, toCookieHeader } from '@abapify/adt-puppeteer';

// Authenticate - opens browser for SSO login
const credentials = await puppeteerAuth.authenticate({
  url: 'https://sap-system.example.com',
  userDataDir: true,
  headless: false,
  requiredCookies: ['SAP_SESSIONID_*', 'sap-usercontext'],
});

// Convert to Cookie header for HTTP requests
const cookieHeader = toCookieHeader(credentials);

// Test if session is still valid
const result = await puppeteerAuth.test(credentials);
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

1. **Launch Browser** - Opens Chrome with optional persistent profile
2. **Navigate to SAP** - Goes to ADT discovery endpoint
3. **SSO Redirect** - Browser redirects to Okta/IDP
4. **User Login** - User completes 2FA/SSO in browser
5. **Capture Cookies** - Waits for required cookies, extracts session

## Options

````typescript
interface PuppeteerAuthOptions {
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

## Session Persistence

By default, Puppeteer starts a fresh browser session each time. Enable `userDataDir` to persist browser state (cookies, localStorage, cache) across runs - perfect for long-lived Okta/IDP tokens!

### Benefits
- **Skip repeated logins**: Okta tokens persist across runs
- **Faster authentication**: Only refresh SAP cookies when needed
- **Better UX**: Same experience as using a regular browser

### Plugin-Level Configuration (Recommended)

Configure once, applies to all destinations:

```typescript
import { withPuppeteer } from '@abapify/adt-puppeteer';

export default withPuppeteer(
  defineConfig({
    destinations: {
      DEV: 'https://sap-dev.example.com',
      PROD: 'https://sap-prod.example.com',
    },
  }),
  {
    userDataDir: true,  // ALL destinations share the same profile
  }
);
````

### Per-Destination Configuration

Only use if you need different profiles per destination:

```typescript
import { puppeteer } from '@abapify/adt-puppeteer';

export default defineConfig({
  destinations: {
    DEV: puppeteer({
      url: 'https://sap-dev.example.com',
      userDataDir: '/path/to/dev-profile', // Custom profile for DEV
    }),
    PROD: puppeteer({
      url: 'https://sap-prod.example.com',
      // No userDataDir = fresh session every time
    }),
  },
});
```

### Options

- `userDataDir: true` - Use default directory (~/.adt/puppeteer-profile)
- `userDataDir: '/custom/path'` - Custom directory path
- `userDataDir: false` or omitted - No persistence (default)

### How It Works

1. **First run**: Opens browser, user logs in via Okta → profile saved
2. **Subsequent runs**: Loads existing profile → checks if session valid
   - ✅ **Valid**: Skips login, extracts cookies
   - ❌ **Expired**: Prompts for re-login (only SAP cookies need refresh)

### Silent Session Refresh

When SAP cookies expire but Okta session is still valid, use `adt auth refresh`:

```bash
# Refresh expired SAP session using stored Okta cookies
npx adt auth refresh

# Or specify a system
npx adt auth refresh --sid TRL
```

**How it works:**

1. Launches **headless browser** with persistent profile (no window popup!)
2. Navigates to SAP system
3. Okta **auto-authenticates** from stored session
4. Extracts fresh SAP cookies
5. Updates `~/.adt/auth.json`

**Benefits:**

- ⚡ **Fast** - No manual login, typically &lt;30 seconds
- 🤫 **Silent** - Runs in background, no browser window
- 🔄 **Automatic** - ADT CLI can auto-refresh when detecting expired sessions

**Note:** Refresh only works when `userDataDir` is enabled. Without it, you'll need to run `adt auth login` again.

### Clearing Sessions

If authentication fails or you need a fresh start:

```bash
# Remove default profile
rm -rf ~/.adt/browser-profile

# Or remove custom profile
rm -rf /path/to/custom/profile
```

## Configuration Patterns

### Pattern 1: All destinations use Puppeteer (Recommended)

```typescript
// adt.config.ts
import { defineConfig } from '@abapify/adt-config';
import { withPuppeteer } from '@abapify/adt-puppeteer';

export default withPuppeteer(
  defineConfig({
    destinations: {
      DEV: 'https://sap-dev.example.com',
      QAS: 'https://sap-qas.example.com',
      PROD: 'https://sap-prod.example.com',
    },
  }),
  {
    // Plugin options applied to ALL destinations
    userDataDir: true, // Session persistence
    headless: false, // Show browser
    timeout: 120000, // 2 min timeout
    requiredCookies: ['MYSAPSSO2', 'SAP_SESSIONID_*'],
  },
);
```

### Pattern 2: Mixed auth types

```typescript
import { defineConfig } from '@abapify/adt-config';
import { basic } from '@abapify/adt-client';
import { puppeteer } from '@abapify/adt-puppeteer';

export default defineConfig({
  destinations: {
    // Basic auth for dev
    DEV: basic({ url: 'https://dev.example.com', client: '100' }),

    // Puppeteer for production (SSO)
    PROD: puppeteer({ url: 'https://prod.example.com' }),
  },
});
```

### Pattern 3: Per-destination Puppeteer options

```typescript
import { puppeteer } from '@abapify/adt-puppeteer';

export default defineConfig({
  destinations: {
    DEV: puppeteer({
      url: 'https://sap-dev.example.com',
      timeout: 60000, // Custom timeout for DEV
    }),

    PROD: puppeteer({
      url: 'https://sap-prod.example.com',
      requiredCookies: ['MYSAPSSO2', 'SAP_SESSIONID_*'],
    }),
  },
});
```

## Architecture

This package is a thin wrapper around `@abapify/browser-auth`:

```
@abapify/browser-auth (core logic)
├── Event-driven auth flow
├── Cookie utilities
└── Pattern matching
    ↑
@abapify/adt-puppeteer (this package)
├── adapter.ts       - Puppeteer BrowserAdapter implementation
├── puppeteer-auth.ts - Wrapper around browser-auth
├── auth-plugin.ts   - AuthManager compatibility
└── index.ts         - Public exports
```

## Playwright vs Puppeteer

| Feature             | Playwright                 | Puppeteer                |
| ------------------- | -------------------------- | ------------------------ |
| **Browser Support** | Chromium, Firefox, WebKit  | Chrome/Chromium          |
| **Maintenance**     | Microsoft-backed           | Google-backed            |
| **API Style**       | Modern, auto-waiting       | Classic, manual waits    |
| **Bundle Size**     | Larger                     | Smaller                  |
| **Recommendation**  | Preferred for new projects | Legacy/existing projects |

Both packages share the same core logic via `@abapify/browser-auth`.

## Related Packages

- [`@abapify/browser-auth`](https://github.com/abapify/adt-cli/blob/main/packages/browser-auth) - Core authentication logic
- [`@abapify/adt-playwright`](https://github.com/abapify/adt-cli/blob/main/packages/adt-playwright) - Playwright alternative (recommended)
- [`@abapify/adt-auth`](https://github.com/abapify/adt-cli/blob/main/packages/adt-auth) - Authentication manager
- [`@abapify/adt-config`](https://github.com/abapify/adt-cli/blob/main/packages/adt-config) - Configuration utilities

## See also

- [`adt-playwright`](./adt-playwright), [`browser-auth`](./browser-auth)
