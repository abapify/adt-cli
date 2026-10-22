/**
 * Auto-generated from SAP/abap-file-formats JSON schemas.
 * Do not edit — regenerate with `bun scripts/generate-aff-schemas.ts`.
 */
/**
 * Format version
 */
export type FormatVersion = "1"
/**
 * Description of the ABAP object
 */
export type Description = string
/**
 * Original language of the ABAP object
 */
export type OriginalLanguage = string
/**
 * ABAP language version
 */
export type ABAPLanguageVersion = ("standard" | "cloudDevelopment")
/**
 * Language dependent
 */
export type LanguageDependent = boolean
/**
 * Multiple notes possible
 */
export type MultipleNotes = boolean
/**
 * Title hidden
 */
export type TitleHidden = boolean
/**
 * Maximum length
 */
export type MaximumLength = number
/**
 * Formatting profile
 */
export type FormattingProfile = ("text" | "simpleFormatting")

/**
 * ABAP file format for note type objects
 */
export interface AffNttyV1 {
formatVersion: FormatVersion
header: Header
generalInformation?: GeneralInformation
contentSettings?: ContentSettings
}
/**
 * Header
 */
export interface Header {
description: Description
originalLanguage: OriginalLanguage
abapLanguageVersion?: ABAPLanguageVersion
}
/**
 * General information
 */
export interface GeneralInformation {
languageDependent?: LanguageDependent
multipleNotes?: MultipleNotes
hideTitle?: TitleHidden
}
/**
 * Content settings
 */
export interface ContentSettings {
maximumLength?: MaximumLength
formattingProfile?: FormattingProfile
}

export type NttyAff = AffNttyV1;
