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
 * Name of domain, which determines the length of the number range number. Define the amount of characters available for number range intervals. It must be of type NUMC or CHAR and have a field length of at least 1 and at most 20.
 */
export type NumberLengthDomain = string;
/**
 * Percentage of numbers remaining in a number range, upon reaching which in number assignment a warning is given. It must be between 0.1 and 99.9. Example: You have defined an interval from 1 to 1000. If you want to issue a warning at the number 900, enter 10 (%) here.
 */
export type PercentWarning = number;
/**
 * If you want to create subobjects for the elements of a field of the application table, specify the relevant data element for this table field. This data element must be active in the Data Dictionary and must have a check table. The domain of the data element must have a field length of between 1 and 6.
 */
export type SubType = string;
/**
 * If you want the records of the business object to be differentiated by financial year, you set this option true. This structures the intervals of a number range object.
 */
export type UntilYear = boolean;
/**
 * For each interval of a number range object, the system checks when the available characters are used up. In the true setting, once the available characters of an interval are used up, the system starts again from the beginning and the lowest number is assigned again. You can suppress this behavior by setting this option false. If you do this, no more characters from an interval are assigned once the characters of the interval are used up. You can suppress rollover for the entire number range object, that is, the setting applies to all the intervals contained in the object.
 */
export type Rolling = boolean;
/**
 * If it is set to true determined numbers consist of the prefix (name of subobject) and the numbers.
 */
export type Prefix = boolean;
/**
 * Transaction code for application specific transaction
 */
export type TransactionID = string;
/**
 * Choose a buffer type for no buffering, for buffering via main memory or for parallel buffering. Default is mainBuffer.
 */
export type Buffering = 'mainBuffer' | 'parallel' | 'none';
/**
 * This value specifies the numbers in buffer. In case of parallel and main memory buffering, add a number for 'bufferedNumbers'. It determines how many numbers are reserved in buffer for the intervals.Default number of buffers is 10.
 */
export type BufferedNumbers = number;

/**
 * Object type NROB
 */
export interface NrobAff {
  formatVersion: ABAPFileFormatVersion;
  header: Header;
  interval: Interval;
  configuration: Configuration;
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
 * Interval
 */
export interface Interval {
  numberLengthDomain: NumberLengthDomain;
  percentWarning: PercentWarning;
  subType: SubType;
  untilYear: UntilYear;
  rolling: Rolling;
  prefix: Prefix;
}
/**
 * Configuration-specific fields
 */
export interface Configuration {
  transactionId?: TransactionID;
  buffering: Buffering;
  bufferedNumbers: BufferedNumbers;
}

