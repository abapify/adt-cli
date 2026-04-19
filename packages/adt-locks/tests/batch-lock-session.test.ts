/**
 * BatchLockSession unit tests.
 *
 * Validates acquire-all / release-all / partial-failure rollback / reuse
 * guard / empty target list / reverse release order / error propagation /
 * idempotent release. Eight cases total (matches E08 acceptance minimum).
 */
import { describe, it, expect, vi } from 'vitest';
import { createBatchLockSession } from '../src/batch/batch-lock-session';
import type { LockService } from '../src/service';
import type { LockHandle } from '../src/types';

function h(handle: string): LockHandle {
  return { handle };
}

function mockLockService(overrides?: Partial<LockService>): LockService {
  return {
    lock: vi.fn().mockImplementation(async (uri: string) => h(`HANDLE_${uri}`)),
    unlock: vi.fn().mockResolvedValue(undefined),
    forceUnlock: vi.fn().mockResolvedValue(undefined),
    list: vi.fn(() => []),
    cleanup: vi.fn().mockResolvedValue({ ok: 0, failed: 0 }),
    clear: vi.fn(),
    ...overrides,
  } as LockService;
}

describe('BatchLockSession', () => {
  it('begin() acquires locks for every target in order', async () => {
    const svc = mockLockService();
    const session = createBatchLockSession(svc, [
      { objectUri: '/a' },
      { objectUri: '/b' },
      { objectUri: '/c' },
    ]);

    const acquired = await session.begin();
    expect(acquired).toHaveLength(3);
    expect(svc.lock).toHaveBeenCalledTimes(3);
    expect((svc.lock as any).mock.calls.map((c: unknown[]) => c[0])).toEqual([
      '/a',
      '/b',
      '/c',
    ]);
    expect(session.active).toBe(true);
  });

  it('passes lock options (transport etc.) through to the service', async () => {
    const svc = mockLockService();
    const session = createBatchLockSession(svc, [
      {
        objectUri: '/a',
        options: { transport: 'DEVK900001', objectName: 'Z_A' },
      },
    ]);

    await session.begin();
    expect(svc.lock).toHaveBeenCalledWith('/a', {
      transport: 'DEVK900001',
      objectName: 'Z_A',
    });
  });

  it('rolls back previously-acquired locks when one fails (default)', async () => {
    const svc = mockLockService({
      lock: vi
        .fn()
        .mockResolvedValueOnce(h('H1'))
        .mockResolvedValueOnce(h('H2'))
        .mockRejectedValueOnce(new Error('boom on /c')),
    });
    const session = createBatchLockSession(svc, [
      { objectUri: '/a' },
      { objectUri: '/b' },
      { objectUri: '/c' },
    ]);

    await expect(session.begin()).rejects.toThrow('boom on /c');
    // Rollback: /b first (reverse), then /a.
    expect(svc.unlock).toHaveBeenCalledTimes(2);
    expect((svc.unlock as any).mock.calls[0][0]).toBe('/b');
    expect((svc.unlock as any).mock.calls[1][0]).toBe('/a');
    expect(session.handles()).toHaveLength(0);
    expect(session.active).toBe(false);
  });

  it('release() unlocks in reverse order', async () => {
    const svc = mockLockService();
    const session = createBatchLockSession(svc, [
      { objectUri: '/a' },
      { objectUri: '/b' },
      { objectUri: '/c' },
    ]);
    await session.begin();

    const result = await session.release();
    expect(result.released).toBe(3);
    expect(result.failed).toHaveLength(0);
    expect((svc.unlock as any).mock.calls.map((c: unknown[]) => c[0])).toEqual([
      '/c',
      '/b',
      '/a',
    ]);
  });

  it('release() collects per-unlock failures without throwing', async () => {
    const svc = mockLockService({
      unlock: vi
        .fn()
        .mockRejectedValueOnce(new Error('already unlocked'))
        .mockResolvedValueOnce(undefined),
    });
    const session = createBatchLockSession(svc, [
      { objectUri: '/a' },
      { objectUri: '/b' },
    ]);
    await session.begin();

    const result = await session.release();
    expect(result.released).toBe(1);
    expect(result.failed).toHaveLength(1);
    // Reverse order → /b attempted first (and rejected).
    expect(result.failed[0].objectUri).toBe('/b');
    expect(result.failed[0].error).toContain('already unlocked');
  });

  it('release() is idempotent', async () => {
    const svc = mockLockService();
    const session = createBatchLockSession(svc, [{ objectUri: '/a' }]);
    await session.begin();

    await session.release();
    const second = await session.release();
    expect(second.released).toBe(0);
    expect(svc.unlock).toHaveBeenCalledTimes(1);
  });

  it('empty target list is a no-op (begin returns [])', async () => {
    const svc = mockLockService();
    const session = createBatchLockSession(svc, []);

    const acquired = await session.begin();
    expect(acquired).toEqual([]);
    expect(svc.lock).not.toHaveBeenCalled();

    const released = await session.release();
    expect(released.released).toBe(0);
  });

  it('begin() can only be called once', async () => {
    const svc = mockLockService();
    const session = createBatchLockSession(svc, [{ objectUri: '/a' }]);
    await session.begin();
    await expect(session.begin()).rejects.toThrow('more than once');
  });

  it('rollbackOnError: false retains partial locks on failure', async () => {
    const svc = mockLockService({
      lock: vi
        .fn()
        .mockResolvedValueOnce(h('H1'))
        .mockRejectedValueOnce(new Error('bad')),
    });
    const session = createBatchLockSession(
      svc,
      [{ objectUri: '/a' }, { objectUri: '/b' }],
      { rollbackOnError: false },
    );
    await expect(session.begin()).rejects.toThrow('bad');
    // Still retain the first handle; caller must release() manually.
    expect(session.handles()).toHaveLength(1);
    expect(svc.unlock).not.toHaveBeenCalled();

    const released = await session.release();
    expect(released.released).toBe(1);
  });
});
