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
 * Sensitivity level for data category
 */
export type SensitivityLevel = ("personalData" | "sensitivePersonalData")

/**
 * Data Category
 */
export interface AffDcatV1 {
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
 * Attributes of the data category
 */
export interface Attributes {
sensitivityLevel?: SensitivityLevel
}

export type DcatAff = AffDcatV1;
