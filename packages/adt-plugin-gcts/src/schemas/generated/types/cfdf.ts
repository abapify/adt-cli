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
 * External name
 */
export type ExternalName = string;
/**
 * Type
 */
export type Type =
  | 'amountWithCurrency'
  | 'boolean'
  | 'date'
  | 'email'
  | 'list'
  | 'number'
  | 'quantity'
  | 'text'
  | 'time'
  | 'url'
  | 'phone'
  | 'amountWithoutCurrency'
  | 'currencyCode'
  | 'quantityOnly'
  | 'unitCode'
  | 'languageCode'
  | 'numericalText'
  | 'postingPeriod'
  | 'raw'
  | 'associationToStandardBo'
  | 'timestamp'
  | 'listBasedOnCdsView'
  | 'characteristicsList'
  | 'numericInterval'
  | 'amountInterval'
  | 'dateInterval'
  | 'timeInterval'
  | 'associationToCustomBo';
/**
 * Length
 */
export type Length = number;
/**
 * Scale
 */
export type Scale = number;
/**
 * Aggregation
 */
export type Aggregation = 'none' | 'min' | 'max' | 'sum';
/**
 * Code List uppercase only
 */
export type CodeListUppercaseOnly = boolean;
/**
 * Associated business object
 */
export type AssociatedBusinessObject = string;
/**
 * Value help view
 */
export type ValueHelpView = string;
/**
 * Dimension view
 */
export type DimensionView = string;
/**
 * Data subject
 */
export type DataSubject =
  'notApplicable' | 'centralBusinessPartner' | 'customer' | 'supplier' | 'contactPerson' | 'workforcePerson';
/**
 * BAdI implementation for data subject
 */
export type BAdIImplementationForDataSubject = string;
/**
 * Characteristic name
 */
export type CharacteristicName = string;
/**
 * Class name
 */
export type ClassName = string;
/**
 * Object type
 */
export type ObjectType = string;
/**
 * Translation language
 */
export type TranslationLanguage = string;
/**
 * Field label
 */
export type FieldLabel = string;
/**
 * Field tooltip
 */
export type FieldTooltip = string;
/**
 * Labels and tooltips
 */
export type LabelsAndTooltips = LabelAndTooltip[];
/**
 * Code
 */
export type Code = string;
/**
 * Disabled
 */
export type Disabled = boolean;
/**
 * Code list values
 */
export type CodeListValues = CodeValue[];
/**
 * Language
 */
export type Language = string;
/**
 * Code
 */
export type Code1 = string;
/**
 * Description
 */
export type Description1 = string;
/**
 * Code list descriptions
 */
export type CodeListDescriptions = CodeDescription[];
/**
 * Business context
 */
export type BusinessContext = string;
/**
 * Deviating field name
 */
export type DeviatingFieldName = string;
/**
 * Extended business context details
 */
export type ExtendedBusinessContextDetails = ExtendedBusinessContextDetails1[];
/**
 * CDS view name
 */
export type CDSViewName = string;
/**
 * Business context
 */
export type BusinessContext1 = string;
/**
 * Basic search relevance
 */
export type BasicSearchRelevance = boolean;
/**
 * BAdI implementation for visibility control
 */
export type BAdIImplementationForVisibilityControl = string;
/**
 * Field control property
 */
export type FieldControlProperty = 'optional' | 'readOnly' | 'mandatory';
/**
 * Extended CDS view details
 */
export type ExtendedCDSViewDetails = ExtendedCDSViewDetails1[];
/**
 * OData service key
 */
export type ODataServiceKey = string;
/**
 * Business context
 */
export type BusinessContext2 = string;
/**
 * Basic search relevance
 */
export type BasicSearchRelevance1 = boolean;
/**
 * Extended OData service details
 */
export type ExtendedODataServiceDetails = ExtendedODataServiceDetails1[];
/**
 * Business scenario
 */
export type BusinessScenario = string;
/**
 * Data transfer
 */
export type DataTransfer = string;
/**
 * Extended business scenario details
 */
export type ExtendedBusinessScenarioDetails = ExtendedBusinessScenarioDetails1[];
/**
 * Dynpro context
 */
export type DynproContext = string;
/**
 * Business context
 */
export type BusinessContext3 = string;
/**
 * Extended dynpro context details
 */
export type ExtendedDynproContextDetails = ExtendedDynproContextDetails1[];
/**
 * Service interface
 */
export type ServiceInterface = string;
/**
 * Operation
 */
export type Operation = string;
/**
 * Message direction
 */
export type MessageDirection = 'request' | 'response';
/**
 * Business context
 */
export type BusinessContext4 = string;
/**
 * Component identifier
 */
export type ComponentIdentifier = string;
/**
 * External namespace
 */
export type ExternalNamespace = string;
/**
 * External field name
 */
export type ExternalFieldName = string;
/**
 * Extended SOAP service details
 */
export type ExtendedSOAPServiceDetails = ExtendedSOAPServiceDetails1[];
/**
 * Component identifier
 */
export type ComponentIdentifier1 = string;
/**
 * Value help field name
 */
