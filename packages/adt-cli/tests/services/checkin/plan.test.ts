/**
 * Unit tests for CheckinService plan stage.
 *
 * Validates that `buildPlan`:
 *   - classifies each object into its dependency tier
 *   - parks skip/unchanged entries in `inert`
 *   - emits groups in tier order (package → ddic → app → cds → other)
 *   - elides empty tiers
 *
 * No SAP calls — we feed synthetic `AdkObject`-shaped stubs.
 */
import { describe, it, expect } from 'vitest';
import {
  buildPlan,
  classifyTier,
} from '../../../src/lib/services/checkin/plan';
import type { ChangePlanEntry } from '../../../src/lib/services/checkin/diff';
import type { AdkObject } from '@abapify/adk';

function stub(name: string, type: string): AdkObject {
  return { name, type } as unknown as AdkObject;
}

function entry(
  name: string,
  type: string,
  action: ChangePlanEntry['action'],
): ChangePlanEntry {
  return { object: stub(name, type), action };
}

describe('checkin/plan: classifyTier', () => {
  it('classifies DDIC primitives as ddic', () => {
    expect(classifyTier('DOMA')).toBe('ddic');
    expect(classifyTier('DTEL')).toBe('ddic');
    expect(classifyTier('TABL/DS')).toBe('ddic');
    expect(classifyTier('TTYP')).toBe('ddic');
  });

  it('classifies application code as app', () => {
    expect(classifyTier('CLAS/OC')).toBe('app');
    expect(classifyTier('INTF')).toBe('app');
    expect(classifyTier('PROG/I')).toBe('app');
    expect(classifyTier('FUGR')).toBe('app');
  });

  it('classifies CDS/RAP as cds', () => {
    expect(classifyTier('DDLS')).toBe('cds');
    expect(classifyTier('DCLS')).toBe('cds');
    expect(classifyTier('SRVD')).toBe('cds');
  });

  it('classifies DEVC as package', () => {
    expect(classifyTier('DEVC/K')).toBe('package');
  });

  it('unknown types fall into other', () => {
    expect(classifyTier('ZZZ')).toBe('other');
  });
});

describe('checkin/plan: buildPlan', () => {
  it('groups entries by tier in canonical apply order', () => {
    const plan = buildPlan([
      entry('ZCL_A', 'CLAS', 'create'),
      entry('ZDOMA_A', 'DOMA', 'create'),
      entry('ZDDL_A', 'DDLS', 'update'),
      entry('$ZPKG', 'DEVC', 'create'),
    ]);
    expect(plan.groups.map((g) => g.tier)).toEqual([
      'package',
      'ddic',
      'app',
      'cds',
    ]);
    expect(plan.groups[0].entries).toHaveLength(1);
    expect(plan.groups[1].entries[0].object.name).toBe('ZDOMA_A');
  });

  it('parks skip/unchanged entries in inert and omits them from groups', () => {
    const plan = buildPlan([
      entry('ZCL_A', 'CLAS', 'unchanged'),
      entry('ZCL_B', 'CLAS', 'skip'),
      entry('ZCL_C', 'CLAS', 'update'),
    ]);
    expect(plan.inert.map((e) => e.object.name)).toEqual(['ZCL_A', 'ZCL_B']);
    expect(plan.groups).toHaveLength(1);
    expect(plan.groups[0].entries[0].object.name).toBe('ZCL_C');
  });

  it('elides empty tiers when no entries of that class are present', () => {
    const plan = buildPlan([entry('ZCL_A', 'CLAS', 'update')]);
    expect(plan.groups.map((g) => g.tier)).toEqual(['app']);
  });

  it('preserves discovery order within a tier', () => {
    const plan = buildPlan([
      entry('ZCL_B', 'CLAS', 'update'),
      entry('ZCL_A', 'CLAS', 'update'),
      entry('ZCL_C', 'CLAS', 'update'),
    ]);
    expect(plan.groups[0].entries.map((e) => e.object.name)).toEqual([
      'ZCL_B',
      'ZCL_A',
      'ZCL_C',
    ]);
  });

  it('empty input yields empty plan', () => {
    const plan = buildPlan([]);
    expect(plan.groups).toHaveLength(0);
    expect(plan.inert).toHaveLength(0);
    expect(plan.entries).toHaveLength(0);
  });

  it('entries field preserves full input (including inert)', () => {
    const all = [
      entry('ZCL_A', 'CLAS', 'create'),
      entry('ZCL_B', 'CLAS', 'unchanged'),
    ];
    const plan = buildPlan(all);
    expect(plan.entries).toEqual(all);
  });
});
