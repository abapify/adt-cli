# @abapify/adt-auth

Authentication package for SAP ADT systems supporting multiple authentication methods.

## Features

- ✅ **Multiple Auth Methods**: Basic, SLC, OAuth (extensible)
- ✅ **Secure Storage**: File-based with proper permissions
- ✅ **Type-Safe**: Full TypeScript support
- ✅ **Testable**: Easy to mock and test
- ✅ **Reusable**: Can be used by any Node.js tool

## Installation

```bash
npm install @abapify/adt-auth
# or
bun add @abapify/adt-auth
```

## Usage

### Basic Authentication

```typescript
import { AuthManager, BasicAuthMethod } from '@abapify/adt-auth';

const authManager = new AuthManager();
authManager.registerMethod(new BasicAuthMethod());

// Login
const session = await authManager.login(
  {
    method: 'basic',
    baseUrl: 'https://sap.example.com',
    username: 'user',
    password: 'pass',
    client: '100',
  },
  'BHF',
);

console.log('✅ Logged in!', session.sid);

// Later: get credentials
const credentials = authManager.getCredentials('BHF');
```

### SAP Secure Login Client (SLC)

```typescript
import { AuthManager, SlcAuthMethod } from '@abapify/adt-auth';

const authManager = new AuthManager();
authManager.registerMethod(new SlcAuthMethod());

// Login (SLC handles authentication via proxy)
const session = await authManager.login(
  {
    method: 'slc',
    baseUrl: 'https://sap.example.com',
    slcProxy: {
      host: 'localhost',
      port: 3128,
    },
    client: '200',
  },
  'BHF',
);

console.log('✅ Logged in via SLC!');
```

### Multiple Systems

```typescript
// Login to multiple systems
await authManager.login(config1, 'BHF');
await authManager.login(config2, 'S0D');
await authManager.login(config3, 'PRD');

// List all systems
const sids = authManager.listSids();
console.log('Available systems:', sids);

// Set default
authManager.setDefaultSid('BHF');

// Get default system credentials
const creds = authManager.getCredentials(); // Uses default SID
```

## API

### AuthManager

Main orchestrator for authentication.

#### Methods

- `registerMethod(method: AuthMethod)` - Register an auth method
- `login(config: AuthConfig, sid: string)` - Login and create session
- `getSession(sid?: string)` - Get session (uses default if sid not provided)
- `getCredentials(sid?: string)` - Get credentials for a session
- `testSession(sid: string)` - Test if session is still valid
- `logout(sid: string)` - Delete session
- `listSids()` - List all available SIDs
- `setDefaultSid(sid: string)` - Set default SID
- `getDefaultSid()` - Get default SID

### Auth Methods

#### BasicAuthMethod

Username/password authentication.

**Config:**

```typescript
{
  method: 'basic',
  baseUrl: string,
  username: string,
  password: string,
  client?: string,
  language?: string,
  insecure?: boolean,
}
```

#### SlcAuthMethod

SAP Secure Login Client Web Adapter.

**Config:**

```typescript
{
  method: 'slc',
  baseUrl: string,
  slcProxy: {
    host: string,
    port: number,
  },
  client?: string,
  language?: string,
}
```

**Prerequisites:**

- SAP Secure Login Client installed and running
- Web Adapter profile configured and active

## Storage

Sessions are stored in `~/.adt/sessions/` with file permissions `0600` (owner read/write only).

### File Structure

```
~/.adt/
└── sessions/
    ├── BHF.json
    ├── S0D.json
    └── PRD.json
```

### Session Format

```json
{
  "sid": "BHF",
  "credentials": {
    "method": "basic",
    "baseUrl": "https://sap.example.com",
    "username": "user",
    "password": "encrypted",
    "client": "100"
  },
  "createdAt": "2025-01-01T00:00:00.000Z",
  "lastUsed": "2025-01-01T00:00:00.000Z"
}
```

## Integration with adt-client

```typescript
import { createAdtClient } from '@abapify/adt-client';
import { AuthManager, BasicAuthMethod } from '@abapify/adt-auth';

// Get credentials
const authManager = new AuthManager();
authManager.registerMethod(new BasicAuthMethod());
const credentials = authManager.getCredentials('BHF');

if (!credentials) {
  throw new Error('Not authenticated. Run: adt login');
}

// Create ADT client
const client = createAdtClient({
  baseUrl: credentials.baseUrl,
  client: credentials.client,

  // Method-specific config
  ...(credentials.method === 'basic' && {
    username: credentials.username,
    password: credentials.password,
  }),

  ...(credentials.method === 'slc' && {
    proxy: credentials.slcProxy,
  }),
});

// Use client
const info =
  await client.adt.core.http.systeminformation.getSystemInformation();
console.log('System:', info);
```

## Plugin Architecture

Auth plugins provide authentication methods. AuthManager is generic and delegates to plugins.

### Plugin Contract

All auth plugins MUST:

1. **Export default** - The plugin must be the default export
2. **Implement AuthPlugin interface** - Must have `authenticate(options): Promise<AuthPluginResult>`
3. **Return AuthPluginResult** - Standard format

```typescript
// Plugin implementation
import type {
  AuthPlugin,
  AuthPluginResult,
  AuthPluginOptions,
} from '@abapify/adt-auth';

const authPlugin: AuthPlugin = {
  async authenticate(options: AuthPluginOptions): Promise<AuthPluginResult> {
    // Your auth logic...
    return {
      method: 'cookie',
      credentials: {
        cookies: 'cookie-string',
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      },
    };
  },
};

export default authPlugin;
```

### Available Plugins

- **@abapify/adt-puppeteer** - Browser-based SSO authentication

### Credential Refresh

When sessions expire, AuthManager automatically refreshes using the stored plugin:

```typescript
// AuthManager loads plugin dynamically
const pluginModule = await import(session.auth.plugin);
const result = await pluginModule.default.authenticate(options);
```

## Security

### Credential Storage

- **File permissions**: `0600` (owner read/write only)
- **Directory permissions**: `0700` (owner only)
- **Password encryption**: TODO (currently plain text)

### SLC Security

- No credentials stored (SLC handles authentication)
- Only proxy configuration stored
- Certificate-based authentication via SLC

## Development

```bash
# Install dependencies
bun install

# Build
bun run build

# Test
bun test

# Type check
bun run typecheck
```

## License

MIT
