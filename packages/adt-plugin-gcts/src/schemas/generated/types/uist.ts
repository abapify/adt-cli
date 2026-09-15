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
 * Title on SAP Fiori launchpad
 */
export type TitleOnLaunchpad = string;
/**
 * Sort priority
 */
export type SortPriority = number;
/**
 * Merge ID
 */
export type MergeID = string;
/**
 * Name of the page template
 */
export type Name = string;
/**
 * Assigned launchpad page templates
 */
export type LaunchpadPageTemplates = LaunchpadPageTemplate[];

/**
 * Launchpad space template
 */
export interface UistAff {
  formatVersion: FormatVersion;
  header: Header;
  generalInformation: GeneralInformation;
  pages?: LaunchpadPageTemplates;
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
  title: TitleOnLaunchpad;
  sortPriority?: SortPriority;
  mergeId?: MergeID;
}
/**
 * Launchpad page template
 */
export interface LaunchpadPageTemplate {
  name: Name;
}

