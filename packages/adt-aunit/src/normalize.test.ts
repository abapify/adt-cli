import { describe, expect, it } from 'vitest';
import {
  MalformedAunitReportError,
  normalizeAunitResult,
  normalizeJacocoCoverage,
} from './normalize';
import type { AunitAlert, AunitProgram, AunitResult } from './types';

function alert(overrides: Partial<AunitAlert>): AunitAlert {
  return {
    kind: 'failedAssertion',
    severity: 'critical',
    title: 'Assertion failed',
    details: ['expected 1, got 2'],
    stack: [],
    ...overrides,
  };
}

function method(
  name: string,
  status: 'pass' | 'fail' | 'error' | 'skip',
  alerts: AunitAlert[] = [],
) {
  return { name, executionTime: 0.1, status, alerts };
}

function program(
  name: string,
  methods: ReturnType<typeof method>[],
): AunitProgram {
  return {
    name,
    uri: `adt:///sap/bc/adt/oo/classes/${name.toLowerCase()}`,
    testClasses: [{ name: `${name}T`, methods }],
  };
}

function result(programs: AunitProgram[]): AunitResult {
  const methods = programs.flatMap((p) =>
    p.testClasses.flatMap((c) => c.methods),
  );
  const count = (status: string) =>
    methods.filter((m) => m.status === status).length;
  return {
    programs,
    totalTests: methods.length,
    passCount: count('pass'),
    failCount: count('fail'),
    errorCount: count('error'),
    skipCount: count('skip'),
    totalTime: methods.length * 0.1,
  };
}

describe('normalizeAunitResult', () => {
  it('classifies an assertion failure without confusing it with an error', () => {
    const normalized = normalizeAunitResult(
      result([program('ZCL_A', [method('T1', 'fail', [alert({})])])]),
    );
    expect(
      normalized.programs[0].testClasses[0].methods[0].classification,
    ).toBe('assertion-failure');
  });

  it('classifies an error status as a technical error', () => {
    const normalized = normalizeAunitResult(
      result([
        program('ZCL_A', [
          method('T1', 'error', [
            alert({ kind: 'exception', title: 'CXboom' }),
          ]),
        ]),
      ]),
    );
    expect(
      normalized.programs[0].testClasses[0].methods[0].classification,
    ).toBe('technical-error');
  });

  it('gives error status precedence over an assertion alert', () => {
    const normalized = normalizeAunitResult(
      result([program('ZCL_A', [method('T1', 'error', [alert({})])])]),
    );
    expect(
      normalized.programs[0].testClasses[0].methods[0].classification,
    ).toBe('technical-error');
  });

  it('classifies a fail without an assertion alert as a technical error', () => {
    const normalized = normalizeAunitResult(
      result([
        program('ZCL_A', [
          method('T1', 'fail', [
            alert({ kind: 'runtimeError', title: 'Dump' }),
          ]),
        ]),
      ]),
    );
    expect(
      normalized.programs[0].testClasses[0].methods[0].classification,
    ).toBe('technical-error');
  });

  it('surfaces a warning alert on a passing method', () => {
    const normalized = normalizeAunitResult(
      result([
        program('ZCL_A', [
          method('T1', 'pass', [alert({ kind: 'warning', title: 'Slow' })]),
        ]),
      ]),
    );
    expect(
      normalized.programs[0].testClasses[0].methods[0].classification,
    ).toBe('warning');
  });

  it('treats a message-less assertion alert as a technical error', () => {
    const normalized = normalizeAunitResult(
      result([
        program('ZCL_A', [
          method('T1', 'fail', [alert({ title: '', details: [] })]),
        ]),
      ]),
    );
    expect(
      normalized.programs[0].testClasses[0].methods[0].classification,
    ).toBe('technical-error');
  });

  it('reports a zero-test run honestly as a valid result', () => {
    const normalized = normalizeAunitResult(result([]));
    expect(normalized.totalTests).toBe(0);
    expect(normalized.programs).toEqual([]);
  });

  it('rejects inconsistent summary counts with a typed error', () => {
    const broken = result([program('ZCL_A', [method('T1', 'pass')])]);
    broken.totalTests = 5;
    expect(() => normalizeAunitResult(broken)).toThrowError(
      MalformedAunitReportError,
    );
  });

  it('rejects summary counts that contradict the recorded methods', () => {
    const broken = result([
      program('ZCL_A', [
        method('T1', 'pass'),
        method('T2', 'fail', [alert({})]),
      ]),
    ]);
    broken.failCount = 0;
    expect(() => normalizeAunitResult(broken)).toThrowError(
      MalformedAunitReportError,
    );
  });

  it('rejects offsetting negative summary counts', () => {
    const broken = result([]);
    broken.totalTests = 0;
    broken.passCount = 1;
    broken.failCount = -1;
    expect(() => normalizeAunitResult(broken)).toThrowError(
      MalformedAunitReportError,
    );
  });

  it('rejects missing program collections with a typed error', () => {
    const broken = {
      totalTests: 0,
      passCount: 0,
      failCount: 0,
      errorCount: 0,
      skipCount: 0,
      totalTime: 0,
    };
    expect(() =>
      normalizeAunitResult(broken as unknown as AunitResult),
    ).toThrowError(MalformedAunitReportError);
  });

  it('preserves recorded source paths and URIs verbatim', () => {
    const normalized = normalizeAunitResult(
      result([program('ZCL_A', [method('T1', 'pass')])]),
    );
    expect(normalized.programs[0].name).toBe('ZCL_A');
    expect(normalized.programs[0].uri).toBe(
      'adt:///sap/bc/adt/oo/classes/zcl_a',
    );
    expect(normalized.programs[0].testClasses[0].methods[0].name).toBe('T1');
  });

  it('keeps composite filenames and failure-count contracts intact', () => {
    const input = result([
      program('ZCL_A', [
        method('T1', 'pass'),
        method('T2', 'fail', [alert({})]),
      ]),
      program('ZCL_X.TEST', [method('T3', 'skip')]),
    ]);
    const normalized = normalizeAunitResult(input);
    expect(normalized.failCount).toBe(1);
    expect(normalized.passCount).toBe(1);
    expect(normalized.skipCount).toBe(1);
    expect(normalized.totalTests).toBe(3);
    expect(normalized.programs[1].name).toBe('ZCL_X.TEST');
  });

  it('does not mutate the caller input', () => {
    const input = result([
      program('ZCL_A', [method('T1', 'fail', [alert({})])]),
    ]);
    const before = structuredClone(input);
    normalizeAunitResult(input);
    expect(input).toEqual(before);
  });
});

