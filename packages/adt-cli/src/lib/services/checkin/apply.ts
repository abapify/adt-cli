/**
 * Apply stage — executes a ChangePlan against SAP.
 *
 * Each tier is deployed as its own `AdkObjectSet` so that DDIC objects are
 * saved + activated before the application-code tier starts. Within a tier,
 * objects are saved with `mode: 'upsert'` — SAP's PUT endpoints auto-detect
 * whether the object already exists so we don't need separate create/update
 * paths here.
 *
 * Locking:
 *   - Before each tier, an outer `BatchLockSession` pre-acquires locks to
 *     catch conflicts early (e.g. another user editing). Because ADK's
 *     `save()` also lock/unlocks per object, we release the batch session
 *     immediately after pre-flight — the CSRF security session is preserved
 *     so the subsequent per-object re-lock is cheap.
 *   - If the batch pre-flight fails, the tier is aborted and all locks
 *     acquired so far (in that tier) are rolled back; partial state from
 *     previous tiers is documented to the caller.
 */
import type { AdkObject, AdkContext } from '@abapify/adk';
import { AdkObjectSet } from '@abapify/adk';
import {
  createBatchLockSession,
  type BatchLockTarget,
} from '@abapify/adt-locks';
import type { ChangePlan, DependencyTier } from './plan';

export interface ApplyOptions {
  /** Transport request used for lock + save operations. */
  transport?: string;
  /** Dry run — build plan but don't touch SAP. */
  dryRun?: boolean;
  /** Activate saved objects after each tier. Default: true. */
  activate?: boolean;
  /**
   * Force-unlock objects currently locked by the authenticated user before
   * the batch lock session begins. Mirrors `adt export --unlock`.
   */
  unlock?: boolean;
  /** Per-tier progress hook. */
  onTierStart?: (tier: DependencyTier, size: number) => void;
  /** Per-object progress hook. */
  onObject?: (object: AdkObject, status: string) => void;
}

export interface ApplyTierResult {
  tier: DependencyTier;
  size: number;
  saved: number;
  failed: number;
  unchanged: number;
  activated: number;
  errors: Array<{ name: string; type: string; error: string }>;
}

export interface ApplyResult {
  /** Per-tier stats in the order they were applied. */
  tiers: ApplyTierResult[];
  /** Aggregate totals. */
  totals: {
    saved: number;
    failed: number;
    unchanged: number;
    activated: number;
  };
  /** True if the caller aborted before all tiers ran (lock conflict). */
  aborted: boolean;
}

/** Execute the change plan. Always returns a result — caller decides exit. */
export async function applyPlan(
  plan: ChangePlan,
  ctx: AdkContext,
  options: ApplyOptions = {},
): Promise<ApplyResult> {
  const activate = options.activate ?? true;
  const result: ApplyResult = {
    tiers: [],
    totals: { saved: 0, failed: 0, unchanged: 0, activated: 0 },
    aborted: false,
  };

  for (const group of plan.groups) {
    const tierResult: ApplyTierResult = {
      tier: group.tier,
      size: group.entries.length,
      saved: 0,
      failed: 0,
      unchanged: 0,
      activated: 0,
      errors: [],
    };
    options.onTierStart?.(group.tier, group.entries.length);

    if (options.dryRun) {
      // Pretend everything succeeded for reporting only.
      for (const entry of group.entries) {
        options.onObject?.(entry.object, 'dry-run');
        tierResult.saved++;
      }
      result.tiers.push(tierResult);
      result.totals.saved += tierResult.saved;
      continue;
    }

    // Optional: force-unlock stale locks owned by the current user.
    if (options.unlock && ctx.lockService) {
      for (const entry of group.entries) {
        try {
          await ctx.lockService.forceUnlock(entry.object.objectUri);
        } catch {
          /* not locked or locked by another user — ignore */
        }
      }
    }

    // Pre-flight: batch-lock to surface conflicts BEFORE we start mutating.
    // We release immediately afterwards because ADK's save() will re-lock
    // per object within the same security session (CSRF survives unlock).
    let preflightFailed = false;
    if (ctx.lockService) {
      const targets: BatchLockTarget[] = group.entries.map((e) => ({
        objectUri: e.object.objectUri,
        options: {
          transport: options.transport,
          objectName: e.object.name,
          objectType: e.object.type,
        },
      }));
      const batch = createBatchLockSession(ctx.lockService, targets);
      try {
        await batch.begin();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        tierResult.errors.push({
          name: '(batch)',
          type: group.tier,
          error: `batch lock pre-flight failed: ${msg}`,
        });
        tierResult.failed = group.entries.length;
        preflightFailed = true;
      } finally {
        await batch.release();
      }
    }

    if (preflightFailed) {
      result.tiers.push(tierResult);
      result.totals.failed += tierResult.failed;
      result.aborted = true;
      // Stop applying further tiers — the caller sees a partial-apply state.
      break;
    }

    // Build the tier's AdkObjectSet and deploy.
    const set = new AdkObjectSet(ctx);
    for (const entry of group.entries) set.add(entry.object);

    const deployResult = await set.deploy({
      transport: options.transport,
      activate,
      mode: 'upsert',
      onProgress: (_processed, _total, current) => {
        options.onObject?.(current, 'saved');
      },
    });

    tierResult.saved = deployResult.save.success;
    tierResult.failed = deployResult.save.failed;
    tierResult.unchanged = deployResult.save.unchanged;
    tierResult.activated = deployResult.activation?.success ?? 0;
    for (const r of deployResult.save.results) {
      if (!r.success && !r.unchanged) {
        tierResult.errors.push({
          name: r.object.name,
          type: r.object.type,
          error: r.error ?? 'unknown error',
        });
      }
    }

    result.tiers.push(tierResult);
    result.totals.saved += tierResult.saved;
    result.totals.failed += tierResult.failed;
    result.totals.unchanged += tierResult.unchanged;
    result.totals.activated += tierResult.activated;
  }

  return result;
}
