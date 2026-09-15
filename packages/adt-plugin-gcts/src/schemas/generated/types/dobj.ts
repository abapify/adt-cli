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
 * Destruction class
 */
export type DestructionClass = string;
/**
 * Parent table
 */
export type ParentTable = string;
/**
 * Dependent table
 */
export type DependentTable = string;
/**
 * Structure definition
 */
export type StructureDefinition = StructureDefinitionDetails[];

/**
 * ILM destruction object (DOBJ) v1
 */
export interface DobjAff {
  formatVersion: ABAPFileFormatVersion;
  header: Header;
  attributes: Attributes;
  structureDefinition: StructureDefinition;
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
 * Attributes
 */
export interface Attributes {
  destructionClass: DestructionClass;
}
/**
 * Structure definition details
 */
export interface StructureDefinitionDetails {
  parentTable?: ParentTable;
  dependentTable?: DependentTable;
}

