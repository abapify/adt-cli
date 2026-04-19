---
title: ABAP Development Kit (ADK)
sidebar_position: 3
---

# ABAP Development Kit (ADK)

`@abapify/adk` is the write-oriented layer on top of typed contracts. It
turns a sequence of contract calls into a single, predictable _"save this
ABAP object"_ operation, taking care of locking, ETag refresh, transport
binding and the "source vs metadata" split that SAP imposes.

All CLI write flows and the MCP write tools ultimately delegate to ADK —
never to raw contracts.

## Why ADK exists

A "save an ABAP class" operation in ADT is actually 4–6 HTTP round trips:

1. Optionally POST a skeleton (create).
2. GET current source to cache its ETag.
3. POST to `/adtlock` to acquire a lock handle.
4. PUT metadata (attributes, description, …) with `If-Match` ETag.
5. GET source again — the metadata PUT bumps the server version, so the
   source ETag must be refreshed. **Skipping this step is the #1 cause
   of `412 Precondition Failed`** on source writes.
6. PUT source with the refreshed ETag.
7. POST to `/adtlock` with `?actionType=unlock`.

Every object type has its own quirks on top of this (function modules
ignore `processingType` on POST; CDS has no lock step; packages never
PUT source…). ADK centralises the orchestration so callers don't have
to reimplement it every time.

## The `AdkObject` base

```
AdkObject<Kind, Data>
  ├─ save(options)           — orchestrates create / update / upsert
  ├─ load()                  — GET metadata + optional source
  ├─ lock() / unlock()       — delegates to ctx.lockService
  ├─ saveViaContract(mode)   — POST (create) or PUT (update) metadata
  ├─ savePendingSources()    — PUT source with current lock handle
  └─ checkPendingSourcesUnchanged()  — short-circuit when source is identical
```

Concrete types (`AdkClass`, `AdkInterface`, `AdkFunctionGroup`,
`AdkFunctionModule`, `AdkPackage`, `AdkDomain`, …) override only the
hooks they need. The registry pattern is in
`packages/adk/src/base/registry.ts`.

## The save flow

```
save({ mode: 'upsert' })
  │
  ├── mode === 'create'?
  │     saveViaContract('create')   POST skeleton (minimal attributes)
  │     recurse with mode='update'
  │
  └── mode === 'update'
        ├── checkPendingSourcesUnchanged()   GET source, diff, cache ETag
        │     └── identical? return (no-op)
        ├── lock()                           POST /adtlock  → handle
        ├── hasPendingSources?
        │     ├── yes → savePendingSources()   (may PUT metadata first)
        │     └── no  → saveViaContract('update')
        └── unlock()                         POST /adtlock?actionType=unlock
```

### Source-only save

When `hasPendingSources` is `true` (e.g. abapGit-style import where only
source changed), ADK **skips the metadata PUT**. SAP frequently rejects a
full metadata PUT with a cryptic error, and most import scenarios don't
need one. Object types that truly need both (e.g. function modules — see
below) override `savePendingSources()`.

### ETag invalidation after metadata PUT

When you `PUT` metadata, SAP bumps the object version. **Every cached
ETag for that object is now stale** — including the source ETag. The
client only refreshes the ETag for the URL it directly wrote to. So
after a metadata PUT, ADK does:

```
PUT metadata            → version bumps
GET source/main         → refreshes cached source ETag
PUT source/main         → succeeds
```

Without the intermediate GET, the source PUT would send `If-Match` with
the pre-bump ETag → `412 Precondition Failed`.

## Lock architecture

All lock operations go through `@abapify/adt-locks`'
[`LockService`](../sdk/packages/adt-locks) — ADK never implements its
own locking. If `ctx.lockService` isn't provided (e.g. by
`initializeAdk()`), `lock()` throws:

> `Lock not available: no lockService in context. Did you call initializeAdk()?`

Locks are bound to the **security session**. The session is established
by `adt-client` (see the [Contracts pipeline](./contracts-pipeline)) and
lives in the `AdtClient` instance. A CSRF token obtained _without_ the
3-step security-session flow is **not valid** for lock/unlock, which is
why the client, lock service and ADK are coupled through a shared client
instance.

For multi-object saves (`checkin`, package export → import), see
[batch-lock-session](./checkin-batch-lock).

## Wrapper keys and object specs

Each ADK object carries a `wrapperKey` that maps to the root element of
its ADT XML envelope (`class:abapClass`, `intf:abapInterface`,
`fugr:functionGroup`, …). The schema-derived type for the object is
stored under `data`; object-set members (segments like
`definitions` / `implementations` / `testclasses` for classes) are
expressed via the shared `object-set.ts` pattern.

## Object-type quirks worth knowing

| Object          | Quirk                                                                                                                                                                                                    |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Function module | SAP ignores `processingType` on POST. ADK PUTs metadata before source to apply it, then refreshes the source ETag.                                                                                       |
| Function module | The PUT source payload must strip the auto-generated parameter comment block before diffing.                                                                                                             |
| Class           | Segments (`definitions`, `implementations`, `macros`, `testclasses`) are children of the main class URI and are fetched/written separately.                                                              |
| Package         | No source; only metadata. `savePendingSources()` is a no-op.                                                                                                                                             |
| CDS (DDLS)      | No ADT lock step; concurrent-write protection is source-ETag-only.                                                                                                                                       |
| BTP Trial       | Deleting an object with a lock handle leaves a **stale CTS lock** for 15–30 minutes — the object name cannot be recreated until it expires. There's no public API to clear it. Use fresh names in tests. |

## Error handling

Typical errors surfaced from ADK `save()`:

- `LockConflict` — someone else (or another session) is editing the
  object. Non-destructive: the client's security session is preserved
  (the adapter distinguishes this from generic 403s; see the `adt-client`
  AGENTS).
- `TransportRequired` — the object is not in a local package and no
  transport was supplied in `options.transport`.
- `412 Precondition Failed` — ETag mismatch; usually means "somebody
  else saved after you loaded". ADK retries once on the known
  metadata-then-source path.
- `ObjectNotFound` — on `save({ mode: 'update' })`, if you wanted
  `upsert`, pass `mode: 'upsert'` instead.

## Why CLI/MCP use ADK (not raw contracts)

- A single place to fix ETag + lock race conditions.
- Consistent transport handling.
- Consistent source-content diffing / no-op short-circuit.
- Extension points for new object types are one file each.

Raw `client.adt.*` calls are still used for **reads** (ADK-like orchestration
is unnecessary) and for endpoints that don't correspond to an ABAP
repository object (discovery, search, ATC runs, …).

## See also

- [Architecture overview](./overview)
- [Contracts pipeline](./contracts-pipeline)
- [Checkin batch lock](./checkin-batch-lock)
- [SDK → adk](../sdk/packages/adk)
- [SDK → adt-locks](../sdk/packages/adt-locks)
- [`packages/adk/AGENTS.md`](https://github.com/abapify/adt-cli/blob/main/packages/adk/AGENTS.md)
