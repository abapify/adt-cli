/**
 * ADK BAdI / Enhancement Implementation (ENHO/XHH) Tests
 *
 * Mirrors the bdef test structure — verifies object URI construction,
 * source read/write, create/delete, and lock/unlock delegation using a
 * mock ADT client.
 */

import { describe, it, expect, vi } from 'vitest';
import { AdkBadi } from '../src/objects/repository/badi/badi.model';
import type { AdkContext } from '../src/base/context';

// ── helpers ──────────────────────────────────────────────────────────────────

function createMockLockService() {
  return {
    lock: vi.fn().mockResolvedValue({ handle: 'LOCK_BADI_1' }),
    unlock: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockBadiContract(getResult: unknown = '') {
  return {
    get: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(undefined),
    source: {
      main: {
        get: vi.fn().mockResolvedValue(getResult),
        put: vi.fn().mockResolvedValue(undefined),
      },
    },
  };
}

function createCtx(
  sourceResult: unknown = '',
  lockService?: ReturnType<typeof createMockLockService>,
) {
  const enhoxhh = createMockBadiContract(sourceResult);
  const ctx = {
    client: {
      adt: {
        enhancements: { enhoxhh },
        activation: {
          activate: { post: vi.fn().mockResolvedValue({}) },
        },
      },
      services: {} as any,
    } as any,
    lockService: lockService ?? createMockLockService(),
  } as unknown as AdkContext;
  return { ctx, enhoxhh };
}

// ── AdkBadi ─────────────────────────────────────────────────────────────────

describe('AdkBadi (ENHO/XHH)', () => {
  describe('objectUri', () => {
    it('constructs lowercase ENHO URI', () => {
      const { ctx } = createCtx();
      const obj = new AdkBadi(ctx, 'ZE_MY_BADI');
      expect(obj.objectUri).toBe('/sap/bc/adt/enhancements/enhoxhh/ze_my_badi');
    });

    it('upper-cases the name on construction', () => {
      const { ctx } = createCtx();
      const obj = new AdkBadi(ctx, 'ze_my_badi');
      expect(obj.name).toBe('ZE_MY_BADI');
    });

    it('exposes static and instance kind', () => {
      expect(AdkBadi.kind).toBe('Badi');
      const { ctx } = createCtx();
      expect(new AdkBadi(ctx, 'X').kind).toBe('Badi');
    });
  });

  describe('getSource', () => {
    it('delegates to enhoxhh.source.main.get', async () => {
      const { ctx, enhoxhh } = createCtx('CLASS lcl_badi_impl ...\n');
      const obj = new AdkBadi(ctx, 'ZE_MY_BADI');
      const src = await obj.getSource();
      expect(src).toContain('lcl_badi_impl');
      expect(enhoxhh.source.main.get).toHaveBeenCalledWith('ZE_MY_BADI');
    });
  });

  describe('saveMainSource', () => {
    it('PUTs via source.main.put with query + body', async () => {
      const { ctx, enhoxhh } = createCtx();
      const obj = new AdkBadi(ctx, 'ZE_MY_BADI');
      await obj.saveMainSource('new source', {
        lockHandle: 'LH1',
        transport: 'DEVK900001',
      });
      expect(enhoxhh.source.main.put).toHaveBeenCalledWith(
        'ZE_MY_BADI',
        { lockHandle: 'LH1', corrNr: 'DEVK900001' },
        'new source',
      );
    });
  });

  describe('create', () => {
    it('POSTs with ENHO/XHH envelope', async () => {
      const { ctx, enhoxhh } = createCtx();
      await AdkBadi.create(
        'ZE_MY_BADI',
        'Mock BAdI',
        'ZTEST',
        { transport: 'DEVK900001' },
        ctx,
      );
      expect(enhoxhh.post).toHaveBeenCalledTimes(1);
      const [query, body] = enhoxhh.post.mock.calls[0];
      expect(query).toEqual({ corrNr: 'DEVK900001' });
      expect(body.enhancementImplementation).toMatchObject({
        name: 'ZE_MY_BADI',
        type: 'ENHO/XHH',
        description: 'Mock BAdI',
        packageRef: expect.objectContaining({ name: 'ZTEST' }),
      });
    });
  });

  describe('lock', () => {
    it('delegates to lockService with ENHO type', async () => {
      const lockService = createMockLockService();
      const { ctx } = createCtx('', lockService);
      const obj = new AdkBadi(ctx, 'ZE_MY_BADI');
      const handle = await obj.lock('DEVK900001');
      expect(lockService.lock).toHaveBeenCalledWith(
        '/sap/bc/adt/enhancements/enhoxhh/ze_my_badi',
        expect.objectContaining({
          objectName: 'ZE_MY_BADI',
          objectType: 'ENHO',
          transport: 'DEVK900001',
        }),
      );
      expect(handle.handle).toBe('LOCK_BADI_1');
    });

    it('throws when no lockService in context', async () => {
      const { ctx } = createCtx();
      (ctx as any).lockService = undefined;
      const obj = new AdkBadi(ctx, 'ZE_MY_BADI');
      await expect(obj.lock()).rejects.toThrow('Lock not available');
    });
  });

  describe('unlock', () => {
    it('delegates to lockService.unlock', async () => {
      const lockService = createMockLockService();
      const { ctx } = createCtx('', lockService);
      const obj = new AdkBadi(ctx, 'ZE_MY_BADI');
      await obj.unlock('LH1');
      expect(lockService.unlock).toHaveBeenCalledWith(
        '/sap/bc/adt/enhancements/enhoxhh/ze_my_badi',
        { lockHandle: 'LH1' },
      );
    });
  });

  describe('delete', () => {
    it('calls enhoxhh.delete with transport + lockHandle', async () => {
      const { ctx, enhoxhh } = createCtx();
      await AdkBadi.delete(
        'ZE_MY_BADI',
        { transport: 'DEVK900001', lockHandle: 'LH9' },
        ctx,
      );
      expect(enhoxhh.delete).toHaveBeenCalledWith('ZE_MY_BADI', {
        corrNr: 'DEVK900001',
        lockHandle: 'LH9',
      });
    });
  });
});
