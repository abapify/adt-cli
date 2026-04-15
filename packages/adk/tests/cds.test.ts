/**
 * ADK CDS Object Tests
 *
 * Unit tests for AdkDdlSource and AdkDclSource.
 * Tests object URIs, lock/unlock delegation, and source read/write
 * using a minimal mock ADT client — no real SAP connection needed.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
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

function createMockClient(fetchResult: unknown = '') {
  return {
    fetch: vi.fn().mockResolvedValue(fetchResult),
    adt: {} as any,
    services: {} as any,
  };
}

function createCtx(
  fetchResult: unknown = '',
  lockService?: ReturnType<typeof createMockLockService>,
): AdkContext {
  return {
    client: createMockClient(fetchResult) as any,
    lockService: lockService ?? createMockLockService(),
  } as unknown as AdkContext;
}

// ── AdkDdlSource ─────────────────────────────────────────────────────────────

describe('AdkDdlSource', () => {
  describe('objectUri', () => {
    it('constructs lowercase URI for the DDL source', () => {
      const ctx = createCtx();
      const obj = new AdkDdlSource(ctx, 'ZI_MY_VIEW');
      expect(obj.objectUri).toBe('/sap/bc/adt/ddic/ddl/sources/zi_my_view');
    });

    it('upper-cases the name on construction', () => {
      const ctx = createCtx();
      const obj = new AdkDdlSource(ctx, 'zi_my_view');
      expect(obj.name).toBe('ZI_MY_VIEW');
    });
  });

  describe('getSource', () => {
    it('fetches from <objectUri>/source/main', async () => {
      const ctx = createCtx('DEFINE VIEW ZI_MY_VIEW AS SELECT FROM ...');
      const obj = new AdkDdlSource(ctx, 'ZI_MY_VIEW');
      const src = await obj.getSource();
      expect(src).toBe('DEFINE VIEW ZI_MY_VIEW AS SELECT FROM ...');
      expect(ctx.client.fetch).toHaveBeenCalledWith(
        '/sap/bc/adt/ddic/ddl/sources/zi_my_view/source/main',
        expect.objectContaining({ method: 'GET' }),
      );
    });
  });

  describe('saveMainSource', () => {
    it('PUTs to <objectUri>/source/main with text/plain', async () => {
      const ctx = createCtx();
      const obj = new AdkDdlSource(ctx, 'ZI_MY_VIEW');
      await obj.saveMainSource('DEFINE VIEW ...', {
        lockHandle: 'LH1',
        transport: 'DEVK900001',
      });
      expect(ctx.client.fetch).toHaveBeenCalledWith(
        '/sap/bc/adt/ddic/ddl/sources/zi_my_view/source/main?lockHandle=LH1&corrNr=DEVK900001',
        expect.objectContaining({ method: 'PUT', body: 'DEFINE VIEW ...' }),
      );
    });

    it('omits query string when no lock/transport', async () => {
      const ctx = createCtx();
      const obj = new AdkDdlSource(ctx, 'ZI_MY_VIEW');
      await obj.saveMainSource('DEFINE VIEW ...');
      expect(ctx.client.fetch).toHaveBeenCalledWith(
        '/sap/bc/adt/ddic/ddl/sources/zi_my_view/source/main',
        expect.anything(),
      );
    });
  });

  describe('lock', () => {
    it('delegates to lockService.lock with correct objectUri and type', async () => {
      const lockService = createMockLockService();
      const ctx = createCtx('', lockService);
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
      const ctx = {
        client: createMockClient() as any,
        lockService: undefined,
      } as unknown as AdkContext;
      const obj = new AdkDdlSource(ctx, 'ZI_MY_VIEW');
      await expect(obj.lock()).rejects.toThrow('Lock not available');
    });
  });

  describe('unlock', () => {
    it('delegates to lockService.unlock', async () => {
      const lockService = createMockLockService();
      const ctx = createCtx('', lockService);
      const obj = new AdkDdlSource(ctx, 'ZI_MY_VIEW');
      await obj.unlock('LOCK_ABC123');
      expect(lockService.unlock).toHaveBeenCalledWith(
        '/sap/bc/adt/ddic/ddl/sources/zi_my_view',
        { lockHandle: 'LOCK_ABC123' },
      );
    });

    it('throws when no lockService in context', async () => {
      const ctx = {
        client: createMockClient() as any,
        lockService: undefined,
      } as unknown as AdkContext;
      const obj = new AdkDdlSource(ctx, 'ZI_MY_VIEW');
      await expect(obj.unlock('LH')).rejects.toThrow('Unlock not available');
    });
  });

  describe('delete', () => {
    it('sends DELETE to objectUri with transport param', async () => {
      const ctx = createCtx();
      await AdkDdlSource.delete('ZI_MY_VIEW', { transport: 'DEVK900001' }, ctx);
      expect(ctx.client.fetch).toHaveBeenCalledWith(
        '/sap/bc/adt/ddic/ddl/sources/zi_my_view?corrNr=DEVK900001',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });
});

// ── AdkDclSource ─────────────────────────────────────────────────────────────

describe('AdkDclSource', () => {
  describe('objectUri', () => {
    it('constructs lowercase ACM DCL URI', () => {
      const ctx = createCtx();
      const obj = new AdkDclSource(ctx, 'ZI_MY_VIEW_ACL');
      expect(obj.objectUri).toBe('/sap/bc/adt/acm/dcl/sources/zi_my_view_acl');
    });

    it('upper-cases the name on construction', () => {
      const ctx = createCtx();
      const obj = new AdkDclSource(ctx, 'zi_my_view_acl');
      expect(obj.name).toBe('ZI_MY_VIEW_ACL');
    });
  });

  describe('getSource', () => {
    it('fetches from <objectUri>/source/main', async () => {
      const ctx = createCtx('@MappingRole\nASSESSMENT POLICY ZI_MY_VIEW_ACL');
      const obj = new AdkDclSource(ctx, 'ZI_MY_VIEW_ACL');
      const src = await obj.getSource();
      expect(src).toContain('ASSESSMENT POLICY');
      expect(ctx.client.fetch).toHaveBeenCalledWith(
        '/sap/bc/adt/acm/dcl/sources/zi_my_view_acl/source/main',
        expect.objectContaining({ method: 'GET' }),
      );
    });
  });

  describe('lock', () => {
    it('delegates to lockService with DCLS type', async () => {
      const lockService = createMockLockService();
      const ctx = createCtx('', lockService);
      const obj = new AdkDclSource(ctx, 'ZI_MY_VIEW_ACL');
      await obj.lock();
      expect(lockService.lock).toHaveBeenCalledWith(
        '/sap/bc/adt/acm/dcl/sources/zi_my_view_acl',
        expect.objectContaining({ objectType: 'DCLS' }),
      );
    });
  });

  describe('delete', () => {
    it('sends DELETE to objectUri with lockHandle param', async () => {
      const ctx = createCtx();
      await AdkDclSource.delete('ZI_MY_VIEW_ACL', { lockHandle: 'LH99' }, ctx);
      expect(ctx.client.fetch).toHaveBeenCalledWith(
        '/sap/bc/adt/acm/dcl/sources/zi_my_view_acl?lockHandle=LH99',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });
});
