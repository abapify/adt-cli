/**
 * ADK v2 - ABAP Development Kit
 *
 * Facade over ADT client providing stable ABAP object interfaces.
 *
 * Usage:
 *   import { createAdk, type AbapPackage } from '@abapify/adk';
 *
 *   const adk = createAdk(client);
 *   const pkg = await adk.getPackage('ZPACKAGE');
 *   const objects = await pkg.getObjects();
 */

// Base types
export type { AbapObject } from './base/types';
export type { AdkContext } from './base/context';
export type { LockRegistry, LockEntry } from './base/lock-registry';
export type { LockStore, LockService } from '@abapify/adt-locks';
export { createLockService } from '@abapify/adt-locks';
export {
  AdkObject,
  AdkMainObject,
  type LockHandle,
  type SaveOptions,
  type ActivationResult,
  type AtomLink,
  type AdtObjectReference,
  type AdkObjectData,
  type AdkMainObjectData,
} from './base/model';

// Object Set - bulk operations service
export {
  AdkObjectSet,
  type BulkSaveResult,
  type BulkSaveOptions,
  type BulkActivateOptions,
} from './base/object-set';

// ADT integration layer - single point for adt-client types
export type {
  AdtClient,
  AdtContracts,
  AdkContract,
  ClassResponse,
  InterfaceResponse,
  PackageResponse,
  ProgramResponse,
  IncludeResponse,
  FunctionGroupResponse,
  FunctionModuleResponse,
  TransportGetResponse,
  DomainResponse,
  DataElementResponse,
  TableTypeResponse,
} from './base/adt';
export { createAdkContract } from './base/adt';

// Global context management
export {
  initializeAdk,
  getGlobalContext,
  isAdkInitialized,
  resetAdk,
  tryGetGlobalContext,
} from './base/global-context';

// Package types and class
export type {
  AbapPackage,
  PackageType,
  PackageAttributes,
  ObjectReference,
  ApplicationComponent,
  SoftwareComponent,
  TransportLayer,
  TransportConfig,
  PackageXml, // Raw API response type (inferred from schema)
} from './objects/repository/devc';
export { AdkPackage } from './objects/repository/devc';

// Class types and class
export type {
  AbapClass,
  ClassCategory,
  ClassVisibility,
  ClassInclude,
  ClassIncludeType,
  ClassXml, // Raw API response type
} from './objects/repository/clas';
export { AdkClass } from './objects/repository/clas';

// Interface types and class
export type {
  AbapInterface,
  InterfaceXml, // Raw API response type
} from './objects/repository/intf';
export { AdkInterface } from './objects/repository/intf';

// Program types and class
export type {
  AbapProgram,
  ProgramXml, // Raw API response type
} from './objects/repository/prog';
export { AdkProgram } from './objects/repository/prog';

// Include types and class
export type {
  AbapInclude,
  IncludeXml, // Raw API response type
} from './objects/repository/incl';
export { AdkInclude } from './objects/repository/incl';

// Function group types and class
export type {
  AbapFunctionGroup,
  FunctionGroupXml, // Raw API response type
} from './objects/repository/fugr';
export { AdkFunctionGroup } from './objects/repository/fugr';

// Function module types and class (child of function group)
export type {
  AbapFunctionModule,
  FunctionModuleXml, // Raw API response type
} from './objects/repository/fugr';
export { AdkFunctionModule } from './objects/repository/fugr';

// DDIC types and classes
export {
  AdkDomain,
  AdkDataElement,
  AdkTable,
  AdkStructure,
  AdkTableType,
  type DomainXml,
  type DataElementXml,
  type TableXml,
  type TableTypeXml,
} from './objects/ddic';

// CDS types (DDL, DCL)
export { AdkDdlSource, AdkDclSource } from './objects/cds';

// RAP types and classes
export { AdkBehaviorDefinition } from './objects/repository/bdef';
export { AdkServiceDefinition } from './objects/repository/srvd';

// CTS types (legacy complex transport)
export type {
  TransportData,
  TransportRequestData,
  TransportTaskData,
  TransportObjectData,
  TransportTask,
  TransportObject,
  TransportStatus,
  TransportType,
  TransportCreateOptions,
  TransportUpdateOptions,
  ReleaseResult,
} from './objects/cts';
export {
  AdkTransportItem,
  AdkTransportRequest,
  AdkTransportTask,
  AdkTransportObject,
  clearConfigCache,
} from './objects/cts';

// CTS - Simplified transport for import operations
export {
  AdkTransport,
  AdkTransportObjectRef,
  AdkTransportTaskRef,
  type TransportResponse,
} from './objects/cts';

// Factory and registry
export type { AdkFactory } from './factory';
export {
  createAdk,
  createAdkFactory,
  AdkGenericObject,
  parseXmlIdentity,
} from './factory';
export {
  registerObjectType,
  resolveType,
  resolveKind,
  parseAdtType,
  getMainType,
  getKindForType,
  getTypeForKind,
  isTypeRegistered,
  getRegisteredTypes,
  getRegisteredKinds,
  getEndpointForType,
  getObjectUri,
  getObjectRootUri,
  normalizeObjectName,
  ADT_TYPE_MAPPINGS,
  type NameTransform,
  type RegisterObjectTypeOptions,
} from './base/registry';

// ADK kinds and type mapping
export * from './base/kinds';
export type { AdkObjectForKind } from './base/kinds';
