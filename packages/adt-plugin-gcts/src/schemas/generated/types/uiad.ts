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
export type ABAPLanguageVersion = 'standard' | 'keyUser' | 'cloudDevelopment';
/**
 * Application type
 */
export type ApplicationType =
  'transaction' | 'webDynpro' | 'webClient' | 'ui5' | 'legacyUi5' | 'url' | 'tileOnly' | 'urlTemplate';
/**
 * Technical catalog
 */
export type TechnicalCatalog = string;
/**
 * SAP Fiori ID
 */
export type SAPFioriID = string;
/**
 * Transaction code
 */
export type TransactionCode = string;
/**
 * Target mapping information
 */
export type TargetMappingInformation = string;
/**
 * Application component (ACH)
 */
export type ApplicationComponentACH = string;
/**
 * Suppress tiles
 */
export type SuppressTiles = boolean;
/**
 * SAPUI5 Component ID
 */
export type SAPUI5ComponentID = string;
/**
 * ICF path
 */
export type ICFPath = string;
/**
 * Web Dynpro application
 */
export type WebDynproApplication = string;
/**
 * Application configuration
 */
export type ApplicationConfiguration = string;
/**
 * Flavor ID (deprecated)
 */
export type FlavorID = string;
/**
 * Integration mode (deprecated)
 */
export type IntegrationMode = 'systemDefault' | 'direct' | 'compatible';
/**
 * Compatibility mode (deprecated)
 */
export type CompatibilityMode = boolean;
/**
 * Target ID
 */
export type TargetID = string;
/**
 * URL template
 */
export type URLTemplate = string;
/**
 * Parameter name
 */
export type Name = string;
/**
 * Parameter value
 */
export type Value = string;
/**
 * URL template parameters
 */
export type URLTemplateParameters = URLTemplateParameter[];
/**
 * Target mapping ID
 */
export type TargetMappingID = string;
/**
 * Semantic object of the target mapping
 */
export type SemanticObject = string;
/**
 * Action of the target mapping
 */
export type Action = string;
/**
 * Target URL used for apps of type 'Tile Only' and 'URL Application'
 */
export type TargetURL = string;
/**
 * System alias
 */
export type SystemAlias = string;
/**
 * Desktop is supported as device type
 */
export type Desktop = boolean;
/**
 * Tablet is supported as device type
 */
export type Tablet = boolean;
/**
 * Phone is supported as device type
 */
export type Phone = boolean;
/**
 * Parameter name
 */
export type ParameterName = string;
/**
 * Parameter in target application
 */
export type ParameterInTargetApplication = string;
/**
 * Default value
 */
export type DefaultValue = string;
/**
 * Filter value
 */
export type FilterValue = string;
/**
 * Filter type
 */
export type FilterType = 'plain' | 'regex';
/**
 * Whether the parameter is required
 */
export type Required = boolean;
/**
 * Navigation parameters of the target mapping
 */
export type NavigationParameters = NavigationParameter[];
/**
 * How additional parameters are handled
 */
export type AdditionalParameterHandling = 'allowed' | 'ignored' | 'notAllowed';
/**
 * Tile ID
 */
export type ID = string;
/**
 * Tile type
 */
export type TileType = 'static' | 'dynamic' | 'custom';
/**
 * Tile is chosen by default
 */
export type IsDefaultTile = boolean;
/**
 * Tile is stored as legacy tile
 */
export type IsLegacyTile = boolean;
/**
 * Reuse text defined as part of the app
 */
export type ReuseTextFromApplication = boolean;
/**
 * Tile title
 */
export type Title = string;
/**
 * Tile subtitle
 */
export type Subtitle = string;
/**
 * Tile information
 */
export type Information = string;
/**
 * Tile keywords
 */
export type Keywords = string;
/**
 * Tile icon
 */
export type Icon = string;
/**
 * Service URL
 */
export type ServiceURL = string;
/**
 * Service path
 */
export type ServicePath = string;
/**
 * Duration until the tile is refreshed
 */
export type RefreshInterval = number;
/**
 * Number unit
 */
export type NumberUnit = string;
/**
 * Parameter name
 */
export type Name1 = string;
/**
 * Parameter value
 */
export type Value1 = string;
/**
 * Tile navigation parameters
 */
export type TileNavigationParameters = TileNavigationParameter[];
/**
 * Base CHIP
 */
export type BaseCHIP = string;
/**
 * Configuration string of the CHIP
 */
export type Configuration = string;
/**
 * Bag ID
 */
