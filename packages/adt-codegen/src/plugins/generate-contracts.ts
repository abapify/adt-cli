/**
 * Contract Generator Plugin for adt-codegen
 *
 * Generates type-safe speci contracts from ADT discovery data.
 *
 * Features:
 * - Whitelist-based generation (only enabled endpoints)
 * - Content-type to schema mapping
 * - Generates reference doc for available endpoints
 * - Fully configurable via hooks for consumer customization
 * - Works directly from discovery XML (no pre-processing needed)
 */

import { readdir, readFile, writeFile, mkdir, rm } from 'fs/promises';
import { join, dirname, relative } from 'path';
import { existsSync } from 'fs';
import { parseDiscoveryXml, getAllCollections } from './discovery-parser';
import {
  type EndpointDefinition,
  type NormalizedEndpointConfig,
  type HttpMethod,
  findMatchingEndpoint,
  isMethodEnabled,
  isPathEnabled,
} from './endpoint-config';

interface ContentTypeMapping {
  mapping: Record<string, string>;
  fallbacks: Record<string, string>;
}

/** @deprecated Use EndpointDefinition[] instead */
interface LegacyEnabledEndpoints {
  enabled: string[];
  notes?: Record<string, string>;
}

/** Enabled endpoints - array of definitions or legacy format */
type EnabledEndpoints = EndpointDefinition[] | LegacyEnabledEndpoints;

interface CollectionJson {
  href: string;
  title: string;
  accepts: string[];
  category: { term: string; scheme: string };
  templateLinks: Array<{ rel: string; template: string }>;
}

interface EndpointMethod {
  name: string;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  pathParams: string[];
  queryParams: string[];
  accept: string;
  contentType?: string;
  requestSchema?: string;
  responseSchema?: string;
  description: string;
}

/**
 * Import configuration for generated contracts
 * Allows consumers to customize where imports come from
 */
export interface ContractImports {
  /**
   * Module path for http and contract utilities
   * @example '#base' (tsconfig path alias)
   */
  base: string;

  /**
   * Module path for schema imports
   * @example '#schemas' (tsconfig path alias)
   */
  schemas: string;
}

/**
 * Hook to resolve import paths for a generated contract file
 * @param relativePath - Path of the generated file relative to output dir (e.g., 'sap/bc/adt/atc/worklists')
 * @param outputDir - The output directory for generated contracts
 * @returns Import paths for base and schemas
 */
export type ResolveImportsHook = (
  relativePath: string,
  outputDir: string,
) => ContractImports;

export interface GenerateContractsOptions {
  collectionsDir: string;
  outputDir: string;
  docsDir: string;

  /**
   * Content-type mapping - either file path (string) or config object
   */
  contentTypeMapping: string | ContentTypeMapping;

  /**
   * Enabled endpoints - either file path (string) or config object
   */
  enabledEndpoints: string | EnabledEndpoints;

  /**
   * Hook to resolve import paths for generated contracts.
   * If not provided, uses relative path calculation (default behavior).
   */
  resolveImports?: ResolveImportsHook;

  /**
   * Clean output directory before generating.
   * When true, removes all files in outputDir before generating new contracts.
   * @default false
   */
  clean?: boolean;
}

/**
 * Default import resolver - uses tsconfig path aliases
 *
 * Uses #base and #schemas aliases which are configured in tsconfig.json paths.
 * tsdown 0.18+ resolves these in both JS and .d.ts output.
 */
export function defaultResolveImports(
  _relativePath: string,
  _outputDir: string,
): ContractImports {
  return {
    base: '#base',
    schemas: '#schemas',
  };
}

let contentTypeMapping: ContentTypeMapping;
let enabledEndpointsList: EndpointDefinition[];

async function loadMapping(mappingPath: string): Promise<void> {
  const content = await readFile(mappingPath, 'utf-8');
  contentTypeMapping = JSON.parse(content);
}

