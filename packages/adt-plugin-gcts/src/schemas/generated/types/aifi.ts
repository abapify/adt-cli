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
 * Integration type
 */
export type IntegrationType = string;
/**
 * Scenario
 */
export type Scenario = string;
/**
 * SOAP class
 */
export type SOAPClass = string;
/**
 * SOAP method
 */
export type SOAPMethod = string;
/**
 * SOAP record type
 */
export type SOAPRecordType = string;
/**
 * Use proxy xml transformation
 */
export type ProxyXMLTransformation = boolean;
/**
 * Extend xml handling
 */
export type ExtendXMLHandling = boolean;
/**
 * Repository id
 */
export type RepositoryID = string;
/**
 * Registration id
 */
export type RegistrationID = string;
/**
 * Registration version
 */
export type RegistrationVersion = string;
/**
 * Topic
 */
export type Topic = string;
/**
 * Operation id
 */
export type OperationID = string;
/**
 * Operation variant id
 */
export type OperationVariantID = string;
/**
 * Operation variant
 */
export type OperationVariant = string;
/**
 * Namespace
 */
export type Namespace = string;
/**
 * AIF interface name
 */
export type AIFInterfaceName = string;
/**
 * AIF interface version
 */
export type AIFInterfaceVersion = string;
/**
 * Data structure
 */
export type DataStructure = string;
/**
 * Mapped data structure
 */
export type MappedDataStructure = string;
/**
 * Index table
 */
export type IndexTable = string;
/**
 * Interface display name
 */
export type InterfaceDisplayName = string;
/**
 * Retention period
 */
export type RetentionPeriod = string;
/**
 * Expiration_behavior
 */
export type ExpirationBehavior = 'delete' | 'archive';
/**
 * Path for sending system in data structure
 */
export type SendingSystem = string;
/**
 * Direction
 */
export type Direction = 'inbound' | 'outbound' | 'both' | 'internal';
/**
 * Preprocessing
 */
export type Preprocessing = boolean;
/**
 * Postprocessing
 */
export type Postprocessing = boolean;
/**
 * Recipient
 */
export type Recipient1 = string;
/**
 * Recipient assignment
 */
export type RecipientAssignment = Recipient[];
/**
 * Sequence
 */
export type Sequence = string;
/**
 * Component
 */
export type Component = string;
/**
 * Changeable
 */
export type Changeable = boolean;
/**
 * Hidden
 */
export type Hidden = boolean;
/**
 * Use ddic description?
 */
export type UseDDIC = boolean;
/**
 * Description
 */
export type Description1 = string;
/**
 * Short text
 */
export type ShortText = string;
/**
 * Medium text
 */
export type MediumText = string;
/**
 * Long text
 */
export type LongText = string;
/**
 * Error handling configuration
 */
export type ErrorHandlingConfiguration = ErrorHandlingConfiguration1[];
/**
 * Application engine
 */
export type ApplicationEngine = string;
/**
 * Persistency engine
 */
export type PersistencyEngine = string;
/**
 * Selection engine
 */
export type SelectionEngine = string;
/**
 * Logging engine
 */
export type LoggingEngine = string;
/**
 * Key field name
 */
export type Name = string;
/**
 * Data element
 */
export type DataElement = string;
/**
 * Name of select-option/parameter
 */
export type NameOfSelectOptionParameter = string;
/**
 * Field name in define key fields
 */
export type FieldName = string;
/**
 * Structure type (source or destination)
 */
export type StructureType = 'sourceStructure' | 'destinationStructure';
/**
 * Is select-option?
 */
export type SelectOption = boolean;
/**
 * Display the column
 */
export type DisplayColumn = boolean;
/**
 * Enable key field qualifier?
 */
export type EnableKeyFieldQualifier = boolean;
/**
 * Qualifier field name
 */
export type QualifierFieldName = string;
/**
 * Qualifier operator
 */
export type QualifierOperator =
  | 'equals'
  | 'between'
  | 'greaterThan'
  | 'containsPattern'
  | 'notEqual'
  | 'notBetween'
  | 'notContainsPattern'
  | 'greaterEqual'
  | 'lessThan'
  | 'lessEqual';
/**
 * Qualifier value
 */
export type QualifierValue = string;
/**
 * Selection type
 */
export type SelectionType = 'single' | 'multiple' | 'document';
/**
 * Message index table
 */
export type MessageIndexTable = string;
/**
 * Parent field sequence number
 */
export type ParentFieldSequenceNumber = string;
/**
 * Icon
 */
export type Icon = string;
/**
 * Icon tooltip
 */
export type IconTooltip = string;
/**
 * Field name in alert recipient assignment table
 */
export type AlertRecipientFieldName = string;
/**
 * Category field name
 */
export type CategoryFieldName = string;
/**
 * Show tree node in view 1 tree
 */
export type ShowTreeNode = boolean;
/**
 * Relevant for alert recipient determination
 */
export type RelevantForAlertRecipientDetermination = boolean;
/**
 * Rule Key field name
 */
export type Name1 = string;
/**
 * Field sequence number
 */
export type FieldSequenceNumber = string;
/**
 * Rule key fields
 */
export type RuleKeyFields = RuleKeyField[];
/**
 * Key Field Rule class
 */
