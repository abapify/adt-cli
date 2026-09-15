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
 * Name
 */
export type Name = string;
/**
 * Time reference
 */
export type TimeReference = string;
/**
 * Source table
 */
export type SourceTable = string;
/**
 * Source field
 */
export type SourceField = string;
/**
 * Indirect Value Determination
 */
export type IndirectValueDetermination = boolean;
/**
 * Value determination for time references
 */
export type TimeReferences = TimeReferenceDetails[];
/**
 * Condition field
 */
export type ConditionField = string;
/**
 * Description of condition field
 */
export type Description1 = string;
/**
 * Data element
 */
export type DataElement = string;
/**
 * Source table
 */
export type SourceTable1 = string;
/**
 * Source field
 */
export type SourceField1 = string;
/**
 * Indirect Value Determination
 */
export type IndirectValueDetermination1 = boolean;
/**
 * No intervals
 */
export type NoIntervals = boolean;
/**
 * Condition fields for direct value determination
 */
export type ConditionFields = ConditionFieldDetails[];
/**
 * Name
 */
export type Name1 = string;

/**
 * ILM object (ILMB) v1
 */
export interface IlmbAff {
  formatVersion: ABAPFileFormatVersion;
  header: Header;
  destructionObject?: DestructionObject;
  timeReferences: TimeReferences;
  conditionFields: ConditionFields;
  callbackClass?: ValueDeterminationCallbackClass;
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
 * Mapping ILM object to data destruction object
 */
export interface DestructionObject {
  name?: Name;
}
/**
 * Time reference details
 */
export interface TimeReferenceDetails {
  timeReference: TimeReference;
  sourceTable: SourceTable;
  sourceField: SourceField;
  indirectValue?: IndirectValueDetermination;
}
/**
 * Condition field details
 */
export interface ConditionFieldDetails {
  conditionField: ConditionField;
  description?: Description1;
  dataElement?: DataElement;
  sourceTable: SourceTable1;
  sourceField: SourceField1;
  indirectValue?: IndirectValueDetermination1;
  noIntervals?: NoIntervals;
}
/**
 * Value determination callback class
 */
export interface ValueDeterminationCallbackClass {
  name?: Name1;
}

