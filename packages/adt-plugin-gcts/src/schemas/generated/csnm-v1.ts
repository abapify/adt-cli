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
 * File
 */
export type File = string
/**
 * CSN files
 */
export type CSNFiles = CSNFile[]

/**
 * CSN model transport object
 */
export interface AffCsnmV1 {
formatVersion: FormatVersion
header: Header
csnFiles?: CSNFiles
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
 * CSN file
 */
export interface CSNFile {
file?: File
}

export type CsnmAff = AffCsnmV1;
