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

/** Registry entry with constructor and kind */
export interface RegistryEntry {
  readonly kind: AdkKind;
  readonly constructor: AdkObjectConstructor;
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

/**
 * Register an ADK object type
 *
 * @param adtMainType - Main ADT type (e.g., "DEVC", "CLAS")
 * @param kind - ADK kind constant
 * @param constructor - Object constructor
 */
export function registerObjectType(
  adtMainType: string,
  kind: AdkKind,
  constructor: AdkObjectConstructor,
): void {
  const normalizedType = adtMainType.toUpperCase();

  registry.set(normalizedType, { kind, constructor });
  adtToKind.set(normalizedType, kind);
  kindToAdt.set(kind, normalizedType);
}

/**
 * Resolve ADT type to registry entry
 *
 * @param adtType - Full or main ADT type (e.g., "DEVC/K" or "DEVC")
 * @returns Registry entry or undefined if not found
 */
export function resolveType(adtType: string): RegistryEntry | undefined {
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
