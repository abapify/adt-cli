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
 * Edit-locked
 */
export type EditLocked = boolean;
/**
 * Include type
 */
export type IncludeType = 'include' | 'functionGroup';

/**
 * REPS object type
 */
export interface RepsAff {
  formatVersion: ABAPFileFormatVersion;
  header: Header;
  editLocked?: EditLocked;
  includeType: IncludeType;
}
/**
 * Header
 */
export interface Header {
  description: Description;
}

