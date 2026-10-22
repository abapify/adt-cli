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
 * Edit-locked
 */
export type EditLocked = boolean
/**
 * Include type
 */
export type IncludeType = ("include" | "functionGroup")

/**
 * REPS object type
 */
export interface AffRepsV1 {
formatVersion: ABAPFileFormatVersion
header: Header
editLocked?: EditLocked
includeType: IncludeType
}
/**
 * Header
 */
export interface Header {
description: Description
}

export type RepsAff = AffRepsV1;
