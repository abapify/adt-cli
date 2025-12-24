/**
 * Base contract utilities
 *
 * Re-exports speci utilities for contract definitions and client creation.
 *
 * This module serves as the abstraction boundary - consumers (like adt-client)
 * should import from here, not directly from speci. This allows swapping the
 * underlying implementation (e.g., speci → ts-rest) without impacting consumers.
 *
 * Schemas from ./schemas are already speci-compatible
 * (they have parse/build methods), so no wrapping is needed.
 */

// Contract definition utilities
export { http, type RestContract } from 'speci/rest';

// CRUD helper for repository objects
// Note: SourceType and IncludeType were removed - crud() now accepts generic strings
// and callers define valid values based on SAP XSD schema for each object type
export {
  crud,
  repo,
  type CrudOptions,
  type CrudContract,
  type CrudContractBase,
  type CrudQueryParams,
  type LockOptions,
  type UnlockOptions,
  type ObjectStructureOptions,
  type SourcePutOptions,
  type SourceOperations,
  type SourcesContract,
  type IncludesContract,
} from './helpers/crud';

// Client creation utilities (for consumers like adt-client)
import {
  createClient as speciCreateClient,
  type HttpAdapter,
} from 'speci/rest';

// Import contract and type for client creation
import { adtContract, type AdtContract } from './adt';

/**
 * Create a typed ADT REST client.
 *
 * Contract is already known - just pass adapter options.
 */
export function createAdtClient(options: {
  baseUrl: string;
  adapter: HttpAdapter;
}): RestClient<AdtContract> {
  return speciCreateClient(adtContract, options);
}

// Types needed by HTTP adapter implementations
export type {
  HttpAdapter,
  HttpRequestOptions,
  RestClient,
  Serializable,
  RestEndpointDescriptor,
} from 'speci/rest';

// Type utilities for extracting types from contracts
export type { ExtractResponse, InferSuccessResponse } from 'speci/rest';

// Import RestClient for use in return type
import type { RestClient } from 'speci/rest';

/**
 * Identity function for contract definitions.
 *
 * Schemas from ./schemas are already speci-compatible,
 * so this is just a pass-through for type safety and documentation.
 *
 * @example
 * ```ts
 * import { configurations } from './schemas';
 * import { contract, http } from '../base';
 *
 * export const myContract = contract({
 *   get: () => http.get('/endpoint', {
 *     responses: { 200: configurations },
 *   }),
 * });
 * // Type is automatically inferred from configurations.parse() return type
 * ```
 */
export function contract<T extends Record<string, any>>(definition: T): T {
  return definition;
}
