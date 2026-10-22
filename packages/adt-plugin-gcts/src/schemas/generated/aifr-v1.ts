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
 * Namespace of the recipient
 */
export type Namespace = string
/**
 * SAP Application Interface recipient
 */
export type AIFRecipient = string

/**
 * Recipient
 */
export interface AffAifrV1 {
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
namespace: Namespace
aifRecipient: AIFRecipient
}

export type AifrAff = AffAifrV1;
