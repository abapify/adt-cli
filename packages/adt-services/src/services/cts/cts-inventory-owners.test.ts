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

describe('dedupeCtsInventoryToOwners', () => {
  it('merges padded spellings of the same object into one owner', () => {
    const groups = dedupeCtsInventoryToOwners([
      entry({ name: 'ZCL_SAMPLE' }),
      entry({ name: 'ZCL_SAMPLE   ' }),
      entry({ name: 'zcl_sample', sourceTransport: 'DEVK900002' }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].owner.name).toBe('ZCL_SAMPLE');
    expect(groups[0].leaves).toHaveLength(3);
    expect(groups[0].leaves.map((leaf) => leaf.sourceTransport)).toEqual([
      'DEVK900001',
      'DEVK900001',
      'DEVK900002',
    ]);
  });

  it('folds a class component leaf into its class owner via wbtype', () => {
    const groups = dedupeCtsInventoryToOwners([
      entry({ type: 'CLAS', name: 'ZCL_SAMPLE' }),
      entry({
        pgmid: 'LIMU',
        type: 'METH',
        name: 'ZCL_SAMPLE RUN',
        wbtype: 'CLAS/ZCL_SAMPLE',
      }),
      entry({
        pgmid: 'LIMU',
        type: 'CLSD',
        name: 'ZCL_SAMPLE',
        wbtype: 'CLAS/ZCL_SAMPLE',
      }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].owner.type).toBe('CLAS');
    expect(groups[0].leaves).toHaveLength(3);
  });

  it('keeps namespaced classes distinct from unprefixed names', () => {
    const groups = dedupeCtsInventoryToOwners([
      entry({ name: '/NS1/ZCL_SAMPLE' }),
      entry({ name: 'ZCL_SAMPLE' }),
      entry({ name: '/NS1/ZCL_SAMPLE ', wbtype: '/NS1/ZCL_SAMPLE' }),
    ]);
    expect(groups).toHaveLength(2);
    const namespaced = groups.find(
      (group) => group.owner.name === '/NS1/ZCL_SAMPLE',
    );
    expect(namespaced?.leaves).toHaveLength(2);
  });

  it('keeps leaves without a matching owner as their own provenance group', () => {
    const orphan = entry({
      pgmid: 'LIMU',
      type: 'METH',
      name: 'ZCL_ORPHAN RUN',
      wbtype: 'CLAS/ZCL_ORPHAN',
    });
    const groups = dedupeCtsInventoryToOwners([orphan]);
    expect(groups).toHaveLength(1);
    expect(groups[0].owner).toEqual(orphan);
    expect(groups[0].leaves).toEqual([orphan]);
  });

  it('does not mutate the caller input', () => {
    const input = [
      entry({ name: 'ZCL_SAMPLE   ' }),
      entry({
        pgmid: 'LIMU',
        type: 'METH',
        name: 'ZCL_SAMPLE RUN',
        wbtype: 'CLAS/ZCL_SAMPLE',
      }),
    ];
    const before = structuredClone(input);
    dedupeCtsInventoryToOwners(input);
    expect(input).toEqual(before);
  });
});
