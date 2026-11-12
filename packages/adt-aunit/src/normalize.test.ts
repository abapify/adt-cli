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
  return { name, testClasses: [{ name: `${name}T`, methods }] };
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

  it('reports a zero-test run honestly as a valid result', () => {
    const normalized = normalizeAunitResult(result([]));
    expect(normalized.totalTests).toBe(0);
    expect(normalized.programs).toEqual([]);
    expect(() => normalizeAunitResult(result([]))).not.toThrow();
  });

  it('rejects inconsistent summary counts with a typed error', () => {
    const broken = result([program('ZCL_A', [method('T1', 'pass')])]);
    broken.totalTests = 5;
    expect(() => normalizeAunitResult(broken)).toThrowError(
      MalformedAunitReportError,
    );
  });

  it('preserves recorded source paths and URIs verbatim', () => {
    const normalized = normalizeAunitResult(
      result([program('ZCL_A', [method('T1', 'pass')])]),
    );
    expect(normalized.programs[0].name).toBe('ZCL_A');
    expect(normalized.programs[0].testClasses[0].methods[0].name).toBe('T1');
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
  function node(name: string, totals: Array<[string, number, number]>) {
    return {
      objectReference: { type: 'package', name },
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

  it('rejects a report without package nodes with a typed error', () => {
    expect(() =>
      normalizeJacocoCoverage({ measurements: { result: {} } }),
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
