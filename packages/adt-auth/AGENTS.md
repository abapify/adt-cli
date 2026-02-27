# AGENTS.md - ADT Auth Development Guide

This file provides guidance to AI coding assistants when working with the `adt-auth` package.

## Package Overview

**adt-auth** - Authentication management for SAP ADT systems. Provides session storage, credential management, and plugin-based authentication.

## Architecture Principles

### 🚨 CRITICAL: AuthManager Must Be Generic

**AuthManager MUST NOT know about specific plugin implementations.**

#### ❌ WRONG - Plugin-specific code in AuthManager

```typescript
// DON'T DO THIS!
if (pluginModule.puppeteerAuth) { ... }
if (pluginModule.toCookieHeader) { ... }
if (Array.isArray(credentials.cookies)) { ... }
```

#### ✅ CORRECT - Generic plugin interface

```typescript
// AuthManager only knows about the standard interface
const pluginModule = await import(session.auth.plugin);
const result = await pluginModule.default.authenticate(options);
// result MUST conform to AuthPluginResult
```

### Plugin Contract

All auth plugins MUST:

1. **Export default** - The plugin must be the default export
2. **Implement AuthPlugin interface** - Must have `authenticate(options): Promise<AuthPluginResult>`
3. **Return AuthPluginResult** - Standard format with `method` and `credentials`

```typescript
// Plugin MUST export default
export default {
  async authenticate(options: AuthPluginOptions): Promise<AuthPluginResult> {
    // ... plugin-specific logic ...

    // MUST return standard format
    return {
      method: 'cookie',  // or 'basic'
      credentials: {
        cookies: 'cookie-string',  // for cookie method
        expiresAt: new Date(...),
      },
    };
  },
};
```

### Why Default Export?

- **Clean import** - `import(plugin).default` is the standard pattern
- **Single responsibility** - One plugin per package
- **No naming conflicts** - No need to coordinate export names

## Key Types

### AuthPluginResult

```typescript
type AuthPluginResult = CookieAuthResult | BasicAuthResult;

interface CookieAuthResult {
  method: 'cookie';
  credentials: {
    cookies: string; // Cookie header string
    expiresAt: Date; // When session expires
  };
}

interface BasicAuthResult {
  method: 'basic';
  credentials: {
    username: string;
    password: string;
  };
}
```

### AuthPlugin

```typescript
interface AuthPlugin {
  authenticate(options: AuthPluginOptions): Promise<AuthPluginResult>;
}

interface AuthPluginOptions {
  url: string;
  client?: string;
  [key: string]: unknown; // Plugin-specific options
}
```

### AuthSession (stored format)

```typescript
interface AuthSession {
  sid: string;
  host: string;
  client?: string;
  auth: {
    method: 'cookie' | 'basic';
    plugin: string; // Package name for refresh, e.g., '@abapify/adt-puppeteer'
    credentials: CookieCredentials | BasicCredentials;
  };
}
```

## Plugin Implementation Example

When creating a new auth plugin:

```typescript
// my-auth-plugin/src/index.ts
import type {
  AuthPlugin,
  AuthPluginResult,
  AuthPluginOptions,
} from '@abapify/adt-auth';

const authPlugin: AuthPlugin = {
  async authenticate(options: AuthPluginOptions): Promise<AuthPluginResult> {
    // Your authentication logic here
    const cookies = await doAuthentication(options.url);

    // Convert to standard format
    return {
      method: 'cookie',
      credentials: {
        cookies: cookies.toString(),
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      },
    };
  },
};

export default authPlugin;
```

## Credential Refresh Flow

When a session expires, AuthManager calls `refreshCredentials()`:

1. Load session from storage
2. Dynamic import the plugin: `await import(session.auth.plugin)`
3. Call `pluginModule.default.authenticate(options)`
4. Plugin returns `AuthPluginResult`
5. AuthManager saves updated session

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  AuthManager    │────▶│  Plugin Package  │────▶│  Auth Provider  │
│  (generic)      │     │  (default export)│     │  (SAP, IDP, etc)│
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                        │
        │ AuthPluginResult       │ Plugin-specific
        │ (standard format)      │ credentials
        ▼                        ▼
┌─────────────────┐     ┌──────────────────┐
│  Session Store  │     │  Conversion to   │
│  (~/.adt/)      │     │  AuthPluginResult│
└─────────────────┘     └──────────────────┘
```

## Common Mistakes

### Mistake 1: Adding plugin-specific code to AuthManager

**Symptom:** AuthManager imports or references specific plugins
**Fix:** Keep AuthManager generic, move conversion logic to plugin

### Mistake 2: Plugin not returning AuthPluginResult

**Symptom:** `Cannot read properties of undefined (reading 'cookies')`
**Fix:** Plugin must convert its internal format to AuthPluginResult

### Mistake 3: Named export instead of default

**Symptom:** `Plugin does not have a default export`
**Fix:** Use `export default authPlugin`

## Testing

```bash
# Build
npx nx build adt-auth

# Test
npx nx test adt-auth
```

## Files

- `src/auth-manager.ts` - Main AuthManager class
- `src/types.ts` - Type definitions (AuthPlugin, AuthPluginResult, etc.)
- `src/storage/file-storage.ts` - Session persistence
