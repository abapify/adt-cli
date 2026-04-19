---
title: Checkin & Batch Lock Session
sidebar_position: 8
---

# Checkin & Batch Lock Session

`adt checkin <dir>` is the inverse of `adt import package`: it pushes a
local abapGit / gCTS-formatted directory **back** into SAP. Because SAP
has no transactional "save N objects atomically" API, we approximate it
with a **batch lock session** plus dependency-ordered application.

This page documents how that orchestration works and what its
limitations are.

## Why SAP has no atomic save

The SAP ADT surface is per-object:

- `POST /adtlock` / `POST /adtlock?actionType=unlock` are one-at-a-time.
- `PUT /oo/classes/{n}` is one-at-a-time.
- There is no "begin transaction / commit" endpoint — each PUT is
  immediately persisted on success.

If we PUT three classes and the third fails mid-way, the first two are
already live. True rollback is impossible; the best we can do is
**fail fast before any PUT** and **surface the remaining failures
clearly**.

## `BatchLockSession`

`@abapify/adt-locks` exposes a `BatchLockSession` primitive:

```ts
const batch = await createBatchLockSession(client, {
  objects: [
    { uri: '/sap/bc/adt/oo/classes/ZCL_A' },
    { uri: '/sap/bc/adt/oo/classes/ZCL_B' },
    { uri: '/sap/bc/adt/packages/ZMYPKG', transport: 'DEVK900042' },
  ],
});
try {
  // use batch.handles.get(uri) to retrieve each lock handle
} finally {
  await batch.releaseAll();
}
```

Behaviour:

- Acquires locks **sequentially**. On any failure, releases every
  previously-acquired lock and throws.
- All locks share the same security session / CSRF token — SAP only
  issues one security session per user.
- Never holds locks across an await boundary the caller doesn't own —
  release is synchronous with the end of `checkin`.

## Pre-flight validation, not execution

Our `CheckinService.apply()` uses `BatchLockSession` primarily as a
**validation primitive**:

```
1. Build change plan (diff local vs. remote).
2. Acquire BatchLockSession over every object in the plan.
3. Immediately release it.  ← validation only
4. Apply each entry via ADK save({mode: 'upsert'}) — which re-locks
   per object and releases on completion.
```

Why the double-lock?

- **Fail fast.** If any object is locked by someone else, we learn in
  step 2, before any PUT runs.
- **ADK already locks.** `ADK.save()` acquires its own lock (and
  handles ETag refresh / retry / transport binding). Using ADK for
  step 4 means we get all of that for free.
- **The CSRF token survives.** Because the security session is stable
  across lock + unlock + relock, the double cycle is cheap.

When ADK exposes a way to **thread pre-acquired lock handles** into
`save()`, the two cycles can collapse into one. That's a known
follow-up (see [Roadmap → Future](../project-roadmap/future)).

## Dependency-tier ordering

PUTs run in a deterministic order so that referenced objects exist
before their referents:

```
tier 0: packages (DEVC)
tier 1: DDIC (DOMA, DTEL, TABL, TTYP, VIEW, …)
tier 2: application types (CLAS, INTF, PROG, FUGR, FUNC, INCL, …)
tier 3: CDS (DDLS, DCLS, DDLX, BDEF, SRVD, SRVB)
```

Within a tier, order is stable (by object name). This is "good enough"
for realistic abapGit packages — full semantic sort would require a
symbol resolver we don't yet have.

## Best-effort rollback

If step 4 fails part-way, `CheckinService.apply()`:

1. Stops further PUTs.
2. Releases any locks still held.
3. Returns a summary with one entry per object: `created` / `updated` /
   `unchanged` / `failed`, plus the error message for failures.
4. Logs "manual cleanup may be needed" for partially-applied changes.

It does **not** attempt to un-do successful PUTs — there is no SAP API
to do so, and a naive "PUT the old content back" would either fail
(ETag mismatch) or land yet another transport entry.

## Known limitations

- **No per-field diff (yet).** `diffObject()` today treats "remote
  exists + local had pending sources" as `update` and "remote 404" as
  `create`. True file-level diffs will come when `FormatPlugin.diff()`
  lands (E05 follow-up — see [Format Plugins](./format-plugins)).
- **Double lock cycle.** See "Pre-flight validation" above.
- **No `.gitignore`-style excludes.** `checkin` processes every
  serialised object in the directory.
- **gCTS-hosted repos use `adt gcts commit`, not `checkin`.** When the
  target system has gCTS enabled and the repo is gCTS-tracked, commit +
  push through gCTS' own endpoints. `checkin` is the raw ADT path.

## See also

- [CLI → checkin](../cli/checkin)
- [MCP → checkin](../mcp/tools/checkin)
- [Architecture → ADK](./adk)
- [Architecture → Format plugins](./format-plugins)
- [SDK → adt-locks](../sdk/packages/adt-locks)
- [Roadmap → Future](../project-roadmap/future)
