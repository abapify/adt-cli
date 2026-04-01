/**
 * ADK Object Registry
 *
 * Maps ADT types to ADK object constructors.
 * Supports both full types (DEVC/K) and main types (DEVC).
 *
 * Architecture:
 * - ADT type (external): "DEVC/K", "CLAS/OC" - from SAP
 * - ADK kind (internal): Package, Class - our abstraction
 * - Constructor: AdkPackage, AdkClass - implementation
 */

import type { AdkContext } from './context';
import type { AdkObject } from './model';
import type { AdkKind } from './kinds';
import * as kinds from './kinds';

// ============================================
// Types
// ============================================

/** Constructor signature for ADK objects */

export type AdkObjectConstructor<
  T extends AdkObject<AdkKind, any> = AdkObject<AdkKind, any>,
> = new (ctx: AdkContext, nameOrData: string | any) => T;

/** How to transform object name for the URI path segment */
export type NameTransform = 'lowercase' | 'preserve';

/** Registry entry with constructor and kind */
export interface RegistryEntry {
  readonly kind: AdkKind;
  readonly constructor: AdkObjectConstructor;
  /** ADT REST endpoint path segment (e.g., 'oo/classes', 'ddic/tabletypes') */
  readonly endpoint?: string;
  /** How to transform the object name in URIs (default: lowercase) */
  readonly nameTransform?: NameTransform;
  /** Optional name normalizer — e.g., strip SAPL prefix for FUGR */
  readonly normalizeName?: (name: string) => string;
}

// ============================================
// ADT Type Utilities
// ============================================

/**
 * Parse ADT type into components
 *
 * @example
 * parseAdtType("DEVC/K") // { full: "DEVC/K", main: "DEVC", sub: "K" }
 * parseAdtType("DEVC")   // { full: "DEVC", main: "DEVC", sub: undefined }
 */
export function parseAdtType(adtType: string): {
  full: string;
  main: string;
  sub?: string;
} {
  const [main, sub] = adtType.split('/');
  return {
    full: adtType,
    main: main.toUpperCase(),
    sub: sub?.toUpperCase(),
  };
}

/**
 * Get main type from ADT type
 *
 * @example
 * getMainType("DEVC/K") // "DEVC"
 * getMainType("CLAS")   // "CLAS"
 */
export function getMainType(adtType: string): string {
  return parseAdtType(adtType).main;
}

// ============================================
// Registry
// ============================================

/** Internal registry storage */
const registry = new Map<string, RegistryEntry>();

/** ADT main type to ADK kind mapping */
const adtToKind = new Map<string, AdkKind>();

/** ADK kind to ADT main type mapping (reverse) */
const kindToAdt = new Map<AdkKind, string>();

/** Options for registerObjectType */
export interface RegisterObjectTypeOptions {
  /** ADT REST endpoint path segment (e.g., 'oo/classes', 'ddic/tabletypes') */
  endpoint?: string;
  /** How to transform the object name in URIs (default: 'lowercase') */
  nameTransform?: NameTransform;
  /** Optional name normalizer — e.g., strip SAPL prefix for FUGR */
  normalizeName?: (name: string) => string;
}

/**
 * Register an ADK object type
 *
 * @param adtType - ADT type, either main (e.g., "CLAS") or full (e.g., "TABL/DS")
 * @param kind - ADK kind constant
 * @param constructor - Object constructor
 * @param options - Optional endpoint and name transform settings
 */
export function registerObjectType(
  adtType: string,
  kind: AdkKind,
  constructor: AdkObjectConstructor,
  options?: RegisterObjectTypeOptions,
): void {
  const normalizedType = adtType.toUpperCase();

  registry.set(normalizedType, {
    kind,
    constructor,
    endpoint: options?.endpoint,
    nameTransform: options?.nameTransform,
    normalizeName: options?.normalizeName,
  });
  adtToKind.set(normalizedType, kind);
  kindToAdt.set(kind, normalizedType);
}

/**
 * Resolve ADT type to registry entry
 *
 * Tries full type first (e.g., "TABL/DS"), then falls back to main type (e.g., "TABL").
 * This allows registering subtypes with different constructors/endpoints.
 *
 * @param adtType - Full or main ADT type (e.g., "DEVC/K" or "DEVC")
 * @returns Registry entry or undefined if not found
 */
export function resolveType(adtType: string): RegistryEntry | undefined {
  const normalized = adtType.toUpperCase();
  // Try full type first (e.g., "TABL/DS")
  const fullMatch = registry.get(normalized);
  if (fullMatch) return fullMatch;
  // Fall back to main type (e.g., "TABL")
  const mainType = getMainType(adtType);
  return registry.get(mainType);
}

/**
 * Resolve ADK kind to registry entry
 *
 * @param kind - ADK kind constant
 * @returns Registry entry or undefined if not found
 */
export function resolveKind(kind: AdkKind): RegistryEntry | undefined {
  const adtType = kindToAdt.get(kind);
  if (!adtType) return undefined;
  return registry.get(adtType);
}

/**
 * Get ADK kind for ADT type
 */
export function getKindForType(adtType: string): AdkKind | undefined {
  return adtToKind.get(getMainType(adtType));
}

/**
 * Get ADT main type for ADK kind
 */
export function getTypeForKind(kind: AdkKind): string | undefined {
  return kindToAdt.get(kind);
}

/**
 * Check if ADT type is registered
 */
export function isTypeRegistered(adtType: string): boolean {
  return registry.has(getMainType(adtType));
}

/**
 * Get all registered ADT types
 */
export function getRegisteredTypes(): string[] {
  return Array.from(registry.keys());
}

/**
 * Get all registered ADK kinds
 */
export function getRegisteredKinds(): AdkKind[] {
  return Array.from(kindToAdt.keys());
}

