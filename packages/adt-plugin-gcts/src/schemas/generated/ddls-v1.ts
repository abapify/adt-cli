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
 * Source origin
 */
export type SourceOrigin = ("abapDevelopmentTools" | "customCdsViews" | "customAnalyticalQueries" | "customBusinessObject" | "customCodeList" | "customCdsViewsVariantConfg" | "customFields" | "extensionsForDataSources" | "customSearchModeler" | "serviceConsumptionModel")
/**
 * Source type
 */
export type SourceType = ("ddicBasedView" | "viewEntity" | "viewExtend" | "viewEntityExtend" | "tableFunction" | "tableEntity" | "abstractEntity" | "customEntity" | "hierarchy" | "projectionView" | "externalEntity" | "unknown")
/**
 * DDLS name of the parent of an extend
 */
export type ParentName = string

/**
 * DDLS object type
 */
export interface AffDdlsV1 {
formatVersion: ABAPFileFormatVersion
header: Header
sourceOrigin: SourceOrigin
sourceType: SourceType
parentName?: ParentName
}
/**
 * Header
 */
export interface Header {
description: Description
originalLanguage: OriginalLanguage
abapLanguageVersion?: ABAPLanguageVersion
}

export type DdlsAff = AffDdlsV1;
