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
 * The name of the SAP Object Node Type.
 */
export type Name = string
/**
 * The name of the referenced SAP Object Type.
 */
export type SAPObjectType = string
/**
 * Indicates that the SAP Object Node Type corresponds to the referenced SAP Object Type.
 */
export type RootNode = boolean

/**
 * SAP object node type
 */
export interface AffNontV1 {
formatVersion: ABAPFileFormatVersion
header: Header
name: Name
sapObjectType?: SAPObjectType
rootNode?: RootNode
}
/**
 * Header
 */
export interface Header {
description: Description
originalLanguage: OriginalLanguage
abapLanguageVersion?: ABAPLanguageVersion
}

export type NontAff = AffNontV1;
