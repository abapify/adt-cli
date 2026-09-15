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
 * Fix point arithmetic
 */
export type FixPointArithmetic = boolean;
/**
 * Status
 */
export type Status = 'notClassified' | 'sapProgram' | 'customerProgram' | 'systemProgram' | 'testProgram';

/**
 * FUGR object type
 */
export interface FugrAff {
  formatVersion: ABAPFileFormatVersion;
  header: Header;
  fixPointArithmetic: FixPointArithmetic;
  status?: Status;
}
/**
 * Header
 */
export interface Header {
  description: Description;
  originalLanguage: OriginalLanguage;
  abapLanguageVersion?: ABAPLanguageVersion;
}

