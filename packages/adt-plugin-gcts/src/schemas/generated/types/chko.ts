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
 * The parent category of an ATC check object
 */
export type Category = string;
/**
 * The implementing class of the ATC check object
 */
export type ImplementingClass = string;
/**
 * The check type of ATC check
 */
export type CheckType = 'local' | 'remoteEnabled';
/**
 * Name of a parameter
 */
export type ParameterName = string;
/**
 * Description of a parameter
 */
export type ParameterDescription = string;
/**
 * The parameter is hidden
 */
export type IsHidden = boolean;
/**
 * Parameters of the ATC check object
 */
export type Parameters = Parameter[];

/**
 * ATC check object properties
 */
export interface ChkoAff {
  formatVersion: ABAPFileFormatVersion;
  header: Header;
  category: Category;
  implementingClass: ImplementingClass;
  checkType?: CheckType;
  parameters?: Parameters;
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
 * A parameter of an ATC check object
 */
export interface Parameter {
  name?: ParameterName;
  description?: ParameterDescription;
  hidden?: IsHidden;
}

