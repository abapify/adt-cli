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
 * Extension include with persisted custom fields
 */
export type ExtensionInclude = string;
/**
 * Structure with application data
 */
export type ApplicationDataStructure = string;
/**
 * Abstract entity with ui definition
 */
export type UIExtensionEntity = string;
/**
 * Name of transaction code
 */
export type Name = string;
/**
 * Transaction codes of extensible application
 */
export type TransactionCodes = TransactionCodes1[];

/**
 * SAP GUI extension point for developer extensibility
 */
export interface SxtgAff {
  formatVersion: FormatVersion;
  header: Header;
  generalInformation?: GeneralInformation;
  transactionCodes?: TransactionCodes;
}
/**
 * Header
 */
export interface Header {
  description: Description;
  originalLanguage: OriginalLanguage;
}
/**
 * General information
 */
export interface GeneralInformation {
  extensionInclude: ExtensionInclude;
  applicationDataStructure: ApplicationDataStructure;
  uiExtensionEntity: UIExtensionEntity;
}
/**
 * Transaction codes
 */
export interface TransactionCodes1 {
  name?: Name;
}

