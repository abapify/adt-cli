import type {
  AtcFinding,
  AtcResult,
  FindingResolver,
  ResolvedLocation,
} from './types';

/** Severity class a finding's priority maps to under an injected policy. */
export type SeverityClass = 'error' | 'warning' | 'info';

export type SeverityPolicy = (priority: number) => SeverityClass;

export interface NormalizedAtcFinding extends AtcFinding {
  /** Stable fingerprint derived from check identity and location facts. */
  fingerprint: string;
  /** Git repository location when a resolver resolved it. */
  resolvedLocation?: ResolvedLocation;
  /** Canonical PREFIX-style fallback path when no resolver resolved it. */
  fallbackPath: string;
  /** File-relative line when resolved; method-relative line otherwise. */
  line: number;
}

export interface NormalizedAtcResult extends AtcResult {
  /** Result-level category; undefined when finding categories conflict. */
  category?: string;
  findings: NormalizedAtcFinding[];
}

// Format 1: /sap/bc/adt/oo/classes/zcl_foo/methods/my_method#start=21,0
// Format 2: ...#type=CLAS%2FOM;name=MY_METHOD;start=21
function extractMethodName(location?: string): string | undefined {
  if (!location) return undefined;
  const match =
    /\/methods\/(\w+)/i.exec(location) || /[;?&]name=(\w+)/i.exec(location);
  return match ? match[1].toLowerCase() : undefined;
}

function fallbackPathFor(finding: AtcFinding): string {
  const type = finding.objectType.toLowerCase();
  const name = finding.objectName.toLowerCase();
  return `src/${type}/${name}.${type}.abap`;
}

function methodRelativeLine(finding: AtcFinding): number {
  const lineMatch = finding.location?.match(/start=(\d+)/);
  return lineMatch ? Number.parseInt(lineMatch[1], 10) : 1;
}

function fingerprintFor(finding: AtcFinding): string {
  return [
    finding.checkId,
    finding.messageId,
    finding.objectType,
    finding.objectName,
    finding.location ?? '',
  ].join(':');
}

async function normalizeFinding(
  finding: AtcFinding,
  resolver: FindingResolver | undefined,
): Promise<NormalizedAtcFinding> {
  const fallbackPath = fallbackPathFor(finding);
  const methodLine = methodRelativeLine(finding);
  const existing = (finding as Partial<NormalizedAtcFinding>).resolvedLocation;
  if (!resolver) {
    return {
      ...finding,
      fingerprint: fingerprintFor(finding),
      fallbackPath,
      line: existing ? existing.line : methodLine,
      ...(existing ? { resolvedLocation: existing } : {}),
    };
  }
  const methodName = extractMethodName(finding.location);
  const resolved = await resolver.resolve(
    finding.objectType,
    finding.objectName,
    methodLine,
    methodName,
    finding.location,
  );
  if (!resolved) {
    return {
      ...finding,
      fingerprint: fingerprintFor(finding),
      fallbackPath,
      line: methodLine,
    };
  }
  return {
    ...finding,
    fingerprint: fingerprintFor(finding),
    resolvedLocation: resolved,
    fallbackPath,
    line: resolved.line,
  };
}

/** Deterministic result-level category: set only when findings agree. */
function resultCategory(findings: readonly AtcFinding[]): string | undefined {
  if (findings.length === 0) {
    return undefined;
  }
  const categories = new Set(findings.map((finding) => finding.checkCategory));
  if (categories.size !== 1) {
    return undefined;
  }
  const category = [...categories][0];
  return category;
}

/**
 * Normalize an ATC result into the canonical model: stable fingerprints,
 * resolved-or-fallback location facts, and a deterministic result-level
 * category. Pure with respect to its inputs; the resolver is optional and
 * its absence keeps the fallback facts.
 */
export function normalizeAtcResult(
  result: AtcResult,
  options?: { resolver?: FindingResolver },
): Promise<NormalizedAtcResult> {
  const resolver = options?.resolver;
  return (async () => {
    const findings = await Promise.all(
      result.findings.map((finding) => normalizeFinding(finding, resolver)),
    );
    const category = resultCategory(result.findings);
    return {
      ...result,
      findings,
      ...(category === undefined ? {} : { category }),
    };
  })();
}

/**
 * Merge variant results into one normalized result. Deterministic and
 * order-independent: findings are ordered by fingerprint, counts are
 * recomputed from the merged findings with the injected severity policy,
 * and the merged variant name is the sorted unique variant names.
 * The caller owns the severity policy; core never reads configured policy.
 */
export function mergeAtcVariants(
  results: readonly AtcResult[],
  policy: SeverityPolicy,
): NormalizedAtcResult {
  // Redelivery-safe: an identical variant result (same variant name and
  // findings) merged twice contributes once.
  const seen = new Set<string>();
  const uniqueResults: NormalizedAtcFinding[][] = [];
  for (const result of results) {
    const key = JSON.stringify([
      result.checkVariant,
      result.findings.map(fingerprintFor),
    ]);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    uniqueResults.push(
      result.findings.map((finding) =>
        isNormalizedFinding(finding)
          ? { ...finding }
          : {
              ...finding,
              fingerprint: fingerprintFor(finding),
              fallbackPath: fallbackPathFor(finding),
              line: methodRelativeLine(finding),
            },
      ),
    );
  }
  const findings: NormalizedAtcFinding[] = uniqueResults.flat();
  findings.sort(compareNormalizedFindings);
  const counts: Record<SeverityClass, number> = {
    error: 0,
    warning: 0,
    info: 0,
  };
  for (const finding of findings) {
    counts[policy(finding.priority)] += 1;
  }
  const variantNames = [...new Set(results.map((r) => r.checkVariant))]
    .slice()
    .sort((a, b) => a.localeCompare(b));
  const category = resultCategory(findings);
  return {
    checkVariant: variantNames.join('+'),
    totalFindings: findings.length,
    errorCount: counts.error,
    warningCount: counts.warning,
    infoCount: counts.info,
    findings,
    ...(category === undefined ? {} : { category }),
  };
}

function isNormalizedFinding(
  finding: AtcFinding,
): finding is NormalizedAtcFinding {
  return typeof (finding as NormalizedAtcFinding).fingerprint === 'string';
}

function compareNormalizedFindings(
  a: NormalizedAtcFinding,
  b: NormalizedAtcFinding,
): number {
  return (
    a.fingerprint.localeCompare(b.fingerprint) ||
    a.priority - b.priority ||
    a.messageId.localeCompare(b.messageId) ||
    (a.location ?? '').localeCompare(b.location ?? '') ||
    a.messageText.localeCompare(b.messageText) ||
    (a.findingUri ?? '').localeCompare(b.findingUri ?? '')
  );
}
