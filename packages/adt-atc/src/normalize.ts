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
  if (!resolver) {
    return {
      ...finding,
      fingerprint: fingerprintFor(finding),
      fallbackPath,
      line: methodLine,
    };
  }
  const methodName =
    /\/methods\/(\w+)/i.exec(finding.location ?? '')?.[1] ?? undefined;
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
  const categories = new Set(
    findings
      .map((finding) => finding.checkCategory)
      .filter((category): category is string => category !== undefined),
  );
  if (categories.size !== 1) {
    return undefined;
  }
  return [...categories][0];
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
  const findings: NormalizedAtcFinding[] = results.flatMap((result) =>
    result.findings.map((finding) => ({
      ...finding,
      fingerprint: fingerprintFor(finding),
      fallbackPath: fallbackPathFor(finding),
      line: methodRelativeLine(finding),
    })),
  );
  findings.sort((a, b) => {
    const byFingerprint = a.fingerprint.localeCompare(b.fingerprint);
    return byFingerprint !== 0 ? byFingerprint : a.priority - b.priority;
  });
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
  return {
    checkVariant: variantNames.join('+'),
    totalFindings: findings.length,
    errorCount: counts.error,
    warningCount: counts.warning,
    infoCount: counts.info,
    findings,
  };
}
