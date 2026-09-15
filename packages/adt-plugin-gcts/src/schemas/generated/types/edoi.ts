/**
 * Auto-generated from SAP/abap-file-formats JSON schemas.
 * DO NOT EDIT — run `nx codegen adt-plugin-gcts` to regenerate.
 * Source: git_modules/abap-file-formats/file-formats/<type>/<type>-v1.json
 */
/**
 * Format version
 */
export type FormatVersion = '1';
/**
 * Description of the ABAP object
 */
export type Description = string;
/**
 * Original language of the ABAP object
 */
export type OriginalLanguage = string;
/**
 * ABAP language version
 */
export type ABAPLanguageVersion = 'standard' | 'cloudDevelopment';
/**
 * Interface direction
 */
export type Direction = 'outbound' | 'inbound';
/**
 * Version
 */
export type Version = number;
/**
 * Description
 */
export type Description1 = string;
/**
 * Active from
 */
export type ActiveFrom = string;
/**
 * DRC process type
 */
export type ProcessType = string;
/**
 * DRC process version
 */
export type ProcessVersion = string;
/**
 * DRC process subtype
 */
export type ProcessSubtype = string;
/**
 * DRC process action
 */
export type Action = string;
/**
 * eDoc response interface
 */
export type ResponseInterface = string;
/**
 * Response interface version
 */
export type ResponseInterfaceVersion = number;
/**
 * Interface versions
 */
export type Versions = VersionDetails[];

/**
 * eDocument interface
 */
export interface EdoiAff {
  formatVersion: FormatVersion;
  header: Header;
  generalInformation: GeneralInformation;
  versions: Versions;
}
/**
 * Header
 */
export interface Header {
  description: Description;
  originalLanguage: OriginalLanguage;
  abapLanguageVersion?: ABAPLanguageVersion;
}
/**
 * General information
 */
export interface GeneralInformation {
  direction: Direction;
}
/**
 * eDocument interface version details
 */
export interface VersionDetails {
  version: Version;
  description: Description1;
  activeFrom: ActiveFrom;
  communicationAttributes?: CommunicationIntegrationAttributes;
}
/**
 * Communication integration attributes
 */
export interface CommunicationIntegrationAttributes {
  processType?: ProcessType;
  processVersion?: ProcessVersion;
  processSubtype?: ProcessSubtype;
  drcAction?: Action;
  responseInterface?: ResponseInterface;
  responseInterfaceVersion?: ResponseInterfaceVersion;
}

