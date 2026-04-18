/**
 * Coverage link helper for AUnit responses.
 *
 * When coverage is enabled on an ABAP Unit run, the aunit:runResult
 * contains an atom:link with `rel` referring to the coverage measurement.
 * Example:
 *
 *   <atom:link href="/sap/bc/adt/runtime/traces/coverage/measurements/6D664D9B46CB1FE1859107ADE8729541"
 *              rel="http://www.sap.com/adt/relations/runtime/traces/coverage/measurements"/>
 *
 * The measurement ID is the hex segment after /measurements/.
 */

const COVERAGE_MEASUREMENT_HREF_RE =
  /\/sap\/bc\/adt\/runtime\/traces\/coverage\/measurements\/([A-Fa-f0-9]+)/;

export interface CoverageLinkCandidate {
  href?: string | null;
  rel?: string | null;
}

export interface CoverageLinkSource {
  link?: CoverageLinkCandidate[] | CoverageLinkCandidate | null;
  [key: string]: unknown;
}

/**
 * Walk the given node (and, shallowly, its top-level children) searching
 * for an atom:link whose href points to a coverage measurement. Returns
 * the measurement ID (hex string) if found, otherwise undefined.
 */
export function extractCoverageMeasurementId(
  result: unknown,
): string | undefined {
  if (!result || typeof result !== 'object') return undefined;

  const seen = new Set<unknown>();
  const queue: unknown[] = [result];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== 'object' || seen.has(current)) continue;
    seen.add(current);

    const obj = current as Record<string, unknown>;
    const links = obj.link;
    const linkList = Array.isArray(links)
      ? links
      : links && typeof links === 'object'
        ? [links as CoverageLinkCandidate]
        : [];

    for (const link of linkList) {
      const href =
        link && typeof link === 'object'
          ? ((link as CoverageLinkCandidate).href ?? undefined)
          : undefined;
      if (!href) continue;
      const match = COVERAGE_MEASUREMENT_HREF_RE.exec(href);
      if (match) return match[1];
    }

    // Recurse into nested object/array values (bounded by `seen`).
    for (const value of Object.values(obj)) {
      if (Array.isArray(value)) {
        for (const v of value) queue.push(v);
      } else if (value && typeof value === 'object') {
        queue.push(value);
      }
    }
  }

  return undefined;
}
