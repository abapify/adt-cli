/**
 * Auto-generated from SAP/abap-file-formats JSON schemas.
 * Do not edit — regenerate with `bun scripts/generate-aff-schemas.ts`.
 */
/**
 * The ABAP file format version
 */
export type ABAPFileFormatVersion = "1"
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
export type ABAPLanguageVersion = ("standard" | "keyUser" | "cloudDevelopment")

/**
 * Dictionary tuning static cache
 */
export interface AffDtscV1 {
formatVersion: ABAPFileFormatVersion
header: Header
}
/**
 * Header
 */
export interface Header {
description: Description
originalLanguage: OriginalLanguage
abapLanguageVersion?: ABAPLanguageVersion
}

export type DtscAff = AffDtscV1;
