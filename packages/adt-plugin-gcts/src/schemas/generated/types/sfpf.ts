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
export type ABAPLanguageVersion = 'standard' | 'cloudDevelopment';
/**
 * RAP Service Definition that implements the business context for this form template
 */
export type DataProvider = string;
/**
 * Automatically embed font files into the output. Useful if your output uses fonts that are not delivered by default, for asian fonts or to include your own branding.
 */
export type FontEmbed = boolean;
/**
 * When activated if your form template is designed in an LTR language and your target output is an RTL language, layout will be automatically mirrored in the output.
 */
export type LayoutMirroring = boolean;
/**
 * Reduce data input volume based on the form design
 */
export type ReduceDataVolume = boolean;

/**
 * Object type SFPF
 */
export interface SfpfAff {
  formatVersion: FormatVersion;
  header: Header;
  generalInformation: GeneralInformation;
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
 * General Information
 */
export interface GeneralInformation {
  dataProvider?: DataProvider;
  fontEmbed?: FontEmbed;
  layoutMirroring?: LayoutMirroring;
  reduceDataVolume?: ReduceDataVolume;
}

