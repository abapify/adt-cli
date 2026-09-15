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
 * Business role template
 */
export type BusinessRoleTemplate = string;
/**
 * Launchpad space template
 */
export type LaunchpadSpaceTemplate = string;

/**
 * Business role template launchpad space template assignment
 */
export interface SiadAff {
  formatVersion: FormatVersion;
  header: Header;
  generalInformation: GeneralInformation;
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
  businessRoleTemplate: BusinessRoleTemplate;
  launchpadSpaceTemplate: LaunchpadSpaceTemplate;
}

