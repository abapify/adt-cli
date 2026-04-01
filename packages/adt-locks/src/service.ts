/**
 * Lock Service — lock/unlock ADT objects via REST API
 *
 * Provides standalone lock/unlock operations that work with any
 * object URI. Optionally integrates with a LockStore for persistence.
 *
 * Usage:
 *   import { createLockService, FileLockStore } from '@abapify/adt-locks';
 *
 *   const locks = createLockService(client, { store: new FileLockStore() });
 *   const handle = await locks.lock('/sap/bc/adt/oo/classes/zcl_test');
 *   await locks.unlock('/sap/bc/adt/oo/classes/zcl_test', handle);
 */

import type { LockHandle, LockEntry } from './types';
import type { LockStore } from './store';

/** Minimal client interface — anything with an authenticated fetch() */
export interface LockClient {
  fetch(
    url: string,
    options?: {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
    },
  ): Promise<unknown>;
}

export interface LockServiceOptions {
  /** Optional lock store for persistence */
  store?: LockStore;
}

export interface LockOptions {
  /** Transport request */
  transport?: string;
  /** Object name (for store metadata) */
  objectName?: string;
  /** Object type (for store metadata) */
  objectType?: string;
}

export interface UnlockOptions {
  /** Lock handle — REQUIRED. SAP always requires an explicit handle for unlock. */
  lockHandle: string;
}

/**
 * Parse SAP lock response XML to extract lock handle and correlation info.
 *
 * Response format:
 * ```xml
 * <asx:abap>...<DATA>
 *   <LOCK_HANDLE>xxx</LOCK_HANDLE>
 *   <CORRNR>yyy</CORRNR>
 *   <CORRUSER>zzz</CORRUSER>
 * </DATA>...</asx:abap>
 * ```
 */
export function parseLockResponse(xml: string): LockHandle {
  const handleMatch = xml.match(/<LOCK_HANDLE>([^<]+)<\/LOCK_HANDLE>/);
  if (!handleMatch) {
    throw new Error(
      'Failed to parse lock handle from SAP response. The response format may have changed.',
    );
  }
  const corrNrMatch = xml.match(/<CORRNR>([^<]+)<\/CORRNR>/);
  const corrUserMatch = xml.match(/<CORRUSER>([^<]+)<\/CORRUSER>/);

  return {
    handle: handleMatch[1],
    correlationNumber: corrNrMatch?.[1],
    correlationUser: corrUserMatch?.[1],
  };
}

export interface LockService {
  /** Acquire a lock on an ADT object */
  lock(objectUri: string, options?: LockOptions): Promise<LockHandle>;
  /** Release a lock on an ADT object (lock handle required) */
  unlock(objectUri: string, options: UnlockOptions): Promise<void>;
  /**
   * Force-unlock: acquire a lock to recover the handle, then immediately unlock.
   * Works when the object is locked by the current user but the handle was lost
   * (e.g., crashed session). If the object is locked by another user, the lock
   * call will fail with 403/409.
   */
  forceUnlock(objectUri: string, options?: LockOptions): Promise<void>;
  /** List all persisted lock entries (from store) */
  list(): LockEntry[];
  /** Try to UNLOCK every persisted entry, removing successful ones from store */
  cleanup(): Promise<{ ok: number; failed: number }>;
  /** Clear the store without sending any UNLOCK requests */
  clear(): void;
}

export function createLockService(
  client: LockClient,
  serviceOptions?: LockServiceOptions,
): LockService {
  const store = serviceOptions?.store;

  /** Headers for lock operations — stateful session with security session reuse */
  const lockHeaders = {
    'X-sap-adt-sessiontype': 'stateful',
    'x-sap-security-session': 'use',
    Accept:
      'application/*,application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.lock.result',
  };

  /** Headers for unlock operations */
  const unlockHeaders = {
    'X-sap-adt-sessiontype': 'stateful',
    'x-sap-security-session': 'use',
  };

  return {
    async lock(objectUri, options) {
      const query = options?.transport
        ? `?_action=LOCK&accessMode=MODIFY&corrNr=${options.transport}`
        : '?_action=LOCK&accessMode=MODIFY';

      const response = await client.fetch(`${objectUri}${query}`, {
        method: 'POST',
        headers: lockHeaders,
      });

      const handle = parseLockResponse(String(response));

      store?.register({
        objectUri,
        objectName:
          options?.objectName ?? objectUri.split('/').pop() ?? objectUri,
        objectType: options?.objectType,
        lockHandle: handle.handle,
        transport: handle.correlationNumber,
        lockedAt: new Date().toISOString(),
      });

      return handle;
    },

    async unlock(objectUri, options) {
      const query = `?_action=UNLOCK&accessMode=MODIFY&lockHandle=${encodeURIComponent(options.lockHandle)}`;

      await client.fetch(`${objectUri}${query}`, {
        method: 'POST',
        headers: unlockHeaders,
      });

      store?.deregister(objectUri);
    },

    async forceUnlock(objectUri, options) {
      // Lock to recover/acquire the handle, then immediately unlock
      const handle = await this.lock(objectUri, options);
      await this.unlock(objectUri, { lockHandle: handle.handle });
    },

    list() {
      return store?.list() ?? [];
    },

    async cleanup() {
      const entries = store?.list() ?? [];
      let ok = 0;
      let failed = 0;

      for (const entry of entries) {
        try {
          const query = `?_action=UNLOCK&accessMode=MODIFY&lockHandle=${encodeURIComponent(entry.lockHandle)}`;
          await client.fetch(`${entry.objectUri}${query}`, {
            method: 'POST',
            headers: unlockHeaders,
          });
          store?.deregister(entry.objectUri);
          ok++;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes('not locked') || msg.includes('not enqueued')) {
            store?.deregister(entry.objectUri);
            ok++;
          } else {
            failed++;
          }
        }
      }

      return { ok, failed };
    },

    clear() {
      store?.clear();
    },
  };
}
