/**
 * RFC transport primitives.
 *
 * Flat value types kept deliberately loose — SAP RFC function modules
 * accept scalars, structures (objects), and tables (arrays of objects).
 */

/** A scalar RFC value — string, number, boolean, or bytes (base64) — or null. */
export type RfcScalar = string | number | boolean | null;

/** A structure — flat field->scalar mapping. Nested structures allowed. */
export interface RfcStructure {
  [field: string]: RfcScalar | RfcStructure | RfcTable;
}

/** A table — array of structures. */
export type RfcTable = RfcStructure[];

/** Top-level RFC parameter map. */
export type RfcParams = Record<string, RfcScalar | RfcStructure | RfcTable>;

/** Top-level RFC response map (same shape). */
export type RfcResponse = Record<string, RfcScalar | RfcStructure | RfcTable>;

/**
 * Options for one RFC call.
 */
export interface RfcCallOptions {
  /** Explicit sap-client override (otherwise uses the client's default). */
  client?: string;
  /** Abort signal. */
  signal?: AbortSignal;
}

/**
 * SOAP fault raised when the server returns a `soap:Fault`.
 */
export class RfcSoapFault extends Error {
  constructor(
    public readonly faultcode: string,
    public readonly faultstring: string,
    public readonly raw: string,
  ) {
    super(`SOAP Fault: ${faultcode}: ${faultstring}`);
    this.name = 'RfcSoapFault';
  }
}

/**
 * Raised when the HTTP endpoint /sap/bc/soap/rfc is unavailable
 * (401/403/404) — useful for gracefully skipping real-e2e tests
 * against systems where SOAP-RFC is disabled.
 */
export class RfcTransportUnavailable extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string,
    public readonly body: string,
  ) {
    super(
      `SOAP-RFC transport unavailable at ${url}: HTTP ${status}. ` +
        `The endpoint /sap/bc/soap/rfc may be disabled on this SAP system.`,
    );
    this.name = 'RfcTransportUnavailable';
  }
}
