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
 * Default remote database schema name when configuring the connection details of logical external schema.
 */
export type DefaultRemoteSchema = string
/**
 * If true, the logical external schema can only be used in routed scenarios.
 */
export type UsesRouting = boolean

/**
 * CDS logical external schema
 */
export interface AffDesdV1 {
formatVersion: FormatVersion
header: Header
generalInformation?: GeneralInformation
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
defaultRemoteSchemaName?: DefaultRemoteSchema
usesRouting?: UsesRouting
}

export type DesdAff = AffDesdV1;
