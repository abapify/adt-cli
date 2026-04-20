/**
 * Session-scoped changeset state (Wave 3).
 *
 * A `Changeset` is an ordered list of object writes + their lock handles
 * acquired during the "open" phase of a unit-of-work. Source code PUTs
 * happen eagerly inside `changeset_add` (i.e. the source is persisted to
 * SAP under lock), but the objects remain INACTIVE until `changeset_commit`
 * runs a single batch activation.
 *
 * Rollback semantics (important — document for callers):
 *   - `changeset_rollback` releases every lock (best-effort) and sets
 *     `status = 'rolled_back'`.
 *   - It does NOT revert the source PUTs. SAP has no transactional
 *     "discard changes" API over ADT; the inactive version stays on the
 *     system until the next edit/activate cycle. This matches what
 *     Eclipse ADT does when a developer closes the editor without
 *     activating.
 *
 * The changeset itself lives on the `SapSessionContext` of an MCP HTTP
 * session. Under stdio, tools fall back to ephemeral per-call state — the
 * changeset tools therefore require an HTTP session to operate.
 */

export type ChangesetStatus =
  | 'open'
  | 'committing'
  | 'committed'
  | 'rolled_back';

export interface ChangesetEntry {
  /** Fully-qualified ADT object URI (e.g. `/sap/bc/adt/oo/classes/zcl_demo`). */
  objectUri: string;
  /** Short SAP object type (e.g. `CLAS`, `INTF`, `PROG`). */
  objectType: string;
  /** Upper-cased object name for display / activation payload. */
  objectName: string;
  /** Lock handle returned by the ADT lock service. */
  lockHandle: string;
  /** High-level intent. `update` is the only value today; `create` is reserved. */
  action: 'update' | 'create';
  /** Milliseconds since epoch at which the entry was recorded. */
  createdAt: number;
}

export interface Changeset {
  /** Opaque identifier (UUID v4) returned to callers. */
  id: string;
  /** Milliseconds since epoch. */
  openedAt: number;
  /** Lifecycle state. */
  status: ChangesetStatus;
  /** Entries, ordered by insertion. */
  entries: ChangesetEntry[];
  /** Optional free-text description supplied by the caller. */
  description?: string;
}
