/**
 * Source Command
 *
 * Read and write ABAP source code via ADT.
 *
 * Usage:
 *   adt source get <objectName> [--type CLAS]   # Print source to stdout
 *   adt source put <objectName> <file>  [--type CLAS] [--transport DEVK900001]
 */

import { Command } from 'commander';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getAdtClientV2 } from '../utils/adt-client-v2';
import { normalizeSearchResults } from '../utils/lock-helpers';
import {
  ExactSourceHistoryService,
  toMetadataOnlySourceVersionListing,
  type ListObjectVersionsResult,
} from '../services/source-history';
import {
  getSource,
  type GetSourceResult,
  type GrepMatch,
} from '../services/source';
import { createLockService, resolveLockCorrelation } from '@abapify/adt-locks';
import { getObjectUri } from '@abapify/adk';
import {
  detectMethodBoundary,
  lintSource,
  normalizeMethodBody,
} from '@abapify/adt-lint';

type AdtClient = Awaited<ReturnType<typeof getAdtClientV2>>;

type SourceHistoryServicePort = Pick<
  ExactSourceHistoryService,
  'listObjectVersions' | 'getVersionSource'
>;

export interface SourceHistoryCommandDependencies {
  getClient: () => Promise<AdtClient>;
  createService: (client: AdtClient) => SourceHistoryServicePort;
  writeStdout: (content: string) => void;
  writeFile: (path: string, content: string) => Promise<void>;
  writeLine: (content: string) => void;
  writeError: (content: string) => void;
  setExitCode: (code: number) => void;
}

const DEFAULT_SOURCE_HISTORY_DEPENDENCIES: SourceHistoryCommandDependencies = {
  getClient: getAdtClientV2,
  createService: (client) => new ExactSourceHistoryService(client),
  writeStdout: (content) => process.stdout.write(content),
  writeFile: (path, content) => writeFile(path, content, 'utf8'),
  writeLine: (content) => console.log(content),
  writeError: (content) => console.error(content),
  setExitCode: (code) => {
    process.exitCode = code;
  },
};

function sourceHistoryDependencies(
  overrides: Partial<SourceHistoryCommandDependencies>,
): SourceHistoryCommandDependencies {
  return { ...DEFAULT_SOURCE_HISTORY_DEPENDENCIES, ...overrides };
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Unknown source-history error.';
}

function resolveSafeOutputPath(filePath: string): string {
  if (filePath === '-') return filePath;
  const normalized = path.normalize(filePath);
  if (path.isAbsolute(normalized)) {
    if (normalized.split(path.sep).includes('..')) {
      throw new Error(
        'Output path contains an illegal parent-directory reference.',
      );
    }
    return normalized;
  }
  const cwd = process.cwd();
  const resolved = path.resolve(normalized);
  const prefix = path.join(cwd, path.sep);
  if (!resolved.startsWith(prefix) && resolved !== cwd) {
    throw new Error(
      'Output path must be inside the current working directory.',
    );
  }
  return resolved;
}

function formatObjectVersions(result: ListObjectVersionsResult): string[] {
  const lines = [`${result.object.type} ${result.object.name}`];
  if (result.object.packageName) {
    lines[0] += ` (${result.object.packageName})`;
  }

  if (result.components.length === 0) {
    lines.push('  No source components found.');
    return lines;
  }

  for (const component of result.components) {
    if (component.diagnostic !== undefined) {
      lines.push(
        `  ${component.id}: unavailable [${component.diagnostic.code}] ${component.diagnostic.message}`,
      );
      continue;
    }

    lines.push(`  ${component.id}: ${component.versions.length} version(s)`);
    for (const version of component.versions) {
      const transports =
        version.transports.length > 0
          ? version.transports.join(', ')
          : 'no transport provenance';
      lines.push(`    #${version.ordinal} ${version.id} [${transports}]`);
    }
  }

  return lines;
}

interface SourceOp {
  get: (name: string) => Promise<string>;
  put: (
    name: string,
    opts: { lockHandle: string; corrNr?: string },
    body: string,
  ) => Promise<unknown>;
}

/**
 * Pick the typed source.main contract for well-known object URIs.
 * Returns `undefined` for object types that don't (yet) have a contract,
 * in which case callers should fall back to generic client.fetch().
 */
