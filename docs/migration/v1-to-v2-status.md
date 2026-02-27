# ADT Client V1 to V2 Migration Status

**Status**: 🟡 In Progress - V1 cannot be deleted yet

**Last Updated**: 2025-12-03

## Summary

The `@abapify/adt-client-v2` package is operational and being used for new commands, but `@abapify/adt-client` (v1) is still required for legacy features that haven't been migrated yet.

## Current State

### ✅ Completed Migrations

1. **Auth Extraction**: `AuthManager` has been successfully extracted to `@abapify/adt-auth`
   - Updated: [adt-cli/src/lib/commands/auth/logout.ts](../../packages/adt-cli/src/lib/commands/auth/logout.ts:2)
   - Updated: [adt-cli/src/lib/commands/auth/login-old-backup.ts](../../packages/adt-cli/src/lib/commands/auth/login-old-backup.ts:3)

2. **New Commands Using V2**:
   - 22 files now use `@abapify/adt-client-v2`
   - Transport list/set commands migrated
   - Discovery and search operations migrated

3. **V2 Contract Coverage**:
   - ✅ Sessions (core/http)
   - ✅ System Information (core/http)
   - ✅ Search (repository/informationsystem)
   - ✅ CTS Transport basics

### 🚧 Still Using V1

**15 files** still depend on `@abapify/adt-client` (v1):

#### Critical Dependencies

1. **[adt-cli/src/lib/shared/clients.ts](../../packages/adt-cli/src/lib/shared/clients.ts:3-8)**
   - Provides singleton v1 client for legacy commands
   - Uses: `AdtClientImpl`, `createAdtClient`, `AuthManager`, `createLogger`, `createFileLogger`
   - Imported by: 7+ files including `cli.ts`, object registry, services

2. **[adt-cli/src/lib/config/auth.ts](../../packages/adt-cli/src/lib/config/auth.ts:1)**
   - Uses: `AdtClient`, `createAdtClient`
   - Provides auth provider abstraction for config file

#### Commands Still Using V1

3. **[adt-cli/src/lib/commands/atc.ts](../../packages/adt-cli/src/lib/commands/atc.ts:3)**
   - Uses: `AdtClientImpl`
   - Reason: ATC service not yet in v2

4. **[adt-cli/src/lib/commands/deploy/deploy.ts](../../packages/adt-cli/src/lib/commands/deploy/deploy.ts:5)**
   - Uses: `AdtClientImpl`, `SetSourceOptions`

5. **[adt-cli/src/lib/commands/export/package.ts](../../packages/adt-cli/src/lib/commands/export/package.ts:4)**
   - Uses: `AdtClientImpl`

6. **[adt-cli/src/lib/commands/import/package.ts](../../packages/adt-cli/src/lib/commands/import/package.ts:4)**
   - Uses: `AdtClientImpl`

7. **[adt-cli/src/lib/commands/lock.ts](../../packages/adt-cli/src/lib/commands/lock.ts:2)**
   - Uses: `AdtClientImpl`

8. **[adt-cli/src/lib/commands/unlock/index.ts](../../packages/adt-cli/src/lib/commands/unlock/index.ts:2)**
   - Uses: `AdtClientImpl`

9. **[adt-cli/src/lib/commands/outline.ts](../../packages/adt-cli/src/lib/commands/outline.ts:4)**
   - Uses: `AdtClientImpl`

10. **[adt-cli/src/lib/commands/research-sessions.ts](../../packages/adt-cli/src/lib/commands/research-sessions.ts:6)**
    - Uses: `AdtClientImpl`

#### Services Using V1

11. **[adt-cli/src/lib/services/atc/service.ts](../../packages/adt-cli/src/lib/services/atc/service.ts:2)**
    - Uses: `AtcOptions`, `AtcResult` types

12. **[adt-cli/src/lib/services/import/service.ts](../../packages/adt-cli/src/lib/services/import/service.ts:2)**
    - Uses: `ADTObjectInfo` type

#### Object Handlers Using V1

13. **[adt-cli/src/lib/objects/adk-bridge/adk-object-handler.ts](../../packages/adt-cli/src/lib/objects/adk-bridge/adk-object-handler.ts:4)**
    - Uses: `AdtClient` type

## Blockers for V1 Deletion

### Missing V2 Features

The following features must be implemented in v2 before v1 can be removed:

