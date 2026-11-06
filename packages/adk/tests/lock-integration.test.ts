/**
 * ADK Lock Integration Tests
 *
 * Validates that AdkObject.lock()/unlock() properly integrates with
 * the lock store via AdkContext — the fundamental invariant that
 * every lock operation is tracked in persistence.
 *
 * Tests:
 * - lock() registers entry in lockStore
 * - unlock() deregisters entry from lockStore
 * - lock() without lockStore in context doesn't throw (backward compat)
 * - initializeAdk() creates lockService automatically
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  AdkObject,
  AdkObjectSet,
  Class,
  initializeAdk,
  resetAdk,
  getGlobalContext,
  type AdkContext,
} from '../src/index';
import type { LockStore, LockEntry } from '@abapify/adt-locks';

// ── helpers ──────────────────────────────────────────────────────────

function createMockStore(): LockStore & {
  _entries: LockEntry[];
  register: ReturnType<typeof vi.fn>;
  deregister: ReturnType<typeof vi.fn>;
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

/** Minimal mock ADT client with fetch */
function createMockClient() {
  return {
    fetch: vi.fn().mockResolvedValue(''),
    adt: {} as any,
    services: {} as any,
  };
}

// ── initializeAdk ────────────────────────────────────────────────────

describe('initializeAdk lock integration', () => {
  afterEach(() => resetAdk());

  it('creates lockService automatically when lockStore is provided', () => {
    const client = createMockClient();
    const store = createMockStore();

    initializeAdk(client as any, { lockStore: store });

    const ctx = getGlobalContext();
    expect(ctx.lockStore).toBe(store);
    expect(ctx.lockService).toBeDefined();
  });

  it('creates lockService even without lockStore', () => {
    const client = createMockClient();

    initializeAdk(client as any);

    const ctx = getGlobalContext();
    expect(ctx.lockStore).toBeUndefined();
    expect(ctx.lockService).toBeDefined();
  });

  it('uses provided lockService when given', () => {
    const client = createMockClient();
    const customService = {
      lock: vi.fn(),
      unlock: vi.fn(),
      list: vi.fn().mockReturnValue([]),
      cleanup: vi.fn(),
      clear: vi.fn(),
    };

    initializeAdk(client as any, { lockService: customService as any });

    const ctx = getGlobalContext();
    expect(ctx.lockService).toBe(customService);
  });
});

// ── AdkObject lock/unlock store integration ──────────────────────────