async function loadEnabledEndpoints(path: string): Promise<void> {
  const content = await readFile(path, 'utf-8');
  const parsed = JSON.parse(content);
  enabledEndpointsList = normalizeEnabledEndpoints(parsed);
}

/** Check if endpoints config is legacy format */
function isLegacyFormat(
  endpoints: EnabledEndpoints,
): endpoints is LegacyEnabledEndpoints {
  return !Array.isArray(endpoints) && 'enabled' in endpoints;
}

/** Convert legacy or new format to EndpointDefinition[] */
function normalizeEnabledEndpoints(
  endpoints: EnabledEndpoints,
): EndpointDefinition[] {
  if (isLegacyFormat(endpoints)) {
    // Convert legacy { enabled: string[] } to EndpointDefinition[]
    return endpoints.enabled;
  }
  return endpoints;
}

function isEndpointEnabled(href: string): boolean {
  return isPathEnabled(href, enabledEndpointsList);
}

function getEndpointConfig(href: string): NormalizedEndpointConfig | undefined {
  return findMatchingEndpoint(href, enabledEndpointsList);
}

function isMethodEnabledForEndpoint(href: string, method: HttpMethod): boolean {
  return isMethodEnabled(href, method, enabledEndpointsList);
}

function getSchemaFromContentType(contentType: string): string | undefined {
  return contentTypeMapping.mapping[contentType];
}

function getSchemaFromPath(href: string): string | undefined {
  for (const [pathPattern, schema] of Object.entries(
    contentTypeMapping.fallbacks,
  )) {
    if (href.includes(pathPattern)) {
      return schema;
    }
  }
  return undefined;
}

function inferSchema(href: string, accepts: string[]): string | undefined {
  for (const accept of accepts) {
    const schema = getSchemaFromContentType(accept);
    if (schema) return schema;
  }
  return getSchemaFromPath(href);
}

function parseTemplate(template: string): {
  path: string;
  pathParams: string[];
  queryParams: string[];
} {
  const pathParams: string[] = [];
  const queryParams: string[] = [];

  const queryMatch = template.match(/\{\?([^}]+)\}/);
  if (queryMatch) {
    queryParams.push(...queryMatch[1].split(',').map(sanitizeParamName));
  }

  const path = template.replace(/\{\?[^}]+\}/, '');

  const pathMatches = path.matchAll(/\{([^}]+)\}/g);
  for (const match of pathMatches) {
    pathParams.push(sanitizeParamName(match[1]));
  }

  return { path, pathParams, queryParams };
}

/** Sanitize parameter name to be a valid TypeScript identifier */
function sanitizeParamName(name: string): string {
  // Remove leading special characters like & or *
  let sanitized = name.replace(/^[&*]+/, '');
  // Replace any remaining invalid characters with underscore
  sanitized = sanitized.replace(/[^a-zA-Z0-9_]/g, '_');
  // Ensure it starts with a letter or underscore
  if (/^[0-9]/.test(sanitized)) {
    sanitized = '_' + sanitized;
  }
  return sanitized || 'param';
}

function inferMethod(rel: string): 'GET' | 'POST' | 'PUT' | 'DELETE' {
  const r = rel.toLowerCase();
  if (r.includes('/new') || r.includes('/create') || r.includes('/run'))
    return 'POST';
  if (r.includes('/update') || r.includes('/apply')) return 'PUT';
  if (r.includes('/delete')) return 'DELETE';
  return 'GET';
}