function pickSourceContract(
  client: AdtClient,
  uri: string,
): { op: SourceOp; objectName: string } | undefined {
  // Patterns: /sap/bc/adt/<area>/<name>
  const match =
    /^\/sap\/bc\/adt\/(oo\/classes|oo\/interfaces|programs\/programs|ddic\/ddl\/sources|ddic\/dcl\/sources)\/([^/?#]+)/i.exec(
      uri,
    );
  if (!match) return undefined;
  const [, area, encodedName] = match;
  const objectName = decodeURIComponent(encodedName);

  switch (area.toLowerCase()) {
    case 'oo/classes':
      return { op: client.adt.oo.classes.source.main, objectName };
    case 'oo/interfaces':
      return { op: client.adt.oo.interfaces.source.main, objectName };
    case 'programs/programs':
      return { op: client.adt.programs.programs.source.main, objectName };
    case 'ddic/ddl/sources':
      return { op: client.adt.ddic.ddl.sources.source.main, objectName };
    case 'ddic/dcl/sources':
      return { op: client.adt.ddic.dcl.sources.source.main, objectName };
    default:
      return undefined;
  }
}

/**
 * Resolve an object to its ADT URI.
 * Uses type-based registry lookup first, then falls back to quickSearch.
 */
async function resolveUri(
  client: AdtClient,
  objectName: string,
  objectType?: string,
): Promise<string> {
  if (objectType) {
    const uri = getObjectUri(objectType, objectName);
    if (uri) return uri;
  }

  const searchResult =
    await client.adt.repository.informationsystem.search.quickSearch({
      query: objectName,
      maxResults: 10,
    });

  const objects = normalizeSearchResults(
    searchResult as Record<string, unknown>,
  );

  const match = objects.find(
    (o) => o.name?.toUpperCase() === objectName.toUpperCase(),
  );

  if (!match?.uri) throw new Error(`Object '${objectName}' not found`);
  return match.uri;
}

// ── sub-commands ─────────────────────────────────────────────────────────────

function formatGrepMatch(match: GrepMatch): string {
  const scope = [match.class, match.include, match.method]
    .filter(Boolean)
    .join('.');
  const scopePrefix = scope ? `${scope} | ` : '';
  const lineNumber = match.line.toString().padStart(5, ' ');
  return `${scopePrefix}${lineNumber}: ${match.text}`;
}

function formatMethodContext(methodContext: GrepMatch[]): string {
  const lines: string[] = [];
  let prev = -1;
  for (const match of methodContext) {
    if (prev > 0 && match.line - prev > 1) {
      lines.push('---');
    }
    lines.push(formatGrepMatch(match));
    prev = match.line;
  }
  return lines.join('\n');
}

function formatGetSourceResult(result: GetSourceResult): string {
  if ('includes' in result) {
    return JSON.stringify(result, null, 2);
  }
  if ('source' in result) {
    return result.source;
  }
  if ('matches' in result) {
    return result.methodContext?.length
      ? formatMethodContext(result.methodContext)
      : result.matches.join('\n');
  }
  if ('methods' in result) {
    return result.methods.join('\n');
  }
  return '';
}

const getSourceCommand = new Command('get')
  .description('Print ABAP source code for an object to stdout')
  .argument('<objectName>', 'ABAP object name')
  .option('--type <type>', 'Object type hint (e.g. CLAS, PROG, INTF)')
  .option('--version <version>', 'Source version (active or inactive)')
  .option(
    '--include <include>',
    'Source include/section (e.g. testclasses, localtypes)',
  )
  .option('--method <method>', 'Method name to read, or * to list methods')
  .option('--grep <pattern>', 'Search source with regex context')
  .option('--max-bytes <bytes>', 'Maximum source bytes to retrieve', '1048576')
  .option('--format <format>', 'Output format (raw or structured)', 'raw')
  .option('--json', 'Output result as JSON')
  .action(
    async (
      objectName: string,
      options: {
        type?: string;
        version?: string;
        include?: string;
        method?: string;
        grep?: string;
        maxBytes?: string;
        format?: string;
        json?: boolean;
      },
    ) => {
      try {
        const client = await getAdtClientV2();
        const maxBytes = options.maxBytes
          ? Number(options.maxBytes)
          : undefined;
        if (
          maxBytes !== undefined &&
          (!Number.isInteger(maxBytes) || maxBytes <= 0)
        ) {
          throw new Error(`Invalid --max-bytes value: ${options.maxBytes}`);
        }
        const result = await getSource(client, {
          objectName,
          objectType: options.type,
          version: options.version,
          include: options.include,
          method: options.method,
          grep: options.grep,
          maxBytes,
          format: options.format === 'structured' ? 'structured' : 'raw',
        });

        if (options.json || options.format === 'structured') {
          console.log(JSON.stringify(result, null, 2));
        } else {
          process.stdout.write(formatGetSourceResult(result));
          if ('note' in result && result.note) {
            process.stderr.write(`\nNote: ${result.note}\n`);
          }
        }
      } catch (error) {
        console.error(
          '❌ Get source failed:',
          error instanceof Error ? error.message : String(error),
        );
        process.exit(1);
      }
    },
  );

/** Create `adt source versions` with injectable I/O for deterministic tests. */
export function createSourceVersionsCommand(
  overrides: Partial<SourceHistoryCommandDependencies> = {},
): Command {
  const dependencies = sourceHistoryDependencies(overrides);

  return new Command('versions')
    .description('List immutable source-version metadata for an ABAP object')
    .argument('<object>', 'ABAP object name')
    .requiredOption('--type <type>', 'ADT object type (for example CLAS)')
    .option('--component <name>', 'Exact source component id')
    .option('--json', 'Output normalized metadata as JSON')
    .action(
      async (
        objectName: string,
        options: { type: string; component?: string; json?: boolean },
      ) => {
        try {
          const client = await dependencies.getClient();
          const service = dependencies.createService(client);
          const result = await service.listObjectVersions({
            objectName,
            objectType: options.type,
            ...(options.component !== undefined
              ? { component: options.component }
              : {}),
          });

          if (options.json) {
            dependencies.writeLine(
              JSON.stringify(
                toMetadataOnlySourceVersionListing(result),
                null,
                2,
              ),
            );
          } else {
            for (const line of formatObjectVersions(result)) {
              dependencies.writeLine(line);
            }
          }
        } catch (error) {
          dependencies.writeError(
            `Source-version listing failed: ${safeErrorMessage(error)}`,
          );
          dependencies.setExitCode(1);
        }
      },
    );
}

/** Create `adt source version get` with explicit stdout/file delivery. */
export function createSourceVersionCommand(
  overrides: Partial<SourceHistoryCommandDependencies> = {},
): Command {
  const dependencies = sourceHistoryDependencies(overrides);
  const getVersionCommand = new Command('get')
    .description('Read one immutable historical source version')
    .requiredOption(
      '--uri <immutable-uri>',
      'Immutable server-relative ADT source URI returned by SAP',
    )
    .option('--output <file>', "Write source to a file, or '-' for stdout", '-')
    .action(async (options: { uri: string; output: string }) => {
      try {
        const client = await dependencies.getClient();
        const service = dependencies.createService(client);
        const source = await service.getVersionSource({ uri: options.uri });

        if (options.output === '-') {
          dependencies.writeStdout(source);
        } else {
          await dependencies.writeFile(
            resolveSafeOutputPath(options.output),
            source,
          );
        }
      } catch (error) {
        dependencies.writeError(
          `Immutable source retrieval failed: ${safeErrorMessage(error)}`,
        );
        dependencies.setExitCode(1);
      }
    });

  return new Command('version')
    .description('Operate on one immutable source version')
    .addCommand(getVersionCommand);
}

/** Replace a single method body in the current source (--method mode). */
async function applyMethodReplacement(
  client: AdtClient,
  uri: string,
  objectName: string,
  methodName: string,
  sourceCode: string,
): Promise<string> {
  if (!uri.includes('/oo/classes/') && !uri.includes('/oo/interfaces/')) {
    throw new Error(
      `--method is only supported for classes and interfaces, but '${objectName}' resolved to ${uri}`,
    );
  }

  const currentSource = String(
    await client.fetch(`${uri}/source/main`, {
      method: 'GET',
      headers: { Accept: 'text/plain' },
    }),
  );
  const boundary = detectMethodBoundary(currentSource, methodName);
  if (!boundary) {
    throw new Error(`Method ${methodName} not found in ${objectName}`);
  }

  const lines = currentSource.split(/\r?\n/);
  const methodBody = normalizeMethodBody(sourceCode, methodName);
  const methodBlock = [
    `METHOD ${methodName.toUpperCase()}.`,
    methodBody,
    'ENDMETHOD.',
  ].join('\n');
  lines.splice(
    boundary.startLine - 1,
    boundary.endLine - boundary.startLine + 1,
    methodBlock,
  );
  return lines.join('\n');
}

/** Run the local lint gate; throws with the blocking diagnostics, if any. */
function lintGate(
  sourceToWrite: string,
  objectName: string,
  lintPreset: 'btp' | 'onpremise' | undefined,
): void {
  const diagnostics = lintSource(sourceToWrite, {
    filename: `${objectName.toLowerCase()}.abap`,
    systemType: lintPreset,
  });
  const blocking = diagnostics.filter((d) =>
    ['parser_error', 'cloud_types', 'strict_sql'].includes(d.key),
  );
  if (blocking.length > 0) {
    const blockedLines = blocking
      .map((d) => `${d.key}: ${d.message}`)
      .join('\n');
    throw new Error(`Lint blocked write:\n${blockedLines}`);
  }
}

/** Write the source through the typed contract or the generic fallback. */
async function writeSourceContent(
  client: AdtClient,
  uri: string,
  sourceToWrite: string,
  lockHandle: string,
  effectiveTransport: string | undefined,
): Promise<void> {
  const contract = pickSourceContract(client, uri);
  if (contract) {
    await contract.op.put(
      contract.objectName,
      {
        lockHandle,
        ...(effectiveTransport ? { corrNr: effectiveTransport } : {}),
      },
      sourceToWrite,
    );
  } else {
    // Generic fallback for object types that do not have a typed
    // source contract yet.
    const params = new URLSearchParams({ lockHandle });
    if (effectiveTransport) params.set('corrNr', effectiveTransport);
    await client.fetch(`${uri}/source/main?${params.toString()}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/plain' },
      body: sourceToWrite,
    });
  }
}

// Lock, write and unlock the object; best-effort unlock on write failure.
async function writeWithLock(
  client: AdtClient,
  lockService: ReturnType<typeof createLockService>,
  uri: string,
  objectName: string,
  sourceToWrite: string,
  options: { transport?: string; json?: boolean },
): Promise<void> {
  if (!options.json) console.log(`🔄 Locking ${objectName}...`);
  const lock = await lockService.lock(uri, {
    transport: options.transport,
    objectName,
  });
  let lockHandle: string | undefined = lock.handle;
  const effectiveTransport = resolveLockCorrelation(lock, options.transport);

  try {
    if (!options.json) console.log(`🔄 Writing source to ${uri}...`);

    await writeSourceContent(
      client,
      uri,
      sourceToWrite,
      lockHandle,
      effectiveTransport,
    );

    await lockService.unlock(uri, { lockHandle });
    lockHandle = undefined;

    if (options.json) {
      console.log(
        JSON.stringify({ objectName, uri, status: 'written' }, null, 2),
      );
    } else {
      console.log(`✅ Source written and lock released for ${objectName}`);
    }
  } catch (err) {
    // Best-effort unlock (only if not already unlocked)
    if (lockHandle) {
      try {
        await lockService.unlock(uri, { lockHandle });
      } catch {
        // ignore
      }
    }
    throw err;
  }
}

const putSourceCommand = new Command('put')
  .description('Write ABAP source code from a file to an existing object')
  .argument('<objectName>', 'ABAP object name')
  .argument('<file>', 'Path to the source file to upload')
  .option('--type <type>', 'Object type hint (e.g. CLAS, PROG, INTF)')
  .option(
    '--transport <transport>',
    'Transport request number for transportable objects',
  )
  .option(
    '--method <method>',
    'Replace the body of a single method instead of uploading full source',
  )
  .option(
    '--lint-before-write',
    'Run local lint checks and block write on parser/cloud violations',
    false,
  )
  .option(
    '--lint-preset <preset>',
    'Lint preset for --lint-before-write gate: btp|onpremise',
    'onpremise',
  )
  .option('--json', 'Output result as JSON')
  .action(
    async (
      objectName: string,
      file: string,
      options: {
        type?: string;
        transport?: string;
        json?: boolean;
        method?: string;
        lintBeforeWrite?: boolean;
        lintPreset?: 'btp' | 'onpremise';
      },
    ) => {
      try {
        const client = await getAdtClientV2();
        const uri = await resolveUri(client, objectName, options.type);
        const sourceCode = await readFile(file, 'utf8');
        let sourceToWrite = sourceCode;

        if (options.method) {
          sourceToWrite = await applyMethodReplacement(
            client,
            uri,
            objectName,
            options.method,
            sourceCode,
          );
        }

        if (options.lintBeforeWrite) {
          lintGate(sourceToWrite, objectName, options.lintPreset);
        }

        const lockService = createLockService(client);
        await writeWithLock(
          client,
          lockService,
          uri,
          objectName,
          sourceToWrite,
          options,
        );
      } catch (error) {
        console.error(
          '❌ Put source failed:',
          error instanceof Error ? error.message : String(error),
        );
        process.exit(1);
      }
    },
  );

// ── parent command ────────────────────────────────────────────────────────────

export const sourceCommand = new Command('source')
  .description('Read and write ABAP source code')
  .addCommand(getSourceCommand)
  .addCommand(putSourceCommand)
  .addCommand(createSourceVersionsCommand())
  .addCommand(createSourceVersionCommand());
