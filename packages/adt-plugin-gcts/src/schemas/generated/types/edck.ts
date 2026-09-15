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
 * Consistency check category
 */
export type CheckCategory = 'existenceCheck' | 'statusCheck' | 'edocumentExistenceCheck' | 'contentMismatchCheck';
/**
 * Consistency check ID classification
 */
export type CheckClassification = 'coreDeliveredChecks' | 'additionalImplementedChecks';
/**
 * Consistency check class
 */
export type AdditionalCheckClass = string;
/**
 * Result process derived
 */
export type ResultProcessDerived = boolean;

/**
 * Consistency check ID
 */
export interface EdckAff {
  formatVersion: ABAPFileFormatVersion;
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
 * General information of consistency check ID
 */
export interface GeneralInformation {
  checkCategory?: CheckCategory;
  checkClassification?: CheckClassification;
  additionalCheckClass?: AdditionalCheckClass;
  resultProcessDerived?: ResultProcessDerived;
}

