/**
 * ADK Service Definition (SRVD) Tests
 *
 * Unit tests for AdkServiceDefinition — mirrors the structure of bdef.test.ts.
 * Verifies object URIs, source read/write, create/delete,
 * and lock/unlock delegation using a mock ADT client.
 */

import { describe, it, expect, vi } from 'vitest';
import { AdkServiceDefinition } from '../src/objects/repository/srvd/srvd.model';
import type { AdkContext } from '../src/base/context';

// ── helpers ──────────────────────────────────────────────────────────────────

function createMockLockService() {
  return {
    lock: vi.fn().mockResolvedValue({ handle: 'LOCK_SRVD_1' }),
    unlock: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockSrvdContract(getResult: unknown = '') {
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
  const sources = createMockSrvdContract(sourceResult);
  const ctx = {
    client: {
      adt: {
        ddic: { srvd: { sources } },
        activation: {
          activate: { post: vi.fn().mockResolvedValue({}) },
        },
      },
      services: {} as any,
    } as any,
    lockService: lockService ?? createMockLockService(),
  } as unknown as AdkContext;
  return { ctx, sources };
}

// ── AdkServiceDefinition ─────────────────────────────────────────────────────

describe('AdkServiceDefinition', () => {
  describe('objectUri', () => {
    it('constructs lowercase SRVD URI', () => {
      const { ctx } = createCtx();
      const obj = new AdkServiceDefinition(ctx, 'ZUI_MOCK_SRVD');
      expect(obj.objectUri).toBe('/sap/bc/adt/ddic/srvd/sources/zui_mock_srvd');
    });

    it('upper-cases the name on construction', () => {
      const { ctx } = createCtx();
      const obj = new AdkServiceDefinition(ctx, 'zui_mock_srvd');
      expect(obj.name).toBe('ZUI_MOCK_SRVD');
    });

    it('exposes static and instance kind', () => {
      expect(AdkServiceDefinition.kind).toBe('ServiceDefinition');
      const { ctx } = createCtx();
      expect(new AdkServiceDefinition(ctx, 'X').kind).toBe('ServiceDefinition');
    });
  });

  describe('getSource', () => {
    it('calls ddic.srvd.sources.source.main.get with object name', async () => {
      const { ctx, sources } = createCtx(
        'define service ZUI_MOCK_SRVD { expose ZI_MOCK_ROOT; }\n',
      );
      const obj = new AdkServiceDefinition(ctx, 'ZUI_MOCK_SRVD');
      const src = await obj.getSource();
      expect(src).toContain('define service');
      expect(sources.source.main.get).toHaveBeenCalledWith('ZUI_MOCK_SRVD');
    });
  });

  describe('saveMainSource', () => {
    it('PUTs via source.main.put with query + body', async () => {
      const { ctx, sources } = createCtx();
      const obj = new AdkServiceDefinition(ctx, 'ZUI_MOCK_SRVD');
      await obj.saveMainSource('define service ZUI_MOCK_SRVD { }', {
        lockHandle: 'LH1',
        transport: 'DEVK900001',
      });
      expect(sources.source.main.put).toHaveBeenCalledWith(
        'ZUI_MOCK_SRVD',
        { lockHandle: 'LH1', corrNr: 'DEVK900001' },
        'define service ZUI_MOCK_SRVD { }',
      );
    });
  });

  describe('create', () => {
    it('POSTs via ddic.srvd.sources.post with SRVD/SRV payload', async () => {
      const { ctx, sources } = createCtx();
      await AdkServiceDefinition.create(
        'ZUI_MOCK_SRVD',
        'Mock SRVD',
        'ZTEST',
        { transport: 'DEVK900001' },
        ctx,
      );
      expect(sources.post).toHaveBeenCalledTimes(1);
      const [query, body] = sources.post.mock.calls[0];
      expect(query).toEqual({ corrNr: 'DEVK900001' });
      expect(body.source).toMatchObject({
        name: 'ZUI_MOCK_SRVD',
        type: 'SRVD/SRV',
        description: 'Mock SRVD',
        packageRef: expect.objectContaining({ name: 'ZTEST' }),
      });
    });
  });

  describe('lock', () => {
    it('delegates to lockService with SRVD type', async () => {
      const lockService = createMockLockService();
      const { ctx } = createCtx('', lockService);
      const obj = new AdkServiceDefinition(ctx, 'ZUI_MOCK_SRVD');
      const handle = await obj.lock('DEVK900001');
      expect(lockService.lock).toHaveBeenCalledWith(
        '/sap/bc/adt/ddic/srvd/sources/zui_mock_srvd',
        expect.objectContaining({
          objectName: 'ZUI_MOCK_SRVD',
          objectType: 'SRVD',
          transport: 'DEVK900001',
        }),
      );
      expect(handle.handle).toBe('LOCK_SRVD_1');
    });

    it('throws when no lockService in context', async () => {
      const { ctx } = createCtx();
      (ctx as any).lockService = undefined;
      const obj = new AdkServiceDefinition(ctx, 'ZUI_MOCK_SRVD');
      await expect(obj.lock()).rejects.toThrow('Lock not available');
    });
  });

  describe('unlock', () => {
    it('delegates to lockService.unlock', async () => {
      const lockService = createMockLockService();
      const { ctx } = createCtx('', lockService);
      const obj = new AdkServiceDefinition(ctx, 'ZUI_MOCK_SRVD');
      await obj.unlock('LH1');
      expect(lockService.unlock).toHaveBeenCalledWith(
        '/sap/bc/adt/ddic/srvd/sources/zui_mock_srvd',
        { lockHandle: 'LH1' },
      );
    });
  });

  describe('delete', () => {
    it('calls ddic.srvd.sources.delete with transport param', async () => {
      const { ctx, sources } = createCtx();
      await AdkServiceDefinition.delete(
        'ZUI_MOCK_SRVD',
        { transport: 'DEVK900001' },
        ctx,
      );
      expect(sources.delete).toHaveBeenCalledWith('ZUI_MOCK_SRVD', {
        corrNr: 'DEVK900001',
      });
    });
  });
});
