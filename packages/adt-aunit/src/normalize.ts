import type {
  AunitAlert,
  AunitProgram,
  AunitResult,
  AunitTestMethod,
} from './types';

/**
 * How a test method outcome is classified after normalization. Assertion
 * failures stay assertion failures; only runs without an assertion alert
 * count as technical errors.
 */
export type AunitMethodClassification =
  'assertion-failure' | 'technical-error' | 'warning' | 'passed' | 'skipped';

export interface NormalizedAunitTestMethod extends AunitTestMethod {
  classification: AunitMethodClassification;
}

export interface NormalizedAunitTestClass {
  name: string;
  uri?: string;
  riskLevel?: string;
  durationCategory?: string;
  methods: NormalizedAunitTestMethod[];
}

export interface NormalizedAunitProgram {
  name: string;
  type?: string;
  uri?: string;
  testClasses: NormalizedAunitTestClass[];
}

export interface NormalizedAunitResult extends AunitResult {
  programs: NormalizedAunitProgram[];
}

/** Typed failure for malformed or inconsistent report facts. */
export class MalformedAunitReportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MalformedAunitReportError';
  }
}

function isAssertionAlert(alert: AunitAlert): boolean {
  return alert.kind.toLowerCase().includes('assertion');
}

function classifyMethod(method: AunitTestMethod): AunitMethodClassification {
  if (method.status === 'pass') {
    return 'passed';
  }
  if (method.status === 'skip') {
    return 'skipped';
  }
  if (method.alerts.some(isAssertionAlert)) {
    return 'assertion-failure';
  }
  return 'technical-error';
}

function normalizeProgram(program: AunitProgram): NormalizedAunitProgram {
  return {
    ...program,
    testClasses: program.testClasses.map((testClass) => ({
      ...testClass,
      methods: testClass.methods.map((method) => ({
        ...method,
        classification: classifyMethod(method),
      })),
    })),
  };
}

function assertConsistentCounts(result: AunitResult): void {
  if (result.totalTests < 0) {
    throw new MalformedAunitReportError(
      'AUnit report summary counts are negative.',
    );
  }
  const statusSum =
    result.passCount + result.failCount + result.errorCount + result.skipCount;
  if (result.totalTests !== statusSum) {
    throw new MalformedAunitReportError(
      `AUnit report summary counts are inconsistent: totalTests=${result.totalTests} but statuses sum to ${statusSum}.`,
    );
  }
}

/**
 * Normalize an AUnit result into the canonical model: every method carries
 * an outcome classification that keeps assertion failures distinct from
 * technical errors, summary counts are validated (typed error on malformed
 * input), zero-test runs are valid results, and recorded source paths and
 * URIs are preserved verbatim — path repair stays a consumer concern. The
 * caller's input is never mutated.
 */
export function normalizeAunitResult(
  result: AunitResult,
): NormalizedAunitResult {
  assertConsistentCounts(result);
  return {
    ...result,
    programs: result.programs.map(normalizeProgram),
  };
}

// ─── JaCoCo coverage normalization ─────────────────────────────────────

export interface JacocoCoverageCounter {
  type: string;
  total: number;
  executed: number;
}

export interface NormalizedJacocoPackage {
  name: string;
  counters: JacocoCoverageCounter[];
}

export interface NormalizedJacocoCoverage {
  packages: NormalizedJacocoPackage[];
  totals: {
    lineTotal: number;
    lineCovered: number;
    instructionTotal: number;
    instructionCovered: number;
  };
}

interface CoverageNodeInput {
  objectReference?: { type?: string; name?: string };
  coverages?: { coverage?: JacocoCoverageCounter[] };
}

interface MeasurementRootInput {
  result?: {
    nodes?: { node?: CoverageNodeInput[] };
  };
}

function counterValue(
  counters: JacocoCoverageCounter[] | undefined,
  type: string,
): { total: number; covered: number } | undefined {
  const counter = counters?.find(
    (candidate) => candidate.type.toUpperCase() === type,
  );
  if (!counter || typeof counter.total !== 'number') {
    return undefined;
  }
  return { total: counter.total, covered: counter.executed ?? 0 };
}

function aggregateCounters(
  packages: NormalizedJacocoPackage[],
): Map<string, { total: number; covered: number }> {
  const totals = new Map<string, { total: number; covered: number }>();
  for (const counterType of ['LINE', 'INSTRUCTION', 'BRANCH']) {
    const aggregated = aggregateCounterType(packages, counterType);
    if (aggregated) {
      totals.set(counterType.toLowerCase(), aggregated);
    }
  }
  return totals;
}

function aggregateCounterType(
  packages: NormalizedJacocoPackage[],
  counterType: string,
): { total: number; covered: number } | undefined {
  let total = 0;
  let covered = 0;
  let present = false;
  for (const pkg of packages) {
    const value = counterValue(pkg.counters, counterType);
    if (value) {
      present = true;
      total += value.total;
      covered += value.covered;
    }
  }
  return present ? { total, covered } : undefined;
}

/**
 * Normalize raw AUnit coverage measurements into deterministic package-level
 * and total facts, computed from the recorded class/package counters.
 * Package order is by name; malformed roots raise a typed error; the
 * caller's input is never mutated.
 */
export function normalizeJacocoCoverage(input: {
  measurements: MeasurementRootInput;
}): NormalizedJacocoCoverage {
  const nodes = input.measurements?.result?.nodes?.node;
  if (!Array.isArray(nodes)) {
    throw new MalformedAunitReportError(
      'Coverage report has no package nodes.',
    );
  }
  const packages: NormalizedJacocoPackage[] = nodes
    .map((node) => ({
      name: node.objectReference?.name ?? '',
      counters: (node.coverages?.coverage ?? []).map((counter) => ({
        ...counter,
      })),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const totals = aggregateCounters(packages);
  const line = totals.get('line') ?? { total: 0, covered: 0 };
  const instruction = totals.get('instruction') ?? { total: 0, covered: 0 };
  return {
    packages,
    totals: {
      lineTotal: line.total,
      lineCovered: line.covered,
      instructionTotal: instruction.total,
      instructionCovered: instruction.covered,
    },
  };
}
