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
 * Type
 */
export type Type = ("OData" | "webService" | "RFC")
/**
 * Object type
 */
export type ObjectType = string
/**
 * Object name
 */
export type ObjectName = string
/**
 * Id
 */
export type Id = string
/**
 * Value
 */
export type Value = string
/**
 * Properties
 */
export type Properties = ConsumerPropertyDetails[]

/**
 * Service Consumption Model properties
 */
export interface AffSrvcV1 {
formatVersion: ABAPFileFormatVersion
header: Header
consumer: Consumer
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
 * Consumer
 */
export interface Consumer {
type: Type
objectType: ObjectType
objectName: ObjectName
properties?: Properties
}
/**
 * Consumer property details
 */
export interface ConsumerPropertyDetails {
id?: Id
value?: Value
}

export type SrvcAff = AffSrvcV1;
