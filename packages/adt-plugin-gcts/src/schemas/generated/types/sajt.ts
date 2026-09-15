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
 * Description of the application job template
 */
export type Description = string;
/**
 * Original language of the application job template
 */
export type OriginalLanguage = string;
/**
 * ABAP language version
 */
export type ABAPLanguageVersion = 'standard' | 'cloudDevelopment';
/**
 * Name of the application job catalog entry to which the template refers
 */
export type JobCatalogEntry = string;
/**
 * Name of the parameter
 */
export type Name = string;
/**
 * Value of the parameter
 */
export type Value = string;
/**
 * List of parameters with single value
 */
export type ParametersWithSingleValue = ParameterDetails[];
/**
 * Name of the parameter
 */
export type Name1 = string;
/**
 * Include/exclude values (I/E)
 */
export type Sign = 'include' | 'exclude';
/**
 * Operator of the ranges condition (EQ/NE/GE/GT/LE/LT/CP/NP/BT/NB)
 */
export type Option =
  | 'equals'
  | 'between'
  | 'greaterThan'
  | 'containsPattern'
  | 'notEqual'
  | 'notBetween'
  | 'notContainsPattern'
  | 'greaterEqual'
  | 'lessThan'
  | 'lessEqual';
/**
 * Low value of the ranges condition
 */
export type LowValue = string;
/**
 * High value of the ranges condition
 */
export type HighValue = string;
/**
 * Values of the parameter as ranges table
 */
export type Values = EntryOfRangesTable[];
/**
 * List of parameters with value ranges
 */
export type ParametersWithValueRanges = ParameterDetails1[];

/**
 * Attributes of the application job template
 */
export interface SajtAff {
  formatVersion: ABAPFileFormatVersion;
  header: Header;
  generalInformation: GeneralInformation;
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
 * General information
 */
export interface GeneralInformation {
  catalogName: JobCatalogEntry;
}
/**
 * Parameters of the class which runs within the job
 */
export interface Parameters {
  singleValueParameters?: ParametersWithSingleValue;
  valueRangesParameters?: ParametersWithValueRanges;
}
/**
 * Name of the parameter and its value
 */
export interface ParameterDetails {
  name: Name;
  value: Value;
}
/**
 * Name of the parameter and its values as ranges table
 */
export interface ParameterDetails1 {
  name: Name1;
  valueRanges: Values;
}
/**
 * Entry of ranges table
 */
export interface EntryOfRangesTable {
  sign: Sign;
  option: Option;
  low?: LowValue;
  high?: HighValue;
}

