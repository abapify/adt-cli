/**
 * ADT Error Handling
 *
 * SAP ADT returns errors in a standard XML format defined by exception.xsd:
 * <exc:exception xmlns:exc="http://www.sap.com/abapxml/types/communicationframework">
 *   <namespace id="..."/>
 *   <type id="..."/>
 *   <message lang="EN">Human readable error message</message>
 *   <localizedMessage lang="EN">Localized message</localizedMessage>
 *   <properties>
 *     <entry key="key1">value1</entry>
 *   </properties>
 * </exc:exception>
 *
 * Uses the generated exception schema from @abapify/adt-schemas for type-safe parsing.
 */

import {
  exception as exceptionSchema,
  type InferTypedSchema,
} from '@abapify/adt-schemas';

/** Exception schema type - inferred from the typed schema */
type ExceptionSchema = InferTypedSchema<typeof exceptionSchema>;

/**
 * Parsed ADT exception structure - derived from ExceptionSchema
 */
export interface AdtExceptionData {
  /** Exception namespace ID (e.g., "com.sap.adt.oo") */
  namespace?: string;
  /** Exception type ID (e.g., "OBJECT_NOT_FOUND") */
  type?: string;
  /** Human-readable error message */
  message?: string;
  /** Localized error message */
  localizedMessage?: string;
  /** Additional properties as key-value pairs */
  properties?: Record<string, string>;
}

/** Re-export the schema type for consumers */
export type { ExceptionSchema };

/**
 * Custom error class for ADT exceptions
 *
 * Provides structured access to SAP ADT error details.
 */
export class AdtError extends Error {
  /** HTTP status code */
  readonly status: number;
  /** HTTP status text */
  readonly statusText: string;
  /** Parsed ADT exception data (if available) */
  readonly exception?: AdtExceptionData;
  /** Raw response body */
  readonly rawBody: string;
  /** Request URL */
  readonly url: string;
  /** HTTP method */
  readonly method: string;

  constructor(options: {
    status: number;
    statusText: string;
    url: string;
    method: string;
    rawBody: string;
    exception?: AdtExceptionData;
  }) {
    // Build a meaningful error message
    const baseMsg = `HTTP ${options.status}: ${options.statusText}`;
    const detailMsg =
      options.exception?.message || options.exception?.localizedMessage;
    const fullMsg = detailMsg ? `${baseMsg} - ${detailMsg}` : baseMsg;

    super(fullMsg);
    this.name = 'AdtError';
    this.status = options.status;
    this.statusText = options.statusText;
    this.url = options.url;
    this.method = options.method;
    this.rawBody = options.rawBody;
    this.exception = options.exception;

    // Maintain proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AdtError);
    }
  }

  /**
   * Get the most relevant error message
   */
  get detailMessage(): string {
    return (
      this.exception?.localizedMessage ||
      this.exception?.message ||
      this.statusText
    );
  }

  /**
   * Check if this is a specific error type
   */
  isType(type: string): boolean {
    return this.exception?.type === type;
  }

  /**
   * Check if this is from a specific namespace
   */
  isNamespace(namespace: string): boolean {
    return this.exception?.namespace === namespace;
  }

  /**
   * Get a property value from the exception
   */
  getProperty(key: string): string | undefined {
    return this.exception?.properties?.[key];
  }
}

/**
 * Parse ADT exception XML into structured data
 *
 * Uses the generated exception schema from @abapify/adt-schemas for type-safe parsing.
 */
export function parseAdtException(xml: string): AdtExceptionData | undefined {
  // Quick check if this looks like an ADT exception
  if (
    !xml.includes('exception') ||
    !xml.includes('http://www.sap.com/abapxml/types/communicationframework')
  ) {
    return undefined;
  }

  try {
    // Use the generated schema for type-safe parsing
    const parsed = exceptionSchema.parse(xml);
    const exc = parsed.exception;

    if (!exc) {
      return undefined;
    }

    const result: AdtExceptionData = {};

    // Map parsed schema to our interface
    // Note: ts-xsd uses $value for simpleContent text values
    if (exc.namespace?.id) {
      result.namespace = exc.namespace.id;
    }
    if (exc.type?.id) {
      result.type = exc.type.id;
    }
    if (exc.message?.$value) {
      result.message = exc.message.$value;
    }
    if (exc.localizedMessage?.$value) {
      result.localizedMessage = exc.localizedMessage.$value;
    }
    if (exc.properties?.entry) {
      result.properties = {};
      const entries = Array.isArray(exc.properties.entry)
        ? exc.properties.entry
        : [exc.properties.entry];
      for (const entry of entries) {
        if (entry.key && entry.$value) {
          result.properties[entry.key] = entry.$value;
        }
      }
    }

    // Return undefined if we didn't find any meaningful data
    if (
      !result.namespace &&
      !result.type &&
      !result.message &&
      !result.localizedMessage
    ) {
      return undefined;
    }

    return result;
  } catch {
    // If schema parsing fails, return undefined (not an ADT exception)
    return undefined;
  }
}

/**
 * Create an AdtError from HTTP response details
 */
export function createAdtError(
  status: number,
  statusText: string,
  url: string,
  method: string,
  rawBody: string,
): AdtError {
  const exception = parseAdtException(rawBody);
  return new AdtError({
    status,
    statusText,
    url,
    method,
    rawBody,
    exception,
  });
}
