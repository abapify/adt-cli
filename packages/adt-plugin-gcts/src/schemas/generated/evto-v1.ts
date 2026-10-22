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
export type ABAPLanguageVersion = ("standard" | "cloudDevelopment")
/**
 * SAP Object Type
 */
export type SAPObjectType = string
/**
 * Major version
 */
export type MajorVersion = number
/**
 * Minor version
 */
export type MinorVersion = number
/**
 * Patch version
 */
export type PatchVersion = number

/**
 * Event Object
 */
export interface AffEvtoV1 {
formatVersion: ABAPFileFormatVersion
header: Header
generalInformation: GeneralInformation
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
sapObjectType: SAPObjectType
majorVersion: MajorVersion
minorVersion: MinorVersion
patchVersion: PatchVersion
}

export type EvtoAff = AffEvtoV1;
