/**
 * ADT Contracts
 *
 * Type-safe SAP ADT REST API contracts.
 *
 * This package serves as the abstraction boundary between contract definitions
 * and their underlying implementation. Consumers should import client utilities
 * from here, not directly from the underlying library (speci).
 *
 * @example
 * ```typescript
 * import { createAdtClient, type HttpAdapter } from '@abapify/adt-contracts';
 *
 * // Implement your adapter
 * const adapter: HttpAdapter = { ... };
 *
 * // Create typed client (contract is built-in)
 * const client = createAdtClient({
 *   baseUrl: 'https://sap-server.example.com',
 *   adapter,
 * });
 *
 * // Full type inference from XSD schemas!
 * const transport = await client.cts.transportrequests.get('TRKORR');
 * ```
 */

// Base utilities (client creation, types)
export * from './base';

// ADT contracts
export * from './adt';
