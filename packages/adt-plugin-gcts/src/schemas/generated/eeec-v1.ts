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
 * Consumer class
 */
export type ConsumerClass = string
/**
 * Descriptor class
 */
export type DescriptorClass = string
/**
 * Type
 */
export type Type = string
/**
 * Entity name
 */
export type EntityName = string
export type EventTypes = EventType[]

export interface AffEeecV1 {
formatVersion: ABAPFileFormatVersion
header: Header
consumerClass: ConsumerClass
descriptorClass: DescriptorClass
eventTypes?: EventTypes
}
/**
 * Header
 */
export interface Header {
description: Description
originalLanguage: OriginalLanguage
abapLanguageVersion?: ABAPLanguageVersion
}
export interface EventType {
type: Type
entityName: EntityName
}

export type EeecAff = AffEeecV1;
