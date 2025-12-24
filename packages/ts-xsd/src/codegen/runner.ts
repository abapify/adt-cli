/**
 * Config Runner
 *
 * Executes the generator pipeline based on configuration.
 */

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  rmSync,
} from 'node:fs';
import { join, dirname, relative, isAbsolute, basename } from 'node:path';
import { parseXsd } from '../xsd';
import { linkSchema } from '../xsd/loader';
import type {
  CodegenConfig,
  SchemaInfo,
  SourceInfo,
  SetupContext,
  TransformContext,
  FinalizeContext,
  AfterAllContext,
} from './types';

// ============================================================================
// Runner
// ============================================================================

export interface RunnerOptions {
  /** Root directory (where config file is located) */
  rootDir: string;
  /** Dry run - don't write files, just return what would be written */
  dryRun?: boolean;
  /** Verbose logging */
  verbose?: boolean;
}

export interface RunnerResult {
  /** Files that were written (or would be written in dry run) */
  files: Array<{ path: string; source: string }>;
  /** Schemas that were processed */
  schemas: Array<{ name: string; source: string }>;
  /** Errors that occurred */
  errors: Array<{ schema?: string; source?: string; error: Error }>;
}

/**
 * Run the codegen pipeline
 */
export async function runCodegen(
  config: CodegenConfig,
  options: RunnerOptions,
): Promise<RunnerResult> {
  const { rootDir, dryRun = false, verbose = false } = options;
  const result: RunnerResult = { files: [], schemas: [], errors: [] };

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const log = verbose ? console.log.bind(console) : () => {};

  // Build source info map - expand schemas if autoLink is enabled
  const sources: Record<string, SourceInfo> = {};
  for (const [name, sourceConfig] of Object.entries(config.sources)) {
    const xsdDir = isAbsolute(sourceConfig.xsdDir)
      ? sourceConfig.xsdDir
      : join(rootDir, sourceConfig.xsdDir);

    // If autoLink is enabled, discover all dependent schemas
    let schemas = sourceConfig.schemas;
    if (sourceConfig.autoLink) {
      schemas = discoverDependentSchemas(sourceConfig.schemas, xsdDir, log);
    }

    sources[name] = {
      name,
      xsdDir,
      outputDir: isAbsolute(sourceConfig.outputDir)
        ? sourceConfig.outputDir
        : join(rootDir, sourceConfig.outputDir),
      schemas,
    };
  }

  // Setup context
  const setupCtx: SetupContext = { sources, rootDir };

  // Clean output directories if requested
  if (config.clean) {
    log(`\n🧹 Cleaning output directories...`);
    for (const source of Object.values(sources)) {
      if (existsSync(source.outputDir)) {
        rmSync(source.outputDir, { recursive: true, force: true });
        log(`  ✅ Cleaned ${relative(rootDir, source.outputDir)}`);
      }
    }
  }

  // Run beforeAll hook
  if (config.beforeAll) {
    log(`\n🔧 Running beforeAll hook...`);
    await config.beforeAll({ sources, rootDir });
  }

  // Run setup for all generators
  for (const generator of config.generators) {
    if (generator.setup) {
      log(`[${generator.name}] Running setup...`);
      await generator.setup(setupCtx);
    }
  }

  // First pass: parse ALL schemas from ALL sources into a global map
  // This is needed for cross-source type resolution (e.g., custom schemas importing SAP schemas)
  const processedSchemas = new Map<string, SchemaInfo[]>();
  const globalAllSchemas = new Map<string, SchemaInfo>();

  /**
   * Recursively discover and parse schemas referenced via xs:include or xs:redefine.
   * This ensures schemas like types/devc.xsd are in globalAllSchemas when devc.xsd references them.
   *
   * @param schema - The parsed schema object
   * @param xsdDir - The root XSD directory (e.g., '.xsd')
   * @param currentXsdPath - The path of the current XSD file (for resolving relative paths)
   * @param sourceName - The source name for logging
   * @param discovered - Set of already discovered schema names
   */
  function discoverReferencedSchemas(
    schema: Record<string, unknown>,
    xsdDir: string,
    currentXsdPath: string,
    sourceName: string,
    discovered: Set<string> = new Set(),
  ): void {
    // Get includes and redefines from schema
    const includes = schema.include as
      | Array<{ schemaLocation?: string }>
      | undefined;
    const redefines = schema.redefine as
      | Array<{ schemaLocation?: string }>
      | undefined;
    const refs = [...(includes ?? []), ...(redefines ?? [])];

    for (const ref of refs) {
      if (!ref.schemaLocation) continue;

      // Get schema name with path (e.g., "types/devc" from "types/devc.xsd")
      const schemaNameWithPath = ref.schemaLocation.replace(/\.xsd$/, '');

      // Skip if already discovered or already in global map
      if (
        discovered.has(schemaNameWithPath) ||
        globalAllSchemas.has(schemaNameWithPath)
      ) {
        continue;
      }
      discovered.add(schemaNameWithPath);

      // Resolve the referenced schema path relative to the current XSD file's directory
      const currentXsdDir = dirname(currentXsdPath);
      const refXsdPath = join(currentXsdDir, ref.schemaLocation);
      if (!existsSync(refXsdPath)) {
        log(
          `    ⚠️  Referenced schema not found: ${ref.schemaLocation} (resolved from ${currentXsdDir})`,
        );
        continue;
      }

      try {
        const refXsdContent = readFileSync(refXsdPath, 'utf-8');
        const refSchema = parseXsd(refXsdContent);

        // Set $filename with path for proper identification
        (refSchema as { $filename?: string }).$filename = ref.schemaLocation;

        const refSchemaInfo: SchemaInfo = {
          name: schemaNameWithPath,
          xsdContent: refXsdContent,
          schema: refSchema,
          sourceName,
          xsdPath: refXsdPath,
        };

        // Add to global map with path-qualified name
        globalAllSchemas.set(schemaNameWithPath, refSchemaInfo);
        log(`    📎 Auto-discovered: ${schemaNameWithPath}`);

        // Recursively discover schemas referenced by this one
        discoverReferencedSchemas(
          refSchema as Record<string, unknown>,
          xsdDir,
          refXsdPath,
          sourceName,
          discovered,
        );
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        log(
          `    ⚠️  Failed to parse referenced schema ${ref.schemaLocation}: ${err.message}`,
        );
      }
    }
  }

  for (const [sourceName, source] of Object.entries(sources)) {
    log(`\n📦 Processing source: ${sourceName}`);
    const schemaInfos: SchemaInfo[] = [];

    for (const schemaName of source.schemas) {
      const xsdPath = join(source.xsdDir, `${schemaName}.xsd`);

      if (!existsSync(xsdPath)) {
        log(`  ⚠️  Skipping ${schemaName} - XSD not found`);
        continue;
      }

      try {
        const xsdContent = readFileSync(xsdPath, 'utf-8');
        const schema = parseXsd(xsdContent);

        // Set $filename for schema identification (used by linkSchemas and interface generator)
        (schema as { $filename?: string }).$filename = `${schemaName}.xsd`;

        // Link schema - populates $imports/$includes from schemaLocation references
        // This is done once here so generators receive pre-linked schemas
        const basePath = dirname(xsdPath);
        linkSchema(schema, { basePath, throwOnMissing: false });

        const schemaInfo: SchemaInfo = {
          name: schemaName,
          xsdContent,
          schema,
          sourceName,
          xsdPath,
        };

        schemaInfos.push(schemaInfo);
        // Add to global map with unique key (sourceName/schemaName to avoid collisions)
        globalAllSchemas.set(schemaName, schemaInfo);
        result.schemas.push({ name: schemaName, source: sourceName });

        // Auto-discover schemas referenced via xs:include or xs:redefine
        discoverReferencedSchemas(
          schema as Record<string, unknown>,
          source.xsdDir,
          xsdPath,
          sourceName,
        );
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        log(`  ❌ Failed to parse ${schemaName}: ${err.message}`);
        result.errors.push({
          schema: schemaName,
          source: sourceName,
          error: err,
        });
      }
    }

    processedSchemas.set(sourceName, schemaInfos);
  }

  // Second pass: run transforms with global schema map
  for (const [sourceName, source] of Object.entries(sources)) {
    const schemaInfos = processedSchemas.get(sourceName) ?? [];

    for (const schemaInfo of schemaInfos) {
      const transformCtx: TransformContext = {
        schema: schemaInfo,
        source,
        allSchemas: globalAllSchemas, // Use global map for cross-source resolution
        allSources: sources,
        rootDir,
        resolveImport: createImportResolver(
          schemaInfo,
          source,
          sources,
          config,
        ),
      };

      for (const generator of config.generators) {
        if (generator.transform) {
          try {
            const files = await generator.transform(transformCtx);
            for (const file of files) {
              const fullPath = join(source.outputDir, file.path);

              if (!dryRun) {
                mkdirSync(dirname(fullPath), { recursive: true });
                writeFileSync(fullPath, file.content);
              }

              result.files.push({ path: fullPath, source: sourceName });
              log(`  ✅ [${generator.name}] Generated ${file.path}`);
            }
          } catch (error) {
            const err =
              error instanceof Error ? error : new Error(String(error));
            log(
              `  ❌ [${generator.name}] Failed ${schemaInfo.name}: ${err.message}`,
            );
            result.errors.push({
              schema: schemaInfo.name,
              source: sourceName,
              error: err,
            });
          }
        }
      }
    }
  }

  // Run finalize for all generators
  const finalizeCtx: FinalizeContext = {
    processedSchemas,
    sources,
    rootDir,
  };

  for (const generator of config.generators) {
    if (generator.finalize) {
      try {
        log(`\n[${generator.name}] Running finalize...`);
        const files = await generator.finalize(finalizeCtx);

        for (const file of files) {
          // Finalize files go to each source's output dir
          for (const [sourceName, source] of Object.entries(sources)) {
            const fullPath = join(source.outputDir, file.path);

            if (!dryRun) {
              mkdirSync(dirname(fullPath), { recursive: true });
              writeFileSync(fullPath, file.content);
            }

            result.files.push({ path: fullPath, source: sourceName });
            log(
              `  ✅ [${generator.name}] Generated ${file.path} for ${sourceName}`,
            );
          }
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        log(`  ❌ [${generator.name}] Finalize failed: ${err.message}`);
        result.errors.push({ error: err });
      }
    }
  }

  // Run afterAll hook
  if (config.afterAll) {
    log(`\n🔧 Running afterAll hook...`);
    const afterAllCtx: AfterAllContext = {
      sources,
      rootDir,
      processedSchemas,
      generatedFiles: result.files.map((f) => ({ path: f.path, content: '' })), // Content not tracked
    };

    const extraFiles = await config.afterAll(afterAllCtx);
    if (extraFiles && Array.isArray(extraFiles)) {
      for (const file of extraFiles) {
        const fullPath = join(rootDir, file.path);

        if (!dryRun) {
          mkdirSync(dirname(fullPath), { recursive: true });
          writeFileSync(fullPath, file.content);
        }

        result.files.push({ path: fullPath, source: 'afterAll' });
        log(`  ✅ [afterAll] Generated ${file.path}`);
      }
    }
  }

  return result;
}

// ============================================================================
// Import Resolution
// ============================================================================

function createImportResolver(
  currentSchema: SchemaInfo,
  currentSource: SourceInfo,
  allSources: Record<string, SourceInfo>,
  config: CodegenConfig,
): (schemaLocation: string) => string | null {
  const ext = config.importExtension ?? ''; // Default to extensionless for bundler compatibility

  return (schemaLocation: string) => {
    // Remove .xsd extension but preserve path (e.g., "types/dd01v.xsd" -> "types/dd01v")
    const schemaPath = schemaLocation.replace(/\.xsd$/, '');
    // Also try just the base name for backward compatibility
    const schemaBaseName = schemaPath.replace(/^.*\//, '');

    // Get the directory of the current schema (for resolving relative paths)
    // e.g., "sap/classes" -> "sap", "custom/discovery" -> "custom"
    const currentSchemaDir = dirname(currentSchema.name);

    // Resolve the schemaLocation relative to the current schema's directory
    // e.g., if current is "sap/classes" and schemaLocation is "adtcore.xsd" -> "sap/adtcore"
    // e.g., if current is "custom/discovery" and schemaLocation is "../sap/atom.xsd" -> "sap/atom"
    const resolvedPath =
      currentSchemaDir !== '.'
        ? join(currentSchemaDir, schemaPath).replace(/\\/g, '/')
        : schemaPath;

    // Normalize the path (handle ../ etc.)
    const normalizedPath = resolvedPath
      .split('/')
      .reduce((acc: string[], part) => {
        if (part === '..') acc.pop();
        else if (part !== '.') acc.push(part);
        return acc;
      }, [])
      .join('/');

    // Check if the resolved path is in the current source
    if (currentSource.schemas.includes(normalizedPath)) {
      // Calculate relative import path from current schema to target
      const fromDir = dirname(currentSchema.name);
      const toPath = normalizedPath;
      const relImport =
        fromDir === dirname(toPath)
          ? `./${basename(toPath)}${ext}`
          : relative(fromDir || '.', toPath).replace(/\\/g, '/') ||
            `./${basename(toPath)}`;
      return relImport.startsWith('.')
        ? `${relImport}${ext}`
        : `./${relImport}${ext}`;
    }

    // Try the original schemaPath (for backward compatibility with flat structures)
    if (currentSource.schemas.includes(schemaPath)) {
      return `./${schemaPath}${ext}`;
    }
    if (currentSource.schemas.includes(schemaBaseName)) {
      return `./${schemaBaseName}${ext}`;
    }

    // Check other sources
    for (const [sourceName, source] of Object.entries(allSources)) {
      if (sourceName === currentSource.name) continue;

      if (source.schemas.includes(normalizedPath)) {
        const relPath = relative(currentSource.outputDir, source.outputDir);
        return `${relPath}/${normalizedPath}${ext}`.replace(/\\/g, '/');
      }
      if (source.schemas.includes(schemaPath)) {
        const relPath = relative(currentSource.outputDir, source.outputDir);
        return `${relPath}/${schemaPath}${ext}`.replace(/\\/g, '/');
      }
      if (source.schemas.includes(schemaBaseName)) {
        const relPath = relative(currentSource.outputDir, source.outputDir);
        return `${relPath}/${schemaBaseName}${ext}`.replace(/\\/g, '/');
      }
    }

    return null;
  };
}

// ============================================================================
// Schema Discovery
// ============================================================================

/**
 * Discover all dependent schemas by recursively parsing XSD files
 * and extracting schemaLocation from xs:import, xs:include, xs:redefine
 */
function discoverDependentSchemas(
  entrySchemas: string[],
  xsdDir: string,
  log: (...args: unknown[]) => void,
): string[] {
  const discovered = new Set<string>();
  const queue = [...entrySchemas];

  while (queue.length > 0) {
    const schemaName = queue.shift();
    if (!schemaName) continue;

    // Skip if already processed
    if (discovered.has(schemaName)) continue;

    // Try to find and parse the XSD file
    const xsdPath = join(xsdDir, `${schemaName}.xsd`);
    if (!existsSync(xsdPath)) {
      throw new Error(
        `Schema not found: ${schemaName}.xsd (resolved: ${xsdPath})`,
      );
    }

    discovered.add(schemaName);

    try {
      const xsdContent = readFileSync(xsdPath, 'utf-8');
      const schema = parseXsd(xsdContent);

      // Extract schemaLocation from import, include, redefine
      const deps = extractSchemaLocations(schema, xsdDir, schemaName);

      for (const dep of deps) {
        if (!discovered.has(dep)) {
          queue.push(dep);
          log(`  🔗 Discovered dependency: ${dep} (from ${schemaName})`);
        }
      }
    } catch {
      log(`  ❌ Failed to parse ${schemaName} for dependency discovery`);
    }
  }

  return Array.from(discovered);
}

/**
 * Extract schema names from schemaLocation attributes
 */
function extractSchemaLocations(
  schema: Record<string, unknown>,
  xsdDir: string,
  currentSchema: string,
): string[] {
  const locations: string[] = [];
  const currentDir = dirname(join(xsdDir, `${currentSchema}.xsd`));

  // xs:import
  const imports = schema.import as
    | Array<{ schemaLocation?: string }>
    | undefined;
  if (imports) {
    for (const imp of imports) {
      if (imp.schemaLocation) {
        const name = resolveSchemaName(imp.schemaLocation, currentDir, xsdDir);
        if (name) locations.push(name);
      }
    }
  }

  // xs:include
  const includes = schema.include as
    | Array<{ schemaLocation?: string }>
    | undefined;
  if (includes) {
    for (const inc of includes) {
      if (inc.schemaLocation) {
        const name = resolveSchemaName(inc.schemaLocation, currentDir, xsdDir);
        if (name) locations.push(name);
      }
    }
  }

  // xs:redefine
  const redefines = schema.redefine as
    | Array<{ schemaLocation?: string }>
    | undefined;
  if (redefines) {
    for (const red of redefines) {
      if (red.schemaLocation) {
        const name = resolveSchemaName(red.schemaLocation, currentDir, xsdDir);
        if (name) locations.push(name);
      }
    }
  }

  return locations;
}

/**
 * Resolve schemaLocation to a schema name relative to xsdDir
 */
function resolveSchemaName(
  schemaLocation: string,
  currentDir: string,
  xsdDir: string,
): string | null {
  // Resolve the full path
  const fullPath = join(currentDir, schemaLocation);

  // Make it relative to xsdDir
  const relativePath = relative(xsdDir, fullPath);

  // Remove .xsd extension
  const name = relativePath.replace(/\.xsd$/, '');

  // Check if file exists
  if (existsSync(fullPath)) {
    return name;
  }

  return null;
}
