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
 * Country code
 */
export type CountryCode = string;
/**
 * Assigned representation type
 */
export type Name = string;
/**
 * Assign representation types associated with consistency scenario
 */
export type RepresentationTypes = RepresentationType[];
/**
 * View name
 */
export type ViewName = string;
/**
 * Field name
 */
export type FieldName = string;
/**
 * Field type
 */
export type FieldType = 'selectOptions' | 'parameterSingleValue' | 'parameterMultipleValues';
/**
 * Additional selection fields of validation report
 */
export type AdditionalSelectionFields = AdditionalSelectionField[];
/**
 * Message type
 */
export type Name1 = string;
/**
 * Tax authority document type
 */
export type TaxAuthorityDocumentType = string;
/**
 * Tax authority message types
 */
export type TaxAuthorityMessageTypes = TaxAuthorityMessageType[];
/**
 * Table name
 */
export type Name2 = string;
/**
 * Additional tax authority tables
 */
export type AdditionalTaxAuthorityTables = AdditionalTaxAuthorityTable[];
/**
 * eDocument Type
 */
export type Name3 = string;
/**
 * Assign eDocument types associated with consistency scenario
 */
export type EDocumentTypes = EDocumentType[];
/**
 * Comparison type
 */
export type Name4 = string;
/**
 * Description of the comparison type
 */
export type Description1 = string;
/**
 * Position number
 */
export type PositionNumber = string;
/**
 * Implementing Class
 */
export type ImplementingClass = string;
/**
 * Data Source
 */
export type DataSource = string;
/**
 * Check id
 */
export type CheckID = string;
/**
 * Field name
 */
export type FieldName1 = string;
/**
 * Field value
 */
export type FieldValue = string;
/**
 * Result process
 */
export type ResultProcess = string;
/**
 * Check id
 */
export type CheckID1 = string;
/**
 * Sequence number
 */
export type SequenceNumber = string;
/**
 * Source field name 1
 */
export type SourceFieldName1 = string;
/**
 * Source field value 1
 */
export type SourceFieldValue1 = string;
/**
 * Source field name 2
 */
export type SourceFieldName2 = string;
/**
 * Source field value 2
 */
export type SourceFieldValue2 = string;
/**
 * Result process
 */
export type ResultProcess1 = string;
/**
 * Assigned status checks
 */
export type StatusChecks = StatusCheck[];
/**
 * Check id
 */
export type CheckID2 = string;
/**
 * Check number
 */
export type CheckNumber = string;
/**
 * Additional data source
 */
export type AdditionalDataSource = string;
/**
 * Additional check description
 */
export type AdditionalDescription = string;
/**
 * Comparison field group for mismatched fields
 */
export type Name5 = string;
/**
 * Mismatch field group description
 */
export type Description2 = string;
/**
 * Level of comparison field group
 */
export type Level = 'header' | 'item';
/**
 * Formula applied to perform the content check on the field group
 */
export type CheckFormula = 'field' | 'fieldWithAbsTolerance' | 'fieldWithoutAbsTolerance';
/**
 * Result process
 */
export type ResultProcess2 = string;
/**
 * Representation type
 */
export type RepresentationType1 = string;
/**
 * Field name to be compared
 */
export type FieldName2 = string;
/**
 * Comparison sequence
 */
export type ComparisonSequence = string;
/**
 * Field Names whose values will be compared
 */
export type ComparisonFields = ComparisonFieldName[];
/**
 * Comparison field groups
 */
export type ComparisonFieldGroups = ComparisonFieldGroup[];
/**
 * Assigned content checks
 */
export type ContentChecks = ContentCheck[];
/**
 * Check id
 */
export type CheckID3 = string;
/**
 * Check execution control parameter
 */
export type ControlParameter = 'alwaysRunCheck' | 'runCheckIfNoInconsistency';
/**
 * Sequence of the checks and control parameter
 */
export type CheckSequence = CheckSequence1[];
/**
 * Assigned representation type
 */
export type Name6 = string;
/**
 * Assigned representation types
 */
export type RepresentationTypes1 = RepresentationType2[];
/**
 * Define comparison types
 */
export type ComparisonTypes = ComparisonType[];
/**
 * Event name
 */
export type Name7 = string;
/**
 * Comparison type
 */
export type ComparisonType1 = string;
/**
 * Check id
 */
export type CheckID4 = string;
/**
 * Assigned comparison Types and checks
 */
export type ComparisonTypesAndChecks = ComparisonTypeAndCheck[];
/**
 * Comparison type
 */
export type ComparisonType2 = string;
/**
 * Check id
 */
export type CheckID5 = string;
/**
 * Relevance
 */
export type Relevance = 'relevant' | 'notRelevant' | 'unchanged';
/**
 * Define relevance of checks
 */
export type CheckRelevance = CheckRelevance1[];
/**
 * Assigned events to consistency scenario
 */
export type Events = Event[];
/**
 * Inconsistency category
 */
