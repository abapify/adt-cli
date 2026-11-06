import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { openApiDocument } from '../../adt-server/src/openapi.js';

type OpenApiRecord = Record<string, unknown>;

interface GeneratedOperation {
  id: string;
  method: string;
  path: string;
  pathParameters: string[];
  queryParameters: string[];
  paramsType: string;
  responseType: string;
  hasInput: boolean;
}

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete']);
const generatedFile = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../src/generated.ts',
);

function record(value: unknown): OpenApiRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Expected an OpenAPI object.');
  }
  return value as OpenApiRecord;
}

function optionalRecord(value: unknown): OpenApiRecord | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return undefined;
  return value as OpenApiRecord;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function key(name: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(name) ? name : JSON.stringify(name);
}

function typeName(operationId: string): string {
  return `${operationId.charAt(0).toUpperCase()}${operationId.slice(1)}`;
}

function literal(value: unknown): string {
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value);
  if (value === null) return 'null';
  return 'unknown';
}

/** `Array.isArray(value)` guard with an empty-array fallback. */
function arrayOrEmpty(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Collect the (string) entries of the schema `type` field. */
function schemaTypeList(schema: OpenApiRecord): string[] {
  const candidates = Array.isArray(schema.type) ? schema.type : [schema.type];
  return candidates.filter(
    (candidate): candidate is string => typeof candidate === 'string',
  );
}

/** Render an object-schema body (properties + additionalProperties). */
function renderObjectSchema(schema: OpenApiRecord): string {
  const properties = optionalRecord(schema.properties) ?? {};
  const required = new Set(
    arrayOrEmpty(schema.required).filter(
      (entry): entry is string => typeof entry === 'string',
    ),
  );
  const fields = Object.entries(properties).map(
    ([property, propertySchema]) =>
      `${key(property)}${required.has(property) ? '' : '?'}: ${schemaToType(propertySchema)};`,
  );
  if (schema.additionalProperties === true)
    fields.push('[key: string]: unknown;');
  else if (optionalRecord(schema.additionalProperties)) {
    fields.push(`[key: string]: ${schemaToType(schema.additionalProperties)};`);
  }
  return fields.length > 0
    ? `{ ${fields.join(' ')} }`
    : 'Record<string, never>';
}

function schemaToType(value: unknown): string {
  // Recursive JSON Schema to TS conversion.
  const schema = optionalRecord(value);
  if (!schema) return 'unknown';
  if ('const' in schema) return literal(schema.const);
  if (Array.isArray(schema.enum)) return schema.enum.map(literal).join(' | ');
  const variants = [
    ...arrayOrEmpty(schema.anyOf),
    ...arrayOrEmpty(schema.oneOf),
  ];
  if (variants.length > 0) return variants.map(schemaToType).join(' | ');

  const type = schemaTypeList(schema);
  const nullable = type.includes('null');
  const baseType = type.find((candidate) => candidate !== 'null');
  if (!baseType && nullable) return 'null';
  let rendered: string;
  if (baseType === 'array' || schema.items) {
    const item = schemaToType(schema.items);
    rendered = `Array<${item}>`;
  } else if (
    baseType === 'object' ||
    schema.properties ||
    schema.additionalProperties
  ) {
    rendered = renderObjectSchema(schema);
  } else if (baseType === 'string') rendered = 'string';
  else if (baseType === 'number' || baseType === 'integer') rendered = 'number';
  else if (baseType === 'boolean') rendered = 'boolean';
  else rendered = 'unknown';
  return nullable ? `${rendered} | null` : rendered;
}

function resolveParameter(
  value: unknown,
  document: OpenApiRecord,
): OpenApiRecord {
  const parameter = record(value);
  const reference = stringValue(parameter.$ref);
  if (!reference) return parameter;
  const prefix = '#/components/parameters/';
  if (!reference.startsWith(prefix)) {
    throw new Error(`Unsupported OpenAPI parameter reference: ${reference}`);
  }
  const parameters = optionalRecord(
    optionalRecord(document.components)?.parameters,
  );
  const resolved = parameters?.[reference.slice(prefix.length)];
  if (!resolved)
    throw new Error(`Unknown OpenAPI parameter reference: ${reference}`);
  return record(resolved);
}

function jsonSchema(content: unknown): unknown {
  return optionalRecord(optionalRecord(content)?.['application/json'])?.schema;
}

/** Build one `GeneratedOperation` from an OpenAPI operation object. */
function buildOperation(
  path: string,
  method: string,
  operationInput: unknown,
  document: OpenApiRecord,
): GeneratedOperation {
  const operation = record(operationInput);
  const id = stringValue(operation.operationId);
  if (!id)
    throw new Error(
      `OpenAPI operation ${method.toUpperCase()} ${path} has no operationId.`,
    );
  const parameters = arrayOrEmpty(operation.parameters)
    .map((parameter) => resolveParameter(parameter, document))
    .filter((parameter) =>
      ['path', 'query'].includes(stringValue(parameter.in) ?? ''),
    );
  const parameterFields = parameters.map((parameter) => {
    const name = stringValue(parameter.name);
    if (!name)
      throw new Error(`OpenAPI operation ${id} has an unnamed parameter.`);
    return `${key(name)}${parameter.required === true ? '' : '?'}: ${schemaToType(parameter.schema)};`;
  });
  const requestBody = optionalRecord(operation.requestBody);
  const bodySchema = requestBody ? jsonSchema(requestBody.content) : undefined;
  if (bodySchema)
    parameterFields.push(
      `body${requestBody.required === true ? '' : '?'}: ${schemaToType(bodySchema)};`,
    );
  const success = optionalRecord(record(operation.responses)['200']);
  const responseSchema = success ? jsonSchema(success.content) : undefined;
  return {
    id,
    method: method.toUpperCase(),
    path,
    pathParameters: parameters
      .filter((parameter) => parameter.in === 'path')
      .map((parameter) => stringValue(parameter.name)!),
    queryParameters: parameters
      .filter((parameter) => parameter.in === 'query')
      .map((parameter) => stringValue(parameter.name)!),
    paramsType:
      parameterFields.length > 0
        ? `{ ${parameterFields.join(' ')} }`
        : 'Record<string, never>',
    responseType: schemaToType(responseSchema),
    hasInput: parameterFields.length > 0,
  };
}

function collectOperations(documentInput: unknown): GeneratedOperation[] {
  // OpenAPI operation collection.
  const document = record(documentInput);
  const paths = record(document.paths);
  const operations: GeneratedOperation[] = [];
  for (const [path, pathItem] of Object.entries(paths)) {
    for (const [method, operationInput] of Object.entries(record(pathItem))) {
      if (!HTTP_METHODS.has(method)) continue;
      operations.push(buildOperation(path, method, operationInput, document));
    }
  }
  return operations.sort((left, right) => left.id.localeCompare(right.id));
}

export async function renderOpenApiClient(document: unknown): Promise<string> {
  const operations = collectOperations(document);
  const definitionSource = operations
    .map(
      (operation) =>
        `${key(operation.id)}: ${JSON.stringify(
          {
            method: operation.method,
            path: operation.path,
            pathParameters: operation.pathParameters,
            queryParameters: operation.queryParameters,
            hasBody: operation.paramsType.includes('body'),
          },
          null,
          2,
        )},`,
    )
    .join('\n');
  const typeSource = operations
    .flatMap((operation) => [
      `export type ${typeName(operation.id)}Params = ${operation.paramsType};`,
      `export type ${typeName(operation.id)}Response = ${operation.responseType};`,
    ])
    .join('\n');
  const methodSource = operations
    .map((operation) => {
      const name = typeName(operation.id);
      return operation.hasInput
        ? `${key(operation.id)}: (params: ${name}Params, requestOptions?: AdtServerRequestOptions) => request<${name}Response>(operationDefinitions.${operation.id}, params, requestOptions),`
        : `${key(operation.id)}: (requestOptions?: AdtServerRequestOptions) => request<${name}Response>(operationDefinitions.${operation.id}, undefined, requestOptions),`;
    })
    .join('\n');
  const source = `/**\n * GENERATED FROM @abapify/adt-server's OpenAPI document.\n * Run \`bun run --filter @abapify/adt-server-client generate\`; do not edit manually.\n */\n\nexport interface AdtServerClientOptions {\n  baseUrl: string;\n  fetch?: typeof globalThis.fetch;\n  headers?: Record<string, string>;\n}\n\nexport interface AdtServerRequestOptions {\n  signal?: AbortSignal;\n}\n\nexport class AdtServerHttpError extends Error {\n  constructor(\n    readonly status: number,\n    readonly body: unknown,\n  ) {\n    super(\`ADT Server request failed (\${status})\`);\n  }\n}\n\ntype OperationDefinition = {\n  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';\n  path: string;\n  pathParameters: readonly string[];\n  queryParameters: readonly string[];\n  hasBody: boolean;\n};\n\nconst operationDefinitions = {\n${definitionSource}\n} as const satisfies Record<string, OperationDefinition>;\n\n${typeSource}\n\nfunction inputValue(input: object | undefined, name: string): unknown {\n  return (input as Record<string, unknown> | undefined)?.[name];\n}\n\nexport function createAdtServerClient(options: AdtServerClientOptions) {\n  const fetcher = options.fetch ?? globalThis.fetch;\n  const request = async <T>(\n    definition: OperationDefinition,\n    input?: object,\n    requestOptions?: AdtServerRequestOptions,\n  ): Promise<T> => {\n    const path = definition.path.replace(/\\{([A-Za-z_$][A-Za-z0-9_$]*)\\}/gu, (_match, name: string) => {\n      const value = inputValue(input, name);\n      if (value === undefined || value === null) {\n        throw new Error(\`Missing required path parameter: \${name}\`);\n      }\n      return encodeURIComponent(String(value)); // NOSONAR\n    });\n    const url = new URL(path, options.baseUrl);\n    for (const name of definition.queryParameters) {\n      const value = inputValue(input, name);\n      if (value !== undefined && value !== null) url.searchParams.set(name, String(value)); // NOSONAR\n    }\n    const body = inputValue(input, 'body');\n    const response = await fetcher(url, {\n      method: definition.method,\n      headers: {\n        accept: 'application/json',\n        ...(definition.hasBody ? { 'content-type': 'application/json' } : {}),\n        ...options.headers,\n      },\n      ...(definition.hasBody ? { body: JSON.stringify(body) } : {}),\n      signal: requestOptions?.signal,\n    });\n    const responseBody = await response.json().catch(() => undefined);\n    if (!response.ok) {\n      throw new AdtServerHttpError(response.status, responseBody);\n    }\n    return responseBody as T;\n  };\n\n  return {\n${methodSource}\n  };\n}\n\nexport type AdtServerClient = ReturnType<typeof createAdtServerClient>;\n`;
  return await format(source, {
    ...(await resolveConfig(generatedFile)),
    filepath: generatedFile,
    parser: 'typescript',
  });
}

async function main(): Promise<void> {
  const generated = await renderOpenApiClient(openApiDocument);
  if (process.argv.includes('--check')) {
    const current = await readFile(generatedFile, 'utf8').catch(() => '');
    if (current !== generated) {
      throw new Error('Generated client is stale. Run the generate script.');
    }
    return;
  }
  await writeFile(generatedFile, generated, 'utf8');
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