1. **ATC Service**
   - Contract: `/sap/bc/adt/atc/*`
   - Types: `AtcOptions`, `AtcResult`, `AtcFinding`
   - Used by: `atc.ts`, `atc/service.ts`

2. **Object Operations**
   - Lock/unlock operations
   - Source code setting (`SetSourceOptions`)
   - Object outline
   - Package export/import

3. **Transport Import**
   - Contract for import operations
   - Type: `ADTObjectInfo`

4. **Logger Utilities**
   - `createLogger(component: string)` - creates child logger
   - `createFileLogger(logger, options)` - file logging wrapper
   - Currently in v1, need to extract to `@abapify/logger` or CLI utils

### Type Exports Needed in V2

These types from v1 need equivalent exports in v2:

```typescript
// From v1 - needed by CLI
export type {
  SetSourceOptions,
  ADTObjectInfo,
  AtcOptions,
  AtcResult,
  AtcFinding,
};
```

## Migration Path Forward

### Phase 1: Extract Shared Utilities ✅ DONE

- [x] Extract `AuthManager` to `@abapify/adt-auth`
- [x] Update logout command to use `@abapify/adt-auth`
- [x] Update login-old-backup to use `@abapify/adt-auth`

### Phase 2: Implement Missing V2 Contracts (NEXT)

Priority order based on usage:

1. **Lock/Unlock** (2 commands depend on this)

   ```typescript
   // @abapify/adt-contracts
   export const lockContract = {
     lock: rest.put('/sap/bc/adt/repository/locks/{objectUri}'),
     unlock: rest.delete('/sap/bc/adt/repository/locks/{objectUri}'),
   };
   ```

2. **Source Operations** (deploy command)

   ```typescript
   // @abapify/adt-contracts
   export const sourceContract = {
     getSource: rest.get('/sap/bc/adt/oo/classes/{className}/source/main'),
     setSource: rest.put('/sap/bc/adt/oo/classes/{className}/source/main'),
   };
   ```

3. **ATC Service** (atc command)

   ```typescript
   // @abapify/adt-contracts
   export const atcContract = {
     runChecks: rest.post('/sap/bc/adt/atc/runs'),
     getResults: rest.get('/sap/bc/adt/atc/runs/{runId}'),
   };
   ```

4. **Package Operations** (export/import commands)

5. **Object Outline** (outline command)

### Phase 3: Migrate Commands to V2

For each command using v1:

1. Check if required contract exists in v2
2. Update imports:

   ```typescript
   // Remove
   import { AdtClientImpl } from '@abapify/adt-client';

   // Add
   import { getAdtClientV2 } from '../utils/adt-client-v2';
   ```

3. Update API calls to use contract-based approach
4. Test thoroughly
5. Remove v1 import

### Phase 4: Extract Logger Utilities

Move `createLogger` and `createFileLogger` from v1 to either:

- `@abapify/logger` (if generally useful)
- `@abapify/adt-cli/utils` (if CLI-specific)

### Phase 5: Remove V1

Once all commands are migrated:

1. Remove `"@abapify/adt-client": "*"` from `adt-cli/package.json`
2. Delete `packages/adt-client/` directory
3. Update documentation
4. Build and verify all tests pass

## Estimated Timeline

- **Phase 2** (Missing contracts): 2-3 weeks
  - Lock/Unlock: 2-3 days
  - Source operations: 3-4 days
  - ATC service: 1 week (complex)
  - Package operations: 3-4 days
  - Outline: 2-3 days

- **Phase 3** (Command migration): 1-2 weeks
  - Systematic migration of 10 commands
  - Testing and validation

- **Phase 4** (Logger extraction): 2-3 days

- **Phase 5** (V1 removal): 1 day

**Total**: 4-6 weeks

## Current Recommendation

**DO NOT delete v1 yet.** Continue with the current dual-client approach:

- ✅ Use v2 for new commands
- ✅ Continue supporting v1 for legacy commands
- ✅ Gradually migrate commands as v2 contracts become available
- ✅ Extract shared utilities (auth ✅, logger pending)

## References

- V1 package: [packages/adt-client/](../../packages/adt-client/)
- V2 package: [packages/adt-client-v2/](../../packages/adt-client-v2/)
- CLI migration guide: [packages/adt-cli/AGENTS.md](../../packages/adt-cli/AGENTS.md#migration-v1-to-v2)
- Auth package: [packages/adt-auth/](../../packages/adt-auth/)
