/**
 * ADK Object Kinds
 *
 * Central registry of all ADK object types.
 * Import specific kinds for type-safe usage:
 *
 * @example
 * import { TransportRequest } from '../base/kinds';
 * class AdkTransportRequest extends AdkObject<typeof TransportRequest> { ... }
 */

// CTS
export const TransportRequest = 'TransportRequest' as const;
export const TransportTask = 'TransportTask' as const;

// Repository Objects
export const Package = 'Package' as const;
export const Class = 'Class' as const;
export const Interface = 'Interface' as const;
export const FunctionGroup = 'FunctionGroup' as const;
export const FunctionModule = 'FunctionModule' as const;
export const Program = 'Program' as const;
export const Include = 'Include' as const;

// Data Dictionary
export const Table = 'Table' as const;
export const Structure = 'Structure' as const;
export const DataElement = 'DataElement' as const;
export const Domain = 'Domain' as const;
export const TableType = 'TableType' as const;

// Other
export const MessageClass = 'MessageClass' as const;
export const EnhancementSpot = 'EnhancementSpot' as const;

/** Union type of all ADK kinds */
export type AdkKind =
  | typeof TransportRequest
  | typeof TransportTask
  | typeof Package
  | typeof Class
  | typeof Interface
  | typeof FunctionGroup
  | typeof FunctionModule
  | typeof Program
  | typeof Include
  | typeof Table
  | typeof Structure
  | typeof DataElement
  | typeof Domain
  | typeof TableType
  | typeof MessageClass
  | typeof EnhancementSpot;

// ============================================
// Type-safe Kind → Object mapping
// ============================================

// Import concrete types for mapping (type-only to avoid circular deps)
import type { AdkClass } from '../objects/repository/clas/clas.model';
import type { AdkInterface } from '../objects/repository/intf/intf.model';
import type { AdkPackage } from '../objects/repository/devc/devc.model';
import type {
  AdkTransportRequest,
  AdkTransportTask,
} from '../objects/cts/transport/transport';
import type { AdkObject } from './model';

/**
 * Maps ADK kind to concrete object type
 *
 * Enables type-safe factory methods:
 * ```ts
 * const cls = factory.byKind(Class, 'ZCL_TEST');  // → AdkClass
 * const intf = factory.byKind(Interface, 'ZIF'); // → AdkInterface
 * ```
 */
export type AdkObjectForKind<K extends AdkKind> = K extends typeof Class
  ? AdkClass
  : K extends typeof Interface
    ? AdkInterface
    : K extends typeof Package
      ? AdkPackage
      : K extends typeof TransportRequest
        ? AdkTransportRequest
        : K extends typeof TransportTask
          ? AdkTransportTask
          : // Add more mappings as types are implemented
            AdkObject; // fallback
