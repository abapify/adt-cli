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
 * Description of the Business Configuration shown in the Maintain Business Configurations app. Can be translated with the Maintain Translations app
 */
export type Description = string;
/**
 * Original language of the development object. Attributes Name and Description must be maintained in this language
 */
export type OriginalLanguage = string;
/**
 * ABAP language version
 */
export type ABAPLanguageVersion = 'standard' | 'cloudDevelopment';
/**
 * Service Binding used for business configuration maintenance
 */
export type ServiceBinding = string;
export type ServiceName = string;
/**
 * The major version number of the service to be used (as defined in the Service Binding)
 */
export type ServiceVersion = string;
/**
 * Root Entity Set exposed by the Service Definition
 */
export type RootEntitySet = string;
/**
 * Name of the Business Configuration
 */
export type Name = string;
export type ConfigurationGroup = string;
/**
 * If true, the UI automatically navigates to the Object Page of the root entity
 */
export type SkipRootEntityListReport = boolean;
/**
 * Defines whether data in the List Report is automatically loaded on first app start.
 */
export type InitialLoad = 'enabled' | 'disabled' | 'auto';
export type VariantManagement = 'page' | 'none';
export type EntitySet = string;
/**
 * Toggle between onepage concept and tabs.
 */
export type SectionLayout = 'page' | 'tabs';
export type VariantManagement1 = 'control' | 'none';
/**
 * If true, the header content is changeable in edit mode
 */
export type EditableHeaderContent = boolean;
/**
 * If true, the selected transport request and transport request select action are displayed in a message strip.
 */
export type ShowTransportSelectionStrip = boolean;
export type ObjectPageConfigurations = ObjectPageSettings[];
export type EntitySet1 = string;
export type TableType = 'responsiveTable' | 'gridTable';
export type SelectionMode = 'auto' | 'multi' | 'single' | 'none';
/**
 * Enable Select all checkbox
 */
export type SelectAll = boolean;
/**
 * Defines how the table handles the visible rows in the table
 */
export type RowCountMode = 'fixed' | 'auto';
/**
 * Number of visible rows of the table
 */
export type RowCount = number;
/**
 * You can freeze the first columns of a table so that they always remain visible when scrolling horizontally
 */
export type FrozenColumnCount = number;
export type TableCreationMode = 'newPage' | 'inline' | 'creationRow' | 'inlineCreationRows';
/**
 * If true, a new row is added to the end of the table instead of the beginning of the table
 */
export type CreateAtEnd = boolean;
/**
 * If true, the user cannot filter data of the table
 */
export type HideFilter = boolean;
/**
 * If true, the user cannot sort the table
 */
export type HideSort = boolean;
/**
 * If true, the user cannot add and remove columns to the table
 */
export type HideColumn = boolean;
/**
 * If true, display rows in a condensed way. Only applicaple to Table Type 'GridTable'.
 */
export type CondensedTableLayout = boolean;
/**
 * If true, include the column labels while calculating the default column width. By default, the column width is calculated based on the type of the content
 */
export type IncludeColumnHeadersInWidthCalculation = boolean;
/**
 * If true, disable the possibility to add several items by copying and pasting data from an excel file
 */
export type DisablePaste = boolean;
/**
 * If true, a button on the table toolbar allows the user to open the table in fullscreen dialog
 */
export type EnableFullScreen = boolean;
/**
 * Mass editing allows users to simultaneously change multiple objects that share the same editable properties
 */
export type EnableMassEdit = boolean;
export type TableSettings = TableSettings1[];

export interface SmbcAff {
  formatVersion: ABAPFileFormatVersion;
  header: HeaderForSMBCObjects;
  serviceConfiguration: ServiceConfiguration;
  appConfiguration?: ConfgurationOfListReportAndObjectPages;
}
export interface HeaderForSMBCObjects {
  description: Description;
  originalLanguage: OriginalLanguage;
  abapLanguageVersion?: ABAPLanguageVersion;
}
export interface ServiceConfiguration {
  serviceBinding: ServiceBinding;
  serviceName: ServiceName;
  serviceVersion: ServiceVersion;
  rootEntitySet: RootEntitySet;
  name: Name;
  configurationGroup?: ConfigurationGroup;
  skipRootEntity?: SkipRootEntityListReport;
}
export interface ConfgurationOfListReportAndObjectPages {
  listReport?: ListReportConfiguration;
  objectPages?: ObjectPageConfigurations;
  tableSettings?: TableSettings;
}
export interface ListReportConfiguration {
  initialLoad?: InitialLoad;
  variantManagement?: VariantManagement;
}
export interface ObjectPageSettings {
  entitySet?: EntitySet;
  sectionLayout?: SectionLayout;
  variantManagement?: VariantManagement1;
  editableHeaderContent?: EditableHeaderContent;
  showTransportSelectionStrip?: ShowTransportSelectionStrip;
}
export interface TableSettings1 {
  entitySet?: EntitySet1;
  tableType?: TableType;
  selectionMode?: SelectionMode;
  selectAll?: SelectAll;
  rowCountMode?: RowCountMode;
  rowCount?: RowCount;
  frozenColumnCount?: FrozenColumnCount;
  creationModeName?: TableCreationMode;
  createAtEnd?: CreateAtEnd;
  hideFilter?: HideFilter;
  hideSort?: HideSort;
  hideColumn?: HideColumn;
  condensedTableLayout?: CondensedTableLayout;
  widthIncludingColumnHeader?: IncludeColumnHeadersInWidthCalculation;
  disablePaste?: DisablePaste;
  enableFullScreen?: EnableFullScreen;
  enableMassEdit?: EnableMassEdit;
}

