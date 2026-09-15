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
 * Namespace of the check
 */
export type Namespace = string;
/**
 * SAP Application Interface check
 */
export type AIFCheck = string;
/**
 * Message class
 */
export type MessageClass = string;
/**
 * Message number
 */
export type MessageNumber = string;
/**
 * Number
 */
export type Number = number;
/**
 * Type
 */
export type Type = 'constant' | 'systemField' | 'definedField';
/**
 * Field
 */
export type Field = string;
/**
 * Value
 */
export type Value = string;
/**
 * Message variable assignments
 */
export type MessageVariableAssignments = VariableList[];
/**
 * Description
 */
export type Description1 = string;
/**
 * ID
 */
export type ID = string;
/**
 * Scenario
 */
export type Scenario =
  | 'simpleFieldCheck'
  | 'advancedFieldCheck'
  | 'simpleFieldAndDbCheck'
  | 'advancedFieldAndDbCheck'
  | 'databaseCheck'
  | 'customImplementation';
/**
 * Check type
 */
export type CheckType =
  | 'empty'
  | 'notEmpty'
  | 'emptyOrZero'
  | 'numericInteger'
  | 'numericEmpty'
  | 'numericNegative'
  | 'numericComma'
  | 'numericDot'
  | 'onlyCharsCapital'
  | 'onlyCharsLower'
  | 'onlyChars'
  | 'alphanumericSpecialUmlaut';
/**
 * Operator for field check
 */
export type Operator =
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
 * Field type
 */
export type FieldType = 'definedField' | 'pattern' | 'systemField';
/**
 * Field
 */
export type Field1 = string;
/**
 * Value or pattern for Field Check
 */
export type Value1 = string;
/**
 * Table
 */
export type Table = string;
/**
 * Where Condition for Select Statement
 */
export type WhereConditionForSelectStatement = string;
/**
 * Check type
 */
export type CheckType1 = 'checkExistence' | 'checkNonExistence' | 'compare';
/**
 * Field Name for Comparison
 */
export type FieldNameForComparison = string;
/**
 * Operator for database check
 */
export type Operator1 =
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
 * Field type
 */
export type FieldType1 = 'definedField' | 'pattern' | 'systemField';
/**
 * Field
 */
export type Field2 = string;
/**
 * Value or pattern for database check
 */
export type Value2 = string;
/**
 * Class name for check
 */
export type Class = string;
/**
 * Message class
 */
export type MessageClass1 = string;
/**
 * Message number
 */
export type MessageNumber1 = string;
/**
 * Number
 */
export type Number1 = number;
/**
 * Type
 */
export type Type1 = 'constant' | 'systemField' | 'definedField';
/**
 * Field
 */
export type Field3 = string;
/**
 * Value
 */
export type Value3 = string;
/**
 * Message variable assignments
 */
export type MessageVariableAssignments1 = VariableList1[];
/**
 * Single check assignments
 */
export type SingleCheckAssignments = SingleCheck[];

/**
 * Check
 */
export interface AifpAff {
  formatVersion: ABAPFileFormatVersion;
  header: Header;
  generalInformation: GeneralInformation;
  errorMessage?: ErrorMessage;
  singleCheckAssignments: SingleCheckAssignments;
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
  namespace: Namespace;
  aifCheck: AIFCheck;
}
/**
 * Error message
 */
export interface ErrorMessage {
  messageClass?: MessageClass;
  messageNumber?: MessageNumber;
  variableAssignments?: MessageVariableAssignments;
}
/**
 * Variable list
 */
export interface VariableList {
  number?: Number;
  type?: Type;
  field?: Field;
  value?: Value;
}
/**
 * Single check
 */
export interface SingleCheck {
  description: Description1;
  id: ID;
  scenario?: Scenario;
  fieldCheck?: FieldCheck;
  databaseCheck?: DatabaseCheck;
  customImplementation?: CustomImplementation;
  successMessage?: SuccessMessage;
}
/**
 * Field check
 */
export interface FieldCheck {
  checkType?: CheckType;
  operator?: Operator;
  fieldType?: FieldType;
  field?: Field1;
  value?: Value1;
}
/**
 * Database check
 */
export interface DatabaseCheck {
  table?: Table;
  whereCondition?: WhereConditionForSelectStatement;
  checkType?: CheckType1;
  fieldName?: FieldNameForComparison;
  operator?: Operator1;
  fieldType?: FieldType1;
  field?: Field2;
  value?: Value2;
}
/**
 * Custom implementation
 */
export interface CustomImplementation {
  class?: Class;
}
/**
 * Success message
 */
export interface SuccessMessage {
  messageClass?: MessageClass1;
  messageNumber?: MessageNumber1;
  variableAssignments?: MessageVariableAssignments1;
}
/**
 * Variable list
 */
export interface VariableList1 {
  number?: Number1;
  type?: Type1;
  field?: Field3;
  value?: Value3;
}

