/**
 * Unit tests for CheckinService apply stage.
 *
 * Exercises dry-run + tier ordering + batch-lock pre-flight failure, using
 * stub AdkObjects and a fake AdkContext (lockService returns canned handles;
 * AdkObjectSet.deploy is exercised for real against the stubs — the stubs
 * implement just enough of the AdkObject surface for deploy to tolerate
 * them, so we take the dry-run path).
 */
import { describe, it, expect, vi } from 'vitest';
import { applyPlan } from '../../../src/lib/services/checkin/apply';
import { buildPlan } from '../../../src/lib/services/checkin/plan';
import type { ChangePlanEntry } from '../../../src/lib/services/checkin/diff';
import type { AdkObject, AdkContext } from '@abapify/adk';
import type { LockService } from '@abapify/adt-locks';

function stub(name: string, type: string): AdkObject {
  return {
    name,
    type,
    objectUri: `/sap/bc/adt/stubs/${name.toLowerCase()}`,
  } as unknown as AdkObject;
}

function entry(
  name: string,
  type: string,
  action: ChangePlanEntry['action'] = 'update',
): ChangePlanEntry {
  return { object: stub(name, type), action };
}

function mockLockService(): LockService {
  return {
    lock: vi.fn().mockImplementation(async (uri: string) => ({
      handle: `HANDLE_${uri}`,
    })),
    unlock: vi.fn().mockResolvedValue(undefined),
    forceUnlock: vi.fn().mockResolvedValue(undefined),
    list: vi.fn(() => []),
    cleanup: vi.fn().mockResolvedValue({ ok: 0, failed: 0 }),
    clear: vi.fn(),
  } as LockService;
}

function mockCtx(lockService: LockService): AdkContext {
  return {
    client: {} as never,
    lockService,
  } as AdkContext;
}

describe('checkin/apply: dry run', () => {
  it('counts all entries as saved, never touches lock service', async () => {
    const lock = mockLockService();
    const plan = buildPlan([
      entry('ZDOMA_X', 'DOMA', 'create'),
      entry('ZCL_X', 'CLAS', 'update'),
    ]);
    const result = await applyPlan(plan, mockCtx(lock), { dryRun: true });
    expect(result.totals.saved).toBe(2);
    expect(result.totals.failed).toBe(0);
    expect(result.aborted).toBe(false);
    expect(lock.lock).not.toHaveBeenCalled();
    expect(result.tiers.map((t) => t.tier)).toEqual(['ddic', 'app']);
  });
});

describe('checkin/apply: lock pre-flight', () => {
  it('aborts tier and later tiers when batch lock fails', async () => {
    const lock = mockLockService();
    (lock.lock as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => {
      throw new Error('409 locked by another user');
    });

    const plan = buildPlan([
      entry('ZDOMA_X', 'DOMA', 'update'),
      entry('ZCL_X', 'CLAS', 'update'),
    ]);
    const result = await applyPlan(plan, mockCtx(lock), {
      dryRun: false,
      activate: false,
    });

    expect(result.aborted).toBe(true);
    // First tier aborted, second never attempted.
    expect(result.tiers).toHaveLength(1);
    expect(result.tiers[0].tier).toBe('ddic');
    expect(result.tiers[0].failed).toBe(1);
    expect(result.tiers[0].errors[0].error).toMatch(/409|locked/i);
  });

  it('acquires pre-flight locks with transport option propagated', async () => {
    const lock = mockLockService();
    const plan = buildPlan([entry('ZDOMA_X', 'DOMA', 'update')]);
    // Make dryRun=false so the lock path runs; deploy will run on stubs and
    // likely throw but we only care about the lock-service calls here.
    try {
      await applyPlan(plan, mockCtx(lock), {
        dryRun: false,
        transport: 'DEVK900001',
        activate: false,
      });
    } catch {
      /* deploy against stub will fail — not what this test asserts */
    }
    expect(lock.lock).toHaveBeenCalledWith(
      '/sap/bc/adt/stubs/zdoma_x',
      expect.objectContaining({ transport: 'DEVK900001' }),
    );
    expect(lock.unlock).toHaveBeenCalled();
  });
});
