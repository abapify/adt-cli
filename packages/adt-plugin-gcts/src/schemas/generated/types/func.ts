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
 * Processing type
 */
export type ProcessingType = 'normal' | 'rfc' | 'update';
/**
 * When this indicator is set, it shows that the function module for the classic RFC protocol and the basXML protocol behaves in the same way, from a semantic point of view. The classic RFC protocol uses a position logic, while the basXML protocol uses a name identification.
 */
export type BasXmlEnabled = boolean;
/**
 * Indicates the scope of function module calls. Modules whose call scope is not defined explicitly can be called from anywhere
 */
export type RFCScope = 'fromSameClientAndUser' | 'fromSameSystem' | 'fromAnySystem' | 'notClassified';
/**
 * Indicates which serializations are permitted for the function module. Among other things, the selected serializations determine where the function module can be enhanced
 */
export type RFCVersion = 'fastSerializationRequired' | 'any';
/**
 * ABAP from Java
 */
export type ABAPFromJava = boolean;
/**
 * Java from ABAP
 */
export type JavaFromABAP = boolean;
/**
 * Java remote
 */
export type JavaRemote = boolean;
/**
 * Update task kind
 */
export type UpdateTaskKind =
  'startImmediately' | 'startDelayed' | 'startImmediatelyNoRestart' | 'collectiveRun' | 'unsupportedKind';
/**
 * Release state
 */
export type ReleaseState = 'notReleased' | 'released' | 'releasedSapInternal' | 'obsolete' | 'releasePlanned';
/**
 * Release date
 */
export type ReleaseDate = string;
/**
 * The parameters of this function module are global visible within the function group
 */
export type Global = boolean;
/**
 * Exception classes
 */
export type ExceptionClasses = boolean;
/**
 * Application to which function module is assigned
 */
export type ApplicationOfFunctionModule = string;
/**
 * This field is obsolete and should not be filled
 */
export type Client = string;
/**
 * This function module is registered as function module exit (see SMOD/CMOD) and the function module exit is active
 */
export type FunctionExitActive = boolean;
/**
 * Include number
 */
export type IncludeNumber = string;
/**
 * If this flag is set, the function module cannot be called. It is deactivated in the function group
 */
export type NotExecutable = boolean;
/**
 * The function module is not editable
 */
export type EditLocked = boolean;
/**
 * Component name
 */
export type ComponentName = string;
/**
 * Component description
 */
export type ComponentDescription = string;
/**
 * Parameter descriptions of the function module
 */
export type ParameterDescriptions = ComponentWithDescription[];
/**
 * Component name
 */
export type ComponentName1 = string;
/**
 * Component description
 */
export type ComponentDescription1 = string;
/**
 * Exception descriptions of the function module
 */
export type ExceptionDescriptions = ComponentWithDescription1[];

/**
 * FUNC object type
 */
export interface FuncAff {
  formatVersion: ABAPFileFormatVersion;
  header: Header;
  processingType: ProcessingType;
  rfcProperties?: RFCSpecificFields;
  updateProperties?: UpdateSpecificFields;
  releaseState?: ReleaseState;
  releaseDate?: ReleaseDate;
  global?: Global;
  exceptionClasses?: ExceptionClasses;
  application?: ApplicationOfFunctionModule;
  client?: Client;
  activeFunctionExit?: FunctionExitActive;
  includeNumber: IncludeNumber;
  notExecutable?: NotExecutable;
  editLocked?: EditLocked;
  parameters?: ParameterDescriptions;
  exceptions?: ExceptionDescriptions;
}
/**
 * Header
 */
export interface Header {
  description: Description;
}
/**
 * Specific fields for rfc function modules
 */
export interface RFCSpecificFields {
  basxmlEnabled: BasXmlEnabled;
  rfcScope: RFCScope;
  rfcVersion: RFCVersion;
  abapFromJava?: ABAPFromJava;
  javaFromAbap?: JavaFromABAP;
  javaRemote?: JavaRemote;
}
/**
 * Specific fields for update function modules
 */
export interface UpdateSpecificFields {
  updateTaskKind: UpdateTaskKind;
}
/**
 * Component with description
 */
export interface ComponentWithDescription {
  name: ComponentName;
  description: ComponentDescription;
}
/**
 * Component with description
 */
export interface ComponentWithDescription1 {
  name: ComponentName1;
  description: ComponentDescription1;
}

