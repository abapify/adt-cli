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
 * Application interface
 */
export type ApplicationInterface1 = string
/**
 * Application interfaces
 */
export type ApplicationInterfaces = ApplicationInterface[]

/**
 * Deployment scenario
 */
export interface AffAifdV1 {
formatVersion: ABAPFileFormatVersion
header: Header
applicationInterfaces: ApplicationInterfaces
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
 * Application interface
 */
export interface ApplicationInterface {
applicationInterface: ApplicationInterface1
}

export type AifdAff = AffAifdV1;
