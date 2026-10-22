/**
 * Auto-generated from SAP/abap-file-formats JSON schemas.
 * Do not edit — regenerate with `bun scripts/generate-aff-schemas.ts`.
 */
/**
 * The ABAP file format version
 */
export type ABAPFileFormatVersion = "1"
/**
 * Paragraph format, max. length 2
 */
export type Format = string
/**
 * Long text line content, max. length 72
 */
export type Line = string
/**
 * Start type
 */
export type StartType = LongTextLine[]

/**
 * documentation
 */
export interface AffDocuV1 {
formatVersion: ABAPFileFormatVersion
lines?: StartType
}
/**
 * Long text line with format and content
 */
export interface LongTextLine {
format: Format
line: Line
}

export type DocuAff = AffDocuV1;
