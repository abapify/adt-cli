/**
 * Data Preview response schema (hand-built JSON schema)
 *
 * The SAP ADT data preview freestyle endpoint returns JSON of the shape:
 *
 *   {
 *     totalRows: number,
 *     isHanaAnalyticalView: boolean,
 *     executedQueryString: string,
 *     queryExecutionTime: number,
 *     dataPreview: {
 *       columns: Array<{
 *         metadata: { name, type, length, description, keyAttribute, ... },
 *         dataPreviewContent: Array<string | null>,
 *       }>,
 *     },
 *   }
 *
 * For robustness across SAP releases the schema accepts an arbitrary object
 * shape (index signature) and only strongly types the fields we actually
 * consume in the CLI / ADK layers.
 */
import type { Serializable } from '@abapify/speci/rest';

/** Column metadata block in a data-preview response */
export interface DataPreviewColumnMetadata {
  name?: string;
  type?: string;
  length?: number | string;
  description?: string;
  /** Some SAP releases use isKey / keyAttribute / key interchangeably */
  isKey?: boolean;
  keyAttribute?: boolean;
  [extra: string]: unknown;
}

/** One column entry including both metadata and the column's values */
export interface DataPreviewColumn {
  metadata?: DataPreviewColumnMetadata;
  /** Column values, one entry per row in document order */
  dataPreviewContent?: Array<string | null>;
  [extra: string]: unknown;
}

/** dataPreview wrapper */
export interface DataPreviewPayload {
  columns?: DataPreviewColumn[];
  [extra: string]: unknown;
}

/** Full freestyle response body */
export interface DataPreviewFreestyleResponse {
  totalRows?: number;
  isHanaAnalyticalView?: boolean;
  executedQueryString?: string;
  queryExecutionTime?: number;
  dataPreview?: DataPreviewPayload;
  [extra: string]: unknown;
}

/**
 * Hand-built Serializable schema for the data preview freestyle response.
 *
 * Shape mirrors the ts-xsd `TypedSchema` pattern so it plugs into speci's
 * `Inferrable`/`Serializable` type inference (`_infer`, `parse`, `build`).
 *
 * The adapter calls `schema.parse(raw)` / `schema.build(data)`, so we keep
 * both sides as plain JSON (de)serialisation.
 */
export const dataPreviewFreestyleResponseSchema: Serializable<DataPreviewFreestyleResponse> =
  {
    _infer: undefined as unknown as DataPreviewFreestyleResponse,
    parse: (raw: string): DataPreviewFreestyleResponse => {
      if (raw == null || raw === '') return {};
      return JSON.parse(raw) as DataPreviewFreestyleResponse;
    },
    build: (data: DataPreviewFreestyleResponse): string => JSON.stringify(data),
  };

/**
 * Request-body schema: the endpoint accepts a raw SQL SELECT string as
 * `text/plain`. We still model it as a Serializable so speci correctly
 * infers the `string` body parameter at the client call site.
 */
export const dataPreviewFreestyleRequestSchema: Serializable<string> = {
  _infer: undefined as unknown as string,
  parse: (raw: string): string => raw,
  build: (data: string): string => data,
};
