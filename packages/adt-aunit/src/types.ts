/**
 * AUnit Types
 *
 * Types for ABAP Unit test results and formatters.
 */

/**
 * A single test method result
 */
export interface AunitTestMethod {
  /** Test method name (e.g., TEST_ALWAYS_FAILS) */
  name: string;
  /** ADT URI for navigation */
  uri?: string;
  /** Execution time in seconds */
  executionTime: number;
  /** 'pass' | 'fail' | 'error' | 'skip' */
  status: 'pass' | 'fail' | 'error' | 'skip';
  /** Alert details if test failed */
  alerts: AunitAlert[];
}

/**
 * A test class containing test methods
 */
export interface AunitTestClass {
  /** Test class name (e.g., LTCL_TEST) */
  name: string;
  /** ADT URI for navigation */
  uri?: string;
  /** Risk level: harmless, dangerous, critical */
  riskLevel?: string;
  /** Duration category: short, medium, long */
  durationCategory?: string;
  /** Test methods in this class */
  methods: AunitTestMethod[];
}

/**
 * A program/object containing test classes
 */
export interface AunitProgram {
  /** Object name (e.g., ZCL_MY_CLASS) */
  name: string;
  /** Object type (e.g., CLAS/OC) */
  type?: string;
  /** ADT URI for navigation */
  uri?: string;
  /** Test classes in this program */
  testClasses: AunitTestClass[];
}

/**
 * An alert (assertion failure, error, etc.)
 */
export interface AunitAlert {
  /** Alert kind: failedAssertion, warning, etc. */
  kind: string;
  /** Severity: critical, tolerable, etc. */
  severity: string;
  /** Alert title/message */
  title: string;
  /** Detail messages */
  details: string[];
  /** Stack trace entries */
  stack: AunitStackEntry[];
}

/**
 * Stack trace entry
 */
export interface AunitStackEntry {
  uri?: string;
  type?: string;
  name?: string;
  description?: string;
}

/**
 * Full AUnit run result
 */
export interface AunitResult {
  /** All programs/objects tested */
  programs: AunitProgram[];
  /** Summary counts */
  totalTests: number;
  passCount: number;
  failCount: number;
  errorCount: number;
  skipCount: number;
  /** Total execution time in seconds */
  totalTime: number;
}

/**
 * Output format options
 */
export type OutputFormat = 'console' | 'json' | 'junit' | 'sonar';
