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
 * Reference domain name
 */
export type DomainName = string;
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
 * Decimals
 */
export type Decimals = number;
/**
 * Reference to an ABAP type
 */
export type ReferenceType = string;
/**
 * Reference to a predefined ABAP type
 */
export type ReferencePredefinedType = string;
/**
 * Short field label
 */
export type Short = string;
/**
 * Short length
 */
export type ShortLength = number;
/**
 * Medium field label
 */
export type Medium = string;
/**
 * Medium length
 */
export type MediumLength = number;
/**
 * Long field label
 */
export type Long = string;
/**
 * Long length
 */
export type LongLength = number;
/**
 * Heading field label
 */
export type Heading = string;
/**
 * Heading length
 */
export type HeadingLength = number;
/**
 * Search help name
 */
export type Name = string;
/**
 * Search help parameters
 */
export type Parameter = string;
/**
 * Basic direction
 */
export type BasicDirection = 'leftToRight' | 'rightToLeft';
/**
 * Deactivates bidirectional text filtering
 */
export type NoBidirectionalFiltering = boolean;
/**
 * Set/Get parameter ID
 */
export type SetGetParameterID = string;
/**
 * Default component name
 */
export type DefaultComponentName = string;
/**
 * Change document relevant
 */
export type ChangeDocumentRelevant = boolean;
/**
 * No input history
 */
export type NoInputHistory = boolean;

/**
 * Data element (DTEL)
 */
export interface DtelAff {
  formatVersion: ABAPFileFormatVersion;
  header: Header;
  dataTypeInformation: DataTypeInformation;
  fieldLabels?: FieldLabels;
  searchHelp?: SearchHelp;
  bidirectionalOptions?: BidirectionalOptions;
  additionalProperties?: AdditionalProperties;
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
 * Data type information
 */
export interface DataTypeInformation {
  domainName?: DomainName;
  predefinedType?: PredefinedType;
  referenceType?: ReferenceType;
  referencePredefinedType?: ReferencePredefinedType;
}
/**
 * Predefined ABAP type
 */
export interface PredefinedType {
  dataType: DataType;
  length: Length;
  decimals?: Decimals;
}
/**
 * Field labels
 */
export interface FieldLabels {
  short?: Short;
  shortLength?: ShortLength;
  medium?: Medium;
  mediumLength?: MediumLength;
  long?: Long;
  longLength?: LongLength;
  heading?: Heading;
  headingLength?: HeadingLength;
}
/**
 * Search help
 */
export interface SearchHelp {
  name: Name;
  parameter: Parameter;
}
/**
 * Bidirectional options
 */
export interface BidirectionalOptions {
  basicDirection?: BasicDirection;
  noFiltering?: NoBidirectionalFiltering;
}
/**
 * Additional properties
 */
export interface AdditionalProperties {
  parameterId?: SetGetParameterID;
  defaultComponentName?: DefaultComponentName;
  changeDocumentRelevant?: ChangeDocumentRelevant;
  noInputHistory?: NoInputHistory;
}

