# @abapify/browser-auth

[![npm](https://img.shields.io/npm/v/%40abapify%2Fbrowser-auth)](https://www.npmjs.com/package/@abapify/browser-auth)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue)](../../LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6)](https://www.typescriptlang.org/)

Core browser-based SSO authentication logic for SAP ADT systems. This package provides the shared authentication flow used by browser-specific adapters like Playwright and Puppeteer.

> **Note:** This is a low-level package. Most users should use `@abapify/adt-playwright` or `@abapify/adt-puppeteer` instead.

## Architecture

```
@abapify/browser-auth (this package)
├── BrowserAdapter interface
├── Event-driven auth flow
├── Cookie utilities
└── Pattern matching
    ↑
@abapify/adt-playwright ─────┐
    └── Playwright adapter   │
                             ├── Implement BrowserAdapter
@abapify/adt-puppeteer ──────┘
    └── Puppeteer adapter
```

## Installation

```bash
npm install @abapify/browser-auth
```

## Usage

This package is primarily used by browser adapter implementations. Direct usage:

```typescript
import {
  authenticate,
  testCredentials,
  toCookieHeader,
} from '@abapify/browser-auth';
import type { BrowserAdapter } from '@abapify/browser-auth';

// Create your browser adapter (see BrowserAdapter interface)
const adapter: BrowserAdapter = createMyAdapter();

// Authenticate
const credentials = await authenticate(adapter, {
  url: 'https://sap-system.example.com',
  headless: false,
  userDataDir: true,
  requiredCookies: ['SAP_SESSIONID_*', 'sap-usercontext'],
});

// Test if credentials are still valid
const result = await testCredentials(credentials);
console.log(result.valid); // true/false

// Convert to Cookie header string
const cookieHeader = toCookieHeader(credentials);
// "SAP_SESSIONID_XXX=abc123; sap-usercontext=..."
```

## API

### `authenticate(adapter, options)`

Performs browser-based SSO authentication.

```typescript
async function authenticate(
  adapter: BrowserAdapter,
  options: BrowserAuthOptions,
): Promise<BrowserCredentials>;
```

**Parameters:**

- `adapter` - Browser adapter implementing `BrowserAdapter` interface
- `options` - Authentication options

**Options:**

```typescript
interface BrowserAuthOptions {
  url: string; // SAP system URL
  headless?: boolean; // Hide browser (default: false)
  timeout?: number; // Login timeout in ms (default: 300000)
  userAgent?: string; // Custom user agent
  requiredCookies?: string[]; // Cookie patterns to wait for
  userDataDir?: string | boolean; // Session persistence path
  ignoreHTTPSErrors?: boolean; // Ignore SSL errors (default: true)
}
```

**Returns:** `BrowserCredentials` with captured cookies

### `testCredentials(credentials)`

Tests if credentials are still valid by making a request to the SAP system.

```typescript
async function testCredentials(
  credentials: BrowserCredentials,
): Promise<TestResult>;
```

### `toCookieHeader(credentials)`

Converts credentials to a Cookie header string.

```typescript
function toCookieHeader(credentials: BrowserCredentials): string;
```

### `toHeaders(credentials)`

Creates headers object with Cookie and User-Agent.

```typescript
function toHeaders(credentials: BrowserCredentials): Record<string, string>;
```

## BrowserAdapter Interface

To create a new browser adapter, implement this interface:

```typescript
interface BrowserAdapter {
  /** Launch browser and create context */
  launch(options: {
    headless: boolean;
    userDataDir?: string;
    ignoreHTTPSErrors?: boolean;
    userAgent?: string;
  }): Promise<void>;

  /** Create a new page */
  newPage(): Promise<void>;

  /** Navigate to URL */
  goto(url: string, options?: { timeout?: number }): Promise<void>;

  /** Get all cookies */
  getCookies(): Promise<CookieData[]>;

  /** Get user agent string */
  getUserAgent(): Promise<string>;

  /** Close the page */
  closePage(): Promise<void>;

  /** Close browser context */
  close(): Promise<void>;

  /** Register response event handler */
  onResponse(handler: (event: ResponseEvent) => void): void;

  /** Register page close handler */
  onPageClose(handler: () => void): void;
}
```

## Cookie Pattern Matching

The `requiredCookies` option supports wildcard patterns:

```typescript
// Wait for any SAP session cookie
requiredCookies: ['SAP_SESSIONID_*'];

// Wait for specific cookies
requiredCookies: ['SAP_SESSIONID_S0D_200', 'sap-usercontext'];

// Multiple patterns
requiredCookies: ['SAP_SESSIONID_*', 'MYSAPSSO2', 'sap-usercontext'];
```

### Utility Functions

```typescript
import { matchesCookiePattern, cookieMatchesAny } from '@abapify/browser-auth';

// Check single pattern
matchesCookiePattern('SAP_SESSIONID_S0D_200', 'SAP_SESSIONID_*'); // true

// Check multiple patterns
cookieMatchesAny('SAP_SESSIONID_S0D_200', ['MYSAPSSO2', 'SAP_SESSIONID_*']); // true
```

## Types

```typescript
interface CookieData {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

interface BrowserCredentials {
  baseUrl: string;
  cookies: CookieData[];
  authenticatedAt: Date;
  userAgent?: string;
}

interface TestResult {
  valid: boolean;
  error?: string;
  responseTime?: number;
}
```

## Creating a New Adapter

Example: Creating a Selenium adapter

```typescript
import type {
  BrowserAdapter,
  CookieData,
  ResponseEvent,
} from '@abapify/browser-auth';
import { Builder, Browser } from 'selenium-webdriver';

export function createSeleniumAdapter(): BrowserAdapter {
  let driver: WebDriver | null = null;
  const responseHandlers: ((event: ResponseEvent) => void)[] = [];

  return {
    async launch(options) {
      driver = await new Builder().forBrowser(Browser.CHROME).build();
    },

    async newPage() {
      // Selenium uses single page model
    },

    async goto(url, options) {
      await driver?.get(url);
    },

    async getCookies(): Promise<CookieData[]> {
      const cookies = await driver?.manage().getCookies();
      return (
        cookies?.map((c) => ({
          name: c.name,
          value: c.value,
          domain: c.domain || '',
          path: c.path || '/',
          expires: c.expiry?.getTime(),
          httpOnly: c.httpOnly,
          secure: c.secure,
        })) || []
      );
    },

    // ... implement remaining methods
  };
}
```

## Related Packages

- [`@abapify/adt-playwright`](../adt-playwright) - Playwright adapter (recommended)
- [`@abapify/adt-puppeteer`](../adt-puppeteer) - Puppeteer adapter
- [`@abapify/adt-auth`](../adt-auth) - Authentication manager
- [`@abapify/adt-config`](../adt-config) - Configuration utilities
