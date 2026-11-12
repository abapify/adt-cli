import { describe, expect, it } from 'vitest';
import type { TransportObjectInventoryEntry } from '@abapify/adk';
import { dedupeCtsInventoryToOwners } from './cts-inventory-owners';

function entry(
  overrides: Partial<TransportObjectInventoryEntry>,
): TransportObjectInventoryEntry {
  return {
    pgmid: 'R3TR',
    type: 'CLAS',
    name: 'ZCL_SAMPLE',
    objFunc: 'K',
    sourceTransport: 'DEVK900001',
    ...overrides,
  };
}

/** CTS pads the class name to 30 characters before the component name. */
function classMethodName(owner: string, component: string): string {
  return owner.padEnd(30, ' ') + component;
}

describe('dedupeCtsInventoryToOwners', () => {
  it('merges padded spellings of the same object into one owner', () => {
    const groups = dedupeCtsInventoryToOwners([
      entry({ name: 'ZCL_SAMPLE' }),
      entry({ name: 'ZCL_SAMPLE   ' }),
      entry({ name: 'zcl_sample', sourceTransport: 'DEVK900002' }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].owner.name).toBe('ZCL_SAMPLE');
    expect(groups[0].unresolved).toBe(false);
    expect(groups[0].leaves).toHaveLength(3);
    expect(groups[0].leaves.map((leaf) => leaf.sourceTransport)).toEqual([
      'DEVK900001',
      'DEVK900001',
      'DEVK900002',
    ]);
  });

  it('folds a padded method leaf into its class owner through the shared ADT rule', () => {
    const groups = dedupeCtsInventoryToOwners([
      entry({ type: 'CLAS', name: 'ZCL_SAMPLE' }),
      entry({
        pgmid: 'LIMU',
        type: 'METH',
        name: classMethodName('ZCL_SAMPLE', 'RUN'),
        wbtype: 'CLAS/OM',
      }),
      entry({
        pgmid: 'LIMU',
        type: 'CLSD',
        name: 'ZCL_SAMPLE',
        wbtype: 'CLAS/OC',
      }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].owner.type).toBe('CLAS');
    expect(groups[0].unresolved).toBe(false);
    expect(groups[0].leaves).toHaveLength(3);
  });

  it('folds a function leaf into the FUGR owner named by its WB type', () => {
    const groups = dedupeCtsInventoryToOwners([
      entry({ type: 'FUGR', name: 'Z_FG' }),
      entry({
        pgmid: 'LIMU',
        type: 'FUNC',
        name: 'Z_FG_RUN',
        wbtype: 'FUGR/Z_FG',
      }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].owner.type).toBe('FUGR');
    expect(groups[0].leaves).toHaveLength(2);
  });

  it('keeps namespaced classes distinct from unprefixed names', () => {
    const groups = dedupeCtsInventoryToOwners([
      entry({ name: '/NS1/ZCL_SAMPLE' }),
      entry({ name: 'ZCL_SAMPLE' }),
      entry({ name: '/NS1/ZCL_SAMPLE ' }),
    ]);
    expect(groups).toHaveLength(2);
    const namespaced = groups.find(
      (group) => group.owner.name === '/NS1/ZCL_SAMPLE',
    );
    expect(namespaced?.leaves).toHaveLength(2);
    expect(namespaced?.unresolved).toBe(false);
  });

  it('preserves input order when component leaves interleave with owners', () => {
    const owner = entry({ type: 'CLAS', name: 'ZCL_SAMPLE' });
    const methodA = entry({
      pgmid: 'LIMU',
      type: 'METH',
      name: classMethodName('ZCL_SAMPLE', 'A'),
      wbtype: 'CLAS/OM',
    });
    const methodB = entry({
      pgmid: 'LIMU',
      type: 'METH',
      name: classMethodName('ZCL_SAMPLE', 'B'),
      wbtype: 'CLAS/OM',
      sourceTransport: 'DEVK900002',
    });
    const groups = dedupeCtsInventoryToOwners([methodA, owner, methodB]);
    expect(groups).toHaveLength(1);
    expect(groups[0].leaves.map((leaf) => leaf.sourceTransport)).toEqual([
      'DEVK900001',
      'DEVK900001',
      'DEVK900002',
    ]);
  });

  it('keeps ownerless leaves as unresolved groups with provenance', () => {
    const orphan = entry({
      pgmid: 'LIMU',
      type: 'METH',
      name: classMethodName('ZCL_ORPHAN', 'RUN'),
      wbtype: 'CLAS/OM',
    });
    const groups = dedupeCtsInventoryToOwners([orphan]);
    expect(groups).toHaveLength(1);
    expect(groups[0].owner).toEqual(orphan);
    expect(groups[0].leaves).toEqual([orphan]);
    expect(groups[0].unresolved).toBe(true);
  });

  it('does not mutate the caller input', () => {
    const input = [
      entry({ name: 'ZCL_SAMPLE   ' }),
      entry({
        pgmid: 'LIMU',
        type: 'METH',
        name: classMethodName('ZCL_SAMPLE', 'RUN'),
        wbtype: 'CLAS/OM',
      }),
    ];
    const before = structuredClone(input);
    dedupeCtsInventoryToOwners(input);
    expect(input).toEqual(before);
  });
});
