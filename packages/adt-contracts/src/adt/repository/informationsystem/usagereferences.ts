/**
 * ADT Repository Information System – Usage References (Where-Used List)
 *
 * The SAP ADT "where-used" service is NOT a simple GET — it is a two-step
 * POST flow discovered via sapcli (`sap/adt/whereused.py`) and confirmed
 * against a real TRL ABAP trial system:
 *
 *   1. POST /sap/bc/adt/repository/informationsystem/usageReferences/scope
 *        + query: uri=<objectUri>&version=active
 *        + Content-Type: application/vnd.sap.adt.repository.usagereferences.scope.request.v1+xml
 *        + Accept:       application/vnd.sap.adt.repository.usagereferences.scope.response.v1+xml
 *        + body: <usagereferences:usageScopeRequest>…</>
 *      → returns a <usagereferences:usageScopeResult> containing the
 *        backend-chosen object types, grade flags and an opaque `payload`
 *        blob (gzip-encoded) that must be echoed back in step 2.
 *
 *   2. POST /sap/bc/adt/repository/informationsystem/usageReferences
 *        + query: uri=<objectUri>&version=active
 *        + Content-Type: application/vnd.sap.adt.repository.usagereferences.request.v1+xml
 *        + Accept:       application/vnd.sap.adt.repository.usagereferences.result.v1+xml
 *        + body: <usagereferences:usageReferenceRequest>
 *                  <usagereferences:affectedObjects/>
 *                  <usagereferences:scope>…copy from step 1 result…</>
 *                </>
 *      → returns a <usagereferences:usageReferenceResult> with all hits.
 *
 * Body/response are passed as plain-text XML because the usagereferences
 * namespace is not yet represented as a typed `adt-schemas` XSD. Callers
 * parse the response themselves (see `find-references` MCP tool).
 */

import { http, contract } from '../../../base';
import { textPlain } from '../../../helpers/text-schema';

/** Vendor MIME types — must match real SAP verbatim. */
export const SCOPE_REQUEST_MIME =
  'application/vnd.sap.adt.repository.usagereferences.scope.request.v1+xml';
export const SCOPE_RESPONSE_MIME =
  'application/vnd.sap.adt.repository.usagereferences.scope.response.v1+xml';
export const SEARCH_REQUEST_MIME =
  'application/vnd.sap.adt.repository.usagereferences.request.v1+xml';
export const SEARCH_RESPONSE_MIME =
  'application/vnd.sap.adt.repository.usagereferences.result.v1+xml';

export const USAGEREFS_NAMESPACE =
  'http://www.sap.com/adt/ris/usageReferences';

/**
 * Build the XML body for the step-1 scope request. sapcli always sends
 * an empty `<affectedObjects/>`; the backend doesn't inspect its content
 * and populates the result from the URI query parameter.
 */
export function buildUsageScopeRequestXml(): string {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    `<usagereferences:usageScopeRequest xmlns:usagereferences="${USAGEREFS_NAMESPACE}">\n` +
    '  <usagereferences:affectedObjects/>\n' +
    '</usagereferences:usageScopeRequest>'
  );
}

/**
 * Build the XML body for the step-2 search request by wrapping the raw
 * step-1 scope-result XML as a `<usagereferences:scope>` element inside
 * a `<usageReferenceRequest>`.
 *
 * We deliberately do string surgery instead of DOM manipulation because
 * the `payload` element contains base64-gzip content we must not perturb.
 */
export function buildUsageReferenceRequestXml(scopeResultXml: string): string {
  // Strip the XML prolog and outer usageScopeResult tags, re-tag as <scope>.
  const noProlog = scopeResultXml.replace(/<\?xml[^>]+\?>\s*/, '');
  const scopeElement = noProlog
    .replace(/usagereferences:usageScopeResult/g, 'usagereferences:scope');

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    `<usagereferences:usageReferenceRequest xmlns:usagereferences="${USAGEREFS_NAMESPACE}">\n` +
    '  <usagereferences:affectedObjects/>\n' +
    `  ${scopeElement}\n` +
    '</usagereferences:usageReferenceRequest>'
  );
}

/**
 * Step 1: fetch the default scope for a given object URI.
 *
 * Typed body/response are plain XML strings — the contract provides
 * URL/header/method shape, callers provide the marshalled body via
 * {@link buildUsageScopeRequestXml}.
 */
const scope = contract({
  post: (params: { uri: string; version?: string }) =>
    http.post('/sap/bc/adt/repository/informationsystem/usageReferences/scope', {
      query: {
        uri: params.uri,
        version: params.version ?? 'active',
      },
      body: textPlain,
      responses: { 200: undefined as unknown as string },
      headers: {
        Accept: SCOPE_RESPONSE_MIME,
        'Content-Type': SCOPE_REQUEST_MIME,
      },
    }),
});

/**
 * Step 2: execute the where-used search using the scope blob from step 1.
 */
const search = contract({
  post: (params: { uri: string; version?: string }) =>
    http.post('/sap/bc/adt/repository/informationsystem/usageReferences', {
      query: {
        uri: params.uri,
        version: params.version ?? 'active',
      },
      body: textPlain,
      responses: { 200: undefined as unknown as string },
      headers: {
        Accept: SEARCH_RESPONSE_MIME,
        'Content-Type': SEARCH_REQUEST_MIME,
      },
    }),
});

export const usageReferencesContract = {
  scope,
  search,
};

export type UsageReferencesContract = typeof usageReferencesContract;
