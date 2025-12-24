/**
 * ADT Client V2 - Contract-Based Architecture
 *
 * Provides typed access to SAP ADT REST APIs:
 * - client.adt.*   - Typed ADT REST contracts (speci-generated)
 * - client.fetch() - Generic HTTP utility for raw requests
 *
 * Note: Business logic (transport management, etc.) has moved to @abapify/adk
 * Use AdkTransportRequest for transport operations.
 */

import { createAdtAdapter, type AdtAdapterConfig } from './adapter';
import {
  createAdtClient as createAdtContractClient,
  type AdtClientType,
  type HttpRequestOptions,
} from '@abapify/adt-contracts';
import { createTransportService, type TransportService } from './services';

/**
 * Fetch options for generic HTTP requests
 */
export interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
}

/**
 * Create ADT client with contract-based architecture
 *
 * @example
 * // Basic usage
 * const client = createAdtClient({
 *   baseUrl: 'https://sap-system.com:8000',
 *   username: 'user',
 *   password: 'pass',
 *   client: '100'
 * });
 *
 * // Contract access
 * const session = await client.adt.core.http.sessions.getSession();
 * const transport = await client.adt.cts.transportrequests.get('S0DK900001');
 *
 * // Generic fetch utility
 * const response = await client.fetch('/sap/bc/adt/arbitrary/endpoint', {
 *   method: 'GET',
 *   headers: { Accept: 'application/xml' }
 * });
 *
 * // For business logic, use ADK:
 * // import { initializeAdk, AdkTransportRequest } from '@abapify/adk';
 * // initializeAdk(client);
 * // const transport = await AdkTransportRequest.get('S0DK900001');
 */

// Re-export AdtClientType from adt-contracts for consumers
export type { AdtClientType } from '@abapify/adt-contracts';

/**
 * Services layer - business logic orchestration
 */
interface AdtServices {
  transports: TransportService;
}

// Return type explicitly defined to avoid TS7056 "exceeds maximum length" error
interface AdtClientReturn {
  adt: AdtClientType;
  services: AdtServices;
  fetch: (url: string, options?: FetchOptions) => Promise<unknown>;
}

export function createAdtClient(config: AdtAdapterConfig): AdtClientReturn {
  const adapter = createAdtAdapter(config);
  const adtClient = createAdtContractClient({
    baseUrl: config.baseUrl,
    adapter,
  });

  // Create fetch function for raw HTTP access
  const fetchFn = async (
    url: string,
    options?: FetchOptions,
  ): Promise<unknown> => {
    const method = options?.method || 'GET';
    const headers = options?.headers || {};
    const body = options?.body;

    const requestOptions: HttpRequestOptions = {
      method,
      url,
      headers,
      body,
    };

    return adapter.request<unknown>(requestOptions);
  };

  // Create services layer
  const services: AdtServices = {
    transports: createTransportService(adtClient),
  };

  return {
    /**
     * Typed ADT REST contracts
     * Direct access to speci-generated client methods
     */
    adt: adtClient,

    /**
     * Services layer - business logic orchestration
     * Higher-level operations that combine multiple contract calls
     */
    services,

    /**
     * Generic fetch utility for arbitrary ADT endpoints
     * Useful for debugging, testing, or accessing undocumented APIs
     *
     * @param url - The ADT endpoint path (e.g., '/sap/bc/adt/core/http/sessions')
     * @param options - Request options (method, headers, body)
     * @returns Raw response
     */
    fetch: fetchFn,
  };
}

export type AdtClient = ReturnType<typeof createAdtClient>;
