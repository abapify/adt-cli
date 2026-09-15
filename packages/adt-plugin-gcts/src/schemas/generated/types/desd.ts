/**
 * Auto-generated from SAP/abap-file-formats JSON schemas.
 * DO NOT EDIT — run `nx codegen adt-plugin-gcts` to regenerate.
 * Source: git_modules/abap-file-formats/file-formats/<type>/<type>-v1.json
 */
/**
 * Format version
 */
export type FormatVersion = '1';
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
 * Default remote database schema name when configuring the connection details of logical external schema.
 */
export type DefaultRemoteSchema = string;
/**
 * If true, the logical external schema can only be used in routed scenarios.
 */
export type UsesRouting = boolean;

/**
 * CDS logical external schema
 */
export interface DesdAff {
  formatVersion: FormatVersion;
  header: Header;
  generalInformation?: GeneralInformation;
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
  defaultRemoteSchemaName?: DefaultRemoteSchema;
  usesRouting?: UsesRouting;
}

