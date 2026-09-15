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
export type ABAPLanguageVersion = 'standard' | 'keyUser' | 'cloudDevelopment';
/**
 * Intelligent scenario type
 */
export type IntelligentScenarioType = string;
/**
 * Scenario technology
 */
export type ScenarioTechnology = 'sideBySide' | 'embedded';
/**
 * If true, the scenario is extensible
 */
export type Extensible = boolean;
/**
 * If true, the scenario can have multiple active models
 */
export type MultipleActiveModels = boolean;
/**
 * If true, the scenario uses data management
 */
export type DataManagement = boolean;
/**
 * Scenario technical ID
 */
export type ScenarioTechnicalID = string;
/**
 * State of an intelligent scenario
 */
export type State = string;
/**
 * ISLM framework version
 */
export type ISLMFrameworkVersion = number;
/**
 * Prediction class
 */
export type PredictionClass = string;
/**
 * Prerequisite check class
 */
export type PrerequisiteCheckClass = string;
/**
 * If true, scenario will be turnkey enabled to automate the operations
 */
export type AutomateTurnkeySwitchOn = boolean;
/**
 * Type of turnkey implementation
 */
export type TurnkeyImplementationType = string;
/**
 * Turnkey class
 */
export type TurnkeyClass = string;
/**
 * Usage type of an intelligent scenario
 */
export type UsageType = string;
/**
 * OAuth 2.0 client profile
 */
export type OAuthProfile = string;
/**
 * Modelling context name
 */
export type ModellingContextName = string;
/**
 * Modelling context ID
 */
export type ModellingContextID = string;
/**
 * Modelling context description
 */
export type ModellingContextDescription = string;
/**
 * Object name
 */
export type ObjectName = string;
/**
 * Type of the object
 */
export type ObjectType = string;
/**
 * Status of the object
 */
export type ObjectStatus = 'error' | 'termination' | 'information' | 'warning' | 'success';
/**
 * Logical object type of a BOM object
 */
export type LogicalObjectType = 'tableFunction' | 'cdsView' | 'class' | 'dcl' | 'model' | 'avas';
/**
 * Objects based on scenario
 */
export type ScenarioObjects = ScenarioObject[];
/**
 * Name of the binding
 */
export type BindingName = string;
/**
 * Reference object(for example - CDS view)
 */
export type ReferenceObject = string;
/**
 * Scenario dataset bindings
 */
export type DatasetBindings = DatasetBinding[];
/**
 * Signature name
 */
export type SignatureName = string;
/**
 * Signature type
 */
export type SignatureType = string;
/**
 * Description
 */
export type Description1 = string;
/**
 * Table or view field name
 */
export type FieldName = string;
/**
 * Position of the field
 */
export type FieldPosition = number;
/**
 * Storage type of the field
 */
export type StorageType = string;
/**
 * Role of field in an intelligent scenario (such as key, target)
 */
export type RoleOfField = string;
/**
 * Data management type
 */
export type DataManagementType = string;
/**
 * Scenario signatures
 */
export type Signatures = Signature[];
/**
 * Parameter name
 */
export type ParameterName = string;
/**
 * Parameter type
 */
export type ParameterType = string;
/**
 * Parameter description
 */
export type ParameterDescription = string;
/**
 * Storage type
 */
export type StorageType1 = string;
/**
 * If true, then input context value is available
 */
export type ContextFlag = boolean;
/**
 * Parameter size
 */
export type ParameterSize = number;
/**
 * Parameter ID
 */
export type ParameterID = string;
/**
 * Parameter context
 */
export type ParameterContext = string;
/**
 * Parameter value
 */
export type ParameterValue = string;
/**
 * Scenario parameters signature
 */
export type ParameterSignature = ParameterSignature1[];
/**
 * Additional information key
 */
export type AdditionalInfoKey = string;
/**
 * Additional information value ID
 */
export type ValueID = number;
/**
 * Additional information value
 */
export type Value = string;
/**
 * Additional information position ID
 */
export type PositionID = number;
/**
 * Additional information key text label
 */
