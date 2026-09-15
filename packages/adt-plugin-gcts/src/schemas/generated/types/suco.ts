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
 * Program ID
 */
export type ProgramID = string;
/**
 * Object type
 */
export type ObjectType = string;
/**
 * Object name
 */
export type ObjectName = string;
/**
 * Service type
 */
export type ServiceType = string;
/**
 * Service name
 */
export type ServiceName = string;

/**
 * Object type SUCO (authorization default variant)
 */
export interface SucoAff {
  formatVersion: ABAPFileFormatVersion;
  header: Header;
  leadingApplication: LeadingApplication;
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
 * Leading application
 */
export interface LeadingApplication {
  programId?: ProgramID;
  objectType: ObjectType;
  objectName: ObjectName;
  serviceType?: ServiceType;
  serviceName?: ServiceName;
}

