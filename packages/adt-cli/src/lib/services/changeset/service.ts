/**
 * `ChangesetService` — transport-agnostic transactional unit-of-work.
 *
 * Wave 3 of the MCP HTTP transport introduces changesets so that an AI
 * agent can lock + stage several source writes, review them, and then
 * atomically commit (batch activate) or roll back (release locks).
 *
 * Architectural contract:
 *
 *   - This service is **pure business logic**: no `console.*`, no
 *     commander, no file I/O. Callers feed it an `AdtClient` and a
 *     `Logger` and receive structured results / thrown errors.
 *   - Both the CLI (`adt changeset …`) and MCP tools
 *     (`changeset_begin` / `changeset_add` / `changeset_commit` /
 *     `changeset_rollback`) delegate straight through. That is the only
 *     way to keep CLI ↔ MCP parity honest.
 *   - Locks are acquired and released through `@abapify/adt-locks` —
 *     the single lock service in this monorepo. We never hand-roll lock
 *     protocol here (nor in the MCP tools).
 *
 * Commit strategy:
 *
 *   SAP ADT supports batch activation via a single POST to
 *   `/sap/bc/adt/activation` with an `adtcore:objectReferences` body
 *   carrying N references. We use the typed `activation.activate.post`
 *   contract from `@abapify/adt-client` for this — NOT a manual XML
 *   string. One HTTP round-trip, all entries activated together.
 *
 *   If activation fails with an error, `commit` still tries to release
 *   every lock (best-effort) and surfaces both the activation error and
 *   the per-entry release outcomes in the result.
 *
 * Rollback semantics (explicit):
 *
 *   Rollback releases locks but does NOT revert the PUTs that `add`
 *   already persisted on SAP. SAP has no transactional "discard" API
 *   over ADT: the inactive version stays on the system until the next
 *   edit/activate cycle. This matches Eclipse ADT's behaviour when a
 *   developer closes the editor without activating.
 */

import { randomUUID } from 'node:crypto';
import { createLockService, type LockService } from '@abapify/adt-locks';
import type { AdtClient } from '@abapify/adt-client';
import type { Logger } from '@abapify/adt-client';
import type { InferTypedSchema } from '@abapify/adt-schemas';
import { adtcore } from '@abapify/adt-schemas';

export type ChangesetStatus =
  | 'open'
  | 'committing'
  | 'committed'
  | 'rolled_back';

export interface ChangesetEntry {
  objectUri: string;
  objectType: string;
  objectName: string;
  lockHandle: string;
  action: 'update' | 'create';
  createdAt: number;
}

export interface Changeset {
  id: string;
  openedAt: number;
  status: ChangesetStatus;
  entries: ChangesetEntry[];
  description?: string;
}

export interface AddEntryArgs {
  objectUri: string;
  objectType: string;
  objectName: string;
  source: string;
  transport?: string;
}

export interface CommitResult {
  activated: string[];
  failed: { uri: string; error: string }[];
}

export interface RollbackResult {
  released: string[];
  failed: { uri: string; error: string }[];
}

type ObjectReferencesBody = Extract<
  InferTypedSchema<typeof adtcore>,
  { objectReferences: unknown }
>;

/** Create a brand-new empty changeset (no SAP interaction yet). */
export function createChangeset(description?: string): Changeset {
  return {
    id: randomUUID(),
    openedAt: Date.now(),
    status: 'open',
    entries: [],
    description,
  };
}

export class ChangesetService {
  private readonly locks: LockService;

  constructor(
    private readonly client: AdtClient,
    private readonly logger?: Logger,
  ) {
    this.locks = createLockService(client);
  }

  /** Transport-agnostic: returns a fresh Changeset descriptor. */
  begin(description?: string): Changeset {
    const cs = createChangeset(description);
    this.logger?.debug('changeset: begin', { id: cs.id });
    return cs;
  }

