/**
 * Documentation Bridge for Check Category Enrichment
 *
 * ATC worklist findings carry a check-instance GUID as their checkId — not
 * the implementing class name the check variant form template catalog lists
 * (observed on a live S/4 system, 2026-10-22). The finding's documentation
 * page (the worklist atom:link) names the check class in its header line,
 * which resolves through the form-template category index.
 *
 * Everything here is best-effort: fetch errors are reported through the
 * optional logger and skipped; findings keep no category when their page
 * cannot be fetched or parsed.
 */

/** Structural surface for a bounded documentation read. The real ADT client
 * provides readTextBounded; mocks without it simply skip the bridge. */
export interface DocumentationReadingClient {
  readTextBounded?: (
    uri: string,
    maxBytes: number,
    options?: { headers?: Record<string, string> },
  ) => Promise<string>;
}

/**
 * Parse the implementing check class from an ATC finding documentation page.
 *
 * Live shape (2026-10-22): the page opens with
 * "Appl. Comp. Check / Check Class / Message Code" followed by
 * `<p>BC-ABA-LA / CL_CI_TEST_SELECT_TAW_A / 0501</p>`. The check class in
 * that line is the implementing class the check variant form template lists
 * — the bridge from the finding's GUID checkId to the check catalog.
 *
 * The match is bounded (no unbounded quantifiers on page input) and accepts
 * an optional ABAP namespace prefix (e.g. `/NSP/CL_EXAMPLE`).
 *
 * @param html - The documentation page HTML
 * @returns The check class name, or undefined when the page does not carry it
 */
export function parseCheckClassFromDocumentation(
  html: string,
): string | undefined {
  const match = html.match(
    /Check\s*Class[^<]{0,80}<\/h3>\s*<p>\s*[^/<]{0,120}\/\s*((?:\/[A-Za-z0-9_]{1,8}\/)?[A-Za-z][A-Za-z0-9_]*)\s*\//u,
  );
  return match?.[1];
}

/** Finding shape the bridge enriches in place. */
export interface DocumentationBridgeFinding {
  checkId: string;
  checkCategory?: string;
  documentationUri?: string;
}

/**
 * Only ATC documentation paths may be fetched — a worklist-provided URI
 * must never drive an authenticated read outside the documentation space.
 */
const ATC_DOCUMENTATION_URI =
  /^\/sap\/bc\/adt\/documentation\/atc\/documents\/[\w/%-]+$/u;

/** Shared state for the per-URI documentation fetch. */
interface DocumentationFetchContext {
  read: NonNullable<DocumentationReadingClient['readTextBounded']>;
  maxBytes: number;
  maxReads: number;
  reads: number;
  classByDocumentationUri: Map<string, string | undefined>;
  logger?: { warn: (message: string) => void };
}

/**
 * Read one documentation page and resolve its check class, with a shared
 * per-URI cache so repeated findings never re-fetch the same page.
 */
async function resolveCheckClassForUri(
  documentationUri: string,
  context: DocumentationFetchContext,
): Promise<void> {
  if (context.classByDocumentationUri.has(documentationUri)) return;
  if (!ATC_DOCUMENTATION_URI.test(documentationUri)) {
    context.logger?.warn?.(
      `⚠️ Skipping non-ATC documentation URI: ${documentationUri}`,
    );
    context.classByDocumentationUri.set(documentationUri, undefined);
    return;
  }
  if (context.reads >= context.maxReads) {
    context.classByDocumentationUri.set(documentationUri, undefined);
    return;
  }
  context.reads++;
  try {
    const html = await context.read(documentationUri, context.maxBytes, {
      headers: { Accept: 'application/vnd.sap.adt.docu.v1+html' },
    });
    context.classByDocumentationUri.set(
      documentationUri,
      parseCheckClassFromDocumentation(html),
    );
  } catch (error) {
    context.logger?.warn?.(
      `⚠️ ATC documentation read failed for ${documentationUri}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    context.classByDocumentationUri.set(documentationUri, undefined);
  }
}

/**
 * Bridge finding categories through the ATC documentation page.
 *
 * After the direct form-template index pass (which resolves findings whose
 * checkId already matches a catalog implementing class), this resolves the
 * GUID-checkId findings: each finding's documentation page names the check
 * class, which resolves through the same index.
 *
 * Best-effort: per-documentation-URI fetch errors are reported through the
 * optional logger and skipped; a finding keeps no category when its page
 * cannot be fetched or parsed. Reads are deduplicated per URI.
 *
 * @param client - ADT client with an optional bounded text read
 * @param findings - Findings to enrich in place
 * @param classToCategory - checkId/class -> category name index (the
 *   form-template catalog: parseCheckCategoryIndex output)
 * @param options - maxBytes (default 64 KiB) and an optional logger
 * @returns Number of findings that received a category
 */
export async function resolveCategoriesViaDocumentation(
  client: DocumentationReadingClient,
  findings: DocumentationBridgeFinding[],
  classToCategory: ReadonlyMap<string, string>,
  options: {
    maxBytes?: number;
    maxReads?: number;
    logger?: { warn: (message: string) => void };
  } = {},
): Promise<number> {
  const read = client.readTextBounded;
  if (!read || classToCategory.size === 0) return 0;

  const pending = findings.filter(
    (finding) => !finding.checkCategory && finding.documentationUri,
  );
  if (pending.length === 0) return 0;

  const context: DocumentationFetchContext = {
    read,
    maxBytes: options.maxBytes ?? 64 * 1024,
    maxReads: options.maxReads ?? 500,
    reads: 0,
    classByDocumentationUri: new Map<string, string | undefined>(),
    logger: options.logger,
  };
  let enriched = 0;
  for (const finding of pending) {
    await resolveCheckClassForUri(finding.documentationUri!, context);
    const checkClass = context.classByDocumentationUri.get(
      finding.documentationUri!,
    );
    const checkCategory = checkClass
      ? classToCategory.get(checkClass)
      : undefined;
    if (checkCategory) {
      finding.checkCategory = checkCategory;
      enriched++;
    }
  }
  return enriched;
}
