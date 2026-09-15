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
 * SAP internal
 */
export type SAPInternal = boolean;
/**
 * Tool type of the BAdI Enhancement Spot
 */
export type BAdIEnhancementSpotToolType = 'badiDefinition';
/**
 * Name of the BAdI definition
 */
export type NameOfTheBAdIDefinition = string;
/**
 * Description of the BAdI definition
 */
export type DescriptionOfTheBAdIDefinition = string;
/**
 * Interface of the BAdI definition
 */
export type InterfaceOfTheBAdIDefinition = string;
/**
 * Instantiation of the BAdI definition
 */
export type InstantiationOfTheBAdIDefinition = 'creatingNewInstances' | 'reuseInstances' | 'contextSpecificInstances';
/**
 * Indicator whether the BAdI definition is single- or multiple usable
 */
export type SingleOrMultipleUseBAdI = boolean;
/**
 * SAP internal
 */
export type SAPInternal1 = boolean;
/**
 * Example class
 */
export type ExampleClass = string;
/**
 * Example classes of the BAdI definition
 */
export type ExampleClassesOfTheBAdIDefinition = ExampleClass[];
/**
 * Name of the default/fallback class. The fallback class is executed if no BAdI implementation exists.
 */
export type NameOfTheDefaultFallbackClass = string;
/**
 * Limited filter use
 */
export type LimitedFilterUse = boolean;
/**
 * Documentation Id
 */
export type DocumentationId = string;
/**
 * BADI is an AMDP BAdI
 */
export type AmdpBAdI = boolean;
/**
 * Name of the filter
 */
export type NameOfTheFilter = string;
/**
 * Description of the filter
 */
export type DescriptionOfTheFilter = string;
/**
 * Type of the filter
 */
export type TypeOfTheFilter = 'integer' | 'characterLike' | 'string' | 'numeric' | 'packed';
/**
 * The filter has only constant filter values
 */
export type OnlyConstantFilterValues = boolean;
/**
 * Type of the value check object
 */
export type TypeOfTheValueCheckObject = 'domain' | 'dataElement';
/**
 * Name of the value check object
 */
export type NameOfTheValueCheckObject = string;
/**
 * Name of the value check class
 */
export type NameOfTheValueCheckClass = string;
/**
 * Length of the value check
 */
export type LengthOfTheValueCheck = number;
/**
 * Decimal places of the value check
 */
export type DecimalPlacesOfTheValueCheck = number;
/**
 * Filters of the BAdI definition
 */
export type FiltersOfTheBAdIDefinition = Filter[];
/**
 * BAdI definitions of the BAdI Enhancement Spot
 */
export type BAdIDefinitionsOfTheBAdIEnhancementSpot = BAdIDefinition[];

/**
 * Object type ENHS
 */
export interface EnhsAff {
  formatVersion: ABAPFileFormatVersion;
  header: Header;
  configuration: Configuration;
  badiDefinitions?: BAdIDefinitionsOfTheBAdIEnhancementSpot;
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
 * Configuration-specific fields
 */
export interface Configuration {
  sapInternal?: SAPInternal;
  tool: BAdIEnhancementSpotToolType;
}
/**
 * Information about this BAdI definition
 */
export interface BAdIDefinition {
  name: NameOfTheBAdIDefinition;
  description: DescriptionOfTheBAdIDefinition;
  interface: InterfaceOfTheBAdIDefinition;
  instantiation: InstantiationOfTheBAdIDefinition;
  multipleUse?: SingleOrMultipleUseBAdI;
  sapInternal?: SAPInternal1;
  exampleClasses?: ExampleClassesOfTheBAdIDefinition;
  fallbackClass?: NameOfTheDefaultFallbackClass;
  filterLimitation?: LimitedFilterUse;
  documentationId?: DocumentationId;
  amdp?: AmdpBAdI;
  filters?: FiltersOfTheBAdIDefinition;
}
/**
 * Information about this filter
 */
export interface Filter {
  name: NameOfTheFilter;
  description: DescriptionOfTheFilter;
  type: TypeOfTheFilter;
  onlyConstantValues?: OnlyConstantFilterValues;
  valueCheckDdic?: ValueCheckDdic;
  valueCheckClass?: ValueCheckClass;
}
/**
 * Value check via domain or data element
 */
export interface ValueCheckDdic {
  type: TypeOfTheValueCheckObject;
  objectName: NameOfTheValueCheckObject;
}
/**
 * Value check via class
 */
export interface ValueCheckClass {
  objectName: NameOfTheValueCheckClass;
  length?: LengthOfTheValueCheck;
  decimalPlaces?: DecimalPlacesOfTheValueCheck;
}

