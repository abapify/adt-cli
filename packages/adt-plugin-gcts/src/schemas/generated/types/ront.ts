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
 * The category of the SAP Object Type
 */
export type TypeCategory =
  | 'businessObject'
  | 'technicalObject'
  | 'analyticalObject'
  | 'configurationObject'
  | 'dependentObject'
  | 'hierarchyObject';
/**
 * The name of the SAP Object Type.
 */
export type Name = string;
/**
 * The object type code uniquely identifies the SAP Object Type.
 */
export type ObjectTypeCode = string;
/**
 * The interface behavior definition related to the SAP Object Type.
 */
export type InterfaceBehaviorDefinition = string;
/**
 * The One Domain Model entity related to the SAP Object Type.
 */
export type ODMEntityName = string;

/**
 * SAP object type
 */
export interface RontAff {
  formatVersion: ABAPFileFormatVersion;
  header: Header;
  typeCategory: TypeCategory;
  name: Name;
  objectTypeCode?: ObjectTypeCode;
  interfaceBehaviorDefinition?: InterfaceBehaviorDefinition;
  odmEntityName?: ODMEntityName;
}
/**
 * Header
 */
export interface Header {
  description: Description;
  originalLanguage: OriginalLanguage;
  abapLanguageVersion?: ABAPLanguageVersion;
}