export type Name8 = string;
/**
 * Description of the result ui group
 */
export type Description3 = string;
/**
 * Country view extension
 */
export type CountryViewExtension = string;
export type Name9 = string;
/**
 * Assign result process to the UI group
 */
export type ResultProcesses = ResultProcess3[];
/**
 * Inconsistency categories and assigned result processes
 */
export type InconsistencyCategories = InconsistencyCategory[];

/**
 * Consistency scenario
 */
export interface EdccAff {
  formatVersion: ABAPFileFormatVersion;
  header: Header;
  generalInformation: GeneralInformation;
  representationTypes: RepresentationTypes;
  additionalSelectionFields?: AdditionalSelectionFields;
  taxAuthorityMessageTypes?: TaxAuthorityMessageTypes;
  taxAuthorityTables?: AdditionalTaxAuthorityTables;
  edocumentTypes?: EDocumentTypes;
  comparisonTypesAndEvents: ComparisonTypesAndEvents;
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
 * General information of consistency scenario
 */
export interface GeneralInformation {
  countryCode: CountryCode;
}
/**
 * Assigned representation type
 */
export interface RepresentationType {
  name: Name;
}
/**
 * Additional selection fields of validation report
 */
export interface AdditionalSelectionField {
  viewName: ViewName;
  fieldName: FieldName;
  fieldType: FieldType;
}
/**
 * Tax authority message type
 */
export interface TaxAuthorityMessageType {
  name: Name1;
  taxAuthorityDocumentType: TaxAuthorityDocumentType;
}
/**
 * Additional tax authority table
 */
export interface AdditionalTaxAuthorityTable {
  name: Name2;
}
/**
 * eDocument types associated with consistency scenario
 */
export interface EDocumentType {
  name: Name3;
}
/**
 * Define comparison types and assign events to the comparison scenario
 */
export interface ComparisonTypesAndEvents {
  comparisonTypes: ComparisonTypes;
  events?: Events;
  inconsistencyCategories: InconsistencyCategories;
}
/**
 * Comparison type
 */
export interface ComparisonType {
  name: Name4;
  description: Description1;
  positionNumber: PositionNumber;
  implementingClass: ImplementingClass;
  dataSource: DataSource;
  checks: Checks;
  representationTypes: RepresentationTypes1;
}
/**
 * Assigned checks
 */
export interface Checks {
  existenceCheck: ExistenceCheck;
  statusChecks?: StatusChecks;
  contentChecks?: ContentChecks;
  checkSequence?: CheckSequence;
}
/**
 * Assigned existence check
 */
export interface ExistenceCheck {
  checkId: CheckID;
  fieldName: FieldName1;
  fieldValue: FieldValue;
  resultProcess: ResultProcess;
}
/**
 * Status check
 */
export interface StatusCheck {
  checkId: CheckID1;
  sequenceNumber: SequenceNumber;
  sourceFieldName1: SourceFieldName1;
  sourceFieldValue1: SourceFieldValue1;
  sourceFieldName2: SourceFieldName2;
  sourceFieldValue2: SourceFieldValue2;
  resultProcess: ResultProcess1;
}
/**
 * Content check
 */
export interface ContentCheck {
  checkId: CheckID2;
  checkNumber: CheckNumber;
  dataSource?: AdditionalDataSource;
  additionalDescription: AdditionalDescription;
  comparisonFieldGroups: ComparisonFieldGroups;
}
/**
 * Comparison field group
 */
export interface ComparisonFieldGroup {
  name: Name5;
  description: Description2;
  level: Level;
  checkFormula: CheckFormula;
  resultProcess: ResultProcess2;
  comparisonFields: ComparisonFields;
}
/**
 * Field Names whose values will be compared
 */
export interface ComparisonFieldName {
  representationType: RepresentationType1;
  fieldName: FieldName2;
  comparisonSequence: ComparisonSequence;
}
/**
 * Sequence of the checks and control parameter
 */
export interface CheckSequence1 {
  checkId: CheckID3;
  controlParameter?: ControlParameter;
}
/**
 * Assigned representation type
 */
export interface RepresentationType2 {
  name: Name6;
}
/**
 * Assigned event to consistency scenario
 */
export interface Event {
  name: Name7;
  comparisonTypesAndChecks: ComparisonTypesAndChecks;
  checkRelevance: CheckRelevance;
}
/**
 * Assigned comparison type and check
 */
export interface ComparisonTypeAndCheck {
  comparisonType: ComparisonType1;
  checkId?: CheckID4;
}
/**
 * Define relevance of check
 */
export interface CheckRelevance1 {
  comparisonType: ComparisonType2;
  checkId: CheckID5;
  relevance?: Relevance;
}
/**
 * Inconsistency category
 */
export interface InconsistencyCategory {
  name: Name8;
  description: Description3;
  countryViewExtension?: CountryViewExtension;
  resultProcesses: ResultProcesses;
}
/**
 * Assign result process to the UI group
 */
export interface ResultProcess3 {
  name: Name9;
}

