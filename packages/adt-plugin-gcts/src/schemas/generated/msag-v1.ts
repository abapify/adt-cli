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
 * Message number
 */
export type MessageNumber = string
/**
 * Message text
 */
export type MessageText = string
/**
 * Messages
 */
export type Messages = MessageProperties[]

/**
 * Message class properties
 */
export interface AffMsagV1 {
formatVersion: ABAPFileFormatVersion
header: Header
messages: Messages
}
/**
 * Header
 */
export interface Header {
description: Description
originalLanguage: OriginalLanguage
}
/**
 * Message properties
 */
export interface MessageProperties {
number?: MessageNumber
text?: MessageText
}

export type MsagAff = AffMsagV1;
