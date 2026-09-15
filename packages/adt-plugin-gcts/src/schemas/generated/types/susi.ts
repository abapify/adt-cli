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
 * Application name of authorization defaults
 */
export type ApplicationName = string;
/**
 * Type of authorization defaults
 */
export type ApplicationType = string;
/**
 * Maintenance mode
 */
export type MaintenanceMode =
  'manual' | 'automatic' | 'automaticBasisObjects' | 'noDefaultValues' | 'deprecated' | 'obsolete';
/**
 * Authorization default documentation for application
 */
export type Documentation = string;
/**
 * Name of Authorization Object
 */
export type Object = string;
/**
 * Maintenance Status
 */
export type MaintenanceStatus = 'noDefault' | 'defaultWithValues' | 'defaultWithoutValues' | 'inactiveValues';
/**
 * Authorization default documentation for object
 */
export type Documentation1 = string;
/**
 * Authorization field
 */
export type AuthorizationField = string;
/**
 * From value
 */
export type From = string;
/**
 * To values
 */
export type To = string;
/**
 * Authorization field values
 */
export type AuthorizationFieldValues = AuthorizationFieldValues1[];
/**
 * Authorization objects
 */
export type AuthorizationObjects = AuthorizationObjectDetails[];

/**
 * Object type SUSI
 */
export interface SusiAff {
  formatVersion: ABAPFileFormatVersion;
  header: Header;
  generalInformation: GeneralInformation;
  authorizationObjects?: AuthorizationObjects;
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
  applicationName: ApplicationName;
  applicationType: ApplicationType;
  maintenanceMode?: MaintenanceMode;
  documentation?: Documentation;
}
/**
 * Details of Authorization object
 */
export interface AuthorizationObjectDetails {
  object: Object;
  maintenanceStatus?: MaintenanceStatus;
  documentation?: Documentation1;
  fields?: AuthorizationFieldValues;
}
/**
 * Authorization field values
 */
export interface AuthorizationFieldValues1 {
  field?: AuthorizationField;
  low?: From;
  high?: To;
}

