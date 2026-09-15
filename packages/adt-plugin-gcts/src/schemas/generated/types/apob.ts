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
 * Name of key table or structure for application object
 */
export type KeyTableOrStructure = string;
/**
 * Name of the SAP object
 */
export type SAPObject = string;
/**
 * Name of the data category
 */
export type DataCategory = string;
/**
 * Name of the ILM object
 */
export type ILMObject = string;

/**
 * Type of application object
 */
export interface ApobAff {
  formatVersion: FormatVersion;
  header: Header;
  attributes: Attributes;
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
 * Attributes of the application object
 */
export interface Attributes {
  aoKeyStructure?: KeyTableOrStructure;
  sapObject?: SAPObject;
  dataCategory?: DataCategory;
  ilmObject?: ILMObject;
}