  /**
   * Lock the object, PUT the source, and register the entry. Throws on
   * lock or PUT failure; lock is released in the error path so the
   * caller never sees a half-applied entry.
   */
  async add(changeset: Changeset, args: AddEntryArgs): Promise<ChangesetEntry> {
    if (changeset.status !== 'open') {
      throw new Error(
        `changeset ${changeset.id} is not open (status=${changeset.status})`,
      );
    }

    const lock = await this.locks.lock(args.objectUri, {
      transport: args.transport,
      objectName: args.objectName,
      objectType: args.objectType,
    });

    try {
      const params = new URLSearchParams();
      params.set('lockHandle', lock.handle);
      if (args.transport) params.set('corrNr', args.transport);
      await this.client.fetch(
        `${args.objectUri}/source/main?${params.toString()}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'text/plain' },
          body: args.source,
        },
      );
    } catch (err) {
      // Best-effort unlock on PUT failure so we don't leak a lock.
      try {
        await this.locks.unlock(args.objectUri, { lockHandle: lock.handle });
      } catch (unlockErr) {
        this.logger?.warn('changeset: failed to unlock after PUT failure', {
          objectUri: args.objectUri,
          error:
            unlockErr instanceof Error ? unlockErr.message : String(unlockErr),
        });
      }
      throw err;
    }

    const entry: ChangesetEntry = {
      objectUri: args.objectUri,
      objectType: args.objectType.toUpperCase(),
      objectName: args.objectName.toUpperCase(),
      lockHandle: lock.handle,
      action: 'update',
      createdAt: Date.now(),
    };
    changeset.entries.push(entry);
    this.logger?.debug('changeset: add', {
      id: changeset.id,
      objectUri: args.objectUri,
    });
    return entry;
  }

  /**
   * Batch-activate every entry, then release every lock. The changeset
   * is mutated in place: `status` advances to `committing` during the
   * call and `committed` on success. On activation failure it is left
   * as `committing` and the error is rethrown after lock cleanup.
   */
  async commit(changeset: Changeset): Promise<CommitResult> {
    if (changeset.status !== 'open') {
      throw new Error(
        `changeset ${changeset.id} is not open (status=${changeset.status})`,
      );
    }

    changeset.status = 'committing';

    if (changeset.entries.length === 0) {
      changeset.status = 'committed';
      return { activated: [], failed: [] };
    }

    const body: ObjectReferencesBody = {
      objectReferences: {
        objectReference: changeset.entries.map((e) => ({
          uri: e.objectUri,
          type: e.objectType,
          name: e.objectName,
        })),
      },
    };

    const result: CommitResult = { activated: [], failed: [] };
    let activationError: Error | undefined;

    try {
      await this.client.adt.activation.activate.post(
        { method: 'activate', preauditRequested: true },
        body,
      );
      result.activated = changeset.entries.map((e) => e.objectUri);
    } catch (err) {
      activationError = err instanceof Error ? err : new Error(String(err));
      result.failed = changeset.entries.map((e) => ({
        uri: e.objectUri,
        error: activationError!.message,
      }));
    }

    // Release locks regardless of activation outcome — a half-activated
    // changeset still has to free SAP-side locks.
    for (const entry of changeset.entries) {
      try {
        await this.locks.unlock(entry.objectUri, {
          lockHandle: entry.lockHandle,
        });
      } catch (err) {
        this.logger?.warn('changeset: unlock failed during commit', {
          id: changeset.id,
          objectUri: entry.objectUri,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (activationError) {
      // Caller decides how to surface — the service keeps state at
      // `committing` so a later recovery path can try again if SAP is
      // reachable. The MCP/CLI layer will turn this into a user-visible
      // error and clear the session pointer.
      throw activationError;
    }

    changeset.status = 'committed';
    this.logger?.debug('changeset: commit', {
      id: changeset.id,
      activated: result.activated.length,
    });
    return result;
  }

  /**
   * Release every lock (best-effort) and mark the changeset
   * `rolled_back`. Does NOT revert PUT'ed source — see file-level
   * comment for rationale.
   */
  async rollback(changeset: Changeset): Promise<RollbackResult> {
    if (changeset.status === 'committed') {
      throw new Error(`changeset ${changeset.id} is already committed`);
    }
    if (changeset.status === 'rolled_back') {
      return { released: [], failed: [] };
    }

    const result: RollbackResult = { released: [], failed: [] };
    for (const entry of changeset.entries) {
      try {
        await this.locks.unlock(entry.objectUri, {
          lockHandle: entry.lockHandle,
        });
        result.released.push(entry.objectUri);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger?.warn('changeset: unlock failed during rollback', {
          id: changeset.id,
          objectUri: entry.objectUri,
          error: message,
        });
        result.failed.push({ uri: entry.objectUri, error: message });
      }
    }

    changeset.status = 'rolled_back';
    this.logger?.debug('changeset: rollback', {
      id: changeset.id,
      released: result.released.length,
      failed: result.failed.length,
    });
    return result;
  }
}
