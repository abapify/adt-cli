/**
 * Narrowed OpenAPI 3.1-compatible types used by the code generator.
 *
 * These are deliberately decoupled from `openapi-types` to keep the surface
 * small, stable, and friendly to ABAP emitters. `JsonSchema` is kept as an
 * open record for now — later waves will refine it into a discriminated union
 * when we need richer structural reasoning.
 */

export type JsonSchema = Record<string, unknown>;

export interface JsonSchemaRef {
  $ref: string;
}

export function isRef(x: unknown): x is JsonSchemaRef {
  return (
    typeof x === 'object' &&
    x !== null &&
    typeof (x as { $ref?: unknown }).$ref === 'string'
  );
}

export type HttpMethod =
  | 'get'
  | 'post'
  | 'put'
  | 'patch'
  | 'delete'
  | 'head'
  | 'options'
  | 'trace';

export type ParameterLocation = 'path' | 'query' | 'header' | 'cookie';

export interface SpecInfo {
  title: string;
  version: string;
  description?: string;
  termsOfService?: string;
  contact?: { name?: string; url?: string; email?: string };
  license?: { name: string; url?: string; identifier?: string };
}

export interface NormalizedServerVariable {
  default: string;
  enum?: string[];
  description?: string;
}

export interface NormalizedServer {
  url: string;
  description?: string;
  variables: Record<string, NormalizedServerVariable>;
}

export interface NormalizedParameter {
  name: string;
  in: ParameterLocation;
  required: boolean;
  schema: JsonSchema;
  style?: string;
  explode?: boolean;
  description?: string;
  deprecated: boolean;
}

export interface NormalizedMediaType {
  schema: JsonSchema;
}

export interface NormalizedRequestBody {
  required: boolean;
  description?: string;
  content: Record<string, NormalizedMediaType>;
}

export interface NormalizedHeader {
  schema: JsonSchema;
  description?: string;
  required?: boolean;
  deprecated?: boolean;
}

export interface NormalizedResponse {
  statusCode: string;
  isSuccess: boolean;
  isError: boolean;
  description?: string;
  content: Record<string, NormalizedMediaType>;
  headers: Record<string, NormalizedHeader>;
}

export interface NormalizedOperation {
  operationId: string;
  method: HttpMethod;
  path: string;
  tags: string[];
  summary?: string;
  description?: string;
  deprecated: boolean;
  parameters: NormalizedParameter[];
  requestBody?: NormalizedRequestBody;
  responses: NormalizedResponse[];
  security: SecurityRequirement[];
}

export interface SecuritySchemeApiKey {
  type: 'apiKey';
  name: string;
  in: 'header' | 'query' | 'cookie';
  description?: string;
}

export interface SecuritySchemeHttp {
  type: 'http';
  scheme: 'bearer' | 'basic' | string;
  bearerFormat?: string;
  description?: string;
}

export interface OAuthFlow {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes: Record<string, string>;
}

export interface SecuritySchemeOAuth2 {
  type: 'oauth2';
  flows: {
    implicit?: OAuthFlow;
    password?: OAuthFlow;
    clientCredentials?: OAuthFlow;
    authorizationCode?: OAuthFlow;
  };
  description?: string;
}

export interface SecuritySchemeOpenIdConnect {
  type: 'openIdConnect';
  openIdConnectUrl: string;
  description?: string;
}

export type SecurityScheme =
  | SecuritySchemeApiKey
  | SecuritySchemeHttp
  | SecuritySchemeOAuth2
  | SecuritySchemeOpenIdConnect;

/** Map of scheme-name → required scopes. */
export type SecurityRequirement = Record<string, string[]>;

export interface NormalizedSpec {
  openapiVersion: string;
  info: SpecInfo;
  servers: NormalizedServer[];
  operations: NormalizedOperation[];
  schemas: Record<string, JsonSchema>;
  securitySchemes: Record<string, SecurityScheme>;
}
