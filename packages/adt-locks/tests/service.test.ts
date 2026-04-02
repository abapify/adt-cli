/**
 * LockService unit tests
 *
 * Validates that createLockService:
 * - Sends correct HTTP requests for lock/unlock
 * - Parses lock responses and returns LockHandle
 * - Registers entries in the store on lock
 * - Deregisters entries from the store on unlock
 * - cleanup() unlocks all entries and removes from store
 * - Handles "not locked" errors gracefully in cleanup
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLockService } from '../src/service';
import type { LockStore } from '../src/store';
import type { LockEntry } from '../src/types';
import type { LockClient } from '../src/service';

// ── helpers ──────────────────────────────────────────────────────────

const LOCK_RESPONSE_XML = `<DATA>
  <LOCK_HANDLE>HANDLE_XYZ</LOCK_HANDLE>
  <CORRNR>DEVK900001</CORRNR>
  <CORRUSER>DEVELOPER</CORRUSER>
</DATA>`;

function createMockClient(fetchImpl?: LockClient['fetch']): LockClient {
  return {
    fetch: fetchImpl ?? vi.fn().mockResolvedValue(LOCK_RESPONSE_XML),
  };
}

function createMockStore(): LockStore & {
  _entries: LockEntry[];
  register: ReturnType<typeof vi.fn>;
  deregister: ReturnType<typeof vi.fn>;
  list: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
} {
  const entries: LockEntry[] = [];
  return {
    _entries: entries,
    register: vi.fn((entry: LockEntry) => {
      const idx = entries.findIndex((e) => e.objectUri === entry.objectUri);
      if (idx >= 0) entries[idx] = entry;
      else entries.push(entry);
    }),
    deregister: vi.fn((uri: string) => {
      const idx = entries.findIndex((e) => e.objectUri === uri);
      if (idx >= 0) entries.splice(idx, 1);
    }),
    list: vi.fn(() => [...entries]),
    clear: vi.fn(() => {
      entries.length = 0;
    }),
  };
}

// ── lock ─────────────────────────────────────────────────────────────

describe('LockService.lock()', () => {
  it('sends POST with _action=LOCK&accessMode=MODIFY', async () => {
    const client = createMockClient();
    const service = createLockService(client);

    await service.lock('/sap/bc/adt/oo/classes/zcl_test');

    expect(client.fetch).toHaveBeenCalledWith(
      '/sap/bc/adt/oo/classes/zcl_test?_action=LOCK&accessMode=MODIFY',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('includes transport in query when provided', async () => {
    const client = createMockClient();
    const service = createLockService(client);

    await service.lock('/sap/bc/adt/oo/classes/zcl_test', {
      transport: 'DEVK900001',
    });

    expect(client.fetch).toHaveBeenCalledWith(
      '/sap/bc/adt/oo/classes/zcl_test?_action=LOCK&accessMode=MODIFY&corrNr=DEVK900001',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('returns parsed LockHandle', async () => {
    const client = createMockClient();
    const service = createLockService(client);

    const handle = await service.lock('/sap/bc/adt/oo/classes/zcl_test');

    expect(handle.handle).toBe('HANDLE_XYZ');
    expect(handle.correlationNumber).toBe('DEVK900001');
    expect(handle.correlationUser).toBe('DEVELOPER');
  });

  it('registers entry in store after successful lock', async () => {
    const client = createMockClient();
    const store = createMockStore();
    const service = createLockService(client, { store });

    await service.lock('/sap/bc/adt/oo/classes/zcl_test', {
      objectName: 'ZCL_TEST',
      objectType: 'CLAS/OC',
    });

    expect(store.register).toHaveBeenCalledTimes(1);
    expect(store.register).toHaveBeenCalledWith(
      expect.objectContaining({
        objectUri: '/sap/bc/adt/oo/classes/zcl_test',
        objectName: 'ZCL_TEST',
        objectType: 'CLAS/OC',
        lockHandle: 'HANDLE_XYZ',
        transport: 'DEVK900001',
      }),
    );
  });

  it('derives objectName from URI when not provided', async () => {
    const client = createMockClient();
    const store = createMockStore();
    const service = createLockService(client, { store });

    await service.lock('/sap/bc/adt/oo/classes/zcl_my_class');

    expect(store.register).toHaveBeenCalledWith(
      expect.objectContaining({
        objectName: 'zcl_my_class',
      }),
    );
  });

  it('does not register in store when no store is provided', async () => {
    const client = createMockClient();
    const service = createLockService(client); // no store

    // Should not throw
    const handle = await service.lock('/sap/bc/adt/oo/classes/zcl_test');
    expect(handle.handle).toBe('HANDLE_XYZ');
  });

  it('throws when lock HTTP call fails', async () => {
    const client = createMockClient(
      vi.fn().mockRejectedValue(new Error('403 Forbidden')),
    );
    const store = createMockStore();
    const service = createLockService(client, { store });

    await expect(
      service.lock('/sap/bc/adt/oo/classes/zcl_test'),
    ).rejects.toThrow('403 Forbidden');

    // Store should NOT be called on failure
    expect(store.register).not.toHaveBeenCalled();
  });
});

// ── unlock ───────────────────────────────────────────────────────────

describe('LockService.unlock()', () => {
  it('sends POST with _action=UNLOCK and lockHandle', async () => {
    const client = createMockClient(vi.fn().mockResolvedValue(''));
    const service = createLockService(client);

    await service.unlock('/sap/bc/adt/oo/classes/zcl_test', {
      lockHandle: 'HANDLE_XYZ',
    });

    expect(client.fetch).toHaveBeenCalledWith(
      '/sap/bc/adt/oo/classes/zcl_test?_action=UNLOCK&accessMode=MODIFY&lockHandle=HANDLE_XYZ',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('deregisters entry from store after successful unlock', async () => {
    const client = createMockClient(vi.fn().mockResolvedValue(''));
    const store = createMockStore();
    const service = createLockService(client, { store });

    // Pre-populate store
    store.register({
      objectUri: '/sap/bc/adt/oo/classes/zcl_test',
      objectName: 'ZCL_TEST',
      lockHandle: 'H1',
      lockedAt: new Date().toISOString(),
    });

    await service.unlock('/sap/bc/adt/oo/classes/zcl_test', {
      lockHandle: 'H1',
    });

    expect(store.deregister).toHaveBeenCalledWith(
      '/sap/bc/adt/oo/classes/zcl_test',
    );
  });

  it('URL-encodes lock handles with special characters', async () => {
    const client = createMockClient(vi.fn().mockResolvedValue(''));
    const service = createLockService(client);

    await service.unlock('/sap/bc/adt/oo/classes/zcl_test', {
      lockHandle: 'H+A/N=D LE',
    });

    expect(client.fetch).toHaveBeenCalledWith(
      expect.stringContaining('lockHandle=H%2BA%2FN%3DD%20LE'),
      expect.anything(),
    );
  });
});

// ── forceUnlock ──────────────────────────────────────────────────────

describe('LockService.forceUnlock()', () => {
  it('locks to recover handle, then unlocks with that handle', async () => {
    let callCount = 0;
    const client = createMockClient(
      vi.fn().mockImplementation(() => {
        callCount++;
        // First call is lock → return XML with handle
        // Second call is unlock → return empty
        return callCount === 1
          ? Promise.resolve(LOCK_RESPONSE_XML)
          : Promise.resolve('');
      }),
    );
    const store = createMockStore();
    const service = createLockService(client, { store });

    await service.forceUnlock('/sap/bc/adt/oo/classes/zcl_test');

    // Should have called fetch twice: lock then unlock
    expect(client.fetch).toHaveBeenCalledTimes(2);

    // First call: LOCK
    expect(client.fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('_action=LOCK'),
      expect.objectContaining({ method: 'POST' }),
    );

    // Second call: UNLOCK with the recovered handle
    expect(client.fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining(
        '_action=UNLOCK&accessMode=MODIFY&lockHandle=HANDLE_XYZ',
      ),
      expect.objectContaining({ method: 'POST' }),
    );

    // Store should be empty after force-unlock (registered on lock, deregistered on unlock)
    expect(store._entries).toHaveLength(0);
  });

  it('propagates lock errors (e.g., locked by another user)', async () => {
    const client = createMockClient(
      vi
        .fn()
        .mockRejectedValue(new Error('403 Forbidden - locked by OTHERUSER')),
    );
    const service = createLockService(client);

    await expect(
      service.forceUnlock('/sap/bc/adt/oo/classes/zcl_test'),
    ).rejects.toThrow('403 Forbidden');
  });

  it('passes transport option through to lock', async () => {
    let callCount = 0;
    const client = createMockClient(
      vi.fn().mockImplementation(() => {
        callCount++;
        return callCount === 1
          ? Promise.resolve(LOCK_RESPONSE_XML)
          : Promise.resolve('');
      }),
    );
    const service = createLockService(client);

    await service.forceUnlock('/sap/bc/adt/oo/classes/zcl_test', {
      transport: 'DEVK900001',
    });

    // Lock call should include transport
    expect(client.fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('corrNr=DEVK900001'),
      expect.anything(),
    );
  });
});

// ── cleanup ──────────────────────────────────────────────────────────

describe('LockService.cleanup()', () => {
  it('unlocks all entries and removes them from store', async () => {
    const client = createMockClient(vi.fn().mockResolvedValue(''));
    const store = createMockStore();
    const service = createLockService(client, { store });

    store.register({
      objectUri: '/a',
      objectName: 'A',
      lockHandle: 'H1',
      lockedAt: new Date().toISOString(),
    });
    store.register({
      objectUri: '/b',
      objectName: 'B',
      lockHandle: 'H2',
      lockedAt: new Date().toISOString(),
    });

    const { ok, failed } = await service.cleanup();

    expect(ok).toBe(2);
    expect(failed).toBe(0);
    expect(store._entries).toHaveLength(0);
  });

  it('treats "not locked" errors as success (stale entry)', async () => {
    const client = createMockClient(
      vi
        .fn()
        .mockRejectedValue(new Error('Object is not locked or not enqueued')),
    );
    const store = createMockStore();
    const service = createLockService(client, { store });

    store.register({
      objectUri: '/a',
      objectName: 'A',
      lockHandle: 'H1',
      lockedAt: new Date().toISOString(),
    });

    const { ok, failed } = await service.cleanup();

    expect(ok).toBe(1);
    expect(failed).toBe(0);
    expect(store._entries).toHaveLength(0);
  });

  it('counts real errors as failures and keeps entries', async () => {
    const client = createMockClient(
      vi.fn().mockRejectedValue(new Error('500 Internal Server Error')),
    );
    const store = createMockStore();
    const service = createLockService(client, { store });

    store.register({
      objectUri: '/a',
      objectName: 'A',
      lockHandle: 'H1',
      lockedAt: new Date().toISOString(),
    });

    const { ok, failed } = await service.cleanup();

    expect(ok).toBe(0);
    expect(failed).toBe(1);
    expect(store._entries).toHaveLength(1);
  });

  it('returns 0/0 when store is empty', async () => {
    const client = createMockClient();
    const store = createMockStore();
    const service = createLockService(client, { store });

    const { ok, failed } = await service.cleanup();

    expect(ok).toBe(0);
    expect(failed).toBe(0);
  });
});

// ── list / clear ─────────────────────────────────────────────────────

describe('LockService.list() / clear()', () => {
  it('list() returns entries from store', () => {
    const client = createMockClient();
    const store = createMockStore();
    const service = createLockService(client, { store });

    store.register({
      objectUri: '/a',
      objectName: 'A',
      lockHandle: 'H1',
      lockedAt: new Date().toISOString(),
    });

    expect(service.list()).toHaveLength(1);
    expect(service.list()[0].objectUri).toBe('/a');
  });

  it('list() returns empty array without store', () => {
    const client = createMockClient();
    const service = createLockService(client); // no store

    expect(service.list()).toEqual([]);
  });

  it('clear() empties the store without HTTP calls', () => {
    const client = createMockClient();
    const store = createMockStore();
    const service = createLockService(client, { store });

    store.register({
      objectUri: '/a',
      objectName: 'A',
      lockHandle: 'H1',
      lockedAt: new Date().toISOString(),
    });

    service.clear();

    expect(store.clear).toHaveBeenCalledTimes(1);
    // fetch should NOT be called — clear is local only
    expect(client.fetch).not.toHaveBeenCalled();
  });
});

// ── lock + unlock round-trip ─────────────────────────────────────────

describe('LockService round-trip', () => {
  it('lock then unlock keeps store in sync', async () => {
    let callCount = 0;
    const client = createMockClient(
      vi.fn().mockImplementation(() => {
        callCount++;
        // First call is lock → return XML
        // Second call is unlock → return empty
        return callCount === 1
          ? Promise.resolve(LOCK_RESPONSE_XML)
          : Promise.resolve('');
      }),
    );
    const store = createMockStore();
    const service = createLockService(client, { store });

    // Lock
    const handle = await service.lock('/sap/bc/adt/oo/classes/zcl_test', {
      objectName: 'ZCL_TEST',
    });
    expect(store._entries).toHaveLength(1);

    // Unlock
    await service.unlock('/sap/bc/adt/oo/classes/zcl_test', {
      lockHandle: handle.handle,
    });
    expect(store._entries).toHaveLength(0);
  });
});