export type BagID = string;
/**
 * Property name
 */
export type Name2 = string;
/**
 * Property value
 */
export type Value2 = string;
/**
 * Property is translatable
 */
export type Translatable = boolean;
/**
 * These Bags are available in the Javascript Frontend via the CHIP API "bag" Contract
 */
export type BagProperties = CHIPBagProperty[];
/**
 * Tiles
 */
export type Tiles = TileDetails[];
/**
 * Life cycle status
 */
export type Status = 'active' | 'deprecated' | 'obsolete';
/**
 * LADI of the successor application
 */
export type Successor = string;

/**
 * Launchpad application descriptor item (LADI)
 */
export interface UiadAff {
  formatVersion: FormatVersion;
  header: Header;
  generalInformation: GeneralInformation;
  ui5AppDetails?: SAPUI5ApplicationInformation;
  webDynproAppDetails?: WebDynproApplicationInformation;
  webClientAppDetails?: WebClientApplicationInformation;
  urlTemplateAppDetails?: URLTemplateApplicationInformation;
  navigation: NavigationInformation;
  tiles: Tiles;
  lifeCycle?: LifeCycle;
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
  appType: ApplicationType;
  catalogId: TechnicalCatalog;
  fioriId?: SAPFioriID;
  transaction?: TransactionCode;
  information?: TargetMappingInformation;
  supportComponent?: ApplicationComponentACH;
  suppressTiles?: SuppressTiles;
}
/**
 * SAPUI5 application information
 */
export interface SAPUI5ApplicationInformation {
  appId: SAPUI5ComponentID;
  icfPath?: ICFPath;
}
/**
 * Web Dynpro application information
 */
export interface WebDynproApplicationInformation {
  appId: WebDynproApplication;
  configId?: ApplicationConfiguration;
  flavorId?: FlavorID;
  integrationMode?: IntegrationMode;
  compatibilityMode?: CompatibilityMode;
}
/**
 * Web Client application information
 */
export interface WebClientApplicationInformation {
  targetId: TargetID;
}
/**
 * URL Template application information
 */
export interface URLTemplateApplicationInformation {
  templateId: URLTemplate;
  parameters?: URLTemplateParameters;
}
/**
 * URL template parameter
 */
export interface URLTemplateParameter {
  name: Name;
  value?: Value;
}
/**
 * Navigation information
 */
export interface NavigationInformation {
  targetMappingId: TargetMappingID;
  semanticObject: SemanticObject;
  action: Action;
  targetUrl?: TargetURL;
  systemAlias?: SystemAlias;
  desktop?: Desktop;
  tablet?: Tablet;
  phone?: Phone;
  parameters?: NavigationParameters;
  additionalParameterHandling?: AdditionalParameterHandling;
}
/**
 * Navigation parameter
 */
export interface NavigationParameter {
  name: ParameterName;
  renameTo?: ParameterInTargetApplication;
  defaultValue?: DefaultValue;
  filterValue?: FilterValue;
  filterType?: FilterType;
  required?: Required;
}
/**
 * Details of a tile
 */
export interface TileDetails {
  id: ID;
  tileType: TileType;
  isDefault?: IsDefaultTile;
  isLegacy?: IsLegacyTile;
  standard?: StandardDetails;
  custom?: CustomDetails;
}
/**
 * Standard tile details
 */
export interface StandardDetails {
  reuseTextFromApp?: ReuseTextFromApplication;
  title: Title;
  subtitle?: Subtitle;
  information?: Information;
  keywords?: Keywords;
  icon?: Icon;
  dynamic?: DynamicTileDetails;
  tileNavigationParameters?: TileNavigationParameters;
}
/**
 * Dynamic tile details
 */
export interface DynamicTileDetails {
  serviceBaseUrl?: ServiceURL;
  servicePath?: ServicePath;
  refreshInterval?: RefreshInterval;
  numberUnit?: NumberUnit;
}
/**
 * Tile navigation parameter
 */
export interface TileNavigationParameter {
  name: Name1;
  value?: Value1;
}
/**
 * Custom tile details
 */
export interface CustomDetails {
  baseChipId?: BaseCHIP;
  configuration?: Configuration;
  bagProperties?: BagProperties;
}
/**
 * Property of a CHIP bag
 */
export interface CHIPBagProperty {
  bagId: BagID;
  name: Name2;
  value?: Value2;
  translatable?: Translatable;
}
/**
 * Life cycle
 */
export interface LifeCycle {
  status?: Status;
  successor?: Successor;
}

