import { readFile } from 'node:fs/promises';
import SwaggerParser from '@apidevtools/swagger-parser';
import YAML from 'yaml';
import type {
  HttpMethod,
  JsonSchema,
  NormalizedOperation,
  NormalizedParameter,
  NormalizedRequestBody,
  NormalizedResponse,
  NormalizedServer,
  NormalizedSpec,
  SecurityRequirement,
  SecurityScheme,
  SpecInfo,
} from './types.js';

type UnknownRecord = Record<string, unknown>;

const HTTP_METHODS: readonly HttpMethod[] = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
  'trace',
] as const;

function isRecord(x: unknown): x is UnknownRecord {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function asString(x: unknown): string | undefined {
  return typeof x === 'string' ? x : undefined;
}

function asBool(x: unknown, fallback: boolean): boolean {
  return typeof x === 'boolean' ? x : fallback;
}

function asArray(x: unknown): unknown[] {
  return Array.isArray(x) ? x : [];
}

function asStringArray(x: unknown): string[] {
  return asArray(x).filter((v): v is string => typeof v === 'string');
}

/**
 * Load and normalize an OpenAPI 3.x spec from a file path, URL, or in-memory
 * object. YAML files (`.yaml` / `.yml`) are read manually with the `yaml`
 * library first so we always hand SwaggerParser a parsed object — this keeps
 * our behaviour identical for local files and in-memory inputs.
 */
export async function loadSpec(
  input: string | URL | object,
): Promise<NormalizedSpec> {
  let raw: unknown;

  if (typeof input === 'string' && /\.ya?ml$/i.test(input)) {
    const text = await readFile(input, 'utf8');
    raw = YAML.parse(text);
  } else if (input instanceof URL) {
    raw = input.toString();
  } else {
    raw = input;
  }

  // Pre-capture component schema names before dereferencing (which would
  // inline them and lose the named handles).
  const namedSchemas = extractComponentSchemas(raw);

  let validated: unknown;
  try {
    // SwaggerParser mutates the input; pass a clone when it's an object so
    // we don't pollute the caller's reference.
    const parserInput = typeof raw === 'string' ? raw : structuredClone(raw);
    validated = await (
      SwaggerParser.validate as (api: unknown) => Promise<unknown>
    )(parserInput);
  } catch (err) {
    throw formatValidationError(err);
  }

  const dereferenced = (await (
    SwaggerParser.dereference as (api: unknown) => Promise<unknown>
  )(validated)) as UnknownRecord;

  return normalizeSpec(dereferenced, namedSchemas);
}

function formatValidationError(err: unknown): Error {
  if (err instanceof Error) {
    const details = (err as Error & { details?: unknown }).details;
    if (Array.isArray(details) && details.length > 0) {
      const top = details
        .slice(0, 3)
        .map((d, i) => {
          const msg =
            isRecord(d) && typeof d.message === 'string'
              ? d.message
              : String(d);
          return `  ${i + 1}. ${msg}`;
        })
        .join('\n');
      return new Error(`OpenAPI spec validation failed:\n${top}`);
    }
    return new Error(`OpenAPI spec validation failed: ${err.message}`);
  }
  return new Error(`OpenAPI spec validation failed: ${String(err)}`);
}

function extractComponentSchemas(raw: unknown): Record<string, JsonSchema> {
  const out: Record<string, JsonSchema> = {};
  if (!isRecord(raw)) return out;
  const components = raw.components;
  if (!isRecord(components)) return out;
  const schemas = components.schemas;
  if (!isRecord(schemas)) return out;
  for (const [name, schema] of Object.entries(schemas)) {
    if (isRecord(schema)) {
      out[name] = schema as JsonSchema;
    }
  }
  return out;
}

/**
 * Normalize a (presumed-dereferenced) OpenAPI document into our internal
 * shape. Callers who already have a dereferenced spec may invoke this
 * directly.
 */
export function normalizeSpec(
  dereferenced: unknown,
  namedSchemas: Record<string, JsonSchema> = {},
): NormalizedSpec {
  if (!isRecord(dereferenced)) {
    throw new Error('normalizeSpec: input must be an object');
  }

  const openapiVersion = asString(dereferenced.openapi) ?? '';
  const info = normalizeInfo(dereferenced.info);
  const servers = normalizeServers(dereferenced.servers);
  const securitySchemes = normalizeSecuritySchemes(
    isRecord(dereferenced.components)
      ? (dereferenced.components as UnknownRecord).securitySchemes
      : undefined,
  );
  const topLevelSecurity = normalizeSecurityRequirements(dereferenced.security);
  const operations = normalizeOperations(dereferenced.paths, topLevelSecurity);

  // Prefer the pre-captured named schemas (from before dereferencing) so the
  // original handles survive. Fall back to `components.schemas` from the
  // dereferenced tree when the caller didn't supply them.
  const schemas =
    Object.keys(namedSchemas).length > 0
      ? namedSchemas
      : extractComponentSchemas(dereferenced);

  return Object.freeze<NormalizedSpec>({
    openapiVersion,
    info,
    servers,
    operations,
    schemas,
    securitySchemes,
  });
}

function normalizeInfo(raw: unknown): SpecInfo {
  if (!isRecord(raw)) {
    return { title: '', version: '' };
  }
  const info: SpecInfo = {
    title: asString(raw.title) ?? '',
    version: asString(raw.version) ?? '',
  };
  const description = asString(raw.description);
  if (description !== undefined) info.description = description;
  const tos = asString(raw.termsOfService);
  if (tos !== undefined) info.termsOfService = tos;
  if (isRecord(raw.contact)) {
    const contact: SpecInfo['contact'] = {};
    const name = asString(raw.contact.name);
    if (name !== undefined) contact.name = name;
    const url = asString(raw.contact.url);
    if (url !== undefined) contact.url = url;
    const email = asString(raw.contact.email);
    if (email !== undefined) contact.email = email;
    info.contact = contact;
  }
  if (isRecord(raw.license)) {
    const license: NonNullable<SpecInfo['license']> = {
      name: asString(raw.license.name) ?? '',
    };
    const url = asString(raw.license.url);
    if (url !== undefined) license.url = url;
    const id = asString(raw.license.identifier);
    if (id !== undefined) license.identifier = id;
    info.license = license;
  }
  return info;
}

function normalizeServers(raw: unknown): NormalizedServer[] {
  return asArray(raw)
    .filter(isRecord)
    .map((s) => {
      const url = asString(s.url) ?? '';
      const variables: NormalizedServer['variables'] = {};
      if (isRecord(s.variables)) {
        for (const [k, v] of Object.entries(s.variables)) {
          if (!isRecord(v)) continue;
          const variable: NormalizedServer['variables'][string] = {
            default: asString(v.default) ?? '',
          };
          const enums = asStringArray(v.enum);
          if (enums.length > 0) variable.enum = enums;
          const desc = asString(v.description);
          if (desc !== undefined) variable.description = desc;
          variables[k] = variable;
        }
      }
      const server: NormalizedServer = { url, variables };
      const desc = asString(s.description);
      if (desc !== undefined) server.description = desc;
      return server;
    });
}

function normalizeSecuritySchemes(
  raw: unknown,
): Record<string, SecurityScheme> {
  const out: Record<string, SecurityScheme> = {};
  if (!isRecord(raw)) return out;
  for (const [name, schemeRaw] of Object.entries(raw)) {
    if (!isRecord(schemeRaw)) continue;
    const type = asString(schemeRaw.type);
    const description = asString(schemeRaw.description);
    switch (type) {
      case 'apiKey': {
        const inLoc = asString(schemeRaw.in);
        if (inLoc !== 'header' && inLoc !== 'query' && inLoc !== 'cookie')
          continue;
        const scheme: SecurityScheme = {
          type: 'apiKey',
          name: asString(schemeRaw.name) ?? name,
          in: inLoc,
        };
        if (description !== undefined) scheme.description = description;
        out[name] = scheme;
        break;
      }
      case 'http': {
        const scheme: SecurityScheme = {
          type: 'http',
          scheme: asString(schemeRaw.scheme) ?? 'bearer',
        };
        const bf = asString(schemeRaw.bearerFormat);
        if (bf !== undefined) scheme.bearerFormat = bf;
        if (description !== undefined) scheme.description = description;
        out[name] = scheme;
        break;
      }
      case 'oauth2': {
        const flowsRaw = isRecord(schemeRaw.flows) ? schemeRaw.flows : {};
        const scheme: SecurityScheme = {
          type: 'oauth2',
          flows: {},
        };
        for (const flowName of [
          'implicit',
          'password',
          'clientCredentials',
          'authorizationCode',
        ] as const) {
          const f = flowsRaw[flowName];
          if (!isRecord(f)) continue;
          const flow: {
            authorizationUrl?: string;
            tokenUrl?: string;
            refreshUrl?: string;
            scopes: Record<string, string>;
          } = {
            scopes: {},
          };
          if (isRecord(f.scopes)) {
            for (const [k, v] of Object.entries(f.scopes)) {
              if (typeof v === 'string') flow.scopes[k] = v;
            }
          }
          const au = asString(f.authorizationUrl);
          if (au !== undefined) flow.authorizationUrl = au;
          const tu = asString(f.tokenUrl);
          if (tu !== undefined) flow.tokenUrl = tu;
          const ru = asString(f.refreshUrl);
          if (ru !== undefined) flow.refreshUrl = ru;
          scheme.flows[flowName] = flow;
        }
        if (description !== undefined) scheme.description = description;
        out[name] = scheme;
        break;
      }
      case 'openIdConnect': {
        const url = asString(schemeRaw.openIdConnectUrl);
        if (url === undefined) continue;
        const scheme: SecurityScheme = {
          type: 'openIdConnect',
          openIdConnectUrl: url,
        };
        if (description !== undefined) scheme.description = description;
        out[name] = scheme;
        break;
      }
      default:
        // Unsupported security scheme type — skip.
        break;
    }
  }
  return out;
}

function normalizeSecurityRequirements(raw: unknown): SecurityRequirement[] {
  return asArray(raw)
    .filter(isRecord)
    .map((req) => {
      const out: SecurityRequirement = {};
      for (const [k, v] of Object.entries(req)) {
        out[k] = asStringArray(v);
      }
      return out;
    });
}

function normalizeOperations(
  pathsRaw: unknown,
  topLevelSecurity: SecurityRequirement[],
): NormalizedOperation[] {
  const ops: NormalizedOperation[] = [];
  if (!isRecord(pathsRaw)) return ops;

  // Iterate paths in insertion order for determinism.
  for (const [path, pathItemRaw] of Object.entries(pathsRaw)) {
    if (!isRecord(pathItemRaw)) continue;
    const pathLevelParams = normalizeParameters(pathItemRaw.parameters);

    for (const method of HTTP_METHODS) {
      const opRaw = pathItemRaw[method];
      if (!isRecord(opRaw)) continue;

      const opParams = normalizeParameters(opRaw.parameters);
      const parameters = mergeParameters(pathLevelParams, opParams);

      const operationId =
        asString(opRaw.operationId) ?? synthesizeOperationId(method, path);

      const op: NormalizedOperation = {
        operationId,
        method,
        path,
        tags: asStringArray(opRaw.tags),
        deprecated: asBool(opRaw.deprecated, false),
        parameters,
        responses: normalizeResponses(opRaw.responses),
        security:
          opRaw.security === undefined
            ? topLevelSecurity
            : normalizeSecurityRequirements(opRaw.security),
      };

      const summary = asString(opRaw.summary);
      if (summary !== undefined) op.summary = summary;
      const description = asString(opRaw.description);
      if (description !== undefined) op.description = description;

      const requestBody = normalizeRequestBody(opRaw.requestBody);
      if (requestBody !== undefined) op.requestBody = requestBody;

      ops.push(op);
    }
  }
  return ops;
}

function normalizeParameters(raw: unknown): NormalizedParameter[] {
  return asArray(raw)
    .filter(isRecord)
    .map((p) => {
      const inLoc = asString(p.in);
      if (
        inLoc !== 'path' &&
        inLoc !== 'query' &&
        inLoc !== 'header' &&
        inLoc !== 'cookie'
      ) {
        return undefined;
      }
      const name = asString(p.name);
      if (name === undefined) return undefined;

      const param: NormalizedParameter = {
        name,
        in: inLoc,
        required: inLoc === 'path' ? true : asBool(p.required, false),
        schema: isRecord(p.schema) ? (p.schema as JsonSchema) : {},
        deprecated: asBool(p.deprecated, false),
      };
      const style = asString(p.style);
      if (style !== undefined) param.style = style;
      if (typeof p.explode === 'boolean') param.explode = p.explode;
      const desc = asString(p.description);
      if (desc !== undefined) param.description = desc;
      return param;
    })
    .filter((p): p is NormalizedParameter => p !== undefined);
}

function mergeParameters(
  pathLevel: NormalizedParameter[],
  opLevel: NormalizedParameter[],
): NormalizedParameter[] {
  const key = (p: NormalizedParameter) => `${p.in}:${p.name}`;
  const merged = new Map<string, NormalizedParameter>();
  for (const p of pathLevel) merged.set(key(p), p);
  for (const p of opLevel) merged.set(key(p), p); // op-level wins
  return [...merged.values()];
}

function normalizeRequestBody(raw: unknown): NormalizedRequestBody | undefined {
  if (!isRecord(raw)) return undefined;
  const content: NormalizedRequestBody['content'] = {};
  if (isRecord(raw.content)) {
    for (const [mt, mtRaw] of Object.entries(raw.content)) {
      if (!isRecord(mtRaw)) continue;
      content[mt] = {
        schema: isRecord(mtRaw.schema) ? (mtRaw.schema as JsonSchema) : {},
      };
    }
  }
  const body: NormalizedRequestBody = {
    required: asBool(raw.required, false),
    content,
  };
  const desc = asString(raw.description);
  if (desc !== undefined) body.description = desc;
  return body;
}

function normalizeResponses(raw: unknown): NormalizedResponse[] {
  if (!isRecord(raw)) return [];
  const entries = Object.entries(raw).filter(
    (entry): entry is [string, UnknownRecord] => isRecord(entry[1]),
  );
  const has2xx = entries.some(([code]) => /^2\d\d$/.test(code));
  return entries.map(([statusCode, respRaw]) => {
    const isSuccess =
      /^2\d\d$/.test(statusCode) || (statusCode === 'default' && !has2xx);
    const isError =
      /^(4|5)\d\d$/.test(statusCode) || (statusCode === 'default' && has2xx);

    const content: NormalizedResponse['content'] = {};
    if (isRecord(respRaw.content)) {
      for (const [mt, mtRaw] of Object.entries(respRaw.content)) {
        if (!isRecord(mtRaw)) continue;
        content[mt] = {
          schema: isRecord(mtRaw.schema) ? (mtRaw.schema as JsonSchema) : {},
        };
      }
    }

    const headers: NormalizedResponse['headers'] = {};
    if (isRecord(respRaw.headers)) {
      for (const [hn, hRaw] of Object.entries(respRaw.headers)) {
        if (!isRecord(hRaw)) continue;
        const header: NormalizedResponse['headers'][string] = {
          schema: isRecord(hRaw.schema) ? (hRaw.schema as JsonSchema) : {},
        };
        const desc = asString(hRaw.description);
        if (desc !== undefined) header.description = desc;
        if (typeof hRaw.required === 'boolean') header.required = hRaw.required;
        if (typeof hRaw.deprecated === 'boolean')
          header.deprecated = hRaw.deprecated;
        headers[hn] = header;
      }
    }

    const resp: NormalizedResponse = {
      statusCode,
      isSuccess,
      isError,
      content,
      headers,
    };
    const desc = asString(respRaw.description);
    if (desc !== undefined) resp.description = desc;
    return resp;
  });
}

function synthesizeOperationId(method: HttpMethod, path: string): string {
  // Explicit character-by-character sanitization avoids super-linear regex
  // backtracking risks (Sonar `typescript:S5852`).
  const out: string[] = [];
  let underscore = false;
  let braceDepth = 0;
  for (const ch of path) {
    if (ch === '{') {
      braceDepth += 1;
      continue;
    }
    if (ch === '}') {
      if (braceDepth > 0) braceDepth -= 1;
      continue;
    }
    const isAlnum =
      (ch >= 'A' && ch <= 'Z') ||
      (ch >= 'a' && ch <= 'z') ||
      (ch >= '0' && ch <= '9');
    if (isAlnum) {
      out.push(ch);
      underscore = false;
    } else if (!underscore) {
      out.push('_');
      underscore = true;
    }
  }
  // Trim leading/trailing underscores.
  let start = 0;
  let end = out.length;
  while (start < end && out[start] === '_') start += 1;
  while (end > start && out[end - 1] === '_') end -= 1;
  return `${method}_${out.slice(start, end).join('')}`;
}
