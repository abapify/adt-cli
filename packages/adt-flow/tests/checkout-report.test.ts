import { describe, expect, it } from 'vitest';
import {
  createFlowCheckoutReport,
  createFlowPartialReport,
  type FlowCheckoutResult,
} from '../src';

function result(): FlowCheckoutResult {
  return {
    mode: 'head',
    requestedTransports: ['DEVK900001'],
    scopeTransports: ['DEVK900001', 'DEVK900002'],
    changed: [],
    moved: [],
    removed: [],
    unchanged: [],
    descriptors: ['.adt/objects/CLAS/zcl_sample.clas.adt.json'],
    skipped: [],
    sapCalls: { manifest: 1, metadata: 0, source: 0 },
    fastPath: 'none',
  };
}

describe('public checkout reports', () => {
  it('retains the full version-one wire contract without claiming completeness', () => {
    expect(
      JSON.parse(JSON.stringify(createFlowCheckoutReport(result()))),
    ).toEqual({
      schemaVersion: 1,
      coverageVersion: 1,
      mode: 'head',
      requestedTransports: ['DEVK900001'],
      scopeTransports: ['DEVK900001', 'DEVK900002'],
      descriptors: ['.adt/objects/CLAS/zcl_sample.clas.adt.json'],
      indexedOnly: false,
      skipped: [],
    });
  });

  it('distinguishes unavailable inventory from a verified empty inventory', () => {
    const unknown = createFlowCheckoutReport(result());
    const empty = createFlowCheckoutReport({
      ...result(),
      inventory: [],
      inventoryResolutions: [],
      absentObjects: [],
    });
    expect('inventory' in unknown).toBe(false);
    expect('inventoryResolutions' in unknown).toBe(false);
    expect('absentObjects' in unknown).toBe(false);
    expect(JSON.parse(JSON.stringify(unknown))).not.toHaveProperty('inventory');
    expect(empty.inventory).toEqual([]);
    expect(empty.inventoryResolutions).toEqual([]);
    expect(empty.absentObjects).toEqual([]);
  });

  it('does not share optional evidence arrays with the checkout result', () => {
    const source = {
      ...result(),
      inventory: [
        {
          pgmid: 'R3TR',
          type: 'CLAS',
          name: 'ZCL_SAMPLE',
          objFunc: 'K',
          sourceTransport: 'DEVK900001',
        },
      ],
    } as FlowCheckoutResult;
    const report = createFlowCheckoutReport(source);
    expect(report.inventory).toEqual([
      {
        pgmid: 'R3TR',
        type: 'CLAS',
        name: 'ZCL_SAMPLE',
        objFunc: 'K',
        sourceTransport: 'DEVK900001',
      },
    ]);
    report.inventory?.push({
      pgmid: 'R3TR',
      type: 'CLAS',
      name: 'ZCL_OTHER',
      objFunc: 'K',
      sourceTransport: 'DEVK900002',
    });
    report.skipped.push({
      object: 'CLAS/ZC',
      component: 'main',
      diagnostic: 'X',
    });
    expect(source.inventory?.length).toBe(1);
    expect(source.skipped).toEqual([]);
  });

  it('preserves baseline and index-only outcomes', () => {
    expect(
      createFlowCheckoutReport({
        ...result(),
        mode: 'base',
        indexedOnly: true,
      }),
    ).toMatchObject({ mode: 'base', indexedOnly: true });
  });

  it('includes derived components only when the result carries them', () => {
    expect('derived' in createFlowCheckoutReport(result())).toBe(false);
    const report = createFlowCheckoutReport({
      ...result(),
      derived: [
        {
          object: 'CLAS/ZCL_OTHER',
          component: 'macros',
          diagnostic: 'SOURCE_COMPONENT_SCOPE_DERIVED',
          sourceTransport: 'DEVK900001',
        },
        {
          object: 'CLAS/ZCL_SAMPLE',
          component: 'definitions',
          diagnostic: 'SOURCE_COMPONENT_SCOPE_DERIVED',
          sourceTransport: 'DEVK900001',
        },
      ],
    });
    expect(report.derived).toEqual([
      {
        object: 'CLAS/ZCL_OTHER',
        component: 'macros',
        diagnostic: 'SOURCE_COMPONENT_SCOPE_DERIVED',
        sourceTransport: 'DEVK900001',
      },
      {
        object: 'CLAS/ZCL_SAMPLE',
        component: 'definitions',
        diagnostic: 'SOURCE_COMPONENT_SCOPE_DERIVED',
        sourceTransport: 'DEVK900001',
      },
    ]);
  });

  it('keeps the partial report compatible without adding coverage fields', () => {
    expect(
      createFlowPartialReport({
        ...result(),
        inventory: [],
        indexedOnly: true,
      }),
    ).toEqual({
      schemaVersion: 1,
      requestedTransports: ['DEVK900001'],
      skipped: [],
    });
  });

  it('sorts omissions deterministically without changing checkout order', () => {
    const input = result();
    input.skipped = [
      { object: 'CLAS/ZB', component: 'main', diagnostic: 'MISSING' },
      {
        object: 'CLAS/ZA',
        component: 'main',
        diagnostic: 'MISSING',
        sourceTransport: 'DEVK900002',
      },
      {
        object: 'CLAS/ZA',
        component: 'main',
        diagnostic: 'MISSING',
        sourceTransport: 'DEVK900001',
      },
      { object: 'CLAS/ZA', component: 'locals', diagnostic: 'UNSUPPORTED' },
    ];
    const before = structuredClone(input);
    const expected = [
      { object: 'CLAS/ZA', component: 'locals', diagnostic: 'UNSUPPORTED' },
      {
        object: 'CLAS/ZA',
        component: 'main',
        diagnostic: 'MISSING',
        sourceTransport: 'DEVK900001',
      },
      {
        object: 'CLAS/ZA',
        component: 'main',
        diagnostic: 'MISSING',
        sourceTransport: 'DEVK900002',
      },
      { object: 'CLAS/ZB', component: 'main', diagnostic: 'MISSING' },
    ];
    expect(createFlowCheckoutReport(input).skipped).toEqual(expected);
    expect(createFlowPartialReport(input).skipped).toEqual(expected);
    expect(
      createFlowCheckoutReport({
        ...input,
        skipped: [...input.skipped].reverse(),
      }),
    ).toEqual(createFlowCheckoutReport(input));
    expect(input).toEqual(before);
  });
});
