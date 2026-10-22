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
 * Extension include with persisted custom fields
 */
export type ExtensionInclude = string
/**
 * Structure with application data
 */
export type ApplicationDataStructure = string
/**
 * Abstract entity with ui definition
 */
export type UIExtensionEntity = string
/**
 * Name of transaction code
 */
export type Name = string
/**
 * Transaction codes of extensible application
 */
export type TransactionCodes = TransactionCodes1[]

/**
 * SAP GUI extension point for developer extensibility
 */
export interface AffSxtgV1 {
formatVersion: FormatVersion
header: Header
generalInformation?: GeneralInformation
transactionCodes?: TransactionCodes
}
/**
 * Header
 */
export interface Header {
description: Description
originalLanguage: OriginalLanguage
}
/**
 * General information
 */
export interface GeneralInformation {
extensionInclude: ExtensionInclude
applicationDataStructure: ApplicationDataStructure
uiExtensionEntity: UIExtensionEntity
}
/**
 * Transaction codes
 */
export interface TransactionCodes1 {
name?: Name
}

export type SxtgAff = AffSxtgV1;
