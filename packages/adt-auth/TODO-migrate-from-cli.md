# TODO: Migrate Auth Utilities from adt-cli

These utilities need to be migrated from `adt-cli` to `adt-auth` before they can be removed from CLI.

## 1. Service Key Authentication (`auth-utils.ts`)

BTP Service Key parsing for service key-based authentication.

### Types to add:

```typescript
interface UAACredentials {
  tenantmode: string;
  sburl: string;
  subaccountid: string;
  'credential-type': string;
  clientid: string;
  xsappname: string;
  clientsecret: string;
  serviceInstanceId: string;
  url: string;
  uaadomain: string;
  verificationkey: string;
  apiurl: string;
  identityzone: string;
  identityzoneid: string;
  tenantid: string;
  zoneid: string;
}

interface BTPServiceKey {
  uaa: UAACredentials;
  url: string;
  'sap.cloud.service': string;
  systemid: string;
  endpoints: Record<string, string>;
  catalogs: Record<string, Catalog>;
  binding: Binding;
  preserve_host_header: boolean;
}
```

### Implementation:

- `ServiceKeyParser.parse(serviceKeyJson)` - Parse and validate service key JSON

### Target location:

- `src/plugins/service-key-auth.ts` or new package `@abapify/adt-auth-service-key`

## 2. OAuth PKCE Utilities (`oauth-utils.ts`)

PKCE (Proof Key for Code Exchange) utilities for OAuth flows.

### Functions to add:

```typescript
// Generate cryptographically secure code verifier
function generateCodeVerifier(): string;

// Generate code challenge from verifier using SHA256
function generateCodeChallenge(verifier: string): string;

// Generate random state parameter
function generateState(): string;
```

### Target location:

- `src/utils/pkce.ts` - Generic PKCE utilities
- Used by OAuth auth plugins

## Priority

- **Medium** - Not blocking current work
- Needed when implementing:
  - Service key authentication for CI/CD
  - OAuth authorization code flow with PKCE

## Source files (to be deleted after migration)

- `packages/adt-cli/src/lib/auth-utils.ts`
- `packages/adt-cli/src/lib/oauth-utils.ts`