export type ValueHelpFieldName = string;
/**
 * Dimension view field name
 */
export type DimensionViewFieldName = string;
/**
 * Value help key mapping details
 */
export type ValueHelpKeyMappingDetails = ValueHelpKeyMappingDetails1[];
/**
 * Extended CDS view name
 */
export type ExtendedCDSViewName = string;
/**
 * Extended CDS view field name
 */
export type ExtendedCDSViewFieldName = string;
/**
 * Value help field name
 */
export type ValueHelpFieldName1 = string;
/**
 * Value help binding details
 */
export type ValueHelpBindingDetails = ValueHelpBindingDetails1[];

/**
 * Custom field
 */
export interface CfdfAff {
  formatVersion: ABAPFileFormatVersion;
  header: Header;
  externalName: ExternalName;
  type: Type;
  typeDetails?: TypeDetails;
  dataProtectionAndPrivacy?: DataProtectionAndPrivacy;
  characteristicReference?: ReferenceToCharacteristic;
  uiTexts?: LabelsAndTooltips;
  codeListValues?: CodeListValues;
  codeListDescriptions?: CodeListDescriptions;
  extendedBusinessContexts?: ExtendedBusinessContextDetails;
  extendedCdsViews?: ExtendedCDSViewDetails;
  extendedOdataServices?: ExtendedODataServiceDetails;
  extendedBusinessScenarios?: ExtendedBusinessScenarioDetails;
  extendedDynproContexts?: ExtendedDynproContextDetails;
  extendedSoapServices?: ExtendedSOAPServiceDetails;
  valueHelpKeyMappings?: ValueHelpKeyMappingDetails;
  valueHelpBindings?: ValueHelpBindingDetails;
}
/**
 * Header
 */
export interface Header {
  description: Description;
  originalLanguage: OriginalLanguage;
}
/**
 * Type details
 */
export interface TypeDetails {
  length?: Length;
  scale?: Scale;
  aggregation?: Aggregation;
  codeListUppercaseOnly?: CodeListUppercaseOnly;
  associatedBusinessObject?: AssociatedBusinessObject;
  valueHelpView?: ValueHelpView;
  dimensionView?: DimensionView;
}
/**
 * Data protection and privacy
 */
export interface DataProtectionAndPrivacy {
  dataSubjectIdType?: DataSubject;
  badiImplForDataSubject?: BAdIImplementationForDataSubject;
}
/**
 * Reference to characteristic
 */
export interface ReferenceToCharacteristic {
  characteristicName?: CharacteristicName;
  classType?: ClassName;
  objectType?: ObjectType;
}
/**
 * Label and tooltip
 */
export interface LabelAndTooltip {
  language: TranslationLanguage;
  fieldLabel: FieldLabel;
  fieldTooltip: FieldTooltip;
}
/**
 * Code value
 */
export interface CodeValue {
  code: Code;
  isDisabled?: Disabled;
}
/**
 * Code description
 */
export interface CodeDescription {
  language: Language;
  code: Code1;
  description: Description1;
}
/**
 * Extended business context details
 */
export interface ExtendedBusinessContextDetails1 {
  businessContext: BusinessContext;
  deviatingFieldName?: DeviatingFieldName;
}
/**
 * Extended CDS view details
 */
export interface ExtendedCDSViewDetails1 {
  cdsViewName: CDSViewName;
  businessContext: BusinessContext1;
  isSearchRelevant?: BasicSearchRelevance;
  badiImplForVisibilityCtrl?: BAdIImplementationForVisibilityControl;
  fieldControlProperty?: FieldControlProperty;
}
/**
 * Extended OData service details
 */
export interface ExtendedODataServiceDetails1 {
  odataServiceKey: ODataServiceKey;
  businessContext: BusinessContext2;
  isSearchRelevant?: BasicSearchRelevance1;
}
/**
 * Extended business scenario details
 */
export interface ExtendedBusinessScenarioDetails1 {
  businessScenario: BusinessScenario;
  dataTransfer: DataTransfer;
}
/**
 * Extended dynpro context details
 */
export interface ExtendedDynproContextDetails1 {
  dynproContext: DynproContext;
  businessContext: BusinessContext3;
}
/**
 * Extended SOAP service details
 */
export interface ExtendedSOAPServiceDetails1 {
  serviceInterface: ServiceInterface;
  operation: Operation;
  messageDirection: MessageDirection;
  businessContext: BusinessContext4;
  componentIdentifier?: ComponentIdentifier;
  externalNamespace: ExternalNamespace;
  externalFieldName: ExternalFieldName;
}
/**
 * Value help key mapping details
 */
export interface ValueHelpKeyMappingDetails1 {
  componentIdentifier?: ComponentIdentifier1;
  valueHelpFieldName: ValueHelpFieldName;
  dimensionViewFieldName?: DimensionViewFieldName;
}
/**
 * Value help binding details
 */
export interface ValueHelpBindingDetails1 {
  cdsViewName: ExtendedCDSViewName;
  extendedCdsViewFieldName: ExtendedCDSViewFieldName;
  valueHelpFieldName: ValueHelpFieldName1;
}

