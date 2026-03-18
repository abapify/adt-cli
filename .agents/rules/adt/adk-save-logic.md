---
trigger: model_decision
description: Complex logic handling for ADK object save, upsert, and locking.
---

# ADK Save and Upsert Logic

## Upsert Fallback Handling
`AdkObject.save()` upsert fallback has **TWO** catch paths that both need `422 "already exists"` handling to correctly mark objects as unchanged instead of failing.

1. **Lock Catch:**
   - If Lock fails -> `shouldFallbackToCreate(e)` -> try create.
   - Catch `422 "already exists"` -> mark unchanged.

2. **Outer saveViaContract Catch:**
   - If Lock succeeds but PUT fails (e.g. `405 Method Not Allowed`) -> `shouldFallbackToCreate(e)` -> try create.
   - Catch `422 "already exists"` -> mark unchanged.

**Note:** Both paths must wrap their `save({ mode: 'create' })` calls in try/catch blocks that check `isAlreadyExistsError(e)`.

## Endpoint Behaviors
- **TABL Lock:** Can succeed for existing objects, but subsequent metadata PUT returns `405 Method Not Allowed`.
- **TTYP Lock:** Returns `405` when object doesn't exist (instead of `404`).
- **Create (POST):** Returns `422` (or "Unprocessable") with "already exists" message if object exists.
