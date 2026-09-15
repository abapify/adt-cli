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
 * Title
 */
export type Title = string;
/**
 * What is the action doing and how can it be used
 */
export type Summary = string;
/**
 * Implementing class for handling the action input. Needs to implement interface {@link if_aia_action }.
 */
export type ImplementingClass = string;
/**
 * Input UI configuration class for implementing the server-driven UI input configuration. Needs to implement interface {@link IF_AIA_SD_ACTION_INPUT }.
 */
export type InputUIConfigurationClass = string;
/**
 * Number of focused resources
 */
export type NumberOfFocusedResources = 'exactlyOne' | 'atLeastOne' | 'moreThanOne' | 'any';
/**
 * Object type
 */
export type ObjectType1 = string;
/**
 * Object subtype
 */
export type ObjectSubtype = string;
/**
 * Filtering of action according to specified object types
 */
export type FilterObjectTypes = ObjectType[];

/**
 * IDE action (SAIA) v1
 */
export interface SaiaAff {
  formatVersion: FormatVersion;
  header: Header;
  generalInformation: GeneralInformation;
  filters?: FilterCardinality;
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
  title: Title;
  summary: Summary;
  implementingClass?: ImplementingClass;
  inputUiConfigurationClass?: InputUIConfigurationClass;
}
/**
 * Filtering of application of action according to cardinality and object types
 */
export interface FilterCardinality {
  numberOfFocusedResources?: NumberOfFocusedResources;
  supportedDevObjectTypes?: FilterObjectTypes;
}
/**
 * Object type
 */
export interface ObjectType {
  workbenchObjectType?: ObjectType1;
  workbenchObjectSubtype?: ObjectSubtype;
}

