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
 * Table name
 */
export type TableName = string;
/**
 * Lock mode
 */
export type LockMode =
  | 'exclusive'
  | 'shared'
  | 'exclusiveNotCumulative'
  | 'setOptimistic'
  | 'promoteOptimistic'
  | 'conflictCheckExtendedExcl'
  | 'conflictCheckExclusive'
  | 'conflictCheckShared'
  | 'promotionCheckOptimized'
  | 'reserved1'
  | 'reserved2'
  | 'initial';
/**
 * Table name
 */
export type TableName1 = string;
/**
 * Lock mode
 */
export type LockMode1 =
  | 'exclusive'
  | 'shared'
  | 'exclusiveNotCumulative'
  | 'setOptimistic'
  | 'promoteOptimistic'
  | 'conflictCheckExtendedExcl'
  | 'conflictCheckExclusive'
  | 'conflictCheckShared'
  | 'promotionCheckOptimized'
  | 'reserved1'
  | 'reserved2'
  | 'initial';
/**
 * Secondary tables must have a foreign key relation to the primary table
 */
export type SecondaryTables = PrimaryTable1[];
/**
 * Parameter name
 */
export type ParameterName = string;
/**
 * Table
 */
export type Table = string;
/**
 * Field
 */
export type Field = string;
/**
 * Parameter is part of function module interface
 */
export type Active = boolean;
/**
 * Lock parameter candidates are derived from the primary keys of the tables
 */
export type LockParameters = LockParameter[];
/**
 * Allow RFC for lock modules
 */
export type AllowRFC = boolean;

/**
 * Lock object (ENQU)
 */
export interface EnquAff {
  formatVersion: FormatVersion;
  header: Header;
  primaryTable: PrimaryTable;
  secondaryTables?: SecondaryTables;
  lockParameters: LockParameters;
  lockModules: LockModules;
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
 * Primary table of the lock object
 */
export interface PrimaryTable {
  name: TableName;
  lockMode: LockMode;
}
/**
 * Primary Table of the lock object
 */
export interface PrimaryTable1 {
  name: TableName1;
  lockMode: LockMode1;
}
/**
 * Lock parameter
 */
export interface LockParameter {
  name: ParameterName;
  table: Table;
  field: Field;
  active?: Active;
}
/**
 * Lock modules are generated during activation
 */
export interface LockModules {
  allowRfc?: AllowRFC;
}

