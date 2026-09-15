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
 * Program type
 */
export type ProgramType = 'executableProgram' | 'modulePool' | 'subroutinePool' | 'include';
/**
 * Program status
 */
export type ProgramStatus =
  'sapProductionProgram' | 'customerProductionProgram' | 'systemProgram' | 'testProgram' | 'unknown';
/**
 * Fix point arithmetic
 */
export type FixPointArithmetic = boolean;
/**
 * The editor lock flag prevents other users from making changes to the program. Only the last person to change the program can remove the flag.
 */
export type EditLocked = boolean;
/**
 * A user can only start this report using a variant.
 */
export type StartsUsingVariant = boolean;
/**
 * Programs that are assigned to an authorization group are protected against display and execution. Security-related programs should, therefore, always be assigned to an authorization group.
 */
export type AuthorizationGroup = string;
/**
 * Application (taplp)
 */
export type Application = string;
/**
 * Name of a logical database.
 */
export type LogicalDatabaseName = string;
/**
 * The Dynpro selection screen.
 */
export type SelectionScreen = string;

/**
 * Program
 */
export interface ProgAff {
  formatVersion: FormatVersion;
  header: Header;
  generalInformation?: GeneralInformation;
  logicalDatabase?: LogicalDatabase;
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
  programType?: ProgramType;
  programStatus?: ProgramStatus;
  fixPointArithmetic?: FixPointArithmetic;
  editLocked?: EditLocked;
  startsUsingVariant?: StartsUsingVariant;
  authorizationGroup?: AuthorizationGroup;
  application?: Application;
}
/**
 * Logical database
 */
export interface LogicalDatabase {
  name?: LogicalDatabaseName;
  selectionScreen?: SelectionScreen;
}

