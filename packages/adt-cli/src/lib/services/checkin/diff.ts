/**
 * ChangePlan — intermediate representation between discovery and apply.
 *
 * Every ChangePlanEntry represents one ADK object about to be pushed into
 * SAP. The diff stage decides `action` by calling `obj.load()` against the
 * remote system:
 *
 *   - `create`  — remote load threw 404 / not-found.
 *   - `update`  — remote exists; local differs (or was deserialised with
 *                 pending sources, which we conservatively treat as
 *                 "changed" because a per-field diff is format-specific).
 *   - `unchanged` — remote exists and local source/data match; skip.
 *   - `skip`    — local object type is not supported by the plugin, or
 *                 filtered out by the caller.
 *
 * We deliberately avoid computing a field-level diff here: that's a format
 * concern (abapGit vs gCTS normalise XML differently) and will be added via
 * the deferred `FormatPlugin.diff()` method — see E05 follow-ups.
 */
import type { AdkObject } from '@abapify/adk';

export type ChangeAction = 'create' | 'update' | 'unchanged' | 'skip';

export interface ChangePlanEntry {
  /** ADK object carrying local (deserialised) data. */
  object: AdkObject;
  /** What we intend to do with this object on SAP. */
  action: ChangeAction;
  /** Human-readable reason — used for dry-run output. */
  reason?: string;
  /** Error encountered during diff (load failure that wasn't a 404). */
  error?: string;
}

/**
 * Compute diff for a single object.
 *
 * Returns the `ChangePlanEntry` without yet mutating anything on SAP. The
 * caller decides whether to group, filter, or apply the plan.
 */
export async function diffObject(object: AdkObject): Promise<ChangePlanEntry> {
  // If the format plugin already populated `_pendingSource(s)` or
  // `_pendingDescription`, treat as potentially-changed — we can't be
  // cheaper without a format-specific diff, and `update` is the safe side
  // (SAP will short-circuit on identical content via ETag).
  const hasPending = Boolean(
    (object as unknown as { _pendingSource?: unknown })._pendingSource ||
    (object as unknown as { _pendingSources?: unknown })._pendingSources ||
    (object as unknown as { _pendingDescription?: unknown })
      ._pendingDescription,
  );

  try {
    // Save the locally-assembled _data before load() overwrites it with
    // server state (matches the pre-deploy pattern in adt-export).
    const localData = (object as unknown as { _data?: unknown })._data;
    await object.load();
    // Restore the plugin-provided data so the subsequent save uses it.
    (object as unknown as { _data?: unknown })._data = localData;

    return {
      object,
      action: hasPending ? 'update' : 'unchanged',
      reason: hasPending
        ? 'local source pending write'
        : 'no local changes detected',
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/404|not[- ]?found/i.test(msg)) {
      return {
        object,
        action: 'create',
        reason: 'remote object does not exist',
      };
    }
    return {
      object,
      action: 'skip',
      error: msg,
      reason: `diff failed: ${msg}`,
    };
  }
}
