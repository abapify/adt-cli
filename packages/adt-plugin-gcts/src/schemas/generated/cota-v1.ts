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
 * Communication type
 */
export type CommunicationType = "http"
/**
 * Communication target class
 */
export type CommunicationTargetClass = string
/**
 * Multitenancy mode
 */
export type MultitenancyMode = ("crossClient" | "clientSpecific")
/**
 * Allow multiple application destinations
 */
export type AllowMultipleApplicationDestinations = boolean
/**
 * Path prefix
 */
export type PathPrefix = string
/**
 * Enforce SAP GUI support
 */
export type EnforceSAPGUISupport = boolean
/**
 * Enforce fast serialization
 */
export type EnforceFastSerialization = boolean
/**
 * Default compression mode
 */
export type DefaultCompressionMode = ("fast" | "high")

/**
 * Creation of communication target object
 */
export interface AffCotaV1 {
formatVersion: FormatVersion
header: Header
configuration: Configuration
httpSettings?: HTTPSettings
rfcSettings?: RFCSettings
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
 * Configuration
 */
export interface Configuration {
communicationType?: CommunicationType
communicationTargetClass?: CommunicationTargetClass
multitenancyMode?: MultitenancyMode
allowMultipleDestinations?: AllowMultipleApplicationDestinations
}
/**
 * HTTP settings
 */
export interface HTTPSettings {
pathPrefix?: PathPrefix
}
/**
 * RFC settings
 */
export interface RFCSettings {
enforceSapGuiSupport?: EnforceSAPGUISupport
enforceFastSerialization?: EnforceFastSerialization
defaultCompressionMode?: DefaultCompressionMode
}

export type CotaAff = AffCotaV1;