function methodNameFromRel(
  rel: string,
  httpMethod: string,
  existingNames: Set<string>,
): string {
  const parts = rel.split('/').filter(Boolean);
  let name = parts[parts.length - 1] ?? httpMethod.toLowerCase();

  name = name
    .replace(/^relations?$/, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();

  if (
    !name ||
    ['get', 'post', 'put', 'delete', 'new', 'create'].includes(name)
  ) {
    name = httpMethod.toLowerCase();
  }

  let finalName = name;
  let counter = 2;
  while (existingNames.has(finalName)) {
    finalName = name + counter;
    counter++;
  }
  existingNames.add(finalName);

  return finalName;
}

function processCollection(coll: CollectionJson): EndpointMethod[] {
  const methods: EndpointMethod[] = [];
  const endpointConfig = getEndpointConfig(coll.href);
  const schema = endpointConfig?.schema ?? inferSchema(coll.href, coll.accepts);
  // Use accept override from config, or fall back to discovery value
  const accept = endpointConfig?.accept ?? coll.accepts[0] ?? 'application/xml';
  const methodNames = new Set<string>();

  if (coll.templateLinks.length === 0) {
    // Only add GET if method filtering allows it
    if (isMethodEnabledForEndpoint(coll.href, 'GET')) {
      methods.push({
        name: 'get',
        httpMethod: 'GET',
        path: coll.href,
        pathParams: [],
        queryParams: [],
        accept,
        responseSchema: schema,
        description: 'GET ' + coll.title,
      });
    }
  } else {
    for (const link of coll.templateLinks) {
      const { path, pathParams, queryParams } = parseTemplate(link.template);
      const httpMethod = inferMethod(link.rel);

      // Skip if method is not enabled for this endpoint
      if (!isMethodEnabledForEndpoint(coll.href, httpMethod)) {
        continue;
      }

      const methodName = methodNameFromRel(link.rel, httpMethod, methodNames);

      const method: EndpointMethod = {
        name: methodName,
        httpMethod,
        path,
        pathParams,
        queryParams,
        accept,
        responseSchema: schema,
        description: httpMethod + ' ' + coll.title,
      };

      if (httpMethod === 'POST' || httpMethod === 'PUT') {
        method.contentType = accept;
        method.requestSchema = schema;
      }

      methods.push(method);
    }
  }

  return methods;
}

function generateMethodCode(method: EndpointMethod, indent: string): string {
  const {
    name,
    httpMethod,
    path,
    pathParams,
    queryParams,
    accept,
    contentType,
    requestSchema,
    responseSchema,
    description,
  } = method;

  const params: string[] = [];
  for (const param of pathParams) {
    params.push(param + ': string');
  }
  if (queryParams.length > 0) {
    const queryType = queryParams.map((p) => p + '?: string').join('; ');
    params.push('params?: { ' + queryType + ' }');
  }

  const paramsStr = params.join(', ');

  let pathExpr: string;
  if (pathParams.length > 0) {
    // Sanitize parameter names in the path expression
    pathExpr =
      '`' +
      path.replace(
        /\{([^}]+)\}/g,
        (_, p) => '${' + sanitizeParamName(p) + '}',
      ) +
      '`';
  } else {
    pathExpr = "'" + path + "'";
  }

  const options: string[] = [];
  if (queryParams.length > 0) {
    options.push('query: params');
  }
  if (requestSchema) {
    options.push('body: ' + requestSchema);
  }
  options.push('responses: { 200: ' + (responseSchema || 'undefined') + ' }');

  const headers: string[] = ["Accept: '" + accept + "'"];
  if (contentType) {
    headers.push("'Content-Type': '" + contentType + "'");
  }
  options.push('headers: { ' + headers.join(', ') + ' }');

  const httpMethodLower = httpMethod.toLowerCase();

  return (
    indent +
    '/**\n' +
    indent +
    ' * ' +
    description +
    '\n' +
    indent +
    ' */\n' +
    indent +
    name +
    ': (' +
    paramsStr +
    ') =>\n' +
    indent +
    '  http.' +
    httpMethodLower +
    '(' +
    pathExpr +
    ', {\n' +
    indent +
    '    ' +
    options.join(',\n' + indent + '    ') +
    ',\n' +
    indent +
    '  }),\n'
  );
}

/**
 * Generate a CRUD contract file using the crud() helper
 */
