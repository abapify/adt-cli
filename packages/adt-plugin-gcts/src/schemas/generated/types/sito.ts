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
 * Object reusable
 */
export type Reusable = boolean;
/**
 * Scope
 */
export type Scope = 'SAP' | 'customer';
/**
 * SAP object type
 */
export type SAPObjectType = string;
/**
 * Object extensible
 */
export type Extensible = boolean;
/**
 * Situation object name
 */
export type Name = string;
/**
 * Description
 */
export type Description1 = string;
/**
 * Situation object structure id
 */
export type ID = string;
/**
 * Name
 */
export type Name1 = string;
/**
 * Situation object structure type
 */
export type Type = 'CDS' | 'inMemory';
/**
 * Object reusable
 */
export type Reusable1 = boolean;
/**
 * Scope
 */
export type Scope1 = 'SAP' | 'customer';
/**
 * SAP object node type
 */
export type SAPObjectNodeType = string;
/**
 * Situation object structure description
 */
export type Description2 = string;
/**
 * Object field
 */
export type Field = string;
/**
 * Object field order for situation
 */
export type FieldOrder = string;
/**
 * Semantic keys of an object structure
 */
export type SemanticKeys = SemanticKeyDetails[];
/**
 * Object field
 */
export type FieldName = string;
/**
 * App for value help
 */
export type AppType = 'allApps';
/**
 * Type of value help
 */
export type Type1 = 'service';
/**
 * Scope
 */
export type Scope2 = 'SAP' | 'customer';
/**
 * Value help mappings for situation object structure
 */
export type ValueHelpMappings = ValueHelpMappingDetails[];
/**
 * Service id for value help
 */
export type ID1 = string;
/**
 * Field name
 */
export type FieldName1 = string;
/**
 * App for value help
 */
export type Type2 = 'allApps';
/**
 * Entity set
 */
export type EntitySet = string;
/**
 * Property
 */
export type Property = string;
/**
 * Value help mapping for situation object structure - services
 */
export type Services = ServiceDetails[];
/**
 * Situation object structures
 */
export type Structures = StructureDetails[];
/**
 * Situation event id
 */
export type ID2 = string;
/**
 * Object
 */
export type Object = string;
/**
 * Type
 */
export type Type3 = string;
/**
 * Object reusable
 */
export type Reusable2 = boolean;
/**
 * Scope
 */
export type Scope3 = 'SAP' | 'customer';
/**
 * Object type category
 */
export type Category = 'businessClass' | 'borObjectType' | 'abapClass' | 'businessObjectType' | 'xmlObjectType';
/**
 * Parameter structure id for situation object
 */
export type ParameterStructureID = string;
/**
 * Description
 */
export type Description3 = string;
/**
 * Situation object events
 */
export type Events = EventDetails[];
/**
 * Action id
 */
export type ID3 = string;
/**
 * Action type of situation
 */
export type Type4 = 'navigationAction' | 'callbackAction';
/**
 * Object reusable
 */
export type Reusable3 = boolean;
/**
 * Scope
 */
export type Scope4 = 'SAP' | 'customer';
/**
 * Name of action
 */
export type Name2 = string;
/**
 * Description of action
 */
export type Description4 = string;
/**
 * Navigation id
 */
export type ID4 = string;
/**
 * Callback id
 */
export type ID5 = string;
/**
 * Situation object end user actions
 */
export type EndUserActions = EndUserActionDetails[];
/**
 * Navigation id
 */
export type ID6 = string;
/**
 * Object reusable
 */
export type Reusable4 = boolean;
/**
 * Scope
 */
export type Scope5 = 'SAP' | 'customer';
/**
 * Semantic object
 */
export type SemanticObject = string;
/**
 * Semantic object action
 */
export type SemanticObjectAction = string;
/**
 * Name of parameter
 */
export type Name3 = string;
/**
 * Parameters
 */
export type Parameters = ParameterDetails[];
/**
 * Situation object navigations
 */
export type Navigations = NavigationDetails1[];
/**
 * Callback id
 */
export type ID7 = string;
/**
 * Object reusable
 */
export type Reusable5 = boolean;
/**
 * Scope
 */
export type Scope6 = 'SAP' | 'customer';
/**
 * Class name
 */
export type ClassName = string;
/**
 * Name of parameter
 */
export type Name4 = string;
/**
 * Parameters
 */
export type Parameters1 = ParameterDetails1[];
/**
 * Situation object callbacks
 */
export type Callbacks = CallbackDetails1[];
/**
 * Service id for value help
 */
export type ID8 = string;
/**
 * Object reusable
 */
export type Reusable6 = boolean;
/**
 * Scope
 */
