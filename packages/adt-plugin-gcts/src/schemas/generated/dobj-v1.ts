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
 * Destruction class
 */
export type DestructionClass = string
/**
 * Parent table
 */
export type ParentTable = string
/**
 * Dependent table
 */
export type DependentTable = string
/**
 * Structure definition
 */
export type StructureDefinition = StructureDefinitionDetails[]

/**
 * ILM destruction object (DOBJ) v1
 */
export interface AffDobjV1 {
formatVersion: ABAPFileFormatVersion
header: Header
attributes: Attributes
structureDefinition: StructureDefinition
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
 * Attributes
 */
export interface Attributes {
destructionClass: DestructionClass
}
/**
 * Structure definition details
 */
export interface StructureDefinitionDetails {
parentTable?: ParentTable
dependentTable?: DependentTable
}

export type DobjAff = AffDobjV1;