function generateCrudContractFile(
  coll: CollectionJson,
  relativePath: string,
  imports: ContractImports,
  config: NormalizedEndpointConfig,
): string {
  const contractName = relativePath.split('/').pop() || 'contract';
  const schema = config.schema;
  const accept = config.accept;

  if (!schema || !accept) {
    throw new Error(
      `CRUD contract requires schema and accept for ${coll.href}`,
    );
  }

  let code =
    '/**\n' +
    ' * ' +
    coll.title +
    '\n' +
    ' * \n' +
    ' * Endpoint: ' +
    coll.href +
    '\n' +
    ' * Category: ' +
    coll.category.term +
    '\n' +
    ' * \n' +
    ' * Full CRUD operations following ADT URL template:\n' +
    ' *   {basePath}/{object_name}{?corrNr,lockHandle,version,accessMode,_action}\n' +
    ' * \n' +
    ' * @generated - DO NOT EDIT MANUALLY\n' +
    ' */\n\n' +
    "import { crud } from '" +
    imports.base +
    "';\n" +
    'import { ' +
    schema +
    " } from '" +
    imports.schemas +
    "';\n\n" +
    'export const ' +
    contractName +
    'Contract = crud({\n' +
    "  basePath: '" +
    coll.href +
    "',\n" +
    '  schema: ' +
    schema +
    ',\n' +
    "  contentType: '" +
    accept +
    "',\n" +
    '});\n\n' +
    'export type ' +
    contractName.charAt(0).toUpperCase() +
    contractName.slice(1) +
    'Contract = typeof ' +
    contractName +
    'Contract;\n';

  return code;
}

function generateContractFile(
  coll: CollectionJson,
  methods: EndpointMethod[],
  relativePath: string,
  imports: ContractImports,
): string {
  const schemas = new Set<string>();
  for (const method of methods) {
    if (method.responseSchema) schemas.add(method.responseSchema);
    if (method.requestSchema) schemas.add(method.requestSchema);
  }

  const availableSchemas = new Set(Object.values(contentTypeMapping.mapping));
  const schemaImports = Array.from(schemas)
    .filter((s) => availableSchemas.has(s))
    .sort();

  const contractName = relativePath.split('/').pop() || 'contract';

  let code =
    '/**\n' +
    ' * ' +
    coll.title +
    '\n' +
    ' * \n' +
    ' * Endpoint: ' +
    coll.href +
    '\n' +
    ' * Category: ' +
    coll.category.term +
    '\n' +
    ' * \n' +
    ' * @generated - DO NOT EDIT MANUALLY\n' +
    ' */\n\n' +
    "import { http, contract } from '" +
    imports.base +
    "';\n";

  if (schemaImports.length > 0) {
    code +=
      'import { ' +
      schemaImports.join(', ') +
      " } from '" +
      imports.schemas +
      "';\n";
  }

  code += '\nexport const ' + contractName + 'Contract = contract({\n';

  for (const method of methods) {
    code += generateMethodCode(method, '  ');
  }

  code +=
    '});\n\n' +
    'export type ' +
    contractName.charAt(0).toUpperCase() +
    contractName.slice(1) +
    'Contract = typeof ' +
    contractName +
    'Contract;\n';

  return code;
}

