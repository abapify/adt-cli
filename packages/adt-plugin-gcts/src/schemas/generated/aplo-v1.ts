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
 * Name of the subobject
 */
export type Name = string
/**
 * Description text of the subobject
 */
export type Description1 = string
/**
 * Table of all subobjects (may be empty)
 */
export type Subobjects = Subobject[]

/**
 * Attributes of the application log object
 */
export interface AffAploV1 {
formatVersion: ABAPFileFormatVersion
header: Header
subobjects: Subobjects
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
 * Attributes of the subobject
 */
export interface Subobject {
name: Name
description?: Description1
}

export type AploAff = AffAploV1;