export type KeyTextLabel = string;
/**
 * Additional information value text label
 */
export type ValueTextLabel = string;
/**
 * Scenario additional information
 */
export type AdditionalInformation = AdditionalInformation1[];
/**
 * Table or view field name
 */
export type FieldName1 = string;
/**
 * Field position
 */
export type FieldPosition1 = number;
/**
 * If true, the field is a key field
 */
export type IsKeyField = boolean;
/**
 * SBS Scenario Segment Fields
 */
export type SBSSegmentFields = SBSSegmentField[];

/**
 * Intelligent scenario
 */
export interface IntsAff {
  formatVersion: ABAPFileFormatVersion;
  header: Header;
  generalInformation: GeneralInformation;
  classInformation?: ClassInformation;
  turnkeyInformation?: TurnkeyInformation;
  connectionInformation?: ConnectionInformation;
  modellingContext?: ModellingContext;
  scenarioDdlObjects?: ScenarioObjects;
  bindings?: DatasetBindings;
  signatures?: Signatures;
  parameters?: ParameterSignature;
  additionalInfo?: AdditionalInformation;
  sbsSegmentFields?: SBSSegmentFields;
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
  scenarioType: IntelligentScenarioType;
  scenarioTechnology: ScenarioTechnology;
  isExtensible?: Extensible;
  isMultiActiveModel?: MultipleActiveModels;
  isDataManagementEnabled?: DataManagement;
  scenarioTechnicalId?: ScenarioTechnicalID;
  state?: State;
  islmVersion?: ISLMFrameworkVersion;
}
/**
 * Class information
 */
export interface ClassInformation {
  predictionClass?: PredictionClass;
  prerequisiteCheckClass?: PrerequisiteCheckClass;
}
/**
 * Turnkey information
 */
export interface TurnkeyInformation {
  isTurnkeyAutoSwitchOn?: AutomateTurnkeySwitchOn;
  turnkeyType?: TurnkeyImplementationType;
  turnkeyClass?: TurnkeyClass;
}
/**
 * Connection information
 */
export interface ConnectionInformation {
  usageType?: UsageType;
  oauthProfile?: OAuthProfile;
}
/**
 * Intelligent scenario modelling context
 */
export interface ModellingContext {
  modellingContextName?: ModellingContextName;
  modellingContextId?: ModellingContextID;
  modellingContextDescription?: ModellingContextDescription;
}
/**
 * Object generated based on a scenario
 */
export interface ScenarioObject {
  objectName?: ObjectName;
  objectType?: ObjectType;
  objectStatus?: ObjectStatus;
  logicalObjectType?: LogicalObjectType;
}
/**
 * Scenario dataset binding
 */
export interface DatasetBinding {
  bindingName?: BindingName;
  referenceObject?: ReferenceObject;
}
/**
 * Scenario signature
 */
export interface Signature {
  signatureName?: SignatureName;
  signatureType?: SignatureType;
  signatureDescription?: Description1;
  fieldName?: FieldName;
  fieldPosition?: FieldPosition;
  storageType?: StorageType;
  fieldRole?: RoleOfField;
  dataManagementType?: DataManagementType;
}
/**
 * Parameter signature
 */
export interface ParameterSignature1 {
  parameterName?: ParameterName;
  parameterType?: ParameterType;
  parameterDescription?: ParameterDescription;
  storageType?: StorageType1;
  hasContext?: ContextFlag;
  parameterSize?: ParameterSize;
  parameterId?: ParameterID;
  parameterContext?: ParameterContext;
  parameterValue?: ParameterValue;
}
/**
 * Additional information
 */
export interface AdditionalInformation1 {
  additionalInfoKey?: AdditionalInfoKey;
  valueId?: ValueID;
  value?: Value;
  positionId?: PositionID;
  keyTextLabel?: KeyTextLabel;
  valueTextLabel?: ValueTextLabel;
}
/**
 * SBS scenario segment field
 */
export interface SBSSegmentField {
  fieldName?: FieldName1;
  fieldPosition?: FieldPosition1;
  isKey?: IsKeyField;
}

