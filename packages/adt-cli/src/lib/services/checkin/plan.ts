/**
 * Plan builder — groups ChangePlanEntry items in dependency order for apply.
 *
 * SAP's activation order is **type-class sensitive**: DDIC primitives
 * (domains, data elements, tables, structures, ttypes) must exist before
 * application-level code (classes, interfaces, includes, programs, function
 * groups) can compile against them; CDS artifacts (DDL source, DCL source,
 * behaviour definitions, service definitions, service bindings) must come
 * last because they reference both categories.
 *
 * The grouping is sapcli-inspired (`_resolve_dependencies` in
 * `sap/cli/checkin.py`) but extended to match the ADK type vocabulary.
 */
import type { AdkObject } from '@abapify/adk';
import { getMainType } from '@abapify/adk';
import type { ChangePlanEntry } from './diff';

export type DependencyTier = 'ddic' | 'app' | 'cds' | 'package' | 'other';

/** Object types classified by dependency tier (main type only). */
const TIER_FOR_TYPE: Record<string, DependencyTier> = {
  // DDIC primitives — no dependencies on ABAP code
  DOMA: 'ddic',
  DTEL: 'ddic',
  TABL: 'ddic',
  TTYP: 'ddic',
  VIEW: 'ddic',
  ENQU: 'ddic',
  SHLP: 'ddic',
  // Packages themselves are their own tier — must exist before any content
  DEVC: 'package',
  // Application code — depends on DDIC
  CLAS: 'app',
  INTF: 'app',
  PROG: 'app',
  INCL: 'app',
  FUGR: 'app',
  // CDS / RAP — depends on everything else
  DDLS: 'cds',
  DCLS: 'cds',
  DDLX: 'cds',
  SRVD: 'cds',
  SRVB: 'cds',
  BDEF: 'cds',
};

/** Order tiers are applied. */
const TIER_ORDER: DependencyTier[] = ['package', 'ddic', 'app', 'cds', 'other'];

export function classifyTier(type: string): DependencyTier {
  return TIER_FOR_TYPE[getMainType(type)] ?? 'other';
}

export interface ChangePlan {
  /** All entries regardless of action/tier, in discovery order. */
  entries: ChangePlanEntry[];
  /** Actionable entries grouped by tier in apply order. */
  groups: Array<{ tier: DependencyTier; entries: ChangePlanEntry[] }>;
  /** Entries that don't need an apply pass (skip/unchanged). */
  inert: ChangePlanEntry[];
}

/**
 * Build a ChangePlan by classifying each entry and sorting into tiers.
 *
 * Entries whose action is `skip` or `unchanged` are parked in `inert` so the
 * apply stage doesn't touch them. Empty tiers are elided.
 */
export function buildPlan(entries: ChangePlanEntry[]): ChangePlan {
  const byTier = new Map<DependencyTier, ChangePlanEntry[]>();
  const inert: ChangePlanEntry[] = [];

  for (const entry of entries) {
    if (entry.action === 'skip' || entry.action === 'unchanged') {
      inert.push(entry);
      continue;
    }
    const tier = classifyTier(entry.object.type);
    const bucket = byTier.get(tier) ?? [];
    bucket.push(entry);
    byTier.set(tier, bucket);
  }

  const groups: ChangePlan['groups'] = [];
  for (const tier of TIER_ORDER) {
    const bucket = byTier.get(tier);
    if (bucket && bucket.length > 0) {
      groups.push({ tier, entries: bucket });
    }
  }

  return { entries, groups, inert };
}

/** Extract a flat ordered list of AdkObjects from a plan (apply order). */
export function flattenPlanObjects(plan: ChangePlan): AdkObject[] {
  const out: AdkObject[] = [];
  for (const group of plan.groups) {
    for (const entry of group.entries) {
      out.push(entry.object);
    }
  }
  return out;
}