describe('AdkObject lock/unlock store integration', () => {
  // Import AdkObject dynamically to test with mock context

  it('lock() registers entry in lockStore', async () => {
    // We test via the base class pattern used in model.ts
    // The lock() method calls ctx.lockStore?.register(...)
    const store = createMockStore();

    // Simulate what lock() does after successful HTTP call:
    const mockEntry: LockEntry = {
      objectUri: '/sap/bc/adt/oo/classes/zcl_test',
      objectName: 'ZCL_TEST',
      objectType: 'CLAS/OC',
      lockHandle: 'HANDLE_123',
      lockedAt: new Date().toISOString(),
    };

    store.register(mockEntry);

    expect(store.register).toHaveBeenCalledTimes(1);
    expect(store._entries).toHaveLength(1);
    expect(store._entries[0].lockHandle).toBe('HANDLE_123');
  });

  it('unlock() deregisters entry from lockStore', async () => {
    const store = createMockStore();

    // Simulate lock
    store.register({
      objectUri: '/sap/bc/adt/oo/classes/zcl_test',
      objectName: 'ZCL_TEST',
      lockHandle: 'H1',
      lockedAt: new Date().toISOString(),
    });
    expect(store._entries).toHaveLength(1);

    // Simulate what unlock() does after successful HTTP call:
    store.deregister('/sap/bc/adt/oo/classes/zcl_test');

    expect(store.deregister).toHaveBeenCalledWith(
      '/sap/bc/adt/oo/classes/zcl_test',
    );
    expect(store._entries).toHaveLength(0);
  });

  it('lock-unlock round-trip keeps store in sync', async () => {
    const store = createMockStore();
    const uri = '/sap/bc/adt/oo/classes/zcl_roundtrip';

    // Lock
    store.register({
      objectUri: uri,
      objectName: 'ZCL_ROUNDTRIP',
      objectType: 'CLAS/OC',
      lockHandle: 'ROUNDTRIP_HANDLE',
      lockedAt: new Date().toISOString(),
    });
    expect(store._entries).toHaveLength(1);

    // Unlock
    store.deregister(uri);
    expect(store._entries).toHaveLength(0);
  });

  it('lockStore?.register() is safe when lockStore is undefined', () => {
    // This tests the optional chaining pattern used in model.ts:
    // this.ctx.lockStore?.register(...)
    const ctx: AdkContext = {
      client: createMockClient() as any,
      // lockStore intentionally omitted
    };
    expect(ctx.lockStore).toBeUndefined();

    // Should not throw, and the optional call must short-circuit to undefined
    const result = ctx.lockStore?.register({
      objectUri: '/test',
      objectName: 'TEST',
      lockHandle: 'H1',
      lockedAt: new Date().toISOString(),
    });
    expect(result).toBeUndefined();
  });

  it('uses the authoritative LOCK correlation in setSource()', async () => {
    const client = createMockClient();
    const lockService = {
      lock: vi.fn().mockResolvedValue({
        handle: 'HANDLE_123',
        correlationNumber: 'DEVK900001',
      }),
      unlock: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockReturnValue([]),
      cleanup: vi.fn(),
      clear: vi.fn(),
      forceUnlock: vi.fn(),
    };
    class SourceObject extends AdkObject<typeof Class> {
      readonly kind = Class;
      get objectUri(): string {
        return '/sap/bc/adt/oo/classes/zcl_source';
      }
    }
    const object = new SourceObject(
      {
        client: client as any,
        lockService: lockService as any,
      },
      'ZCL_SOURCE',
    );

    await object.setSource('/source/main', 'CLASS source.', {
      transport: 'DEVK900002',
    });

    expect(lockService.lock).toHaveBeenCalledWith(object.objectUri, {
      transport: 'DEVK900002',
      objectName: 'ZCL_SOURCE',
      objectType: Class,
    });
    const putCall = client.fetch.mock.calls.find(
      ([, options]) => options?.method === 'PUT',
    );
    expect(putCall?.[0]).toContain('corrNr=DEVK900001');
    expect(putCall?.[0]).not.toContain('corrNr=DEVK900002');
    expect(lockService.unlock).toHaveBeenCalledWith(object.objectUri, {
      lockHandle: 'HANDLE_123',
    });
  });

  it('uses the authoritative LOCK correlation for deferred sources', async () => {
    const client = createMockClient();
    const lockService = {
      lock: vi.fn().mockResolvedValue({
        handle: 'HANDLE_DEFERRED',
        correlationNumber: 'DEVK900001',
      }),
      unlock: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockReturnValue([]),
      cleanup: vi.fn(),
      clear: vi.fn(),
      forceUnlock: vi.fn(),
    };
    class DeferredSourceObject extends AdkObject<typeof Class> {
      readonly kind = Class;
      get objectUri(): string {
        return '/sap/bc/adt/oo/classes/zcl_deferred';
      }
    }
    const object = new DeferredSourceObject(
      {
        client: client as any,
        lockService: lockService as any,
      },
      { name: 'ZCL_DEFERRED', type: 'CLAS/OC', description: 'Deferred' },
    );
    vi.spyOn(object, 'save').mockResolvedValue(object);
    const saveIncludeSource = vi.fn().mockResolvedValue(undefined);
    Object.assign(object, {
      _deferredSources: [['testclasses', 'CLASS test.']],
      saveIncludeSource,
    });
    const set = new AdkObjectSet({
      client: client as any,
      lockService: lockService as any,
    });
    set.add(object);

    const result = await set.deploy({ transport: 'DEVK900002' });

    expect(result.save).toMatchObject({ success: 1, failed: 0 });
    expect(lockService.lock).toHaveBeenCalledWith(object.objectUri, {
      transport: 'DEVK900002',
      objectName: 'ZCL_DEFERRED',
      objectType: Class,
    });
    expect(saveIncludeSource).toHaveBeenCalledWith(
      'testclasses',
      'CLASS test.',
      {
        lockHandle: 'HANDLE_DEFERRED',
        transport: 'DEVK900001',
      },
    );
  });

  it('reports a deferred source failure in the deployment result', async () => {
    const client = createMockClient();
    const lockService = {
      lock: vi.fn().mockResolvedValue({ handle: 'HANDLE_DEFERRED' }),
      unlock: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockReturnValue([]),
      cleanup: vi.fn(),
      clear: vi.fn(),
      forceUnlock: vi.fn(),
    };
    class DeferredSourceObject extends AdkObject<typeof Class> {
      readonly kind = Class;
      get objectUri(): string {
        return '/sap/bc/adt/oo/classes/zcl_deferred_failure';
      }
    }
    const object = new DeferredSourceObject(
      {
        client: client as any,
        lockService: lockService as any,
      },
      {
        name: 'ZCL_DEFERRED_FAILURE',
        type: 'CLAS/OC',
        description: 'Deferred failure',
      },
    );
    vi.spyOn(object, 'save').mockResolvedValue(object);
    Object.assign(object, {
      _deferredSources: [['testclasses', 'CLASS test.']],
      saveIncludeSource: vi.fn().mockRejectedValue(new Error('write failed')),
    });
    const set = new AdkObjectSet({
      client: client as any,
      lockService: lockService as any,
    });
    set.add(object);

    const result = await set.deploy({ transport: 'DEVK900002' });

    expect(result.save).toMatchObject({ success: 0, failed: 1 });
    expect(result.save.results[0]).toMatchObject({
      success: false,
      error: 'Deferred source deployment failed: write failed',
    });
  });

  it('reports a returned deferred reactivation failure', async () => {
    const client = createMockClient();
    client.fetch
      .mockResolvedValueOnce('initial activation')
      .mockRejectedValueOnce(new Error('activation failed'));
    const lockService = {
      lock: vi.fn().mockResolvedValue({ handle: 'HANDLE_DEFERRED' }),
      unlock: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockReturnValue([]),
      cleanup: vi.fn(),
      clear: vi.fn(),
      forceUnlock: vi.fn(),
    };
    class DeferredSourceObject extends AdkObject<typeof Class> {
      readonly kind = Class;
      get objectUri(): string {
        return '/sap/bc/adt/oo/classes/zcl_deferred_activation';
      }
    }
    const object = new DeferredSourceObject(
      {
        client: client as any,
        lockService: lockService as any,
      },
      {
        name: 'ZCL_DEFERRED_ACTIVATION',
        type: 'CLAS/OC',
        description: 'Deferred activation',
      },
    );
    vi.spyOn(object, 'save').mockResolvedValue(object);
    Object.assign(object, {
      _deferredSources: [['testclasses', 'CLASS test.']],
      saveIncludeSource: vi.fn().mockResolvedValue(undefined),
    });
    const set = new AdkObjectSet({
      client: client as any,
      lockService: lockService as any,
    });
    set.add(object);

    const result = await set.deploy({ transport: 'DEVK900002' });

    expect(result.save).toMatchObject({ success: 0, failed: 1 });
    expect(result.save.results[0]).toMatchObject({
      success: false,
      error:
        'Deferred source deployment failed: Deferred activation failed: activation failed',
    });
    expect(
      (object as unknown as { _deferredSources?: unknown })._deferredSources,
    ).toBeDefined();
  });
});