function generateIndexFile(
  contracts: Array<{ relativePath: string; contractName: string }>,
): string {
  let code =
    '/**\n' +
    ' * Generated ADT Contracts Index\n' +
    ' * \n' +
    ' * Only includes enabled endpoints from config/enabled-endpoints.json\n' +
    ' * See docs/adt-endpoints.md for available but not-yet-enabled endpoints.\n' +
    ' * \n' +
    ' * @generated - DO NOT EDIT MANUALLY\n' +
    ' */\n\n';

  // Track used export names to avoid duplicates
  const usedNames = new Set<string>();

  // Generate unique export name from path
  function getUniqueExportName(
    relativePath: string,
    contractName: string,
  ): string {
    // Start with just the contract name
    let exportName = contractName + 'Contract';

    if (!usedNames.has(exportName)) {
      usedNames.add(exportName);
      return exportName;
    }

    // If duplicate, prefix with parent directory names until unique
    const parts = relativePath.split('/');
    for (let i = parts.length - 2; i >= 0; i--) {
      const prefix = parts
        .slice(i, -1)
        .map((p) =>
          p.replace(/[^a-zA-Z0-9]/g, '').replace(/^./, (c) => c.toUpperCase()),
        )
        .join('');
      exportName =
        prefix +
        contractName.charAt(0).toUpperCase() +
        contractName.slice(1) +
        'Contract';

      if (!usedNames.has(exportName)) {
        usedNames.add(exportName);
        return exportName;
      }
    }

    // Fallback: add numeric suffix
    let counter = 2;
    const baseName = contractName + 'Contract';
    while (usedNames.has(exportName)) {
      exportName = baseName + counter;
      counter++;
    }
    usedNames.add(exportName);
    return exportName;
  }

  const byDir = new Map<
    string,
    Array<{ relativePath: string; contractName: string; exportName: string }>
  >();

  for (const c of contracts) {
    const dir = dirname(c.relativePath);
    if (!byDir.has(dir)) {
      byDir.set(dir, []);
    }
    const dirContracts = byDir.get(dir);
    if (dirContracts) {
      const exportName = getUniqueExportName(c.relativePath, c.contractName);
      dirContracts.push({ ...c, exportName });
    }
  }

  for (const [dir, items] of Array.from(byDir.entries()).sort()) {
    code += '// ' + dir + '\n';
    for (const item of items.sort((a, b) =>
      a.contractName.localeCompare(b.contractName),
    )) {
      if (item.exportName === item.contractName + 'Contract') {
        code +=
          'export { ' +
          item.contractName +
          "Contract } from './" +
          item.relativePath +
          "';\n";
      } else {
        code +=
          'export { ' +
          item.contractName +
          'Contract as ' +
          item.exportName +
          " } from './" +
          item.relativePath +
          "';\n";
      }
    }
    code += '\n';
  }

  return code;
}

function generateUnsupportedEndpointsDoc(
  unsupported: Array<{ href: string; title: string; category: string }>,
  enabled: Array<{ href: string; title: string; category: string }>,
): string {
  let doc = '# ADT Endpoints Reference\n\n';
  doc += '> Auto-generated from SAP ADT discovery data.\n';
  doc +=
    '> To enable an endpoint, add it to `adt-codegen` config/enabled-endpoints.json\n\n';

  doc += '## Enabled Endpoints (' + enabled.length + ')\n\n';
  doc +=
    'These endpoints have generated contracts in `src/generated/adt/`:\n\n';
  doc += '| Endpoint | Title | Category |\n';
  doc += '|----------|-------|----------|\n';
  for (const e of enabled.sort((a, b) => a.href.localeCompare(b.href))) {
    doc += '| `' + e.href + '` | ' + e.title + ' | ' + e.category + ' |\n';
  }

  doc +=
    '\n## Available Endpoints (Not Yet Enabled) (' +
    unsupported.length +
    ')\n\n';
  doc +=
    'These endpoints were discovered but no contracts are generated yet:\n\n';

  // Group by top-level path
  const byArea = new Map<
    string,
    Array<{ href: string; title: string; category: string }>
  >();
  for (const e of unsupported) {
    const parts = e.href.split('/');
    const area = parts.slice(0, 5).join('/'); // /sap/bc/adt/xxx
    if (!byArea.has(area)) {
      byArea.set(area, []);
    }
    const areaEndpoints = byArea.get(area);
    if (areaEndpoints) {
      areaEndpoints.push(e);
    }
  }

  for (const [area, endpoints] of Array.from(byArea.entries()).sort()) {
    doc += '### ' + area + ' (' + endpoints.length + ' endpoints)\n\n';
    doc += '<details>\n<summary>Click to expand</summary>\n\n';
    doc += '| Endpoint | Title |\n';
    doc += '|----------|-------|\n';
    for (const e of endpoints.sort((a, b) => a.href.localeCompare(b.href))) {
      doc += '| `' + e.href + '` | ' + e.title + ' |\n';
    }
    doc += '\n</details>\n\n';
  }

  return doc;
}

