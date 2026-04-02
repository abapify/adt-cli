# ADK (ABAP Development Kit) - AI Agent Guide

## Package Overview

**adk** — Schema-driven construction, serialization, and CRUD operations for ABAP objects via SAP ADT REST APIs.

## Architecture

### Base Model (`base/model.ts`)

All ADK objects extend `AdkObject<Kind, Data>`. The base class provides:

- **save()** — Orchestrates create/update/upsert with lock management
- **load()** — Fetches object data from SAP
- **lock()/unlock()** — Delegates to `ctx.lockService` (`@abapify/adt-locks`). Requires `lockService` in `AdkContext` (set by `initializeAdk()` or manually).
- **saveViaContract()** — Typed contract call (POST for create, PUT for update)
- **savePendingSources()** — PUT source code with lock handle

### Lock Architecture

All lock/unlock operations delegate to `@abapify/adt-locks` `LockService` — there is no direct lock logic in ADK. The lock service uses CSRF tokens from the security session (see `adt-client/AGENTS.md` for the 3-step session protocol).

If `ctx.lockService` is missing, lock/unlock will throw: `"Lock not available: no lockService in context. Did you call initializeAdk()?"`

### Save Flow (Critical)

```
save({ mode: 'create' })
  → saveViaContract('create')           // POST skeleton (minimal fields)
  → save({ mode: 'update' })            // Continue with update flow
    → checkPendingSourcesUnchanged()     // GET source, compare, cache ETag
    → lock()                             // Acquire lock
    → savePendingSources()               // PUT source (if pending) OR saveViaContract('update')
    → unlock()                           // Release lock
```

**Key design choice**: When `hasPendingSources` is true (abapGit import), only source is saved — metadata PUT is skipped because "SAP often rejects" full metadata PUTs. Individual object types override this when needed.

## SAP ADT Behaviors (Critical Knowledge)

### FM processingType Ignored During POST

**SAP ADT ignores `processingType` during POST creation of function modules.** All FMs are created with `processingType="normal"` regardless of what's in the XML body.

**Fix**: `AdkFunctionModule.savePendingSources()` PUTs metadata before source to apply processingType. This adds:

1. `saveViaContract('update')` — PUT full metadata including processingType
2. GET source — refresh cached ETag (see below)
3. PUT source — with fresh ETag

### ETag Cache Invalidation After Metadata PUT

**When you PUT metadata on an object, SAP changes the object's internal version.** This invalidates ALL related ETags (metadata, source, etc.) but the client only updates the cache for the URL that was directly PUT.

**Pattern**: After metadata PUT, always GET sibling endpoints (like `source/main`) to refresh their cached ETags before PUTting to them. Otherwise → HTTP 412 Precondition Failed.

```
ETag Timeline:
1. GET source/main → ETag E1 cached
2. PUT metadata   → Object version changes, source ETag now E2
3. GET source/main → ETag E2 cached (REQUIRED refresh!)
4. PUT source/main → Uses E2, succeeds
```

Without step 3, step 4 sends If-Match: E1, which doesn't match E2 → 412 error.

### BTP Stale CTS Locks

Deleting an object with a lock handle removes the object but leaves a CTS-level lock that blocks re-creation. These locks expire after ~15-30 minutes on BTP. There is no enqueue management API on BTP to clear them manually. Workaround: use a different object name for testing.

## Function Module Object (`objects/repository/fugr/func/func.model.ts`)

Key overrides from base `AdkObject`:

| Method                           | Override Reason                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------ |
| `load()`                         | Passes `groupName` as first arg to contract                                          |
| `lock()/unlock()`                | Passes `groupName` to contract                                                       |
| `saveViaContract()`              | Passes `groupName` to contract.post()/put()                                          |
| `savePendingSources()`           | PUT metadata first (processingType fix), refresh ETag, strip parameter comment block |
| `checkPendingSourcesUnchanged()` | Strip parameter comment block before comparing                                       |
| `getSkeletonData()`              | Returns name, type, description, processingType, basXMLEnabled (no packageRef)       |

## File Locations

| Purpose         | Location                                         |
| --------------- | ------------------------------------------------ |
| Base model      | `src/base/model.ts`                              |
| Object registry | `src/base/registry.ts`                           |
| ADK factory     | `src/factory.ts`                                 |
| Function group  | `src/objects/repository/fugr/fugr.model.ts`      |
| Function module | `src/objects/repository/fugr/func/func.model.ts` |
| Class           | `src/objects/repository/clas/clas.model.ts`      |
| Interface       | `src/objects/repository/intf/intf.model.ts`      |
| Package         | `src/objects/repository/devc/devc.model.ts`      |
| Object set      | `src/base/object-set.ts`                         |

## Common Tasks

### Adding a New Object Type

1. Create model in `src/objects/repository/{type}/{type}.model.ts`
2. Extend `AdkObject<Kind, Data>` or `AdkMainObject<Kind, Data>`
3. Define `kind`, `crudContract`, `wrapperKey`
4. Register with `registerObjectType()` at bottom of file
5. Export from `src/index.ts`

### Debugging Save Issues

1. Check if `hasPendingSources` is true (source-only save path)
2. Check ETag flow: GET → cache → PUT with If-Match
3. Check lock handle propagation through options
4. For FMs: verify processingType in both POST and PUT bodies

## Build Commands

```bash
bunx nx build adk
bunx nx test adk
```
