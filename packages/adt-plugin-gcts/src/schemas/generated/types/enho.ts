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
export type ABAPLanguageVersion = 'standard' | 'keyUser' | 'cloudDevelopment';
/**
 * Enhancement Spot name
 */
export type EnhancementSpotName = string;
/**
 * Name of the BAdI implementation
 */
export type Name = string;
/**
 * Description of the BAdI implementation
 */
export type Description1 = string;
/**
 * BAdI Definition of the BAdI implementation
 */
export type BAdIDefinition = string;
/**
 * Implementing class of the BAdI implementation
 */
export type ImplementingClass = string;
/**
 * BAdI implementation is an example implementation
 */
export type IsExampleImplementation = boolean;
/**
 * BAdI implementation is the default implementation of the BAdI definition
 */
export type IsDefaultImplementation = boolean;
/**
 * BAdI implementation is active
 */
export type BAdIImplementationIsActive = boolean;
/**
 * Does the BAdI implementation support customizing
 */
export type BAdIImplementationCustomizing = 'notSupported' | 'supported' | 'supportedNoTransport';
/**
 * Filter value
 */
export type FilterValue = string;
/**
 * An and/or-operator combining filters
 */
export type Operator = string;
/**
 * Filter value
 */
export type FilterValue1 = string;
/**
 * An and/or-operator combining filters
 */
export type Operator1 = string;
/**
 * Filter value
 */
export type FilterValue2 = string;
/**
 * Filter values
 */
export type FilterValues2 = FilterValue2[];
/**
 * Filter values
 */
export type FilterValues1 = (FilterValue1 | FilterCombination1)[];
/**
 * Filter values for this BAdI implementation
 */
export type FilterValues = (FilterValue | FilterCombination)[];
/**
 * BAdI implementations of the ENHO
 */
export type BAdIImplementationsOfTheENHO = BAdIImplementation[];
/**
 * Type of the referenced object
 */
export type TypeOfTheReferencedObject = string;
/**
 * Name of the referenced object
 */
export type NameOfTheReferencedObject = string;
/**
 * Program ID (R3TR or LIMU) of the referenced object
 */
export type ProgramIDOfTheReferencedObject = string;
/**
 * Element usage of the referenced object
 */
export type ElementUsage = 'usedObject' | 'enhancedObject' | 'migratedFrom';
/**
 * Main object type of the referenced object
 */
export type MainObjectType = string;
/**
 * Main object name of the referenced object
 */
export type MainObjectName = string;
/**
 * Referenced objects of the enhancement implementation
 */
export type ReferencedObjects = AReferencedObject[];

/**
 * Object type ENHO
 */
export interface EnhoAff {
  formatVersion: ABAPFileFormatVersion;
  header: Header;
  enhancementSpot: EnhancementSpotName;
  badiImplementations?: BAdIImplementationsOfTheENHO;
  referencedObjects: ReferencedObjects;
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
 * Information about this BAdI implementation
 */
export interface BAdIImplementation {
  name: Name;
  description: Description1;
  badiDefinition: BAdIDefinition;
  implementingClass?: ImplementingClass;
  isExampleImplementation?: IsExampleImplementation;
  isDefaultImplementation?: IsDefaultImplementation;
  isActiveImplementation?: BAdIImplementationIsActive;
  customizing?: BAdIImplementationCustomizing;
  filterValues?: FilterValues;
}
/**
 * Filter combination
 */
export interface FilterCombination {
  operator?: Operator;
  filterValues?: FilterValues1;
}
/**
 * Filter combination
 */
export interface FilterCombination1 {
  operator?: Operator1;
  filterValues?: FilterValues2;
}
/**
 * A referenced object
 */
export interface AReferencedObject {
  objectType: TypeOfTheReferencedObject;
  objectName: NameOfTheReferencedObject;
  programId: ProgramIDOfTheReferencedObject;
  elementUsage: ElementUsage;
  mainObjectType: MainObjectType;
  mainObjectName: MainObjectName;
}

