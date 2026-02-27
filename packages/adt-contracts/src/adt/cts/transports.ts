/**
 * /sap/bc/adt/cts/transports/**
 * ADT CTS Transports Contract
 *
 * GET with _action=FIND - Search transports (undocumented but works)
 *
 * Uses manual ts-xsd schema from adt-schemas for proper XML parsing.
 */

import { http } from 'speci/rest';
import { transportfind } from '../../schemas';

// ============================================================================
// URL Parameter Enums
// ============================================================================

/**
 * Transport function codes (TRFUNCTION field)
 */
export const TransportFunction = {
  /** Workbench request - development objects */
  WORKBENCH: 'K',
  /** Customizing request - configuration */
  CUSTOMIZING: 'W',
  /** Transport of copies */
  TRANSPORT_OF_COPIES: 'T',
  /** Development/correction task */
  DEVELOPMENT_CORRECTION: 'S',
  /** Repair task */
  REPAIR: 'R',
  /** Unclassified task */
  UNCLASSIFIED: 'X',
  /** Customizing task */
  CUSTOMIZING_TASK: 'Q',
  /** Wildcard - all types */
  ALL: '*',
} as const;

export type TransportFunctionCode =
  (typeof TransportFunction)[keyof typeof TransportFunction];

/**
 * Transport status codes (TRSTATUS field) - for response parsing
 */
export const TransportStatus = {
  /** Modifiable - can be edited */
  MODIFIABLE: 'D',
  /** Release started - in progress */
  RELEASE_STARTED: 'O',
  /** Release in preparation */
  RELEASE_IN_PREPARATION: 'P',
  /** Released - locked, cannot be edited */
  RELEASED: 'R',
  /** Locked */
  LOCKED: 'L',
} as const;

export type TransportStatusCode =
  (typeof TransportStatus)[keyof typeof TransportStatus];

// ============================================================================
// URL Parameters Interface
// ============================================================================

/**
 * Query parameters for transport find endpoint
 *
 * Note: This is the basic find endpoint (/sap/bc/adt/cts/transports?_action=FIND)
 * which only supports user and trfunction filters. For advanced filtering
 * (status, date range, etc.), use the discovery-based search endpoint.
 */
export interface TransportFindParams {
  /** Action - must be 'FIND' for search */
  _action: 'FIND';
  /** Owner filter - username or '*' for all */
  user: string;
  /** Transport function filter - use TransportFunction enum or '*' */
  trfunction: TransportFunctionCode | string;
}

// ============================================================================
// Response Schema
// ============================================================================

/**
 * Single transport header from the response
 */
export interface CtsReqHeader {
  /** Transport number (e.g., S0DK921630) */
  TRKORR: string;
  /** Transport function code */
  TRFUNCTION: string;
  /** Transport status code */
  TRSTATUS: string;
  /** Target system (e.g., /SOD_ALL/) */
  TARSYSTEM: string;
  /** Owner username */
  AS4USER: string;
  /** Creation/modification date (YYYY-MM-DD) */
  AS4DATE: string;
  /** Creation/modification time (HH:MM:SS) */
  AS4TIME: string;
  /** Description text */
  AS4TEXT: string;
  /** Client number */
  CLIENT: string;
  /** Repository ID (usually empty) */
  REPOID?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize response to always return array of headers
 * Works with the parsed transportfind schema response
 */
export function normalizeTransportFindResponse(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  response: any,
): CtsReqHeader[] {
  // ts-xsd parses root element content directly: { version, values: { DATA: { CTS_REQ_HEADER: [...] } } }
  const headers = response?.values?.DATA?.CTS_REQ_HEADER;
  if (!headers) return [];
  return Array.isArray(headers) ? headers : [headers];
}

// ============================================================================
// Contract
// ============================================================================

export const transports = {
  /**
   * Search transports with filters
   *
   * GET /sap/bc/adt/cts/transports?_action=FIND&user=X&trfunction=*
   *
   * @example
   * // Find all modifiable workbench requests for current user
   * const result = await client.cts.transports.find({
   *   _action: 'FIND',
   *   user: 'PPLENKOV',
   *   trfunction: '*',
   * });
   *
   * @example
   * // Find with status filter
   * const result = await client.cts.transports.find({
   *   _action: 'FIND',
   *   user: '*',
   *   trfunction: 'K',
   *   requestStatus: 'D',  // Modifiable only
   * });
   */
  find: (params: TransportFindParams) =>
    http.get('/sap/bc/adt/cts/transports', {
      query: params,
      responses: { 200: transportfind },
      headers: { Accept: '*/*' },
    }),
};
