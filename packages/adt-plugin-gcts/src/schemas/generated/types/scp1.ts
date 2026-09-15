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
 * Type of BC Set i.e. a simple BC Set or hierarchical BC Set, which contains several other BC Sets
 */
export type Type = 'simple' | 'hierarchical';
/**
 * Scope Relevant
 */
export type ScopingRelevant = boolean;
/**
 * Name of the BC Set
 */
export type Name = string;
/**
 * Position of BC Set in Hierarchical BC Set
 */
export type Position = number;
/**
 * A hierarchical BC Set comprises several other BC Sets, which can also be hierarchical. The hierarchy can have any number of levels.
 */
export type SubBCSets = SubBCSet[];
/**
 * Collections of tables which constitute logical business entities, and must therefore be maintained and exported together.
 */
export type Name1 = string;
/**
 * Object type is used to classify customizing objects
 */
export type Type1 =
  'viewCluster' | 'logicalTransportObject' | 'tableWithTextTable' | 'individualTransactionObject' | 'view';
/**
 * Customizing object assigned to an IMG Activity
 */
export type IMGActivity = string;
/**
 * Table name of each data record
 */
export type EntityName = string;
/**
 * Name of field in table/view
 */
export type FieldName = string;
/**
 * Defines the attribute of field like during BC Set activation, the field value must be copied to database table or not
 */
export type FieldAttribute = 'fixedKeyField' | 'defaultValue' | 'forbiddenField';
/**
 * You can define the behavior for field of table/view during activation
 */
export type FieldAttributes = AttributesOfTableViewField[];
/**
 * Key value of a record
 */
export type KeyValue = string;
/**
 * Automatic customizing recording only puts the key fields of a data record or data records, in the BC Set. Such BC Sets must be post-processed. Such data records are flagged as incomplete
 */
export type RecordIsIncomplete = boolean;
/**
 * Data records which are to be deleted at activation are flagged with value 'L'
 */
export type OperationAtActivation = 'upsert' | 'delete';
/**
 * Name of data record field
 */
export type FieldName1 = string;
/**
 * Value of data record field
 */
export type Value = string;
/**
 * Complete data record of selected key value
 */
export type Data = Data1[];
/**
 * Language in which the data record is translated
 */
export type Language = string;
/**
 * Name of data record field
 */
export type FieldName2 = string;
/**
 * Value of data record field
 */
export type Value1 = string;
/**
 * Translated data records of table or view included in a BC Set
 */
export type Translations = SelectedLanguage[];
/**
 * Data records of table or view included in a BC Set
 */
export type DataRecords = DataRecord[];
/**
 * Involved tables or views of a Customizing object
 */
export type Entities = Entity[];
/**
 * Customizing objects or tables included in the BC Set
 */
export type CustomizingObjects = CustomizingObject[];

/**
 * Metadata information of BC Set
 */
export interface Scp1Aff {
  formatVersion: ABAPFileFormatVersion;
  header: Header;
  attributes: Attributes;
  subBcSets?: SubBCSets;
  customizingObjects?: CustomizingObjects;
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
 * Header information of BC Set
 */
export interface Attributes {
  type: Type;
  isRelevantForScope?: ScopingRelevant;
}
/**
 * A hierarchical BC Set comprises several other BC Sets, which can also be hierarchical. The hierarchy can have any number of levels.
 */
export interface SubBCSet {
  name?: Name;
  positionInHierarchy?: Position;
}
/**
 * Details of selected customizing object
 */
export interface CustomizingObject {
  objectName: Name1;
  objectType: Type1;
  imgActivity?: IMGActivity;
  entities: Entities;
}
/**
 * Details of selected view or table
 */
export interface Entity {
  name: EntityName;
  fieldAttributes?: FieldAttributes;
  dataRecords: DataRecords;
}
/**
 * You can define the behavior for field of table/view during activation
 */
export interface AttributesOfTableViewField {
  fieldName: FieldName;
  fieldAttribute: FieldAttribute;
}
/**
 * Details of selected record
 */
export interface DataRecord {
  keyValue: KeyValue;
  incomplete?: RecordIsIncomplete;
  operationAtActivation: OperationAtActivation;
  data: Data;
  translations?: Translations;
}
/**
 * Data record represented as field-value pair
 */
export interface Data1 {
  fieldName: FieldName1;
  fieldValue?: Value;
}
/**
 * Details of selected language
 */
export interface SelectedLanguage {
  language?: Language;
  fieldName?: FieldName2;
  fieldValue?: Value1;
}

