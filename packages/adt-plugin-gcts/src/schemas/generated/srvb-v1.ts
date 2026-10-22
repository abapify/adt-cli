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
 * Service Binding type
 */
export type BindingType = string
/**
 * Service Binding category
 */
export type BindingCategory = ("ui" | "webApi")
/**
 * Service name
 */
export type ServiceName = string
/**
 * Service version
 */
export type ServiceVersion1 = string
/**
 * Service build version
 */
export type ServiceBuildVersion = string
/**
 * Service definition
 */
export type ServiceDefinition = string
/**
 * Service versions
 */
export type ServiceVersions = ServiceVersion[]
/**
 * Services
 */
export type Services = ServiceProperties[]

/**
 * Service Binding properties
 */
export interface AffSrvbV1 {
formatVersion: ABAPFileFormatVersion
header: Header
bindingType: BindingType
bindingTypeCategory: BindingCategory
services: Services
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
 * Service properties
 */
export interface ServiceProperties {
name: ServiceName
versions: ServiceVersions
}
/**
 * Service version
 */
export interface ServiceVersion {
serviceVersion: ServiceVersion1
serviceBuildVersion?: ServiceBuildVersion
serviceDefinition: ServiceDefinition
}

export type SrvbAff = AffSrvbV1;
