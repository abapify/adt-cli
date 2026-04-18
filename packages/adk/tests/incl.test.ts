/**
 * ADK Include Object Tests
 *
 * Unit tests for AdkInclude: object URIs, lock/unlock delegation, save
 * orchestration, source read/write, and delete — all with a mock ADT
 * client so tests don't require a running SAP system.
 *
 * Mirrors tests/cds.test.ts in structure.
 */

import { describe, it, expect, vi } from 'vitest';
import { AdkInclude } from '../src/objects/repository/incl/incl.model';
import type { AdkContext } from '../src/base/context';

// ── helpers ──────────────────────────────────────────────────────────────────

function createMockLockService() {
  return {
    lock: vi.fn().mockResolvedValue({ handle: 'LOCK_ABC123' }),
    unlock: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * Mock the client.adt.programs.includes surface — matches the CRUD contract
 * shape produced by `crud({ ... sources: ['main'] })`.
 */
function createMockIncludesContract(getResult: unknown = { abapInclude: {} }) {
  return {
    get: vi.fn().mockResolvedValue(getResult),
    post: vi.fn().mockResolvedValue({}),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    lock: vi.fn().mockResolvedValue({ handle: 'LOCK_ABC123' }),
    unlock: vi.fn().mockResolvedValue(undefined),
    source: {
      main: {
        get: vi.fn().mockResolvedValue('REPORT zmy_incl. " test'),
        put: vi.fn().mockResolvedValue(undefined),
      },
    },
  };
}

function createCtx(
  getResult: unknown = {
    abapInclude: {
      name: 'ZTEST_INCLUDE',
      type: 'PROG/I',
      description: 'Test Include',
      version: 'active',
    },
  },
  lockService?: ReturnType<typeof createMockLockService>,
  options: { getThrows?: boolean } = {},
) {
  const includes = createMockIncludesContract(getResult);
  if (options.getThrows) {
    // Simulate 404 only on the first existence check so save()'s create
    // path hits .post. Subsequent GETs (used by the recursive update
    // step) return the standard metadata so the flow completes cleanly.
    const first = vi
      .fn()
      .mockRejectedValueOnce(new Error('HTTP 404 Not Found'))
      .mockResolvedValue(getResult);
    includes.get = first as any;
  }
  const ctx = {
    client: {
      adt: {
        programs: {
          includes,
        },
        activation: {
          activate: { post: vi.fn().mockResolvedValue({}) },
        },
      },
      services: {} as any,
    } as any,
    lockService: lockService ?? createMockLockService(),
  } as unknown as AdkContext;
  return { ctx, includes };
}

// ── AdkInclude ──────────────────────────────────────────────────────────────

describe('AdkInclude', () => {
  it('objectUri constructs lowercase URI for the include', () => {
    const { ctx } = createCtx();
    const obj = new AdkInclude(ctx, 'ZTEST_INCLUDE');
    expect(obj.objectUri).toBe('/sap/bc/adt/programs/includes/ztest_include');
  });

  it('AdkInclude.get loads metadata via includes.get', async () => {
    const { ctx, includes } = createCtx();
    const obj = await AdkInclude.get('ZTEST_INCLUDE', ctx);
    expect(includes.get).toHaveBeenCalledWith('ZTEST_INCLUDE');
    expect(obj.name).toBe('ZTEST_INCLUDE');
  });

  it('getSource calls includes.source.main.get and caches via lazy()', async () => {
    const { ctx, includes } = createCtx();
    const obj = new AdkInclude(ctx, 'ZTEST_INCLUDE');
    const src1 = await obj.getSource();
    const src2 = await obj.getSource();
    expect(src1).toBe('REPORT zmy_incl. " test');
    expect(src2).toBe(src1);
    // lazy() memoizes — the underlying contract should be hit exactly once
    expect(includes.source.main.get).toHaveBeenCalledTimes(1);
    expect(includes.source.main.get).toHaveBeenCalledWith('ZTEST_INCLUDE');
  });

  it('AdkInclude.create POSTs skeleton to includes.post (with transport)', async () => {
    const { ctx, includes } = createCtx(undefined, undefined, {
      getThrows: true,
    });
    await AdkInclude.create(
      'ZTEST_INCLUDE',
      'Test Include',
      '$TMP',
      { transport: 'DEVK900001' },
      ctx,
    );
    // save({ mode: 'create' }) invokes saveViaContract('create') which
    // delegates to includes.post with the skeleton body once the
    // existence check has returned false (we simulated 404).
    expect(includes.post).toHaveBeenCalledTimes(1);
    const [queryArg, bodyArg] = includes.post.mock.calls[0];
    expect(queryArg).toMatchObject({ corrNr: 'DEVK900001' });
    expect(bodyArg).toMatchObject({
      abapInclude: expect.objectContaining({
        name: 'ZTEST_INCLUDE',
        type: 'PROG/I',
        description: 'Test Include',
      }),
    });
  });

  it('AdkInclude.create with master sets contextRef to the main program', async () => {
    const { ctx, includes } = createCtx(undefined, undefined, {
      getThrows: true,
    });
    await AdkInclude.create(
      'ZTEST_INCLUDE',
      'Test Include',
      '$TMP',
      { master: 'ZTEST_PROGRAM' },
      ctx,
    );
    expect(includes.post).toHaveBeenCalledTimes(1);
    const [, bodyArg] = includes.post.mock.calls[0];
    expect(bodyArg.abapInclude.contextRef).toMatchObject({
      name: 'ZTEST_PROGRAM',
      type: 'PROG/P',
      uri: '/sap/bc/adt/programs/programs/ztest_program',
    });
  });

  it('lock delegates to lockService with correct URI and type', async () => {
    const lockService = createMockLockService();
    const { ctx } = createCtx(undefined, lockService);
    const obj = new AdkInclude(ctx, 'ZTEST_INCLUDE');
    const handle = await obj.lock('DEVK900001');
    expect(lockService.lock).toHaveBeenCalledWith(
      '/sap/bc/adt/programs/includes/ztest_include',
      expect.objectContaining({
        objectName: 'ZTEST_INCLUDE',
        transport: 'DEVK900001',
      }),
    );
    expect(handle.handle).toBe('LOCK_ABC123');
  });

  it('lock throws when no lockService in context', async () => {
    const { ctx } = createCtx();
    (ctx as any).lockService = undefined;
    const obj = new AdkInclude(ctx, 'ZTEST_INCLUDE');
    await expect(obj.lock()).rejects.toThrow('Lock not available');
  });

  it('unlock delegates to lockService.unlock after lock was acquired', async () => {
    const lockService = createMockLockService();
    const { ctx } = createCtx(undefined, lockService);
    const obj = new AdkInclude(ctx, 'ZTEST_INCLUDE');
    await obj.lock();
    await obj.unlock();
    expect(lockService.unlock).toHaveBeenCalledWith(
      '/sap/bc/adt/programs/includes/ztest_include',
      expect.objectContaining({ lockHandle: 'LOCK_ABC123' }),
    );
  });

  it('AdkInclude.delete calls includes.delete with transport + lockHandle', async () => {
    const { ctx, includes } = createCtx();
    await AdkInclude.delete(
      'ZTEST_INCLUDE',
      { transport: 'DEVK900001', lockHandle: 'LH99' },
      ctx,
    );
    expect(includes.delete).toHaveBeenCalledWith('ZTEST_INCLUDE', {
      corrNr: 'DEVK900001',
      lockHandle: 'LH99',
    });
  });
});
