import { describe, expect, it } from 'vitest';
import {
  assessFlowCheckoutCoverage,
  type FlowCheckoutReport,
  type ObjectDescriptor,
} from '../src';

const source = 'src/sample/zcl_sample.clas.abap';
const metadata = 'src/sample/zcl_sample.clas.xml';
const companion = 'src/sample/zcl_sample.clas.locals_imp.abap';
const hashA = 'a'.repeat(64);
const hashB = 'b'.repeat(64);

function descriptor(overrides?: Partial<ObjectDescriptor>): ObjectDescriptor {
  return {
    schemaVersion: 1,
    formatVersion: 1,
    identity: {
      canonical: 'R3TR/CLAS/ZCL_SAMPLE',
      pgmid: 'R3TR',
      type: 'CLAS',
      name: 'ZCL_SAMPLE',
    },
    state: 'present',
    packagePath: ['SAMPLE'],
    selections: [],
    ownedFiles: [
      { path: source, hash: hashA, role: 'source', sourceComponent: 'main' },
      { path: metadata, hash: hashA, role: 'metadata' },
      {
        path: companion,
        hash: hashA,
        role: 'source',
        sourceComponent: 'locals-imp',
      },
    ],
    configDigest: hashA,
    formatDigest: hashA,
    ...overrides,
  };
}

function report(overrides?: Partial<FlowCheckoutReport>): FlowCheckoutReport {
  return {
    schemaVersion: 1,
    coverageVersion: 1,
    mode: 'head',
    requestedTransports: ['DEVK900001'],
    scopeTransports: ['DEVK900001'],
    descriptors: ['.adt/objects/CLAS/zcl_sample.clas.adt.json'],
    indexedOnly: false,
    skipped: [],
    inventory: [
      {
        pgmid: 'R3TR',
        type: 'CLAS',
        name: 'ZCL_SAMPLE',
        objFunc: 'K',
        sourceTransport: 'DEVK900001',
      },
    ],
    ...overrides,
  };
}

function evidence(
  map: Record<string, string | null> = {
    [source]: hashA,
    [metadata]: hashA,
    [companion]: hashA,
  },
) {
  return new Map(Object.entries(map));
}

function assess(
  reportValue: unknown = report(),
  descriptors: readonly unknown[] = [descriptor()],
  files = evidence(),
) {
  const result = assessFlowCheckoutCoverage({
    report: reportValue,
    descriptors,
    fileEvidence: files,
  });
  if (result.status === 'unknown')
    throw new Error(`unexpected unknown assessment: ${result.reason}`);
  return result;
}

