/**
 * ADK CDS Object Tests
 *
 * Unit tests for AdkDdlSource and AdkDclSource.
 * Tests object URIs, lock/unlock delegation, and source read/write
 * using a minimal mock ADT client — no real SAP connection needed.
 */

import { describe, it, expect, vi } from 'vitest';
import { AdkDdlSource } from '../src/objects/cds/ddl.model';
import { AdkDclSource } from '../src/objects/cds/dcl.model';
import type { AdkContext } from '../src/base/context';

// ── helpers ──────────────────────────────────────────────────────────────────

function createMockLockService() {
  return {
    lock: vi.fn().mockResolvedValue({ handle: 'LOCK_ABC123' }),
    unlock: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * Create a mock sources contract surface (matches client.adt.ddic.{ddl,dcl}.sources shape).
 * Individual tests override default resolved values as needed.
 */
function createMockSourcesContract(getResult: unknown = '') {
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
  const ddlSources = createMockSourcesContract(sourceResult);
  const dclSources = createMockSourcesContract(sourceResult);
  const ctx = {
    client: {
      adt: {
        ddic: {
          ddl: { sources: ddlSources },
          dcl: { sources: dclSources },
        },
        activation: {
          activate: { post: vi.fn().mockResolvedValue({}) },
        },
      },
      services: {} as any,
    } as any,
    lockService: lockService ?? createMockLockService(),
  } as unknown as AdkContext;
  return { ctx, ddlSources, dclSources };
}

// ── AdkDdlSource ─────────────────────────────────────────────────────────────

describe('AdkDdlSource', () => {
  describe('objectUri', () => {
    it('constructs lowercase URI for the DDL source', () => {
      const { ctx } = createCtx();
      const obj = new AdkDdlSource(ctx, 'ZI_MY_VIEW');
      expect(obj.objectUri).toBe('/sap/bc/adt/ddic/ddl/sources/zi_my_view');
    });

    it('upper-cases the name on construction', () => {
      const { ctx } = createCtx();
      const obj = new AdkDdlSource(ctx, 'zi_my_view');
      expect(obj.name).toBe('ZI_MY_VIEW');
    });
  });

  describe('getSource', () => {
    it('calls ddl.sources.source.main.get with object name', async () => {
      const { ctx, ddlSources } = createCtx(
        'DEFINE VIEW ZI_MY_VIEW AS SELECT FROM ...',
      );
      const obj = new AdkDdlSource(ctx, 'ZI_MY_VIEW');
      const src = await obj.getSource();
      expect(src).toBe('DEFINE VIEW ZI_MY_VIEW AS SELECT FROM ...');
      expect(ddlSources.source.main.get).toHaveBeenCalledWith('ZI_MY_VIEW');
    });
  });

  describe('saveMainSource', () => {
    it('PUTs via ddl.sources.source.main.put with query + body', async () => {
      const { ctx, ddlSources } = createCtx();
      const obj = new AdkDdlSource(ctx, 'ZI_MY_VIEW');
      await obj.saveMainSource('DEFINE VIEW ...', {
        lockHandle: 'LH1',
        transport: 'DEVK900001',
      });
      expect(ddlSources.source.main.put).toHaveBeenCalledWith(
        'ZI_MY_VIEW',
        { lockHandle: 'LH1', corrNr: 'DEVK900001' },
        'DEFINE VIEW ...',
      );
    });

    it('omits query params when no lock/transport', async () => {
      const { ctx, ddlSources } = createCtx();
      const obj = new AdkDdlSource(ctx, 'ZI_MY_VIEW');
      await obj.saveMainSource('DEFINE VIEW ...');
      expect(ddlSources.source.main.put).toHaveBeenCalledWith(
        'ZI_MY_VIEW',
        {},
        'DEFINE VIEW ...',
      );
    });
  });

  describe('create', () => {
    it('POSTs via ddl.sources.post with transport and structured body', async () => {
      const { ctx, ddlSources } = createCtx();
      await AdkDdlSource.create(
        'ZI_MY_VIEW',
        'My view',
        'ZTEST',
        { transport: 'DEVK900001' },
        ctx,
      );
      expect(ddlSources.post).toHaveBeenCalledTimes(1);
      const [query, body] = ddlSources.post.mock.calls[0];
      expect(query).toEqual({ corrNr: 'DEVK900001' });
      expect(body.source).toMatchObject({
        name: 'ZI_MY_VIEW',
        description: 'My view',
        packageRef: expect.objectContaining({ name: 'ZTEST' }),
      });
    });
  });

  describe('lock', () => {
    it('delegates to lockService.lock with correct objectUri and type', async () => {
      const lockService = createMockLockService();
      const { ctx } = createCtx('', lockService);
      const obj = new AdkDdlSource(ctx, 'ZI_MY_VIEW');
      const handle = await obj.lock('DEVK900001');
      expect(lockService.lock).toHaveBeenCalledWith(
        '/sap/bc/adt/ddic/ddl/sources/zi_my_view',
        expect.objectContaining({
          objectName: 'ZI_MY_VIEW',
          objectType: 'DDLS',
          transport: 'DEVK900001',
        }),
      );
      expect(handle.handle).toBe('LOCK_ABC123');
    });

    it('throws when no lockService in context', async () => {
      const { ctx } = createCtx();
      (ctx as any).lockService = undefined;
      const obj = new AdkDdlSource(ctx, 'ZI_MY_VIEW');
      await expect(obj.lock()).rejects.toThrow('Lock not available');
    });
  });

  describe('unlock', () => {
    it('delegates to lockService.unlock', async () => {
      const lockService = createMockLockService();
      const { ctx } = createCtx('', lockService);
      const obj = new AdkDdlSource(ctx, 'ZI_MY_VIEW');
      await obj.unlock('LOCK_ABC123');
      expect(lockService.unlock).toHaveBeenCalledWith(
        '/sap/bc/adt/ddic/ddl/sources/zi_my_view',
        { lockHandle: 'LOCK_ABC123' },
      );
    });

    it('throws when no lockService in context', async () => {
      const { ctx } = createCtx();
      (ctx as any).lockService = undefined;
      const obj = new AdkDdlSource(ctx, 'ZI_MY_VIEW');
      await expect(obj.unlock('LH')).rejects.toThrow('Unlock not available');
    });
  });

  describe('delete', () => {
    it('calls ddl.sources.delete with transport param', async () => {
      const { ctx, ddlSources } = createCtx();
      await AdkDdlSource.delete('ZI_MY_VIEW', { transport: 'DEVK900001' }, ctx);
      expect(ddlSources.delete).toHaveBeenCalledWith('ZI_MY_VIEW', {
        corrNr: 'DEVK900001',
      });
    });
  });
});

// ── AdkDclSource ─────────────────────────────────────────────────────────────

describe('AdkDclSource', () => {
  describe('objectUri', () => {
    it('constructs lowercase ACM DCL URI', () => {
      const { ctx } = createCtx();
      const obj = new AdkDclSource(ctx, 'ZI_MY_VIEW_ACL');
      expect(obj.objectUri).toBe('/sap/bc/adt/acm/dcl/sources/zi_my_view_acl');
    });

    it('upper-cases the name on construction', () => {
      const { ctx } = createCtx();
      const obj = new AdkDclSource(ctx, 'zi_my_view_acl');
      expect(obj.name).toBe('ZI_MY_VIEW_ACL');
    });
  });

  describe('getSource', () => {
    it('calls dcl.sources.source.main.get with object name', async () => {
      const { ctx, dclSources } = createCtx(
        '@MappingRole\nASSESSMENT POLICY ZI_MY_VIEW_ACL',
      );
      const obj = new AdkDclSource(ctx, 'ZI_MY_VIEW_ACL');
      const src = await obj.getSource();
      expect(src).toContain('ASSESSMENT POLICY');
      expect(dclSources.source.main.get).toHaveBeenCalledWith('ZI_MY_VIEW_ACL');
    });
  });

  describe('saveMainSource', () => {
    it('PUTs via dcl.sources.source.main.put with body', async () => {
      const { ctx, dclSources } = createCtx();
      const obj = new AdkDclSource(ctx, 'ZI_MY_VIEW_ACL');
      await obj.saveMainSource('@MappingRole ...');
      expect(dclSources.source.main.put).toHaveBeenCalledWith(
        'ZI_MY_VIEW_ACL',
        {},
        '@MappingRole ...',
      );
    });
  });

  describe('create', () => {
    it('POSTs via dcl.sources.post', async () => {
      const { ctx, dclSources } = createCtx();
      await AdkDclSource.create(
        'ZI_MY_VIEW_ACL',
        'My ACL',
        'ZTEST',
        undefined,
        ctx,
      );
      expect(dclSources.post).toHaveBeenCalledTimes(1);
      const [query, body] = dclSources.post.mock.calls[0];
      expect(query).toEqual({});
      expect(body.source).toMatchObject({
        name: 'ZI_MY_VIEW_ACL',
        description: 'My ACL',
      });
    });
  });

  describe('lock', () => {
    it('delegates to lockService with DCLS type', async () => {
      const lockService = createMockLockService();
      const { ctx } = createCtx('', lockService);
      const obj = new AdkDclSource(ctx, 'ZI_MY_VIEW_ACL');
      await obj.lock();
      expect(lockService.lock).toHaveBeenCalledWith(
        '/sap/bc/adt/acm/dcl/sources/zi_my_view_acl',
        expect.objectContaining({ objectType: 'DCLS' }),
      );
    });
  });

  describe('unlock', () => {
    it('delegates to lockService.unlock', async () => {
      const lockService = createMockLockService();
      const { ctx } = createCtx('', lockService);
      const obj = new AdkDclSource(ctx, 'ZI_MY_VIEW_ACL');
      await obj.unlock('LH99');
      expect(lockService.unlock).toHaveBeenCalledWith(
        '/sap/bc/adt/acm/dcl/sources/zi_my_view_acl',
        { lockHandle: 'LH99' },
      );
    });
  });

  describe('delete', () => {
    it('calls dcl.sources.delete with lockHandle param', async () => {
      const { ctx, dclSources } = createCtx();
      await AdkDclSource.delete('ZI_MY_VIEW_ACL', { lockHandle: 'LH99' }, ctx);
      expect(dclSources.delete).toHaveBeenCalledWith('ZI_MY_VIEW_ACL', {
        lockHandle: 'LH99',
      });
    });
  });
});
