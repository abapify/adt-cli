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
 * Data type
 */
export type DataType =
  | 'ACCP'
  | 'CHAR'
  | 'CLNT'
  | 'CUKY'
  | 'CURR'
  | 'DF16_DEC'
  | 'DF16_RAW'
  | 'DF16_SCL'
  | 'DECFLOAT16'
  | 'DF34_DEC'
  | 'DF34_RAW'
  | 'DF34_SCL'
  | 'DECFLOAT34'
  | 'DATS'
  | 'DATN'
  | 'DEC'
  | 'FLTP'
  | 'GEOM_EWKB'
  | 'INT1'
  | 'INT2'
  | 'INT4'
  | 'INT8'
  | 'LANG'
  | 'LCHR'
  | 'LRAW'
  | 'NUMC'
  | 'PREC'
  | 'QUAN'
  | 'RAW'
  | 'RAWSTRING'
  | 'SSTRING'
  | 'STRING'
  | 'TIMS'
  | 'TIMN'
  | 'UNIT'
  | 'UTCLONG'
  | 'VARC';
/**
 * Length
 */
export type Length = number;
/**
 * Output style (for Releases < 71*)
 */
export type Style =
  | 'normal'
  | 'signRight'
  | 'scalePreserving'
  | 'scientific'
  | 'scientificWithLeadingZero'
  | 'scalePreservingScientific'
  | 'engineering';
/**
 * Set the output length
 */
export type Length1 = number;
/**
 * Values are case sensitive
 */
export type CaseSensitive = boolean;
/**
 * Supports negative values
 */
export type NegativeValues = boolean;
/**
 * AM/PM time format supported
 */
export type AMPMTimeFormat = boolean;
/**
 * Value
 */
export type FixedValue = string;
/**
 * Description
 */
export type Description1 = string;
/**
 * Fixed values
 */
export type FixedValues = SingleValues[];
/**
 * Low value for the interval
 */
export type LowLimitOfTheInterval = string;
/**
 * High value for the interval
 */
export type HighLimitOfTheInterval = string;
/**
 * Description
 */
export type Description2 = string;
/**
 * Fixed value intervals
 */
export type FixedValueIntervals = IntervalValues[];
/**
 * Name
 */
export type Name = string;
/**
 * Name
 */
export type Name1 = string;
/**
 * Fixed value appends
 */
export type FixedValueAppends = FixedValueAppends1[];

/**
 * Domain properties
 */
export interface DomaAff {
  formatVersion: ABAPFileFormatVersion;
  header: Header;
  format: Format;
  outputCharacteristics?: OutputCharacteristics;
  fixedValues?: FixedValues;
  fixedValueIntervals?: FixedValueIntervals;
  valueTable?: ValueTable;
  fixedValueAppends?: FixedValueAppends;
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
 * Format
 */
export interface Format {
  dataType: DataType;
  length: Length;
  /**
   * Set if decimal
   */
  decimals?: number;
}
/**
 * Output characteristics
 */
export interface OutputCharacteristics {
  style?: Style;
  length?: Length1;
  /**
   * Conversion Routine
   */
  conversionRoutine?: string;
  caseSensitive?: CaseSensitive;
  negativeValues?: NegativeValues;
  amPmTimeFormat?: AMPMTimeFormat;
}
/**
 * Single values
 */
export interface SingleValues {
  fixedValue?: FixedValue;
  description?: Description1;
}
/**
 * Interval values
 */
export interface IntervalValues {
  lowLimit?: LowLimitOfTheInterval;
  highLimit: HighLimitOfTheInterval;
  description?: Description2;
}
/**
 * Value table
 */
export interface ValueTable {
  name?: Name;
}
/**
 * Fixed value appends
 */
export interface FixedValueAppends1 {
  name?: Name1;
}

