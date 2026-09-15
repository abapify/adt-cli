/**
 * Auto-generated from SAP/abap-file-formats JSON schemas.
 * DO NOT EDIT — run `nx codegen adt-plugin-gcts` to regenerate.
 * Source: git_modules/abap-file-formats/file-formats/<type>/<type>-v1.json
 */
/**
 * The ABAP file format version
 */
export type ABAPFileFormatVersion = '1';
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
 * Name of the service provider
 */
export type ProviderName = string;
/**
 * Namespace of the service provider
 */
export type Namespace = string;
/**
 * Prefix for all generated objects
 */
export type ObjectNamePrefix = string;
/**
 * Implementing class of service provider
 */
export type ImplementingClass = string;

/**
 * SOAP web service provider model
 */
export interface SprvAff {
  formatVersion: ABAPFileFormatVersion;
  header: Header;
  serviceProvider: ServiceProvider;
}
/**
 * Header data
 */
export interface Header {
  description: Description;
  originalLanguage: OriginalLanguage;
  abapLanguageVersion?: ABAPLanguageVersion;
}
/**
 * Service provider details
 */
export interface ServiceProvider {
  providerName: ProviderName;
  namespace: Namespace;
  prefix?: ObjectNamePrefix;
  implementingClass?: ImplementingClass;
}

