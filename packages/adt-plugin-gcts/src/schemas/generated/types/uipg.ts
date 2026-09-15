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
 * Title visible to the enduser
 */
export type Title = string;
/**
 * At runtime page templates are merged based on the merge ID
 */
export type MergeID = string;
/**
 * Technical ID of the section. The personalization of the launchpad is based on this ID.
 */
export type ID = string;
/**
 * Section title on the launchpad UI
 */
export type Title1 = string;
/**
 * Technical Id of the visualization. The personalization of the launchpad is based on this ID.
 */
export type ID1 = string;
/**
 * Type of application/visualization assignment
 */
export type Type = 'ladiAssignment' | 'tileAssignment';
/**
 * Tile format for UI rendering. May not be applicable for all kinds of visualization.
 */
export type DisplayFormat = 'standard' | 'wide' | 'flat' | 'flatWide' | 'link';
/**
 * Catalog ID
 */
export type CatalogID = string;
/**
 * Catalog type
 */
export type CatalogType = string;
/**
 * Catalog Item ID
 */
export type CatalogItemID = string;
/**
 * Catalog ID
 */
export type CatalogID1 = string;
/**
 * Catalog type
 */
export type CatalogType1 = string;
/**
 * Catalog Item ID
 */
export type CatalogItemID1 = string;
/**
 * ID of a launchpad app descriptor item
 */
export type LaunchpadAppDescriptorItemID = string;
/**
 * ID of a tile in the the referenced Launchpad App Descriptor Item
 */
export type TileID = string;
/**
 * Visualizations represent applications on the launchpad UI
 */
export type Visualizations = Visualization[];
/**
 * Sections make up a grouping of applications on the launchpad UI
 */
export type Sections = Section[];

/**
 * Launchpad page template
 */
export interface UipgAff {
  formatVersion: FormatVersion;
  header: Header;
  generalInformation: GeneralInformation;
  sections?: Sections;
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
  title: Title;
  mergeId?: MergeID;
}
/**
 * Sections make up a grouping of applications on the launchpad UI
 */
export interface Section {
  id: ID;
  title?: Title1;
  visualizations?: Visualizations;
}
/**
 * Visualizations represent applications on the launchpad UI
 */
export interface Visualization {
  id: ID1;
  type?: Type;
  displayFormat?: DisplayFormat;
  tileAssignment?: TileAssignment;
  ladiAssignment?: LaunchpadAppDescriptorItemAssignment;
}
/**
 * Assignment of a launchpad catalog tile
 */
export interface TileAssignment {
  tileKey: TileKey;
  targetMappingKey?: TargetMappingKey;
}
/**
 * Tile key
 */
export interface TileKey {
  catalogId: CatalogID;
  catalogType?: CatalogType;
  id: CatalogItemID;
}
/**
 * Target mapping key
 */
export interface TargetMappingKey {
  catalogId: CatalogID1;
  catalogType?: CatalogType1;
  id: CatalogItemID1;
}
/**
 * Assignment of a launchpad app descriptor item
 */
export interface LaunchpadAppDescriptorItemAssignment {
  ladiId: LaunchpadAppDescriptorItemID;
  tileId: TileID;
}

