import { describe, expect, it } from 'vitest';
import {
  mergeAtcVariants,
  normalizeAtcResult,
  type SeverityClass,
} from './normalize';
import type { AtcFinding, AtcResult, FindingResolver } from './types';

function finding(overrides: Partial<AtcFinding>): AtcFinding {
  return {
    checkId: 'CHECK_A',
    checkTitle: 'Check A',
    messageId: 'MSG1',
    priority: 1,
    messageText: 'Something is wrong',
    objectUri: '/sap/bc/adt/oo/classes/zcl_foo',
    objectType: 'CLAS',
    objectName: 'ZCL_FOO',
    location: '/sap/bc/adt/oo/classes/zcl_foo/methods/run#start=21,0',
    ...overrides,
  };
}

function result(findings: AtcFinding[], variant = 'V1'): AtcResult {
  return {
    checkVariant: variant,
    totalFindings: findings.length,
    errorCount: findings.filter((f) => f.priority === 1).length,
    warningCount: findings.filter((f) => f.priority === 2).length,
    infoCount: findings.filter((f) => f.priority > 2).length,
    findings,
  };
}

const standardPolicy = (priority: number): SeverityClass =>
  priority === 1 ? 'error' : priority === 2 ? 'warning' : 'info';

describe('normalizeAtcResult', () => {
  it('derives a stable fingerprint from identity and location facts', async () => {
    const normalized = await normalizeAtcResult(result([finding({})]));
    expect(normalized.findings[0].fingerprint).toBe(
      'CHECK_A:MSG1:CLAS:ZCL_FOO:/sap/bc/adt/oo/classes/zcl_foo/methods/run#start=21,0',
    );
  });

  it('keeps duplicate findings as distinct entries with equal fingerprints', async () => {
    const normalized = await normalizeAtcResult(
      result([finding({}), finding({})]),
    );
    expect(normalized.findings).toHaveLength(2);
    expect(normalized.findings[0].fingerprint).toBe(
      normalized.findings[1].fingerprint,
    );
  });

  it('prefers resolved repository locations over fallback paths', async () => {
    const resolver: FindingResolver = {
      resolve: async () => ({
        path: 'src/zpkg/zpkg_clas/zcl_foo.clas.abap',
        line: 7,
      }),
    };
    const normalized = await normalizeAtcResult(result([finding({})]), {
      resolver,
    });
    expect(normalized.findings[0].resolvedLocation).toEqual({
      path: 'src/zpkg/zpkg_clas/zcl_foo.clas.abap',
      line: 7,
    });
    expect(normalized.findings[0].line).toBe(7);
  });

  it('falls back to a canonical prefix path and method-relative line', async () => {
    const normalized = await normalizeAtcResult(result([finding({})]));
    expect(normalized.findings[0].resolvedLocation).toBeUndefined();
    expect(normalized.findings[0].fallbackPath).toBe(
      'src/clas/zcl_foo.clas.abap',
    );
    expect(normalized.findings[0].line).toBe(21);
  });

  it('resolves a single distinct category as the result category', async () => {
    const normalized = await normalizeAtcResult(
      result([
        finding({ checkCategory: 'CI_PERFORMANCE' }),
        finding({ checkCategory: 'CI_PERFORMANCE' }),
      ]),
    );
    expect(normalized.category).toBe('CI_PERFORMANCE');
  });

  it('reports no result category when finding categories conflict', async () => {
    const normalized = await normalizeAtcResult(
      result([
        finding({ checkCategory: 'CI_PERFORMANCE' }),
        finding({ checkCategory: 'CI_CORRECTNESS' }),
      ]),
    );
    expect(normalized.category).toBeUndefined();
  });

  it('keeps composite object facts on the normalized finding', async () => {
    const composite = finding({
      objectType: 'CLAS',
      objectName: 'ZCL_FOO',
      location:
        '/sap/bc/adt/oo/classes/zcl_foo/methods/run#type=CLAS%2FOM;name=RUN;start=21',
    });
    const normalized = await normalizeAtcResult(result([composite]));
    expect(normalized.findings[0].objectType).toBe('CLAS');
    expect(normalized.findings[0].objectName).toBe('ZCL_FOO');
    expect(normalized.findings[0].location).toContain('methods/run');
  });

  it('keeps namespace segments in identity and fallback path', async () => {
    const normalized = await normalizeAtcResult(
      result([finding({ objectName: '/NS1/ZCL_FOO' })]),
    );
    expect(normalized.findings[0].fallbackPath).toBe(
      'src/clas//ns1/zcl_foo.clas.abap',
    );
    expect(normalized.findings[0].objectName).toBe('/NS1/ZCL_FOO');
  });
});

describe('mergeAtcVariants', () => {
  it('is independent of merge order', () => {
    const a = result([finding({ checkId: 'CHECK_A' })], 'VA');
    const b = result([finding({ checkId: 'CHECK_B', priority: 3 })], 'VB');
    const ab = mergeAtcVariants([a, b], standardPolicy);
    const ba = mergeAtcVariants([b, a], standardPolicy);
    expect(ab).toEqual(ba);
  });

  it('recomputes counts with the injected severity policy', () => {
    const merged = mergeAtcVariants(
      [
        result([finding({ priority: 1 }), finding({ priority: 3 })]),
        result([finding({ priority: 2 })]),
      ],
      standardPolicy,
    );
    expect(merged.totalFindings).toBe(3);
    expect(merged.errorCount).toBe(1);
    expect(merged.warningCount).toBe(1);
    expect(merged.infoCount).toBe(1);
  });

  it('applies a non-default severity policy, not the priority convention', () => {
    const invertedPolicy = (priority: number): SeverityClass =>
      priority === 1 ? 'info' : priority === 3 ? 'error' : 'warning';
    const merged = mergeAtcVariants(
      [
        result([finding({ priority: 1 }), finding({ priority: 3 })]),
        result([finding({ priority: 2 })]),
      ],
      invertedPolicy,
    );
    expect(merged.errorCount).toBe(1);
    expect(merged.warningCount).toBe(1);
    expect(merged.infoCount).toBe(1);
  });

  it('is idempotent for a repeated identical variant result', () => {
    const variantResult = result(
      [finding({}), finding({ messageId: 'MSG2' })],
      'VA',
    );
    const redelivered = structuredClone(variantResult);
    // Redelivery may reorder findings; the duplicate must still collapse.
    redelivered.findings.reverse();
    const merged = mergeAtcVariants(
      [variantResult, redelivered],
      standardPolicy,
    );
    expect(merged.totalFindings).toBe(2);
    expect(merged.checkVariant).toBe('VA');
  });

  it('keeps findings from identical checks across variants', () => {
    const merged = mergeAtcVariants(
      [
        result([finding({ messageId: 'MSG1' })]),
        result([finding({ messageId: 'MSG2' })]),
      ],
      standardPolicy,
    );
    expect(merged.findings).toHaveLength(2);
    expect(new Set(merged.findings.map((f) => f.fingerprint)).size).toBe(2);
  });
});
