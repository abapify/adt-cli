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
 * Namespace
 */
export type Namespace = string;
/**
 * AIF action
 */
export type AIFAction = string;
/**
 * Main component type
 */
export type MainComponentType = string;
/**
 * Implementing class
 */
export type ImplementingClass = string;
/**
 * Name
 */
export type Name = string;
/**
 * Fields to restore
 */
export type FieldsToRestore = FieldToRestore[];
/**
 * ID
 */
export type ID = string;
/**
 * Check
 */
export type Check = string;
/**
 * Check behavior
 */
export type CheckBehavior = 'treatAsError' | 'ignoreData';
/**
 * Type
 */
export type Type =
  | 'sourceStructure'
  | 'destinationStructure'
  | 'constant'
  | 'systemField'
  | 'sendingSystem'
  | 'currentLineNumber'
  | 'hierarchicalMapping';
/**
 * Name
 */
export type Name1 = string;
/**
 * Value
 */
export type Value = string;
/**
 * Fields
 */
export type Fields = FieldsToCheck[];
/**
 * Checks
 */
export type Checks = CheckDetails[];

/**
 * Action
 */
export interface AifaAff {
  formatVersion: ABAPFileFormatVersion;
  header: Header;
  generalInformation: GeneralInformation;
  fieldsToRestore?: FieldsToRestore;
  checks?: Checks;
}
/**
 * Header
 */
export interface Header {
  description: Description;
  originalLanguage: OriginalLanguage;
  abapLanguageVersion?: ABAPLanguageVersion;
}
/**
 * General information
 */
export interface GeneralInformation {
  namespace: Namespace;
  aifAction: AIFAction;
  mainComponentType?: MainComponentType;
  implementingClass?: ImplementingClass;
}
/**
 * Field to restore
 */
export interface FieldToRestore {
  name?: Name;
}
/**
 * Check details
 */
export interface CheckDetails {
  id: ID;
  check: Check;
  checkBehaviour?: CheckBehavior;
  fields?: Fields;
}
/**
 * Field to check
 */
export interface FieldsToCheck {
  type?: Type;
  name?: Name1;
  value?: Value;
}