async function findJsonFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(currentDir: string) {
    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.name.endsWith('.json')) {
        files.push(fullPath);
      }
    }
  }

  await walk(dir);
  return files;
}

/**
 * Generate contracts from discovery collections
 */
export async function generateContracts(
  options: GenerateContractsOptions,
): Promise<void> {
  const { collectionsDir, outputDir, docsDir, resolveImports, clean } = options;

  // Use provided hook or default resolver
  const importResolver = resolveImports ?? defaultResolveImports;

  console.log('Collections: ' + collectionsDir);
  console.log('Output: ' + outputDir);
  console.log('Docs: ' + docsDir);

  // Clean output directory if requested
  if (clean && existsSync(outputDir)) {
    await rm(outputDir, { recursive: true });
    console.log('Cleaned: ' + outputDir);
  }

  // Load content type mapping - either from file or use object directly
  if (typeof options.contentTypeMapping === 'string') {
    if (!existsSync(options.contentTypeMapping)) {
      throw new Error('Mapping file not found: ' + options.contentTypeMapping);
    }
    await loadMapping(options.contentTypeMapping);
  } else {
    contentTypeMapping = options.contentTypeMapping;
  }

  // Load enabled endpoints - either from file or use object directly
  if (typeof options.enabledEndpoints === 'string') {
    if (!existsSync(options.enabledEndpoints)) {
      throw new Error(
        'Enabled endpoints file not found: ' + options.enabledEndpoints,
      );
    }
    await loadEnabledEndpoints(options.enabledEndpoints);
  } else {
    enabledEndpointsList = normalizeEnabledEndpoints(options.enabledEndpoints);
  }
  console.log('Enabled patterns: ' + enabledEndpointsList.length);

  if (!existsSync(collectionsDir)) {
    throw new Error('Collections directory not found: ' + collectionsDir);
  }

  const jsonFiles = await findJsonFiles(collectionsDir);
  console.log('Found ' + jsonFiles.length + ' collection files\n');

  const generatedContracts: Array<{
    relativePath: string;
    contractName: string;
  }> = [];
  const enabledEndpointsInfo: Array<{
    href: string;
    title: string;
    category: string;
  }> = [];
  const skippedEndpointsInfo: Array<{
    href: string;
    title: string;
    category: string;
  }> = [];
  let totalMethods = 0;

  for (const jsonFile of jsonFiles) {
    try {
      const content = await readFile(jsonFile, 'utf-8');
      const coll: CollectionJson = JSON.parse(content);

      const endpointInfo = {
        href: coll.href,
        title: coll.title,
        category: coll.category.term,
      };

      if (!isEndpointEnabled(coll.href)) {
        skippedEndpointsInfo.push(endpointInfo);
        continue;
      }

      enabledEndpointsInfo.push(endpointInfo);

      const relPath = relative(collectionsDir, jsonFile);
      const dirPath = dirname(relPath);
      const contractName = dirPath.split('/').pop() || 'contract';

      // Get endpoint config to check for CRUD mode
      const endpointConfig = getEndpointConfig(coll.href);
      const imports = importResolver(dirPath, outputDir);

      let code: string;
      let methodCount: number;

      if (endpointConfig?.crud) {
        // Generate CRUD contract using crud() helper
        code = generateCrudContractFile(coll, dirPath, imports, endpointConfig);
        methodCount = 4; // get, post, put, delete
        console.log('  + ' + dirPath + '.ts (CRUD: get, post, put, delete)');
      } else {
        // Generate standard contract with individual methods
        const methods = processCollection(coll);

        // Skip endpoints with no methods (e.g., method filter excluded all)
        if (methods.length === 0) {
          console.log(
            '  - ' + dirPath + '.ts (skipped: no methods after filtering)',
          );
          continue;
        }

        code = generateContractFile(coll, methods, dirPath, imports);
        methodCount = methods.length;
        console.log('  + ' + dirPath + '.ts (' + methods.length + ' methods)');
      }

      totalMethods += methodCount;

      const outputPath = join(outputDir, dirPath + '.ts');
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, code, 'utf-8');

      generatedContracts.push({ relativePath: dirPath, contractName });
    } catch (err) {
      console.error('  Error: ' + jsonFile + ':', err);
    }
  }

  // Generate index
  const indexCode = generateIndexFile(generatedContracts);
  await writeFile(join(outputDir, 'index.ts'), indexCode, 'utf-8');
  console.log('\n  + index.ts');

  // Generate unsupported endpoints doc
  const unsupportedDoc = generateUnsupportedEndpointsDoc(
    skippedEndpointsInfo,
    enabledEndpointsInfo,
  );
  await mkdir(docsDir, { recursive: true });
  await writeFile(join(docsDir, 'adt-endpoints.md'), unsupportedDoc, 'utf-8');
  console.log('  + ' + docsDir + '/adt-endpoints.md');

  console.log('\nSummary:');
  console.log(
    '   Enabled: ' +
      generatedContracts.length +
      ' contracts, ' +
      totalMethods +
      ' methods',
  );
  console.log(
    '   Skipped: ' +
      skippedEndpointsInfo.length +
      ' endpoints (not in whitelist)',
  );
}

