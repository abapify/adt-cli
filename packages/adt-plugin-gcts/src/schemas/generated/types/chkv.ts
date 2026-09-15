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
 * The ATC check variant is remote-enabled
 */
export type RemoteEnabled = boolean;
/**
 * The name of check
 */
export type CheckName = string;
/**
 * The parameter name
 */
export type ParameterName = string;
/**
 * The value of the parameter
 */
export type ParameterValue = string;
/**
 * Name of a component of a structure
 */
export type ComponentFieldName = string;
/**
 * Value of a component of a structure
 */
export type ComponentValue = string;
/**
 * A structured value of a parameter, i.e. a value with named components
 */
export type StructuredValue = Component[];
/**
 * Name of a component of a structure
 */
export type ComponentFieldName1 = string;
/**
 * Value of a component of a structure
 */
export type ComponentValue1 = string;
/**
 * A structured value as a list of key-value pairs
 */
export type Structure = Component1[];
/**
 * A list of structured values of a parameter
 */
export type StructuredValueList = Structure[];
/**
 * A parameter value in the parameter value list
 */
export type EntryInValueList = string;
/**
 * List of values for a multi-value check parameter
 */
export type ListOfParameterValues = EntryInValueList[];
/**
 * The sign type of the range
 */
export type Sign = 'include' | 'exclude';
/**
 * Sign option of the range
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
 * The low value of the range
 */
export type Low = string;
/**
 * The high value of the range
 */
export type High = string;
/**
 * List of range values for a check parameter
 */
export type ListOfRangeValues = RangeValue[];
/**
 * Parameters of check
 */
export type CheckParameters = Parameter[];
/**
 * The checks selected in the ATC check variant
 */
export type SelectedChecks = Check[];

/**
 * ATC check variant properties
 */
export interface ChkvAff {
  formatVersion: ABAPFileFormatVersion;
  header: Header;
  remoteEnabled?: RemoteEnabled;
  selectedChecks?: SelectedChecks;
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
 * Check with its parameters
 */
export interface Check {
  checkName: CheckName;
  parameters?: CheckParameters;
}
/**
 * Parameter of ATC check
 */
export interface Parameter {
  name: ParameterName;
  value?: ParameterValue;
  structuredValue?: StructuredValue;
  structuredValueList?: StructuredValueList;
  valueList?: ListOfParameterValues;
  valueRangeList?: ListOfRangeValues;
}
/**
 * Component of a structure as a key-value pair
 */
export interface Component {
  field: ComponentFieldName;
  value: ComponentValue;
}
/**
 * Component of a structure as a key-value pair
 */
export interface Component1 {
  field: ComponentFieldName1;
  value: ComponentValue1;
}
/**
 * A range value for an ATC check parameter
 */
export interface RangeValue {
  sign: Sign;
  option: Option;
  low?: Low;
  high?: High;
}

