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
 * Language dependent
 */
export type LanguageDependent = boolean;
/**
 * Multiple notes possible
 */
export type MultipleNotes = boolean;
/**
 * Title hidden
 */
export type TitleHidden = boolean;
/**
 * Maximum length
 */
export type MaximumLength = number;
/**
 * Formatting profile
 */
export type FormattingProfile = 'text' | 'simpleFormatting';

/**
 * ABAP file format for note type objects
 */
export interface NttyAff {
  formatVersion: FormatVersion;
  header: Header;
  generalInformation?: GeneralInformation;
  contentSettings?: ContentSettings;
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
  languageDependent?: LanguageDependent;
  multipleNotes?: MultipleNotes;
  hideTitle?: TitleHidden;
}
/**
 * Content settings
 */
export interface ContentSettings {
  maximumLength?: MaximumLength;
  formattingProfile?: FormattingProfile;
}

