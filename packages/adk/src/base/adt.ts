/**
 * ADK v2 - ADT Integration Layer
 *
 * Single integration point for adt-client.
 * All ADK objects import types from here, not directly from adt-client.
 *
 * This provides:
 * 1. Single dependency point - only this file imports from adt-client
 * 2. Re-exported types - objects import from '../base/adt'
 * 3. Proxy contract - ADK-specific contract interface
 *
 * Architecture:
 * ```
 * adt-client (external)
 *       ↓
 * base/adt.ts (integration layer)
 *       ↓
 * objects/* (ADK objects import from here)
 * ```
 */

// ============================================
// Re-export types from adt-client
// Objects import these instead of from adt-client directly
// ============================================

// Client type (return type of createAdtClient)
export type { AdtClient } from '@abapify/adt-client';

// Response types (inferred from contracts/schemas)
// Note: Some response types are unions (e.g., ClassResponse = { abapClass } | { abapClassInclude })
// We re-export the full union and provide extracted types for ADK objects
export type {
  ClassResponse as ClassResponseUnion,
  InterfaceResponse as InterfaceResponseUnion,
  PackageResponse as PackageResponseUnion,
  TransportGetResponse,
} from '@abapify/adt-client';

// CRUD contract types for typed ADK base model
export type {
  CrudContract,
  CrudContractBase,
  CrudQueryParams,
  LockOptions,
  UnlockOptions,
  ObjectStructureOptions,
  SourceOperations,
  SourcesContract,
  IncludesContract,
} from '@abapify/adt-client';

import type {
  ClassResponse as _ClassResponse,
  InterfaceResponse as _InterfaceResponse,
  PackageResponse as _PackageResponse,
} from '@abapify/adt-client';

/**
 * Extract the abapClass variant from ClassResponse union
 * ClassResponse = { abapClass: ... } | { abapClassInclude: ... }
 * ADK Class objects only use the abapClass variant
 */
export type ClassResponse = Extract<_ClassResponse, { abapClass: unknown }>;

/**
 * Extract the abapInterface variant from InterfaceResponse union
 */
export type InterfaceResponse = Extract<
  _InterfaceResponse,
  { abapInterface: unknown }
>;

/**
 * Extract the package variant from PackageResponse union
 * PackageResponse = { package: ... } | { packageTree: ... }
 * ADK Package objects only use the package variant
 */
export type PackageResponse = Extract<_PackageResponse, { package: unknown }>;

// ============================================
// ADK Contract Proxy
// Wraps adt-client contract with ADK-specific interface
// ============================================

import type { AdtClient } from '@abapify/adt-client';

/**
 * ADT REST contracts accessible via client.adt.*
 *
 * This is the typed contract layer from adt-client.
 * Example: client.adt.oo.classes.get('ZCL_MY_CLASS')
 */
export type AdtContracts = AdtClient['adt'];

/**
 * ADK Contract interface
 *
 * Proxy to adt-client contracts.
 * Provides typed access to ADT REST endpoints.
 */
export interface AdkContract {
  /** OO contracts (classes, interfaces) */
  readonly oo: AdtContracts['oo'];
  /** Packages contract */
  readonly packages: AdtContracts['packages'];
  /** CTS contracts (transports) */
  readonly cts: AdtContracts['cts'];
  /** Core contracts (discovery, sessions) */
  readonly core: AdtContracts['core'];
  /** Repository contracts (search) */
  readonly repository: AdtContracts['repository'];
}

/**
 * Create ADK contract from ADT client
 *
 * @param client - ADT client instance from createAdtClient()
 * @returns ADK contract proxy
 */
export function createAdkContract(client: AdtClient): AdkContract {
  return {
    oo: client.adt.oo,
    packages: client.adt.packages,
    cts: client.adt.cts,
    core: client.adt.core,
    repository: client.adt.repository,
  };
}
