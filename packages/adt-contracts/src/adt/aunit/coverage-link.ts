/**
 * Coverage link helper for AUnit responses.
 *
 * When coverage is enabled on an ABAP Unit run, the aunit:runResult
 * contains either an Atom link or an external coverage URI referring to the
 * coverage measurement. Examples:
 *
 *   <atom:link href="/sap/bc/adt/runtime/traces/coverage/measurements/6D664D9B46CB1FE1859107ADE8729541"
 *              rel="http://www.sap.com/adt/relations/runtime/traces/coverage/measurements"/>
 *   <external><coverage adtcore:uri="/sap/bc/adt/runtime/traces/coverage/measurements/6D664D9B46CB1FE1859107ADE8729541"/></external>
 *
 * The measurement ID is the hex segment after /measurements/.
 */

const COVERAGE_MEASUREMENT_URI_RE =
  /\/sap\/bc\/adt\/runtime\/traces\/coverage\/measurements\/([A-Fa-f0-9]+)/;

export interface CoverageLinkCandidate {
  href?: string | null;
  rel?: string | null;
}

export interface CoverageLinkSource {
  link?: CoverageLinkCandidate[] | CoverageLinkCandidate | null;
  [key: string]: unknown;
}

/** Normalize a node's `link` property into a candidate list. */
function linkCandidates(links: unknown): CoverageLinkCandidate[] {
  if (Array.isArray(links)) return links as CoverageLinkCandidate[];
  if (links && typeof links === 'object')
    return [links as CoverageLinkCandidate];
  return [];
}

/** The measurement ID encoded in a coverage URI, if any. */
function measurementIdFrom(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const match = COVERAGE_MEASUREMENT_URI_RE.exec(value);
  return match ? match[1] : undefined;
}

/**
 * Search one node's atom:link candidates (or its `uri` attribute) for a
 * coverage measurement URI. Returns the measurement ID when found.
 */
function matchNode(obj: Record<string, unknown>): string | undefined {
  for (const link of linkCandidates(obj.link)) {
    const href =
      link && typeof link === 'object'
        ? ((link as CoverageLinkCandidate).href ?? undefined)
        : undefined;
    const id = measurementIdFrom(href);
    if (id) return id;
  }
  return measurementIdFrom(typeof obj.uri === 'string' ? obj.uri : undefined);
}

/** Push nested object/array values onto the BFS queue (bounded by `seen`). */
function enqueueChildValues(
  obj: Record<string, unknown>,
  queue: unknown[],
): void {
  for (const value of Object.values(obj)) {
    if (Array.isArray(value)) {
      for (const v of value) queue.push(v);
    } else if (value && typeof value === 'object') {
      queue.push(value);
    }
  }
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

    const id = matchNode(current as Record<string, unknown>);
    if (id) return id;

    // Recurse into nested object/array values (bounded by `seen`).
    enqueueChildValues(current as Record<string, unknown>, queue);
  }

  return undefined;
}
