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
 * Attributes of the annotation definition
 */
export interface AffDdlaV1 {
formatVersion: ABAPFileFormatVersion
header: Header
}
/**
 * Header
 */
export interface Header {
description: Description
originalLanguage: OriginalLanguage
}

export type DdlaAff = AffDdlaV1;
