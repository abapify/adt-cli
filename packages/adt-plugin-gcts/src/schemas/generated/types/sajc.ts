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
 * Description of the application job catalog entry
 */
export type Description = string;
/**
 * Original language of the application job catalog entry
 */
export type OriginalLanguage = string;
/**
 * ABAP language version
 */
export type ABAPLanguageVersion = 'standard' | 'cloudDevelopment';
/**
 * Name of the class which contains the execute-method to run within the job
 */
export type ClassWithExecuteMethod = string;
/**
 * Name of the program which is executed within the job
 */
export type ExecutedProgram = string;
/**
 * Name of the class which contains the check exit
 */
export type Check = string;
/**
 * Name of the class which contains the value help exit
 */
export type ValueHelp = string;
/**
 * Name of the class which contains the notification exit
 */
export type Notification = string;
/**
 * Name of the section
 */
export type Name = string;
/**
 * Title of the section on the selection screen
 */
export type Title = string;
/**
 * List of sections
 */
export type Sections = Section[];
/**
 * Name of the group
 */
export type Name1 = string;
/**
 * Title of the group on the selection screen
 */
export type Title1 = string;
/**
 * Name of the group section
 */
export type Section1 = string;
/**
 * List of groups
 */
export type Groups = Group[];
/**
 * Name of the parameter
 */
export type Name2 = string;
/**
 * Title of the parameter on the selection screen
 */
export type Title2 = string;
/**
 * Name of the parameter group
 */
export type Group1 = string;
/**
 * Flag indicating whether the parameter is indented on the selection screen
 */
export type Indented = boolean;
/**
 * Flag indicating whether the parameter is mandatory
 */
export type Mandatory = boolean;
/**
 * Flag indicating whether the parameter is hidden
 */
export type Hidden = boolean;
/**
 * Flag indicating whether the parameter is read only
 */
export type ReadOnly = boolean;
/**
 * Name of the boolean parameter which enables / disables the current parameter
 */
export type EnabledByParameter = string;
/**
 * Display of the parameter as screen element (radio button, checkbox, list box)
 */
export type ScreenElement = 'none' | 'checkbox' | 'radioButton' | 'listBox';
/**
 * Name of the radio button group if the parameter is a radio button
 */
export type RadioButtonGroup = string;
/**
 * Name of the object on which the value help is based: for value helps based on a CDS view: name of the data definition; for value helps based on a domain: name of the domain
 */
export type ValueHelp1 = string;
/**
 * Type of the value help (based on a CDS view, or based on the 'Fixed values' list of a dictionary domain)
 */
export type ValueHelpType = 'none' | 'cdsView' | 'domain';
/**
 * Flag indicating whether a call of the backend system is triggered after a parameter value change to check it
 */
export type BackendCall = boolean;
/**
 * Flag indicating whether only single values are allowed (no conditions like 'not equal' or 'between')
 */
export type OnlySingleValues = boolean;
/**
 * Number of lines of the text editor (0 means no multiline editor)
 */
export type TextLinesInEditor = number;
/**
 * List of parameters
 */
export type Parameters = Parameter[];

/**
 * Attributes of the application job catalog entry
 */
export interface SajcAff {
  formatVersion: ABAPFileFormatVersion;
  header: Header;
  generalInformation: GeneralInformation;
  exitClasses?: ExitClasses;
  sections?: Sections;
  groups?: Groups;
  parameters?: Parameters;
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
  className: ClassWithExecuteMethod;
  programName?: ExecutedProgram;
}
/**
 * Classes which contain the exits of the job scheduling and processing
 */
export interface ExitClasses {
  check?: Check;
  valueHelp?: ValueHelp;
  notification?: Notification;
}
/**
 * Section of parameter groups on the selection screen
 */
export interface Section {
  name: Name;
  title: Title;
}
/**
 * Group of parameters on the selection screen
 */
export interface Group {
  name: Name1;
  title: Title1;
  section?: Section1;
}
/**
 * Parameter of the class which is executed within the job
 */
export interface Parameter {
  name: Name2;
  title?: Title2;
  group?: Group1;
  indented?: Indented;
  mandatory?: Mandatory;
  hidden?: Hidden;
  readOnly?: ReadOnly;
  enabledByParameter?: EnabledByParameter;
  screenElement?: ScreenElement;
  radioButtonGroup?: RadioButtonGroup;
  valueHelp?: ValueHelp1;
  valueHelpType?: ValueHelpType;
  backendCall?: BackendCall;
  singleValues?: OnlySingleValues;
  textEditorLines?: TextLinesInEditor;
}

