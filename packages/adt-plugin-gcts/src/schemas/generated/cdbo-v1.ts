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
 * Object type
 */
export type ObjectType = ("TABL" | "DDLS")
/**
 * Object name
 */
export type ObjectName = string
/**
 * Name
 */
export type Name = string
/**
 * Nature
 */
export type Nature = ("general" | "sensitive" | "nonBusinessInformation")
/**
 * Fields
 */
export type Fields = FieldDetails[]

/**
 * Customer Data Browser Object
 */
export interface AffCdboV1 {
formatVersion: FormatVersion
header: Header
generalInformation: GeneralInformation
fields: Fields
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
objectType: ObjectType
objectName: ObjectName
}
/**
 * Field details
 */
export interface FieldDetails {
name: Name
nature: Nature
}

export type CdboAff = AffCdboV1;
