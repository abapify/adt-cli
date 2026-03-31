---
trigger: model_decision
description: Complex logic handling for ADK object save, upsert, and locking.
---

# ADK Save and Upsert Logic

## Upsert Fallback Handling

`AdkObject.save()` upsert flow uses a **GET-before-LOCK** strategy:

1. **Existence Check (GET):**
   - Before locking, do a lightweight GET to check if the object exists.
   - If 404/405 → go straight to POST (create), skipping LOCK entirely.
   - **Why:** On BTP, locking a non-existent DDIC object creates a draft that persists
     even after unlock, blocking subsequent POST (create) attempts.

2. **Lock + PUT (object exists):**
   - If GET succeeds → proceed with normal LOCK + PUT + UNLOCK flow.
   - If PUT fails with 404/405/S_ABPLNGVS → unlock + fallback to create (safety net).

3. **Create Fallback:**
   - Both the GET-check path and the PUT-failure path use `fallbackToCreate()`.
   - Catch `422 "already exists"` → mark unchanged.

**Note:** Both paths must wrap their `save({ mode: 'create' })` calls in try/catch blocks that check `isAlreadyExistsError(e)`.

## abapLanguageVersion Must NOT Be Sent in PUT/POST

`saveViaContract()` strips `abapLanguageVersion` from the payload before sending.
Eclipse ADT never sends this attribute either — SAP infers it from the package.

**Why:** Including `adtcore:abapLanguageVersion` triggers an `S_ABPLNGVS` authorization
check on the server. On BTP Cloud systems this auth object may not be assigned,
causing a **403 Forbidden** after the lock is already acquired — leading to phantom locks.

The value is kept in `_data` for reading/display, just excluded from the HTTP body.

## Endpoint Behaviors

- **TABL Lock:** Can succeed for existing objects, but subsequent metadata PUT returns `405 Method Not Allowed`.
- **TTYP Lock:** Returns `405` when object doesn't exist (instead of `404`).
- **BTP DDIC Lock:** May succeed for non-existent objects, creating a draft. Unlock does NOT clean up the draft.
- **Create (POST):** Returns `422` (or "Unprocessable") with "already exists" message if object exists.
- **Create (POST) on BTP:** Requires `packageRef` in the body. Without it, SAP can't determine the target package and triggers S_ABPLNGVS.

## BTP-Specific Notes

- Use `--package ROOT_PACKAGE` when deploying new objects to BTP so the format plugin resolves `packageRef` for each object.
- SAP's strict `xs:sequence` parser requires ALL elements in a sequence to be present, even when logically empty (e.g., `builtInType` in TTYP with `refToDictionaryType`). Default empty fields to `""` or `0` instead of omitting them.
