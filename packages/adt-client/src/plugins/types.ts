/**
 * Plugin Types - Core interfaces for the response plugin system
 */

/**
 * Response context passed to plugins
 */
export interface ResponseContext {
  /** Raw response text (XML) */
  rawText: string;
  /** Parsed response object (if schema available) */
  parsedData?: unknown;
  /** Request URL */
  url: string;
  /** Request method */
  method: string;
  /** Response content type */
  contentType: string;
}

/**
 * Response plugin interface
 */
export interface ResponsePlugin {
  /**
   * Plugin name for identification
   */
  name: string;

  /**
   * Process response before returning to caller
   * Can store files, transform data, log, etc.
   *
   * @param context - Response context with raw and parsed data
   * @returns Modified data or original data
   */
  process(context: ResponseContext): unknown;
}
