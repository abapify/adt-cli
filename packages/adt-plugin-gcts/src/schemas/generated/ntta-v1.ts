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
 * SAP Object Node Type
 */
export type SAPObjectNodeType = string
/**
 * Name
 */
export type Name = string
/**
 * Note types assigned to the SAP Object Node Type
 */
export type NoteTypes = NoteType[]

/**
 * ABAP file format for note type assignment objects
 */
export interface AffNttaV1 {
formatVersion: FormatVersion
header: Header
generalInformation?: GeneralInformation
noteTypes?: NoteTypes
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
objectNodeType: SAPObjectNodeType
}
/**
 * Note type
 */
export interface NoteType {
name: Name
}

export type NttaAff = AffNttaV1;
