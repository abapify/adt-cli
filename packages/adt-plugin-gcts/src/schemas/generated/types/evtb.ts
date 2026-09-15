/**
 * Auto-generated from SAP/abap-file-formats JSON schemas.
 * DO NOT EDIT — run `nx codegen adt-plugin-gcts` to regenerate.
 * Source: git_modules/abap-file-formats/file-formats/<type>/<type>-v1.json
 */
/**
 * The ABAP file format version
 */
export type ABAPFileFormatVersion = '1';
/**
 * Description of the ABAP object
 */
export type Description = string;
/**
 * Original language of the ABAP object
 */
export type OriginalLanguage = string;
/**
 * ABAP language version
 */
export type ABAPLanguageVersion = 'standard' | 'cloudDevelopment';
/**
 * Type namespace
 */
export type TypeNamespace = string;
/**
 * Producer legacy
 */
export type ProducerLegacy = boolean;
/**
 * Producer
 */
export type Producer = string;
/**
 * Producer version
 */
export type ProducerVersion = string;
/**
 * SAP Object Type
 */
export type SAPObjectType = string;
/**
 * Operation
 */
export type Operation = string;
/**
 * Type
 */
export type Type = string;
/**
 * Major version
 */
export type MajorVersion = string;
/**
 * Minor version
 */
export type MinorVersion = number;
/**
 * Patch version
 */
export type PatchVersion = number;
/**
 * Entity name
 */
export type EntityName = string;
/**
 * Entity event name
 */
export type EntityEventName = string;
export type EventVersions = Event[];

export interface EvtbAff {
  formatVersion: ABAPFileFormatVersion;
  header: Header;
  producerNamespace: TypeNamespace;
  producerLegacy?: ProducerLegacy;
  producer?: Producer;
  producerVersion?: ProducerVersion;
  boName: SAPObjectType;
  boOperation: Operation;
  producerType?: Type;
  events: EventVersions;
}
/**
 * Header
 */
export interface Header {
  description: Description;
  originalLanguage: OriginalLanguage;
  abapLanguageVersion?: ABAPLanguageVersion;
}
export interface Event {
  eventVersion?: MajorVersion;
  eventMinorVersion?: MinorVersion;
  eventPatchVersion?: PatchVersion;
  entityName: EntityName;
  entityEventName: EntityEventName;
}

