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

// CDS and RAP source objects
export const DdlSource = 'DdlSource' as const;
export const DclSource = 'DclSource' as const;
export const DdlExtension = 'DdlExtension' as const;
export const CdsAspect = 'CdsAspect' as const;
export const CdsType = 'CdsType' as const;
export const ScalarFunctionDefinition = 'ScalarFunctionDefinition' as const;
export const ScalarFunctionImplementation =
  'ScalarFunctionImplementation' as const;
export const EntityBuffer = 'EntityBuffer' as const;
export const DynamicCache = 'DynamicCache' as const;
export const TuningIndex = 'TuningIndex' as const;
export const StaticCache = 'StaticCache' as const;
export const ExternalSchema = 'ExternalSchema' as const;
export const BehaviorDefinition = 'BehaviorDefinition' as const;
export const ServiceDefinition = 'ServiceDefinition' as const;
export const ServiceBinding = 'ServiceBinding' as const;

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
  | typeof DdlSource
  | typeof DclSource
  | typeof DdlExtension
  | typeof CdsAspect
  | typeof CdsType
  | typeof ScalarFunctionDefinition
  | typeof ScalarFunctionImplementation
  | typeof EntityBuffer
  | typeof DynamicCache
  | typeof TuningIndex
  | typeof StaticCache
  | typeof ExternalSchema
  | typeof BehaviorDefinition
  | typeof ServiceDefinition
  | typeof ServiceBinding
  | typeof MessageClass
  | typeof EnhancementSpot;

// ============================================
// Type-safe Kind → Object mapping
// ============================================

// Import concrete types for mapping (type-only to avoid circular deps)
import type { AdkClass } from '../objects/repository/clas/clas.model';
import type { AdkInterface } from '../objects/repository/intf/intf.model';
import type { AdkPackage } from '../objects/repository/devc/devc.model';
import type { AdkProgram } from '../objects/repository/prog/prog.model';
import type { AdkInclude } from '../objects/repository/incl/incl.model';
import type { AdkFunctionGroup } from '../objects/repository/fugr/fugr.model';
import type { AdkFunctionModule } from '../objects/repository/fugr/func/func.model';
import type {
  AdkTransportRequest,
  AdkTransportTask,
} from '../objects/cts/transport/transport';
import type { AdkObject } from './model';
import type { AdkDomain } from '../objects/ddic/doma/doma.model';
import type { AdkDataElement } from '../objects/ddic/dtel/dtel.model';
import type { AdkTable, AdkStructure } from '../objects/ddic/tabl/tabl.model';
import type { AdkTableType } from '../objects/ddic/ttyp/ttyp.model';
import type { AdkDdlSource } from '../objects/cds/ddl.model';
import type { AdkDclSource } from '../objects/cds/dcl.model';
import type { AdkDdlExtension } from '../objects/cds/ddlx.model';
import type { AdkCdsAspect } from '../objects/cds/dras.model';
import type { AdkCdsType } from '../objects/cds/drty.model';
import type { AdkScalarFunctionDefinition } from '../objects/cds/dsfd.model';
import type { AdkScalarFunctionImplementation } from '../objects/cds/dsfi.model';
import type { AdkEntityBuffer } from '../objects/cds/dteb.model';
import type { AdkDynamicCache } from '../objects/cds/dtdc.model';
import type { AdkTuningIndex } from '../objects/cds/dtix.model';
import type { AdkStaticCache } from '../objects/cds/dtsc.model';
import type { AdkExternalSchema } from '../objects/cds/desd.model';
import type { AdkBehaviorDefinition } from '../objects/repository/bdef/bdef.model';
import type { AdkServiceDefinition } from '../objects/repository/srvd/srvd.model';
import type { AdkServiceBinding } from '../objects/repository/srvb/srvb.model';

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
      : K extends typeof Program
        ? AdkProgram
        : K extends typeof Include
          ? AdkInclude
          : K extends typeof FunctionGroup
            ? AdkFunctionGroup
            : K extends typeof FunctionModule
              ? AdkFunctionModule
              : K extends typeof TransportRequest
                ? AdkTransportRequest
                : K extends typeof TransportTask
                  ? AdkTransportTask
                  : K extends typeof Domain
                    ? AdkDomain
                    : K extends typeof DataElement
                      ? AdkDataElement
                      : K extends typeof Table
                        ? AdkTable
                        : K extends typeof Structure
                          ? AdkStructure
                          : K extends typeof TableType
                            ? AdkTableType
                            : K extends typeof DdlSource
                              ? AdkDdlSource
                              : K extends typeof DclSource
                                ? AdkDclSource
                                : K extends typeof DdlExtension
                                  ? AdkDdlExtension
                                  : K extends typeof CdsAspect
                                    ? AdkCdsAspect
                                    : K extends typeof CdsType
                                      ? AdkCdsType
                                      : K extends typeof ScalarFunctionDefinition
                                        ? AdkScalarFunctionDefinition
                                        : K extends typeof ScalarFunctionImplementation
                                          ? AdkScalarFunctionImplementation
                                          : K extends typeof EntityBuffer
                                            ? AdkEntityBuffer
                                            : K extends typeof DynamicCache
                                              ? AdkDynamicCache
                                              : K extends typeof TuningIndex
                                                ? AdkTuningIndex
                                                : K extends typeof StaticCache
                                                  ? AdkStaticCache
                                                  : K extends typeof ExternalSchema
                                                    ? AdkExternalSchema
                                                    : K extends typeof BehaviorDefinition
                                                      ? AdkBehaviorDefinition
                                                      : K extends typeof ServiceDefinition
                                                        ? AdkServiceDefinition
                                                        : K extends typeof ServiceBinding
                                                          ? AdkServiceBinding
                                                          : AdkObject; // fallback