export type KeyFieldRuleClass = string;
/**
 * Key field rule method
 */
export type KeyFieldRuleMethod = string;
/**
 * Semantic object
 */
export type SemanticObject = string;
/**
 * Semantic action
 */
export type SemanticAction = string;
/**
 * Display in message monitoring
 */
export type DisplayInMessageMonitoring = boolean;
/**
 * Display in message monitoring by default
 */
export type DisplayInMessageMonitoringByDefault = boolean;
/**
 * Key fields
 */
export type KeyFields = KeyFieldDetails[];

/**
 * Application interface
 */
export interface AifiAff {
  formatVersion: ABAPFileFormatVersion;
  header: Header;
  generalInformation: GeneralInformation;
  recipientAssignment: RecipientAssignment;
  errorHandlingConfigs: ErrorHandlingConfiguration;
  engines: Engines;
  keyFields: KeyFields;
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
  integrationType?: IntegrationType;
  scenario?: Scenario;
  soapSettings?: SOAPSettings;
  eventSettings?: EventSettings;
  bgpfSettings?: BgPFSettings;
  namespace?: Namespace;
  interfaceName?: AIFInterfaceName;
  interfaceVersion?: AIFInterfaceVersion;
  dataStructure: DataStructure;
  mappedDataStructure?: MappedDataStructure;
  indexTable: IndexTable;
  displayName?: InterfaceDisplayName;
  retentionPeriod?: RetentionPeriod;
  expirationBehavior?: ExpirationBehavior;
  sendingSystem?: SendingSystem;
  direction?: Direction;
  usesPreprocessing?: Preprocessing;
  usesPostprocesssing?: Postprocessing;
}
/**
 * SOAP settings
 */
export interface SOAPSettings {
  soapClass: SOAPClass;
  soapMethod: SOAPMethod;
  soapRecordType: SOAPRecordType;
  usesProxyXmlTransformation?: ProxyXMLTransformation;
  usesExtendedXmlHandling?: ExtendXMLHandling;
}
/**
 * Event settings
 */
export interface EventSettings {
  repositoryId: RepositoryID;
  registrationId: RegistrationID;
  registrationVersion: RegistrationVersion;
  topic: Topic;
}
/**
 * Background processing framework settings
 */
export interface BgPFSettings {
  operationId: OperationID;
  operationVariantId: OperationVariantID;
  operationVariant: OperationVariant;
}
/**
 * Recipient
 */
export interface Recipient {
  recipient: Recipient1;
}
/**
 * Error handling configuration
 */
export interface ErrorHandlingConfiguration1 {
  sequence: Sequence;
  component: Component;
  isChangeable?: Changeable;
  isHidden?: Hidden;
  usesDdic?: UseDDIC;
  description?: Description1;
  shortText?: ShortText;
  mediumText?: MediumText;
  longText?: LongText;
}
/**
 * Engines
 */
export interface Engines {
  applicationEngine?: ApplicationEngine;
  persistencyEngine?: PersistencyEngine;
  selectionEngine?: SelectionEngine;
  loggingEngine?: LoggingEngine;
}
/**
 * Key field details
 */
export interface KeyFieldDetails {
  name: Name;
  dataElement: DataElement;
  selectOptionName?: NameOfSelectOptionParameter;
  fieldName?: FieldName;
  structureType?: StructureType;
  isSelectOption?: SelectOption;
  isColumnDisplay?: DisplayColumn;
  keyFieldQualifier?: KeyFieldDeterminationByQualifier;
  keyFieldSelection?: KeyFieldSelection;
  keyFieldRule?: KeyFieldRule;
  fioriFeatures?: SAPFioriFeatures;
}
/**
 * Key field determination by qualifier
 */
export interface KeyFieldDeterminationByQualifier {
  usesQualifier?: EnableKeyFieldQualifier;
  qualifierFieldName?: QualifierFieldName;
  qualifierOperator?: QualifierOperator;
  qualifierValue?: QualifierValue;
}
/**
 * Key field selection type and settings
 */
export interface KeyFieldSelection {
  selectionType?: SelectionType;
  messageIndexTable?: MessageIndexTable;
  parentFieldSequence?: ParentFieldSequenceNumber;
  icon?: Icon;
  iconTooltip?: IconTooltip;
  alertFieldName?: AlertRecipientFieldName;
  categoryFieldName?: CategoryFieldName;
  isTreeNodeVisible?: ShowTreeNode;
  isAlertRecipientRelevant?: RelevantForAlertRecipientDetermination;
}
/**
 * Key field rule
 */
export interface KeyFieldRule {
  ruleKeyFields?: RuleKeyFields;
  ruleClass?: KeyFieldRuleClass;
  ruleMethod?: KeyFieldRuleMethod;
}
/**
 * Rule key field
 */
export interface RuleKeyField {
  name?: Name1;
  fieldSequnceNumber?: FieldSequenceNumber;
}
/**
 * SAP Fiori specific features
 */
export interface SAPFioriFeatures {
  semanticObject?: SemanticObject;
  semanticAction?: SemanticAction;
  isShownInMessageMonitor?: DisplayInMessageMonitoring;
  isShownByDefault?: DisplayInMessageMonitoringByDefault;
}

