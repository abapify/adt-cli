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
 * Source Origin states which tool was used to create the service definition
 */
export type SourceOrigin = ("abapDevelopmentTools" | "customCdsViews" | "customAnalyticalQueries" | "customBusinessObject" | "customCodeList" | "customCdsViewsVariantConfg" | "customFields" | "extensionsForDataSources" | "customSearchModeler" | "serviceConsumptionModel")
/**
 * Source type states which statement is in the service definition.
 */
export type SourceType = ("definition" | "extension")

/**
 * Properties of a Service Definition
 */
export interface AffSrvdV1 {
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
sourceOrigin: SourceOrigin
sourceType: SourceType
}

export type SrvdAff = AffSrvdV1;
