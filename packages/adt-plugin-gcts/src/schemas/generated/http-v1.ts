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
 * Handler class
 */
export type HandlerClass = string

/**
 * HTTP Service
 */
export interface AffHttpV1 {
formatVersion: FormatVersion
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
handlerClass?: HandlerClass
}

export type HttpAff = AffHttpV1;
