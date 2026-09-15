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
 * Model name
 */
export type ModelName = string;
/**
 * Model type
 */
export type ModelType = string;
/**
 * Intelligent scenario of the model
 */
export type IntelligentScenario = string;
/**
 * Modelling context ID which is the parent of the model
 */
export type ModellingContextID = string;
/**
 * Adapter ID
 */
export type AdapterID = string;
/**
 * Native model type
 */
export type NativeModelType = string;
/**
 * Model specification
 */
export type ModelSpecification = string;
/**
 * Model definition
 */
export type ModelDefinition = string;
/**
 * State of the model
 */
export type State = string;
/**
 * Model signature
 */
export type Signature = string;
/**
 * Model bindings
 */
export type Bindings = string;
/**
 * If true, the model is an enhancement, if false the model is a new model.
 */
export type IsEnhancement = boolean;
/**
 * Executable ID
 */
export type ExecutableID = string;
/**
 * Large language model name
 */
export type LargeLanguageModelName = string;
/**
 * Large language model version
 */
export type LargeLanguageModelVersion = string;
/**
 * Table or view field name
 */
export type FieldName = string;
/**
 * Field position
 */
export type FieldPosition = number;
/**
 * If true, the field is a key field
 */
export type IsKeyField = boolean;
/**
 * Model segment fields
 */
export type ModelSegmentFields = SegmentField[];
/**
 * Prompt template name
 */
export type PromptTemplateName = string;
/**
 * Description of prompt template
 */
export type PromptTemplateDescription = string;
/**
 * Prompt
 */
export type Prompt = string;
/**
 * If true, the prompt is visible
 */
export type PromptVisibility = boolean;
/**
 * Model prompt templates
 */
export type ModelPromptTemplates = ModelPromptTemplate[];

/**
 * Intelligent scenario model
 */
export interface IntmAff {
  formatVersion: ABAPFileFormatVersion;
  header: Header;
  generalInformation: GeneralInformation;
  modelSegmentFields?: ModelSegmentFields;
  modelPromptTemplates?: ModelPromptTemplates;
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
  modelName?: ModelName;
  modelType?: ModelType;
  intelligentScenario?: IntelligentScenario;
  modellingContextId?: ModellingContextID;
  adapterId?: AdapterID;
  nativeModelType?: NativeModelType;
  modelSpecification?: ModelSpecification;
  modelDefinition?: ModelDefinition;
  state?: State;
  signature?: Signature;
  bindings?: Bindings;
  isEnhancement?: IsEnhancement;
  executableId?: ExecutableID;
  llmName?: LargeLanguageModelName;
  llmVersion?: LargeLanguageModelVersion;
}
/**
 * Model segment field
 */
export interface SegmentField {
  fieldName?: FieldName;
  fieldPosition?: FieldPosition;
  isKey?: IsKeyField;
}
/**
 * Model prompt template
 */
export interface ModelPromptTemplate {
  promptTemplateName: PromptTemplateName;
  promptTemplateDescription?: PromptTemplateDescription;
  prompt: Prompt;
  isVisible?: PromptVisibility;
}