/**
 * Get ADT REST endpoint for a type (e.g., 'oo/classes', 'ddic/tabletypes')
 */
export function getEndpointForType(adtType: string): string | undefined {
  return registry.get(getMainType(adtType))?.endpoint;
}

/**
 * Build the full ADT object URI for a given type and name.
 *
 * @example
 * getObjectUri('CLAS', 'ZCL_MY_CLASS')  // '/sap/bc/adt/oo/classes/zcl_my_class'
 * getObjectUri('DEVC', 'ZPACKAGE')       // '/sap/bc/adt/packages/ZPACKAGE'
 * getObjectUri('TTYP', 'ZAGE_TTYP_STRTAB') // '/sap/bc/adt/ddic/tabletypes/zage_ttyp_strtab'
 */
export function getObjectUri(
  adtType: string,
  name: string,
): string | undefined {
  const entry = resolveType(adtType);
  if (!entry?.endpoint) return undefined;

  const normalized = entry.normalizeName ? entry.normalizeName(name) : name;
  const transformedName =
    entry.nameTransform === 'preserve'
      ? encodeURIComponent(normalized)
      : encodeURIComponent(normalized.toLowerCase());

  return `/sap/bc/adt/${entry.endpoint}/${transformedName}`;
}

/**
 * Normalize an object name using type-specific rules.
 *
 * If `adtType` is provided, applies that type's normalizer only.
 * Otherwise, collects all possible normalized forms from every registered type.
 *
 * @returns Array of candidate names (always includes the original).
 *
 * @example
 * normalizeObjectName('SAPLZAGE_FUGR')          // ['SAPLZAGE_FUGR', 'ZAGE_FUGR']
 * normalizeObjectName('SAPLZAGE_FUGR', 'FUGR')  // ['ZAGE_FUGR']
 * normalizeObjectName('ZCLAS_TEST')              // ['ZCLAS_TEST']  (no normalizer matches)
 */
export function normalizeObjectName(
  name: string,
  adtType?: string,
): string[] {
  if (adtType) {
    const entry = resolveType(adtType);
    const normalized = entry?.normalizeName?.(name) ?? name;
    return [normalized];
  }

  // No type hint — collect all distinct candidates from every registered normalizer
  const candidates = new Set<string>([name]);
  for (const entry of registry.values()) {
    if (entry.normalizeName) {
      candidates.add(entry.normalizeName(name));
    }
  }
  return Array.from(candidates);
}

/**
 * Extract the root object URI from a full (possibly sub-resource) URI.
 *
 * SAP locks must target the object root, not sub-resources like `/source/main`.
 * This function matches against registered endpoint prefixes and strips
 * everything after the object name segment.
 *
 * @returns The root object URI, or the original URI unchanged if no endpoint matches.
 *
 * @example
 * getObjectRootUri('/sap/bc/adt/functions/groups/zage_fugr/source/main')
 *   // → '/sap/bc/adt/functions/groups/zage_fugr'
 * getObjectRootUri('/sap/bc/adt/oo/classes/zcl_test/includes/testclasses')
 *   // → '/sap/bc/adt/oo/classes/zcl_test'
 * getObjectRootUri('/sap/bc/adt/oo/classes/zcl_test')
 *   // → '/sap/bc/adt/oo/classes/zcl_test'  (already root)
 */
export function getObjectRootUri(uri: string): string {
  const ADT_PREFIX = '/sap/bc/adt/';

  // Collect all registered endpoints, sorted longest-first to avoid partial matches
  const endpoints: string[] = [];
  for (const entry of registry.values()) {
    if (entry.endpoint) endpoints.push(entry.endpoint);
  }
  endpoints.sort((a, b) => b.length - a.length);

  for (const endpoint of endpoints) {
    const prefix = `${ADT_PREFIX}${endpoint}/`;
    if (uri.startsWith(prefix)) {
      // Next segment after the endpoint prefix is the object name
      const rest = uri.slice(prefix.length);
      const objectName = rest.split('/')[0];
      return `${prefix}${objectName}`;
    }
  }

  return uri;
}

// ============================================
// Built-in Registrations
// ============================================

// These will be populated by object modules when they're imported
// Each object module calls registerObjectType() in its module scope

// Example (done in clas.model.ts):
// registerObjectType('CLAS', kinds.Class, AdkClass);

// For now, we export the registration function and let objects self-register
// This avoids circular dependencies

// ============================================
// Type Mappings (for reference/documentation)
// ============================================

/**
 * Known ADT type to ADK kind mappings
 *
 * Repository Objects:
 * - DEVC → Package
 * - CLAS → Class
 * - INTF → Interface
 * - FUGR → FunctionGroup
 * - FUNC → FunctionModule
 * - PROG → Program
 * - INCL → Include
 *
 * Data Dictionary:
 * - TABL → Table
 * - STRU → Structure (actually TABL with different category)
 * - DTEL → DataElement
 * - DOMA → Domain
 * - TTYP → TableType
 *
 * Other:
 * - MSAG → MessageClass
 * - ENHS → EnhancementSpot
 *
 * CTS:
 * - (Transport requests/tasks use different identification)
 */
export const ADT_TYPE_MAPPINGS = {
  // Repository
  DEVC: kinds.Package,
  CLAS: kinds.Class,
  INTF: kinds.Interface,
  FUGR: kinds.FunctionGroup,
  FUNC: kinds.FunctionModule,
  PROG: kinds.Program,
  INCL: kinds.Include,

  // Data Dictionary
  TABL: kinds.Table,
  DTEL: kinds.DataElement,
  DOMA: kinds.Domain,
  TTYP: kinds.TableType,

  // Other
  MSAG: kinds.MessageClass,
  ENHS: kinds.EnhancementSpot,
} as const;
