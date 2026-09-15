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
 * Class name
 */
export type Class = string;
/**
 * type
 */
export type Type = 'CLAS' | 'FUGR' | 'PROG';
/**
 * name
 */
export type Name = string;
/**
 * Daemon type
 */
export type DaemonType = 'application' | 'system';
/**
 * Start type
 */
export type StartType = 'automaticallyStarted' | 'explicitlyStartedSameuser' | 'explicitlyStartedDiffuser';

/**
 * ABAP daemon
 */
export interface DmonAff {
  formatVersion: ABAPFileFormatVersion;
  header: Header;
  className: Class;
  callerObject: CallerObject;
  daemonType?: DaemonType;
  startType?: StartType;
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
 * Caller object
 */
export interface CallerObject {
  type: Type;
  name: Name;
}