/**
 * Options for generating contracts directly from discovery XML
 */
export interface GenerateContractsFromDiscoveryOptions {
  /** Path to discovery XML file */
  discoveryXml: string;
  /** Output directory for generated contracts */
  outputDir: string;
  /** Output directory for documentation */
  docsDir: string;
  /** Content-type mapping - either file path (string) or config object */
  contentTypeMapping: string | ContentTypeMapping;
  /** Enabled endpoints - either file path (string) or config object */
  enabledEndpoints: string | EnabledEndpoints;
  /** Hook to resolve import paths for generated contracts */
  resolveImports?: ResolveImportsHook;
  /**
   * Clean output directory before generating.
   * When true, removes all files in outputDir before generating new contracts.
   * @default false
   */
  clean?: boolean;
}

/**
 * Generate contracts directly from discovery XML
 *
 * This is the preferred method - no pre-processing of collections needed.
 */
export async function generateContractsFromDiscovery(
  options: GenerateContractsFromDiscoveryOptions,
): Promise<void> {
  const { discoveryXml, outputDir, docsDir, resolveImports, clean } = options;

  // Use provided hook or default resolver
  const importResolver = resolveImports ?? defaultResolveImports;

  console.log('Discovery: ' + discoveryXml);
  console.log('Output: ' + outputDir);
  console.log('Docs: ' + docsDir);

  // Clean output directory if requested
  if (clean && existsSync(outputDir)) {
    await rm(outputDir, { recursive: true });
    console.log('Cleaned: ' + outputDir);
  }

  // Load discovery XML
  if (!existsSync(discoveryXml)) {
    throw new Error('Discovery XML not found: ' + discoveryXml);
  }
  const xml = await readFile(discoveryXml, 'utf-8');
  const discovery = parseDiscoveryXml(xml);
  const collections = getAllCollections(discovery);
  console.log('Found ' + collections.length + ' collections in discovery\n');

  // Load content type mapping
  if (typeof options.contentTypeMapping === 'string') {
    if (!existsSync(options.contentTypeMapping)) {
      throw new Error('Mapping file not found: ' + options.contentTypeMapping);
    }
    await loadMapping(options.contentTypeMapping);
  } else {
    contentTypeMapping = options.contentTypeMapping;
  }

  // Load enabled endpoints
  if (typeof options.enabledEndpoints === 'string') {
    if (!existsSync(options.enabledEndpoints)) {
      throw new Error(
        'Enabled endpoints file not found: ' + options.enabledEndpoints,
      );
    }
    await loadEnabledEndpoints(options.enabledEndpoints);
  } else {
    enabledEndpointsList = normalizeEnabledEndpoints(options.enabledEndpoints);
  }
  console.log('Enabled patterns: ' + enabledEndpointsList.length);

  const generatedContracts: Array<{
    relativePath: string;
    contractName: string;
  }> = [];
  const enabledEndpointsInfo: Array<{
    href: string;
    title: string;
    category: string;
  }> = [];
  const skippedEndpointsInfo: Array<{
    href: string;
    title: string;
    category: string;
  }> = [];
  let totalMethods = 0;

  for (const coll of collections) {
    const endpointInfo = {
      href: coll.href,
      title: coll.title,
      category: coll.category.term,
    };

    if (!isEndpointEnabled(coll.href)) {
      skippedEndpointsInfo.push(endpointInfo);
      continue;
    }

    enabledEndpointsInfo.push(endpointInfo);

    // Convert CollectionData to CollectionJson format
    const collJson: CollectionJson = {
      href: coll.href,
      title: coll.title,
      accepts: coll.accepts,
      category: coll.category,
      templateLinks: coll.templateLinks,
    };

    // Generate relative path from href (e.g., /sap/bc/adt/atc/worklists -> sap/bc/adt/atc/worklists)
    const dirPath = coll.href.replace(/^\//, '');
    const contractName = dirPath.split('/').pop() || 'contract';

    // Get endpoint config to check for CRUD mode
    const endpointConfig = getEndpointConfig(coll.href);
    const imports = importResolver(dirPath, outputDir);

    let code: string;
    let methodCount: number;

    if (endpointConfig?.crud) {
      // Generate CRUD contract using crud() helper
      code = generateCrudContractFile(
        collJson,
        dirPath,
        imports,
        endpointConfig,
      );
      methodCount = 4; // get, post, put, delete
      console.log('  + ' + dirPath + '.ts (CRUD: get, post, put, delete)');
    } else {
      // Generate standard contract with individual methods
      const methods = processCollection(collJson);

      // Skip endpoints with no methods (e.g., method filter excluded all)
      if (methods.length === 0) {
        console.log(
          '  - ' + dirPath + '.ts (skipped: no methods after filtering)',
        );
        continue;
      }

      code = generateContractFile(collJson, methods, dirPath, imports);
      methodCount = methods.length;
      console.log('  + ' + dirPath + '.ts (' + methods.length + ' methods)');
    }

    totalMethods += methodCount;

    const outputPath = join(outputDir, dirPath + '.ts');
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, code, 'utf-8');

    generatedContracts.push({ relativePath: dirPath, contractName });
  }

  // Generate index
  const indexCode = generateIndexFile(generatedContracts);
  await writeFile(join(outputDir, 'index.ts'), indexCode, 'utf-8');
  console.log('\n  + index.ts');

  // Generate endpoints doc
  const endpointsDoc = generateUnsupportedEndpointsDoc(
    skippedEndpointsInfo,
    enabledEndpointsInfo,
  );
  await mkdir(docsDir, { recursive: true });
  await writeFile(join(docsDir, 'adt-endpoints.md'), endpointsDoc, 'utf-8');
  console.log('  + ' + docsDir + '/adt-endpoints.md');

  console.log('\nSummary:');
  console.log(
    '   Enabled: ' +
      generatedContracts.length +
      ' contracts, ' +
      totalMethods +
      ' methods',
  );
  console.log(
    '   Skipped: ' +
      skippedEndpointsInfo.length +
      ' endpoints (not in whitelist)',
  );
}
