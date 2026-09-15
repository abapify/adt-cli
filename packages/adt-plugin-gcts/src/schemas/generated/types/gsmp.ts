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
 * Type
 */
export type Type = 'CLAS';
/**
 * Name
 */
export type Name = string;
/**
 * Mode
 */
export type Mode = 'system' | 'instance' | 'application' | 'job' | 'none';
/**
 * Priority
 */
export type Priority = 'availability' | 'high' | 'normal' | 'low';
/**
 * Instantiation
 */
export type Instantiation = 'reuse' | 'createNew';
/**
 * Scope dependent
 */
export type ScopeDependent = boolean;
/**
 * JSON data
 */
export type JSONData = string;

/**
 * Metric Provider (GSMP)
 */
export interface GsmpAff {
  formatVersion: ABAPFileFormatVersion;
  header: Header;
  implementation: Implementation;
  execution: Execution;
  model?: Model;
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
 * Implementation
 */
export interface Implementation {
  type: Type;
  name: Name;
}
/**
 * Execution
 */
export interface Execution {
  mode: Mode;
  priority: Priority;
  instantiation?: Instantiation;
  scopeDependent: ScopeDependent;
}
/**
 * Model
 */
export interface Model {
  data?: JSONData;
}

