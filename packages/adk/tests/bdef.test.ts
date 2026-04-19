/**
 * ADK Behavior Definition (BDEF) Tests
 *
 * Unit tests for AdkBehaviorDefinition — mirrors the structure of cds.test.ts.
 * Verifies object URIs, source read/write, create/delete,
 * and lock/unlock delegation using a mock ADT client.
 */

import { describe, it, expect, vi } from 'vitest';
import { AdkBehaviorDefinition } from '../src/objects/repository/bdef/bdef.model';
import type { AdkContext } from '../src/base/context';

// ── helpers ──────────────────────────────────────────────────────────────────

function createMockLockService() {
  return {
    lock: vi.fn().mockResolvedValue({ handle: 'LOCK_BDEF_1' }),
    unlock: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockBdefContract(getResult: unknown = '') {
  return {
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
  const behaviordefinitions = createMockBdefContract(sourceResult);
  const ctx = {
    client: {
      adt: {
        bo: { behaviordefinitions },
        activation: {
          activate: { post: vi.fn().mockResolvedValue({}) },
        },
      },
      services: {} as any,
    } as any,
    lockService: lockService ?? createMockLockService(),
  } as unknown as AdkContext;
  return { ctx, behaviordefinitions };
}

// ── AdkBehaviorDefinition ────────────────────────────────────────────────────

describe('AdkBehaviorDefinition', () => {
  describe('objectUri', () => {
    it('constructs lowercase BO URI', () => {
      const { ctx } = createCtx();
      const obj = new AdkBehaviorDefinition(ctx, 'ZBP_MY_BDEF');
      expect(obj.objectUri).toBe(
        '/sap/bc/adt/bo/behaviordefinitions/zbp_my_bdef',
      );
    });

    it('upper-cases the name on construction', () => {
      const { ctx } = createCtx();
      const obj = new AdkBehaviorDefinition(ctx, 'zbp_my_bdef');
      expect(obj.name).toBe('ZBP_MY_BDEF');
    });

    it('exposes static and instance kind', () => {
      expect(AdkBehaviorDefinition.kind).toBe('BehaviorDefinition');
      const { ctx } = createCtx();
      expect(new AdkBehaviorDefinition(ctx, 'X').kind).toBe(
        'BehaviorDefinition',
      );
    });
  });

  describe('getSource', () => {
    it('calls bo.behaviordefinitions.source.main.get with object name', async () => {
      const { ctx, behaviordefinitions } = createCtx(
        'managed implementation in class zbp_foo unique;\n',
      );
      const obj = new AdkBehaviorDefinition(ctx, 'ZBP_MY_BDEF');
      const src = await obj.getSource();
      expect(src).toContain('managed implementation');
      expect(behaviordefinitions.source.main.get).toHaveBeenCalledWith(
        'ZBP_MY_BDEF',
      );
    });
  });

  describe('saveMainSource', () => {
    it('PUTs via source.main.put with query + body', async () => {
      const { ctx, behaviordefinitions } = createCtx();
      const obj = new AdkBehaviorDefinition(ctx, 'ZBP_MY_BDEF');
      await obj.saveMainSource('managed ...', {
        lockHandle: 'LH1',
        transport: 'DEVK900001',
      });
      expect(behaviordefinitions.source.main.put).toHaveBeenCalledWith(
        'ZBP_MY_BDEF',
        { lockHandle: 'LH1', corrNr: 'DEVK900001' },
        'managed ...',
      );
    });
  });

  describe('create', () => {
    it('POSTs via bo.behaviordefinitions.post with BDEF/BDO payload', async () => {
      const { ctx, behaviordefinitions } = createCtx();
      await AdkBehaviorDefinition.create(
        'ZBP_MY_BDEF',
        'Mock BDEF',
        'ZTEST',
        { transport: 'DEVK900001' },
        ctx,
      );
      expect(behaviordefinitions.post).toHaveBeenCalledTimes(1);
      const [query, body] = behaviordefinitions.post.mock.calls[0];
      expect(query).toEqual({ corrNr: 'DEVK900001' });
      expect(body.blueSource).toMatchObject({
        name: 'ZBP_MY_BDEF',
        type: 'BDEF/BDO',
        description: 'Mock BDEF',
        packageRef: expect.objectContaining({ name: 'ZTEST' }),
      });
    });
  });

  describe('lock', () => {
    it('delegates to lockService with BDEF type', async () => {
      const lockService = createMockLockService();
      const { ctx } = createCtx('', lockService);
      const obj = new AdkBehaviorDefinition(ctx, 'ZBP_MY_BDEF');
      const handle = await obj.lock('DEVK900001');
      expect(lockService.lock).toHaveBeenCalledWith(
        '/sap/bc/adt/bo/behaviordefinitions/zbp_my_bdef',
        expect.objectContaining({
          objectName: 'ZBP_MY_BDEF',
          objectType: 'BDEF',
          transport: 'DEVK900001',
        }),
      );
      expect(handle.handle).toBe('LOCK_BDEF_1');
    });

    it('throws when no lockService in context', async () => {
      const { ctx } = createCtx();
      (ctx as any).lockService = undefined;
      const obj = new AdkBehaviorDefinition(ctx, 'ZBP_MY_BDEF');
      await expect(obj.lock()).rejects.toThrow('Lock not available');
    });
  });

  describe('unlock', () => {
    it('delegates to lockService.unlock', async () => {
      const lockService = createMockLockService();
      const { ctx } = createCtx('', lockService);
      const obj = new AdkBehaviorDefinition(ctx, 'ZBP_MY_BDEF');
      await obj.unlock('LH1');
      expect(lockService.unlock).toHaveBeenCalledWith(
        '/sap/bc/adt/bo/behaviordefinitions/zbp_my_bdef',
        { lockHandle: 'LH1' },
      );
    });
  });

  describe('delete', () => {
    it('calls bo.behaviordefinitions.delete with transport param', async () => {
      const { ctx, behaviordefinitions } = createCtx();
      await AdkBehaviorDefinition.delete(
        'ZBP_MY_BDEF',
        { transport: 'DEVK900001' },
        ctx,
      );
      expect(behaviordefinitions.delete).toHaveBeenCalledWith('ZBP_MY_BDEF', {
        corrNr: 'DEVK900001',
      });
    });
  });
});