describe('normalizeJacocoCoverage', () => {
  function node(
    name: string,
    totals: Array<[string, number, number]>,
    children?: Array<ReturnType<typeof classNode>>,
  ) {
    return {
      objectReference: { type: 'package', name },
      ...(totals.length
        ? {
            coverages: {
              coverage: totals.map(([type, total, executed]) => ({
                type,
                total,
                executed,
              })),
            },
          }
        : {}),
      ...(children ? { nodes: { node: children } } : {}),
    };
  }

  function classNode(name: string, totals: Array<[string, number, number]>) {
    return {
      objectReference: { type: 'class', name },
      coverages: {
        coverage: totals.map(([type, total, executed]) => ({
          type,
          total,
          executed,
        })),
      },
    };
  }

  function measurementRoot(packages: ReturnType<typeof node>[]) {
    return {
      result: {
        objectReference: { type: 'root', name: 'ROOT' },
        nodes: { node: packages },
      },
    };
  }

  it('aggregates package-level totals from class-level facts deterministically', () => {
    const normalized = normalizeJacocoCoverage({
      measurements: measurementRoot([
        node('zpkgb', [
          ['LINE', 10, 4],
          ['INSTRUCTION', 20, 8],
        ]),
        node('zpka', [
          ['LINE', 6, 2],
          ['INSTRUCTION', 12, 3],
        ]),
      ]),
    });
    expect(normalized.packages.map((pkg) => pkg.name)).toEqual([
      'zpka',
      'zpkgb',
    ]);
    expect(normalized.packages[1].counters).toContainEqual({
      type: 'LINE',
      total: 10,
      executed: 4,
    });
    expect(normalized.totals.lineTotal).toBe(16);
    expect(normalized.totals.lineCovered).toBe(6);
    expect(normalized.totals.instructionTotal).toBe(32);
    expect(normalized.totals.instructionCovered).toBe(11);
  });

  it('aggregates nested class counters when the package omits its own', () => {
    const normalized = normalizeJacocoCoverage({
      measurements: measurementRoot([
        node(
          'zpkg',
          [],
          [
            classNode('ZCL_A', [['LINE', 8, 2]]),
            classNode('ZCL_B', [['LINE', 4, 4]]),
          ],
        ),
      ]),
    });
    expect(normalized.packages).toHaveLength(1);
    expect(normalized.totals.lineTotal).toBe(12);
    expect(normalized.totals.lineCovered).toBe(6);
  });

  it('maps ADT counter names to normalized measurements', () => {
    const normalized = normalizeJacocoCoverage({
      measurements: measurementRoot([
        node('zpkg', [
          ['STATEMENT', 9, 3],
          ['PROCEDURE', 5, 1],
          ['BRANCH', 4, 2],
        ]),
      ]),
    });
    expect(normalized.totals.lineTotal).toBe(9);
    expect(normalized.totals.lineCovered).toBe(3);
    expect(normalized.totals.instructionTotal).toBe(5);
    expect(normalized.totals.instructionCovered).toBe(1);
    expect(normalized.totals.branchTotal).toBe(4);
    expect(normalized.totals.branchCovered).toBe(2);
  });

  it('rejects a report without package nodes with a typed error', () => {
    expect(() =>
      normalizeJacocoCoverage({ measurements: { result: {} } }),
    ).toThrowError(MalformedAunitReportError);
  });

  it('rejects malformed counters with a typed error', () => {
    expect(() =>
      normalizeJacocoCoverage({
        measurements: measurementRoot([
          node('zpkg', [['LINE', 4, 1]], undefined),
          {
            objectReference: { type: 'package', name: 'zbad' },
            coverages: { coverage: [{ type: '', total: 1, executed: 1 }] },
          },
        ]),
      }),
    ).toThrowError(MalformedAunitReportError);
  });

  it('does not mutate the caller input', () => {
    const input = {
      measurements: measurementRoot([node('zpkg', [['LINE', 4, 1]])]),
    };
    const before = structuredClone(input);
    normalizeJacocoCoverage(input);
    expect(input).toEqual(before);
  });
});
