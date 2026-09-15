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
 * Change document category
 */
export type Category = 'standard' | 'behaviorDefiniton';
/**
 * Generated object
 */
export type GeneratedObject = string;
/**
 * Name of table or structure
 */
export type Name = string;
/**
 * Reference table for currencies and units
 */
export type ReferenceTable = string;
/**
 * Specifies whether multiple changes can be logged
 */
export type LogMultipleChanges = boolean;
/**
 * Log field values for insertions.
 */
export type LogFieldValues = boolean;
/**
 * Log initial values for insertions Logging of initial values depends on setting 'Log Field Values for Database Insertions'
 */
export type LogInitialValues = boolean;
/**
 * Log field values for deletions.
 */
export type LogFieldValues1 = boolean;
/**
 * Log initial values for deletions Logging of initial values depends on setting 'Log Field Values for Database Deletions'
 */
export type LogInitialValues1 = boolean;
/**
 * Tables and structures
 */
export type TablesAndStructures = TableOrStructureDetails[];
/**
 * Error message identifier
 */
export type MessageID = string;
/**
 * Error message number
 */
export type MessageNumber = string;

/**
 * Change Documents (CHDO) v1
 */
export interface ChdoAff {
  formatVersion: ABAPFileFormatVersion;
  header: Header;
  generalInformation?: GeneralInformation;
  tablesAndStructures: TablesAndStructures;
  errorMessage: ErrorMessage;
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
  category?: Category;
  generatedObject?: GeneratedObject;
}
/**
 * Table or structure
 */
export interface TableOrStructureDetails {
  name: Name;
  referenceTable?: ReferenceTable;
  multipleChanges?: LogMultipleChanges;
  databaseInsertions?: DatabaseInsertions;
  databaseDeletions?: DatabaseDeletions;
}
/**
 * Log field values for insertions.
 */
export interface DatabaseInsertions {
  logValues?: LogFieldValues;
  logInitialValues?: LogInitialValues;
}
/**
 * Log field values for deletions.
 */
export interface DatabaseDeletions {
  logValues?: LogFieldValues1;
  logInitialValues?: LogInitialValues1;
}
/**
 * Error message
 */
export interface ErrorMessage {
  id: MessageID;
  number: MessageNumber;
}

