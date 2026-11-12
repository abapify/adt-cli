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

function hasMessageContent(alert: AunitAlert): boolean {
  return (
    alert.title.trim().length > 0 ||
    alert.details.some((detail) => detail.trim().length > 0)
  );
}

function isAssertionAlert(alert: AunitAlert): boolean {
  return (
    alert.kind.toLowerCase().includes('assertion') && hasMessageContent(alert)
  );
}

function isWarningAlert(alert: AunitAlert): boolean {
  return alert.kind.toLowerCase().includes('warning');
}

function classifyMethod(method: AunitTestMethod): AunitMethodClassification {
  if (method.status === 'pass') {
    if (method.alerts.some(isWarningAlert)) {
      return 'warning';
    }
    return 'passed';
  }
  if (method.status === 'skip') {
    return 'skipped';
  }
  if (method.status === 'error') {
    return 'technical-error';
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

function derivedStatusCounts(programs: readonly AunitProgram[]): {
  passCount: number;
  failCount: number;
  errorCount: number;
  skipCount: number;
  totalTests: number;
} {
  const counts = { pass: 0, fail: 0, error: 0, skip: 0 };
  for (const program of programs) {
    for (const testClass of program.testClasses ?? []) {
      for (const method of testClass.methods ?? []) {
        counts[method.status] += 1;
      }
    }
  }
  return {
    passCount: counts.pass,
    failCount: counts.fail,
    errorCount: counts.error,
    skipCount: counts.skip,
    totalTests: counts.pass + counts.fail + counts.error + counts.skip,
  };
}

function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function assertNonNegativeCounts(result: AunitResult): void {
  const summaryFields: Array<[string, number]> = [
    ['totalTests', result.totalTests],
    ['passCount', result.passCount],
    ['failCount', result.failCount],
    ['errorCount', result.errorCount],
    ['skipCount', result.skipCount],
  ];
  for (const [field, value] of summaryFields) {
    if (!isNonNegativeInteger(value)) {
      throw new MalformedAunitReportError(
        `AUnit report summary count ${field}=${value} is not a non-negative integer.`,
      );
    }
  }
}

function assertCountsMatchMethods(
  result: AunitResult,
  derived: ReturnType<typeof derivedStatusCounts>,
): void {
  const fields: Array<[string, number, number]> = [
    ['totalTests', result.totalTests, derived.totalTests],
    ['passCount', result.passCount, derived.passCount],
    ['failCount', result.failCount, derived.failCount],
    ['errorCount', result.errorCount, derived.errorCount],
    ['skipCount', result.skipCount, derived.skipCount],
  ];
  for (const [field, summary, actual] of fields) {
    if (summary !== actual) {
      throw new MalformedAunitReportError(
        `AUnit report summary ${field}=${summary} contradicts the recorded methods (${actual}).`,
      );
    }
  }
}

function assertConsistentCounts(
  result: AunitResult,
  derived: ReturnType<typeof derivedStatusCounts>,
): void {
  assertNonNegativeCounts(result);
  assertCountsMatchMethods(result, derived);
}

/**
 * Normalize an AUnit result into the canonical model: every method carries
 * an outcome classification that keeps assertion failures distinct from
 * technical errors (error status takes precedence; warnings on passing
 * methods are surfaced), summary counts must be non-negative integers that
 * match the recorded methods (typed MalformedAunitReportError otherwise),
 * zero-test runs are valid results, and recorded source paths and URIs are
 * preserved verbatim — path repair stays a consumer concern. The caller's
 * input is never mutated.
 */
function assertWellFormedCollections(result: AunitResult): void {
  if (!Array.isArray(result.programs)) {
    throw new MalformedAunitReportError(
      'AUnit report is missing the recorded programs collection.',
    );
  }
  for (const program of result.programs) {
    assertWellFormedProgram(program);
  }
}

function assertWellFormedProgram(program: AunitProgram): void {
  if (!Array.isArray(program.testClasses)) {
    throw new MalformedAunitReportError(
      `AUnit report program ${program.name} is missing its testClasses collection.`,
    );
  }
  for (const testClass of program.testClasses) {
    if (!Array.isArray(testClass.methods)) {
      throw new MalformedAunitReportError(
        `AUnit report test class ${testClass.name} is missing its methods collection.`,
      );
    }
  }
}

export function normalizeAunitResult(
  result: AunitResult,
): NormalizedAunitResult {
  assertWellFormedCollections(result);
  const derived = derivedStatusCounts(result.programs);
  assertConsistentCounts(result, derived);
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
    branchTotal: number;
    branchCovered: number;
  };
}

/** ADT counter names mapped to their normalized coverage measurement. */
const COUNTER_ALIASES: Record<string, string> = {
  LINE: 'line',
  STATEMENT: 'line',
  INSTRUCTION: 'instruction',
  PROCEDURE: 'instruction',
  BRANCH: 'branch',
};

interface CoverageNodeInput {
  objectReference?: { type?: string; name?: string };
  coverages?: { coverage?: JacocoCoverageCounter[] };
  nodes?: { node?: CoverageNodeInput[] };
}

interface MeasurementRootInput {
  result?: {
    nodes?: { node?: CoverageNodeInput[] };
  };
}

function isWellFormedCounter(counter: JacocoCoverageCounter): boolean {
  return (
    typeof counter.type === 'string' &&
    counter.type.trim() !== '' &&
    typeof counter.total === 'number' &&
    Number.isInteger(counter.total) &&
    counter.total >= 0 &&
    typeof counter.executed === 'number' &&
    Number.isInteger(counter.executed) &&
    counter.executed >= 0
  );
}

function normalizeCounter(
  counter: JacocoCoverageCounter,
): JacocoCoverageCounter {
  if (!isWellFormedCounter(counter)) {
    throw new MalformedAunitReportError(
      'Coverage report contains an incomplete or invalid counter.',
    );
  }
  return { ...counter };
}

/**
 * Collect a package's counters: the package node's own counters when it
 * records them, otherwise the aggregated counters of its nested class
 * nodes — so class-level coverage is never omitted. Multiple entries for
 * the same measurement (one per class) are summed.
 */

function addCounterEntry(
  summed: Map<string, JacocoCoverageCounter>,
  counter: JacocoCoverageCounter,
): void {
  const measurement = COUNTER_ALIASES[counter.type.toUpperCase()];
  if (!measurement) {
    throw new MalformedAunitReportError(
      `Coverage report contains an unknown counter type: ${counter.type}.`,
    );
  }
  const existing = summed.get(measurement);
  summed.set(
    measurement,
    existing
      ? {
          type: existing.type,
          total: existing.total + counter.total,
          executed: existing.executed + counter.executed,
        }
      : counter,
  );
}

function collectPackageCounters(
  node: CoverageNodeInput,
): JacocoCoverageCounter[] {
  const own = (node.coverages?.coverage ?? []).map(normalizeCounter);
  const ownMeasurements = new Set(
    own
      .map((counter) => COUNTER_ALIASES[counter.type.toUpperCase()])
      .filter(
        (measurement): measurement is string => measurement !== undefined,
      ),
  );
  const summed = new Map<string, JacocoCoverageCounter>();
  // Package-node counters win per measurement; nested class counters fill
  // in measurements the package node does not record itself — and are
  // summed together when the package records none of them.
  for (const counter of own) {
    addCounterEntry(summed, counter);
  }
  for (const child of node.nodes?.node ?? []) {
    for (const counter of (child.coverages?.coverage ?? []).map(
      normalizeCounter,
    )) {
      const measurement = COUNTER_ALIASES[counter.type.toUpperCase()];
      if (measurement && ownMeasurements.has(measurement)) {
        continue;
      }
      addCounterEntry(summed, counter);
    }
  }
  return [...summed.values()];
}

function counterValue(
  counters: JacocoCoverageCounter[],
  measurement: string,
): { total: number; covered: number } | undefined {
  const counter = counters.find(
    (candidate) =>
      COUNTER_ALIASES[candidate.type.toUpperCase()] === measurement,
  );
  return counter
    ? { total: counter.total, covered: counter.executed }
    : undefined;
}

function aggregateCounterType(
  packages: NormalizedJacocoPackage[],
  measurement: string,
): { total: number; covered: number } | undefined {
  let total = 0;
  let covered = 0;
  let present = false;
  for (const pkg of packages) {
    const value = counterValue(pkg.counters, measurement);
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
 * and total facts, computed from the recorded counters (ADT counter names
 * such as `statement`/`procedure` map to their normalized measurements).
 * Package order is by name; malformed roots or counters raise a typed
 * error; the caller's input is never mutated.
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
    .map((node) => {
      const name = node.objectReference?.name;
      if (typeof name !== 'string' || name.trim() === '') {
        throw new MalformedAunitReportError(
          'Coverage report contains a package node without a recorded name.',
        );
      }
      return { name, counters: collectPackageCounters(node) };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  const line = aggregateCounterType(packages, 'line') ?? {
    total: 0,
    covered: 0,
  };
  const instruction = aggregateCounterType(packages, 'instruction') ?? {
    total: 0,
    covered: 0,
  };
  const branch = aggregateCounterType(packages, 'branch') ?? {
    total: 0,
    covered: 0,
  };
  return {
    packages,
    totals: {
      lineTotal: line.total,
      lineCovered: line.covered,
      instructionTotal: instruction.total,
      instructionCovered: instruction.covered,
      branchTotal: branch.total,
      branchCovered: branch.covered,
    },
  };
}
