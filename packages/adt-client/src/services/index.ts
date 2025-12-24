/**
 * Services Layer - Business logic orchestration
 *
 * Architecture:
 * - Contracts (client.adt.*) = granular HTTP operations
 * - Services (client.services.*) = business logic orchestration
 * - ADK = object-focused logic (client-agnostic)
 *
 * Services bridge contracts and provide higher-level operations
 * that CLI and SDK consumers need.
 */

export {
  TransportService,
  createTransportService,
  type Transport,
  type TransportTask,
  type CreateTransportOptions,
  type ListTransportsOptions,
} from './transports';