export type Scope7 = 'SAP' | 'customer';
/**
 * Service protocol version for value help
 */
export type ProtocolVersion = 'V2' | 'V4';
/**
 * Service path type for value help
 */
export type PathType = 'standard' | 'custom';
/**
 * Service custom path for value help
 */
export type CustomPath = string;
/**
 * Service binding for value help
 */
export type Binding = string;
/**
 * Service definition for value help
 */
export type Definition = string;
/**
 * Service version for value help
 */
export type Version = string;
/**
 * Entity set
 */
export type EntitySet1 = string;
/**
 * Property
 */
export type Property1 = string;
/**
 * Providers of value help service for situation object
 */
export type ValueHelpServiceProviders = ValueHelpServiceProviderDetails[];
/**
 * Value help services for situation object
 */
export type ValueHelpServices = ValueHelpServiceDetails[];

/**
 * Situation Object properties
 */
export interface SitoAff {
  formatVersion: FormatVersion;
  header: Header;
  situationObject: SituationObject;
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
 * Situation Object
 */
export interface SituationObject {
  reusable: Reusable;
  scope: Scope;
  sapObjectType: SAPObjectType;
  extensible: Extensible;
  text: Text;
  structures?: Structures;
  events?: Events;
  endUserActions?: EndUserActions;
  navigations?: Navigations;
  callbacks?: Callbacks;
  valueHelpServices?: ValueHelpServices;
}
/**
 * Text for ituation object
 */
export interface Text {
  name: Name;
  description: Description1;
}
/**
 * Situation object structure
 */
export interface StructureDetails {
  id: ID;
  name: Name1;
  type: Type;
  reusable: Reusable1;
  scope: Scope1;
  sapObjectNodeType: SAPObjectNodeType;
  text: Text1;
  semanticKeys?: SemanticKeys;
  valueHelpMappings?: ValueHelpMappings;
  services?: Services;
}
/**
 * Text for situation object structure
 */
export interface Text1 {
  description: Description2;
}
/**
 * Semantic key of an object structure
 */
export interface SemanticKeyDetails {
  field: Field;
  fieldOrder: FieldOrder;
}
/**
 * Value help mapping for situation object structure
 */
export interface ValueHelpMappingDetails {
  fieldName: FieldName;
  appType: AppType;
  type: Type1;
  scope: Scope2;
}
/**
 * Value help mapping for situation object structure - service
 */
export interface ServiceDetails {
  id: ID1;
  fieldName: FieldName1;
  type: Type2;
  entitySet: EntitySet;
  property: Property;
}
/**
 * Situation object event
 */
export interface EventDetails {
  id: ID2;
  object: Object;
  type: Type3;
  reusable: Reusable2;
  scope: Scope3;
  category: Category;
  parameterStructureId: ParameterStructureID;
  text: Text2;
}
/**
 * Text for situation object event
 */
export interface Text2 {
  description: Description3;
}
/**
 * Situation object action
 */
export interface EndUserActionDetails {
  id: ID3;
  type: Type4;
  reusable: Reusable3;
  scope: Scope4;
  text: Text3;
  navigation?: NavigationDetails;
  callback?: CallbackDetails;
}
/**
 * Text for situation object action
 */
export interface Text3 {
  name: Name2;
  description: Description4;
}
/**
 * Situation object action - navigation
 */
export interface NavigationDetails {
  id: ID4;
}
/**
 * Situation object action - callback
 */
export interface CallbackDetails {
  id: ID5;
}
/**
 * Situation object navigation
 */
export interface NavigationDetails1 {
  id: ID6;
  reusable: Reusable4;
  scope: Scope5;
  semanticObject: SemanticObject;
  semanticObjectAction: SemanticObjectAction;
  parameters?: Parameters;
}
/**
 * Parameter
 */
export interface ParameterDetails {
  name: Name3;
}
/**
 * Situation object callback
 */
export interface CallbackDetails1 {
  id: ID7;
  reusable: Reusable5;
  scope: Scope6;
  className: ClassName;
  parameters?: Parameters1;
}
/**
 * Parameter
 */
export interface ParameterDetails1 {
  name: Name4;
}
/**
 * Value help service for situation object
 */
export interface ValueHelpServiceDetails {
  id: ID8;
  reusable: Reusable6;
  scope: Scope7;
  protocolVersion: ProtocolVersion;
  pathType: PathType;
  customPath: CustomPath;
  binding: Binding;
  definition: Definition;
  version: Version;
  valueHelpServiceProviders?: ValueHelpServiceProviders;
}
/**
 * Provider of value help service for situation object
 */
export interface ValueHelpServiceProviderDetails {
  entitySet: EntitySet1;
  property: Property1;
}

