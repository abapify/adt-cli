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
 * Name
 */
export type Name = string

/**
 * Bdef object type
 */
export interface AffBdefV1 {
formatVersion: ABAPFileFormatVersion
header: Header
extendedBehaviorDefintion?: ExtendedBehaviorDefinition
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
 * Extended Behavior Definition
 */
export interface ExtendedBehaviorDefinition {
name?: Name
}

export type BdefAff = AffBdefV1;
