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
export type ABAPLanguageVersion = 'standard' | 'keyUser' | 'cloudDevelopment';
/**
 * Source
 */
export type Source = 'predefined' | 'custom';
/**
 * Status
 */
export type Status = 'draft' | 'final';
/**
 * Fiori application
 */
export type FioriApplication = string;
/**
 * Extensibility mode
 */
export type ExtensibilityMode = 'fullySupported' | 'supportedPredefinedQueries' | 'notSupported';
/**
 * Predefined InA service
 */
export type PredefinedInAService = string;
/**
 * Custom InA service
 */
export type CustomInAService = string;

/**
 * Object type RVBC
 */
export interface RvbcAff {
  formatVersion: FormatVersion;
  header: Header;
  bookletDefinition: BookletDefinition;
  ina1Services?: InAServices;
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
 * Booklet definition
 */
export interface BookletDefinition {
  source: Source;
  status: Status;
  application?: FioriApplication;
  extensibilityMode?: ExtensibilityMode;
}
/**
 * InA services
 */
export interface InAServices {
  predefined?: PredefinedInAService;
  custom?: CustomInAService;
}