describe('flow checkout coverage assessment', () => {
  it('assesses complete coverage when every owned file is verified', () => {
    const assessment = assess();
    expect(assessment.status).toBe('complete');
    expect(assessment).toMatchObject({
      schemaVersion: 1,
      mode: 'head',
      requestedTransports: ['DEVK900001'],
      scopeTransports: ['DEVK900001'],
      sourceExactness: 'verified',
      indexedOnly: false,
    });
    expect(assessment.files.acquired).toEqual([source, companion, metadata]);
    expect(assessment.files.deleted).toEqual([]);
    expect(assessment.files.unverified).toEqual([]);
    expect(assessment.omissions).toEqual([]);
    expect(assessment.inventory).toEqual({ entries: 1, mapped: 1 });
  });

  it('maps namespaced ownership through encoded abapGit paths', () => {
    const namespaced = descriptor({
      identity: {
        canonical: 'R3TR/CLAS//DEMO/ZCL_SAMPLE',
        pgmid: 'R3TR',
        type: 'CLAS',
        name: '/DEMO/ZCL_SAMPLE',
      },
      ownedFiles: [
        {
          path: 'src/#demo#zcl_sample.clas.abap',
          hash: hashA,
          role: 'source',
          sourceComponent: 'main',
        },
        {
          path: 'src/#demo#zcl_sample.clas.xml',
          hash: hashA,
          role: 'metadata',
        },
      ],
    });
    const namespacedReport = report({
      inventory: [
        {
          pgmid: 'R3TR',
          type: 'CLAS',
          name: '/DEMO/ZCL_SAMPLE',
          objFunc: 'K',
          sourceTransport: 'DEVK900001',
        },
      ],
    });
    const assessment = assess(
      namespacedReport,
      [namespaced],
      evidence({
        'src/#demo#zcl_sample.clas.abap': hashA,
        'src/#demo#zcl_sample.clas.xml': hashA,
      }),
    );
    expect(assessment.status).toBe('complete');
    expect(assessment.files.acquired).toEqual([
      'src/#demo#zcl_sample.clas.abap',
      'src/#demo#zcl_sample.clas.xml',
    ]);
  });

  it('maps padded and URI-less components through repository ownership', () => {
    const padded = 'ZCL_SAMPLE'.padEnd(30, ' ') + 'METHOD';
    const assessment = assess(
      report({
        inventory: [
          {
            pgmid: 'R3TR',
            type: 'CLAS',
            name: 'ZCL_SAMPLE',
            objFunc: 'K',
            sourceTransport: 'DEVK900001',
          },
          {
            pgmid: 'R3TR',
            type: 'METH',
            name: padded,
            objFunc: 'K',
            sourceTransport: 'DEVK900001',
          },
        ],
        inventoryResolutions: [
          {
            outcome: 'resolved',
            object: {
              pgmid: 'R3TR',
              type: 'METH',
              name: padded,
            },
            sourceTransport: 'DEVK900001',
            repositoryObject: {
              pgmid: 'R3TR',
              type: 'CLAS',
              name: 'ZCL_SAMPLE',
            },
          },
        ],
      }),
    );
    expect(assessment.status).toBe('complete');
    expect(assessment.inventory).toEqual({ entries: 2, mapped: 2 });
  });

  it('keeps skipped, derived, absent and unmapped objects as typed omissions', () => {
    const assessment = assess(
      report({
        skipped: [
          {
            object: 'CLAS/Z_UNAVAILABLE',
            component: 'object',
            diagnostic: 'OBJECT_METADATA_LOAD_FAILED',
            sourceTransport: 'DEVK900001',
          },
        ],
        derived: [
          {
            object: 'CLAS/ZCL_OTHER',
            component: 'macros',
            diagnostic: 'SOURCE_COMPONENT_SCOPE_DERIVED',
            sourceTransport: 'DEVK900001',
          },
        ],
        absentObjects: ['R3TR/CLAS/Z_ABSENT'],
        inventory: [
          {
            pgmid: 'R3TR',
            type: 'CLAS',
            name: 'ZCL_SAMPLE',
            objFunc: 'K',
            sourceTransport: 'DEVK900001',
          },
          {
            pgmid: 'R3TR',
            type: 'PROG',
            name: 'Z_UNMAPPED',
            objFunc: 'K',
            sourceTransport: 'DEVK900001',
          },
        ],
      }),
    );
    expect(assessment.status).toBe('partial');
    expect(assessment.omissions).toEqual([
      {
        object: 'R3TR/CLAS/Z_ABSENT',
        component: 'object',
        diagnostic: 'COVERAGE_ABSENT_OBJECT',
      },
      {
        object: 'CLAS/Z_UNAVAILABLE',
        component: 'object',
        diagnostic: 'OBJECT_METADATA_LOAD_FAILED',
        sourceTransport: 'DEVK900001',
      },
      {
        object: 'R3TR/PROG/Z_UNMAPPED',
        component: 'object',
        diagnostic: 'COVERAGE_OWNERSHIP_UNMAPPED',
        sourceTransport: 'DEVK900001',
      },
      {
        object: 'CLAS/ZCL_OTHER',
        component: 'macros',
        diagnostic: 'SOURCE_COMPONENT_SCOPE_DERIVED',
        sourceTransport: 'DEVK900001',
      },
    ]);
  });

  it('resolves unknown reports to explicit unknown instead of completeness', () => {
    for (const [reason, value] of [
      ['missing-report', undefined],
      ['unsupported-report', null],
      ['unsupported-report', {}],
      ['unsupported-report', { ...report(), schemaVersion: 2 }],
      ['unsupported-report', { ...report(), coverageVersion: 2 }],
      ['unsupported-report', 'report'],
    ] as const) {
      const assessment = assessFlowCheckoutCoverage({
        report: value,
        descriptors: [],
        fileEvidence: evidence(),
      });
      expect(assessment.status).toBe('unknown');
      if (assessment.status !== 'unknown') throw new Error('narrowing');
      expect(assessment.reason).toBe(reason);
    }
  });

  it('classifies verified absence and divergence instead of failing the assessment', () => {
    const assessment = assess(
      report(),
      [descriptor()],
      evidence({
        [source]: hashA,
        [metadata]: null,
        [companion]: hashB,
      }),
    );
    expect(assessment.status).toBe('partial');
    expect(assessment.files.acquired).toEqual([source]);
    expect(assessment.files.deleted).toEqual([metadata]);
    expect(assessment.files.diverged).toEqual([companion]);
    expect(assessment.files.unverified).toEqual([]);
    expect(assessment.omissions).toEqual([
      {
        object: 'R3TR/CLAS/ZCL_SAMPLE',
        component: 'locals-imp',
        diagnostic: 'COVERAGE_FILE_DIVERGED',
      },
    ]);
  });

  it('reports owned files without caller evidence as unverified', () => {
    const assessment = assess(
      report(),
      [descriptor()],
      evidence({ [source]: hashA }),
    );
    expect(assessment.status).toBe('partial');
    expect(assessment.files.unverified).toEqual([companion, metadata]);
    expect(assessment.sourceExactness).toBe('unverified');
  });

  it('keeps indexed-only assessments without demanding source evidence', () => {
    const assessment = assess(
      report({ indexedOnly: true, inventory: [] }),
      [descriptor()],
      evidence({}),
    );
    expect(assessment.status).toBe('partial');
    expect(assessment.sourceExactness).toBe('indexed-only');
    expect(assessment.files.unverified).toEqual([]);
  });

  it('keeps duplicate ownership and unsafe paths as validation failures', () => {
    const duplicate = descriptor();
    duplicate.ownedFiles.push({
      path: metadata.toUpperCase(),
      hash: hashA,
      role: 'metadata',
    });
    expect(() => assess(report(), [duplicate])).toThrow(/path/i);
    const outside = descriptor();
    (outside.ownedFiles[0] as { path: string }).path = '../outside';
    expect(() => assess(report(), [outside])).toThrow();
  });

  it('assesses the same inputs identically', () => {
    expect(assess()).toEqual(assess());
  });
});
