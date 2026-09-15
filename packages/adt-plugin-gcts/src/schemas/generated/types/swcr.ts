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
 * Software component
 */
export type SoftwareComponent = string;
/**
 * The software component grants access permission to the specified software components
 */
export type AccessPermissions = AccessPermission[];
/**
 * Software component
 */
export type SoftwareComponent1 = string;
/**
 * The software component depends on the specified software components
 */
export type Dependencies = Dependency[];

/**
 * Software component relations
 */
export interface SwcrAff {
  formatVersion: FormatVersion;
  header: Header;
  permissions?: AccessPermissions;
  dependencies?: Dependencies;
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
 * Access permission
 */
export interface AccessPermission {
  softwareComponent: SoftwareComponent;
}
/**
 * Dependency
 */
export interface Dependency {
  softwareComponent: SoftwareComponent1;
}

