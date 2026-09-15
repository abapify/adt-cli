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
export type ABAPLanguageVersion = 'standard' | 'keyUser' | 'cloudDevelopment';
/**
 * Class category
 */
export type ClassCategory =
  | 'generalObjectType'
  | 'exitClass'
  | 'testclassAbapUnit'
  | 'behaviorClass'
  | 'entityEventHandler'
  | 'persistentClass'
  | 'factoryForPersistentClass'
  | 'statusClassForPersistClass'
  | 'rfcProxyClass'
  | 'communicationConnectionClass'
  | 'exceptionClass'
  | 'areaClassSharedObjects'
  | 'businessClass'
  | 'bspApplicationClass'
  | 'basisClassBspElementHdlr'
  | 'webDynproRuntimeObject';
/**
 * Fix point arithmetic
 */
export type FixPointArithmetic = boolean;
/**
 * The message class of the class
 */
export type MessageClass = string;
/**
 * Name
 */
export type Name = string;
/**
 * Description
 */
export type Description1 = string;
/**
 * Type descriptions
 */
export type TypeDescriptions = NameAndDescription[];
/**
 * Name
 */
export type Name1 = string;
/**
 * Description
 */
export type Description2 = string;
/**
 * Attribute descriptions
 */
export type AttributeDescriptions = NameAndDescription1[];
/**
 * Name of the event
 */
export type EventName = string;
/**
 * Description of the event
 */
export type EventDescription1 = string;
/**
 * Name
 */
export type Name2 = string;
/**
 * Description
 */
export type Description3 = string;
/**
 * Parameter descriptions
 */
export type ParameterDescriptions = NameAndDescription2[];
/**
 * Event descriptions
 */
export type EventDescriptions = EventDescription[];
/**
 * Name of the method
 */
export type MethodName = string;
/**
 * Description of the method
 */
export type MethodDescription1 = string;
/**
 * Name
 */
export type Name3 = string;
/**
 * Description
 */
export type Description4 = string;
/**
 * Parameter descriptions
 */
export type ParameterDescriptions1 = NameAndDescription3[];
/**
 * Name
 */
export type Name4 = string;
/**
 * Description
 */
export type Description5 = string;
/**
 * Exception descriptions
 */
export type ExceptionDescriptions = NameAndDescription4[];
/**
 * Method descriptions
 */
export type MethodDescriptions = MethodDescription[];

/**
 * Class properties
 */
export interface ClasAff {
  formatVersion: ABAPFileFormatVersion;
  header: Header;
  category?: ClassCategory;
  fixPointArithmetic?: FixPointArithmetic;
  messageClass?: MessageClass;
  descriptions?: Descriptions;
}
/**
 * header
 */
export interface Header {
  description: Description;
  originalLanguage: OriginalLanguage;
  abapLanguageVersion?: ABAPLanguageVersion;
}
/**
 * Descriptions maintained in SE80
 */
export interface Descriptions {
  types?: TypeDescriptions;
  attributes?: AttributeDescriptions;
  events?: EventDescriptions;
  methods?: MethodDescriptions;
}
/**
 * Name and description
 */
export interface NameAndDescription {
  name: Name;
  description: Description1;
}
/**
 * Name and description
 */
export interface NameAndDescription1 {
  name: Name1;
  description: Description2;
}
/**
 * Event description
 */
export interface EventDescription {
  name: EventName;
  description: EventDescription1;
  parameters?: ParameterDescriptions;
}
/**
 * Name and description
 */
export interface NameAndDescription2 {
  name: Name2;
  description: Description3;
}
/**
 * Method description
 */
export interface MethodDescription {
  name: MethodName;
  description: MethodDescription1;
  parameters?: ParameterDescriptions1;
  exceptions?: ExceptionDescriptions;
}
/**
 * Name and description
 */
export interface NameAndDescription3 {
  name: Name3;
  description: Description4;
}
/**
 * Name and description
 */
export interface NameAndDescription4 {
  name: Name4;
  description: Description5;
}

