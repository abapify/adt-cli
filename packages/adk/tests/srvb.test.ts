/**
 * ADK Service Binding (SRVB) Tests
 *
 * Unit tests for AdkServiceBinding — mirrors the structure of srvd.test.ts.
 * Verifies object URIs, metadata fetch, create/delete, publish/unpublish,
 * and lock/unlock delegation using a mock ADT client.
 */

import { describe, it, expect, vi } from 'vitest';
import { AdkServiceBinding } from '../src/objects/repository/srvb/srvb.model';
import type { AdkContext } from '../src/base/context';

// ── helpers ──────────────────────────────────────────────────────────────────

function createMockLockService() {
  return {
    lock: vi.fn().mockResolvedValue({ handle: 'LOCK_SRVB_1' }),
    unlock: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockBindingsContract(getResult: unknown = { meta: true }) {
  return {
    get: vi.fn().mockResolvedValue(getResult),
    post: vi.fn().mockResolvedValue({}),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    publish: vi.fn().mockResolvedValue(undefined),
    unpublish: vi.fn().mockResolvedValue(undefined),
  };
}

function createCtx(
  getResult: unknown = { meta: true },
  lockService?: ReturnType<typeof createMockLockService>,
) {
  const bindings = createMockBindingsContract(getResult);
  const ctx = {
    client: {
      adt: {
        businessservices: { bindings },
        activation: {
          activate: { post: vi.fn().mockResolvedValue({}) },
        },
      },
      services: {} as any,
    } as any,
    lockService: lockService ?? createMockLockService(),
  } as unknown as AdkContext;
  return { ctx, bindings };
}

// ── AdkServiceBinding ────────────────────────────────────────────────────────

describe('AdkServiceBinding', () => {
  describe('objectUri', () => {
    it('constructs lowercase SRVB URI', () => {
      const { ctx } = createCtx();
      const obj = new AdkServiceBinding(ctx, 'ZUI_MOCK_SRVB');
      expect(obj.objectUri).toBe(
        '/sap/bc/adt/businessservices/bindings/zui_mock_srvb',
      );
    });

    it('upper-cases the name on construction', () => {
      const { ctx } = createCtx();
      const obj = new AdkServiceBinding(ctx, 'zui_mock_srvb');
      expect(obj.name).toBe('ZUI_MOCK_SRVB');
    });

    it('exposes static and instance kind', () => {
      expect(AdkServiceBinding.kind).toBe('ServiceBinding');
      const { ctx } = createCtx();
      expect(new AdkServiceBinding(ctx, 'X').kind).toBe('ServiceBinding');
    });
  });

  describe('getMetadata', () => {
    it('calls businessservices.bindings.get with object name', async () => {
      const { ctx, bindings } = createCtx({ foo: 'bar' });
      const obj = new AdkServiceBinding(ctx, 'ZUI_MOCK_SRVB');
      const meta = await obj.getMetadata();
      expect(meta).toEqual({ foo: 'bar' });
      expect(bindings.get).toHaveBeenCalledWith('ZUI_MOCK_SRVB');
    });

    it('getSource returns empty string (metadata-only object)', async () => {
      const { ctx } = createCtx();
      const obj = new AdkServiceBinding(ctx, 'ZUI_MOCK_SRVB');
      expect(await obj.getSource()).toBe('');
    });
  });

  describe('create', () => {
    it('POSTs with SRVB/SVB payload', async () => {
      const { ctx, bindings } = createCtx();
      await AdkServiceBinding.create(
        'ZUI_MOCK_SRVB',
        'Mock SRVB',
        'ZTEST',
        { transport: 'DEVK900001' },
        ctx,
      );
      expect(bindings.post).toHaveBeenCalledTimes(1);
      const [query, body] = bindings.post.mock.calls[0];
      expect(query).toEqual({ corrNr: 'DEVK900001' });
      expect(body.serviceBinding).toMatchObject({
        name: 'ZUI_MOCK_SRVB',
        type: 'SRVB/SVB',
        description: 'Mock SRVB',
        packageRef: expect.objectContaining({ name: 'ZTEST' }),
      });
    });
  });

  describe('lock', () => {
    it('delegates to lockService with SRVB type', async () => {
      const lockService = createMockLockService();
      const { ctx } = createCtx({}, lockService);
      const obj = new AdkServiceBinding(ctx, 'ZUI_MOCK_SRVB');
      const handle = await obj.lock('DEVK900001');
      expect(lockService.lock).toHaveBeenCalledWith(
        '/sap/bc/adt/businessservices/bindings/zui_mock_srvb',
        expect.objectContaining({
          objectName: 'ZUI_MOCK_SRVB',
          objectType: 'SRVB',
          transport: 'DEVK900001',
        }),
      );
      expect(handle.handle).toBe('LOCK_SRVB_1');
    });

    it('throws when no lockService in context', async () => {
      const { ctx } = createCtx();
      (ctx as any).lockService = undefined;
      const obj = new AdkServiceBinding(ctx, 'ZUI_MOCK_SRVB');
      await expect(obj.lock()).rejects.toThrow('Lock not available');
    });
  });

  describe('unlock', () => {
    it('delegates to lockService.unlock', async () => {
      const lockService = createMockLockService();
      const { ctx } = createCtx({}, lockService);
      const obj = new AdkServiceBinding(ctx, 'ZUI_MOCK_SRVB');
      await obj.unlock('LH1');
      expect(lockService.unlock).toHaveBeenCalledWith(
        '/sap/bc/adt/businessservices/bindings/zui_mock_srvb',
        { lockHandle: 'LH1' },
      );
    });
  });

  describe('publish / unpublish', () => {
    it('publish delegates to bindings.publish', async () => {
      const { ctx, bindings } = createCtx();
      await AdkServiceBinding.publish('ZUI_MOCK_SRVB', ctx);
      expect(bindings.publish).toHaveBeenCalledWith('ZUI_MOCK_SRVB');
    });

    it('unpublish delegates to bindings.unpublish', async () => {
      const { ctx, bindings } = createCtx();
      await AdkServiceBinding.unpublish('ZUI_MOCK_SRVB', ctx);
      expect(bindings.unpublish).toHaveBeenCalledWith('ZUI_MOCK_SRVB');
    });
  });

  describe('delete', () => {
    it('calls bindings.delete with transport param', async () => {
      const { ctx, bindings } = createCtx();
      await AdkServiceBinding.delete(
        'ZUI_MOCK_SRVB',
        { transport: 'DEVK900001' },
        ctx,
      );
      expect(bindings.delete).toHaveBeenCalledWith('ZUI_MOCK_SRVB', {
        corrNr: 'DEVK900001',
      });
    });
  });
});
