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
export type ABAPLanguageVersion = ("standard" | "keyUser" | "cloudDevelopment")
/**
 * Name of key table or structure for application object
 */
export type KeyTableOrStructure = string
/**
 * Name of the SAP object
 */
export type SAPObject = string
/**
 * Name of the data category
 */
export type DataCategory = string
/**
 * Name of the ILM object
 */
export type ILMObject = string

/**
 * Type of application object
 */
export interface AffApobV1 {
formatVersion: FormatVersion
header: Header
attributes: Attributes
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
 * Attributes of the application object
 */
export interface Attributes {
aoKeyStructure?: KeyTableOrStructure
sapObject?: SAPObject
dataCategory?: DataCategory
ilmObject?: ILMObject
}

export type ApobAff = AffApobV1;
