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
 * The name of the scalar function
 */
export type ScalarFunctionName = string
/**
 * Engine
 */
export type Engine = ("analyticalEngine" | "sqlEngine")
/**
 * The name of the AMDP implementation reference
 */
export type AMDPReference = string
/**
 * Flag whether or not the SQL implementation of the CDS scalar function will be automatically exposed in all SQL services
 */
export type AutomaticallyExposedInSQLServices = boolean

export interface AffDsfiV1 {
formatVersion: ABAPFileFormatVersion
header: Header
scalarFunctionName: ScalarFunctionName
engine?: Engine
sqlProperties?: SQLProperties
}
/**
 * The header for an ABAP main object (with source code) with a description of 60 characters
 */
export interface Header {
description: Description
originalLanguage: OriginalLanguage
abapLanguageVersion?: ABAPLanguageVersion
}
/**
 * SQL Properties
 */
export interface SQLProperties {
amdpReference: AMDPReference
autoExposedInSqlServices?: AutomaticallyExposedInSQLServices
}

export type DsfiAff = AffDsfiV1;
