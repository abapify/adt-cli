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
 * Name of executable class or program which writes the data to the archive
 */
export type WriteClass = string;
/**
 * Name of executable class or program which deletes the data from the tables
 */
export type DeleteClass = string;
/**
 * Name of executable class or program which reloads the data to the tables (may be empty)
 */
export type ReloadClass = string;
/**
 * Name of class which stores and retrieves archived data. The class needs to implement the interface IF_ARCH_STORAGE_MANAGER.
 */
export type StorageClass = string;
/**
 * Name of table or structure
 */
export type Name = string;
/**
 * Tables of business object instance from which data is archived.
 */
export type TablesToBeArchived = TableToBeArchived[];
/**
 * Name of archiving class
 */
export type Name1 = string;
/**
 * Archiving classes are no ABAP classes, but IDs of reuse objects, whose data should be archived Together with the business object instance (for example change documents).
 */
export type ArchivingClasses = NameOfArchivingClass[];

/**
 * Archiving Object (AOBJ) v1
 */
export interface AobjAff {
  formatVersion: ABAPFileFormatVersion;
  header: Header;
  attributes: Attributes;
  tablesToBeArchived: TablesToBeArchived;
  archivingClasses: ArchivingClasses;
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
 * Attributes of an archiving object
 */
export interface Attributes {
  writeClass: WriteClass;
  deleteClass: DeleteClass;
  reloadClass?: ReloadClass;
  storageClass: StorageClass;
}
/**
 * Tables of business object instance from which data is archived
 */
export interface TableToBeArchived {
  name: Name;
}
/**
 * Archiving classes are no ABAP classes, but IDs of reuse objects, whose data should be archived Together with the business object instance (for example change documents).
 */
export interface NameOfArchivingClass {
  name: Name1;
}

